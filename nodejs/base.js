"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mws_info = require('@lemay/mws-api-info');
var xmljs = require('xml-js');
var api_mapping = {
    Feeds: {
        path: 'Feeds',
        version: '2009-01-01',
    },
    Finances: {
        path: 'Finances',
        version: '2015-05-01',
    },
    FulfillmentInboundShipment: {
        path: 'FulfillmentInboundShipment',
        version: '2010-10-01',
    },
    FulfillmentInventory: {
        path: 'FulfillmentInventory',
        version: '2010-10-01',
    },
    FulfillmentOutboundShipment: {
        path: 'FulfillmentOutboundShipment',
        version: '2010-10-01',
    },
    MerchantFulfillment: {
        path: 'MerchantFulfillment',
        version: '2015-06-01',
    },
    Orders: {
        path: 'Orders',
        version: '2013-09-01',
    },
    Products: {
        path: 'Products',
        version: '2011-10-01',
    },
    Recommendations: {
        path: 'Recommendations',
        version: '2013-04-01',
    },
    Reports: {
        path: 'Reports',
        version: '2009-01-01',
    },
    Sellers: {
        path: 'Sellers',
        version: '2011-07-01',
    },
    Subscriptions: {
        path: 'Subscriptions',
        version: '2013-07-01',
    },
    EasyShip: {
        path: 'EasyShip',
        version: '2018-09-01'
    }
};
var MWSClientBase = (function () {
    function MWSClientBase(marketplace, access_key, access_secret, seller_id, auth_token) {
        if (auth_token === void 0) { auth_token = ''; }
        var marketplace_info = this.getMarketplaceInfo(marketplace);
        this.useragent = null;
        this.marketplace = marketplace;
        this.marketplace_id = marketplace_info['id'];
        this.protocol = 'https';
        this.endpoint = marketplace_info['mws_endpoint'];
        this.site_url = marketplace_info['site'];
        this.access_key = access_key;
        this.access_secret = access_secret;
        this.seller_id = seller_id;
        this.auth_token = auth_token;
    }
    MWSClientBase.version = function () {
        return "1.1.13";
    };
    MWSClientBase.escapeUserAgentFieldValue = function (v) {
        return v.replace(/[\\\/();=]/g, function (m) {
            return '\\' + m;
        });
    };
    MWSClientBase.getMarketplaceId = function (country_code) {
        country_code = country_code.toUpperCase();
        if (!mws_info[country_code])
            throw new Error("Invalid country code: " + country_code);
        return mws_info[country_code]['id'];
    };
    MWSClientBase.parseResponseError = function (status, headers, body) {
        status = parseInt(status);
        if (status > 199 && status < 300) {
            if (headers['Content-MD5']) {
                throw new Error("Reponse content MD5 checksum not match!");
            }
            return null;
        }
        else {
            var err = {
                status: status,
                headers: headers,
                quota: {},
                body: body,
            };
            if (headers['x-mws-quota-max'])
                err['quota']['max'] = parseInt(headers['x-mws-quota-max']);
            if (headers['x-mws-quota-remaining'])
                err['quota']['remaining'] = parseInt(headers['x-mws-quota-remaining']);
            if (headers['x-mws-quota-resetsOn'] || headers['x-mws-quota-resetson'])
                err['quota']['resetsOn'] = new Date(headers['x-mws-quota-resetsOn'] || headers['x-mws-quota-resetson']);
            if (headers['x-mws-request-id'])
                err['request-id'] = headers['x-mws-request-id'];
            if (headers['x-mws-response-context'])
                err['response-context'] = headers['x-mws-response-context'];
            if (headers['x-mws-timestamp'])
                err['timestamp'] = new Date(headers['x-mws-timestamp']);
            if (headers['Content-Type'] == 'text/xml' || headers['content-type'] == 'text/xml') {
                err['data'] = xmljs.xml2js(body);
            }
            else {
                err['data'] = body;
            }
            return err;
        }
    };
    MWSClientBase.parseResponse = function (status, headers, body) {
        status = parseInt(status);
        if (status > 199 && status < 300) {
            var res = {
                status: status,
                headers: headers,
                body: body,
                quota: {}
            };
            if (headers['x-mws-quota-max'])
                res['quota']['max'] = parseInt(headers['x-mws-quota-max']);
            if (headers['x-mws-quota-remaining'])
                res['quota']['remaining'] = parseInt(headers['x-mws-quota-remaining']);
            if (headers['x-mws-quota-resetsOn'] || headers['x-mws-quota-resetson'])
                res['quota']['resetsOn'] = new Date(headers['x-mws-quota-resetsOn'] || headers['x-mws-quota-resetson']);
            if (headers['x-mws-request-id'])
                res['request-id'] = headers['x-mws-request-id'];
            if (headers['x-mws-response-context'])
                res['response-context'] = headers['x-mws-response-context'];
            if (headers['x-mws-timestamp'])
                res['timestamp'] = new Date(headers['x-mws-timestamp']);
            if (headers['Content-Type'] == 'text/xml' || headers['content-type'] == 'text/xml') {
                res['data'] = xmljs.xml2js(body, { compact: true });
            }
            else {
                res['data'] = body;
            }
            return res;
        }
        else {
            return null;
        }
    };
    MWSClientBase.prototype.getMarketplaceInfo = function (country_code) {
        if (!mws_info[country_code])
            throw new Error("Invalid country code: " + country_code);
        return mws_info[country_code];
    };
    MWSClientBase.prototype.urlEncode = function (str) {
        return encodeURIComponent(str).replace(/[!*()']/g, function (c) {
            return '%' + c.charCodeAt(0).toString(16);
        });
    };
    MWSClientBase.prototype.createQueryString = function (params) {
        var query_parts = [];
        var keys = Object.keys(params);
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var k = keys_1[_i];
            query_parts.push(k + '=' + this.urlEncode(params[k]));
        }
        var queryString = query_parts.join('&');
        return queryString;
    };
    MWSClientBase.prototype.calcSignature = function (endpoint, path, params) {
        var str = '';
        var keys = Object.keys(params);
        keys = keys.sort();
        for (var i = 0; i < keys.length; i++) {
            if (i != 0)
                str += '&';
            str += keys[i] + '=' + this.urlEncode(params[keys[i]]);
        }
        var stringToSign = "POST\n" + endpoint + "\n" + path + "\n" + str;
        var hmac = this.calcHMAC(stringToSign, this.access_secret);
        return hmac;
    };
    MWSClientBase.prototype.callApi = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var section = null;
        var version = null;
        var action = null;
        var params = {};
        var feed = null;
        var cbk = null;
        var argc = arguments.length;
        if (argc < 4) {
            throw new Error("Invalid paramters, at least 4 parameter needed!");
        }
        section = arguments[0];
        version = arguments[1];
        action = arguments[2];
        if (argc == 4) {
            cbk = arguments[3];
        }
        else if (argc == 5) {
            params = arguments[3];
            cbk = arguments[4];
        }
        else {
            params = arguments[3];
            feed = arguments[4];
            cbk = arguments[5];
        }
        var headers = {
            "User-Agent": this.getUserAgent(),
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
        };
        var requiredParams = {
            AWSAccessKeyId: this.access_key,
            Action: action,
            SellerId: this.seller_id,
            SignatureMethod: 'HmacSHA256',
            SignatureVersion: '2',
            Timestamp: new Date().toISOString(),
            Version: version,
        };
        for (var k in params) {
            requiredParams[k] = params[k];
        }
        if (this.auth_token) {
            requiredParams['MWSAuthToken'] = this.auth_token;
        }
        if (action == 'SubmitFeed') {
            if (params['FeedType'].indexOf('FLAT_FILE') > -1) {
                if (this.marketplace == 'CN') {
                    headers['Content-Type'] = 'text/tab-separated-values; charset=utf-8';
                    feed = this.encodeContent(feed, 'utf8');
                }
                else if (this.marketplace == 'JP') {
                    headers['Content-Type'] = 'text/tab-separated-values; charset=Shift_JIS';
                    feed = this.encodeContent(feed, 'shift_jis');
                }
                else {
                    headers['Content-Type'] = 'text/tab-separated-values; charset=iso-8859-1';
                    feed = this.encodeContent(feed, 'iso-8859-1');
                }
            }
            else {
                headers['Content-Type'] = 'text/xml';
                feed = this.encodeContent(feed, 'utf8');
            }
            requiredParams['ContentMD5Value'] = this.calcMD5(feed);
        }
        requiredParams['Signature'] = this.calcSignature(this.endpoint, '/' + section + '/' + version, requiredParams);
        var queryString = this.createQueryString(requiredParams);
        var url = this.protocol + '://' + this.endpoint + '/' + section + '/' + version;
        if (queryString)
            url = url + '?' + queryString;
        if (action == 'SubmitFeed') {
            return this.makeHttpRequest('POST', url, headers, feed, cbk);
        }
        else {
            return this.makeHttpRequest('POST', url, headers, null, cbk);
        }
    };
    MWSClientBase.prototype._invokeApi = function (section, name) {
        var params = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            params[_i - 2] = arguments[_i];
        }
        if (!api_mapping[section])
            throw new Error("Invalid MWS API Section name: " + section + "!");
        return this.callApi.apply(this, [section, api_mapping[section].version, name].concat(params));
    };
    MWSClientBase.prototype.SubmitFeed = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Feeds', 'SubmitFeed'].concat(params));
    };
    MWSClientBase.prototype.GetFeedSubmissionList = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Feeds', 'GetFeedSubmissionList'].concat(params));
    };
    MWSClientBase.prototype.GetFeedSubmissionListByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Feeds', 'GetFeedSubmissionListByNextToken'].concat(params));
    };
    MWSClientBase.prototype.GetFeedSubmissionCount = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Feeds', 'GetFeedSubmissionCount'].concat(params));
    };
    MWSClientBase.prototype.CancelFeedSubmissions = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Feeds', 'CancelFeedSubmissions'].concat(params));
    };
    MWSClientBase.prototype.GetFeedSubmissionResult = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Feeds', 'GetFeedSubmissionResult'].concat(params));
    };
    MWSClientBase.prototype.ListFinancialEventGroups = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Finances', 'ListFinancialEventGroups'].concat(params));
    };
    MWSClientBase.prototype.ListFinancialEventGroupsByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Finances', 'ListFinancialEventGroupsByNextToken'].concat(params));
    };
    MWSClientBase.prototype.ListFinancialEvents = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Finances', 'ListFinancialEvents'].concat(params));
    };
    MWSClientBase.prototype.ListFinancialEventsByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Finances', 'ListFinancialEventsByNextToken'].concat(params));
    };
    MWSClientBase.prototype.GetInboundGuidanceForSKU = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetInboundGuidanceForSKU'].concat(params));
    };
    MWSClientBase.prototype.GetInboundGuidanceForASIN = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetInboundGuidanceForASIN'].concat(params));
    };
    MWSClientBase.prototype.CreateInboundShipmentPlan = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'CreateInboundShipmentPlan'].concat(params));
    };
    MWSClientBase.prototype.CreateInboundShipment = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'CreateInboundShipment'].concat(params));
    };
    MWSClientBase.prototype.UpdateInboundShipment = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'UpdateInboundShipment'].concat(params));
    };
    MWSClientBase.prototype.GetPreorderInfo = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetPreorderInfo'].concat(params));
    };
    MWSClientBase.prototype.ConfirmPreorder = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'ConfirmPreorder'].concat(params));
    };
    MWSClientBase.prototype.GetPrepInstructionsForSKU = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetPrepInstructionsForSKU'].concat(params));
    };
    MWSClientBase.prototype.GetPrepInstructionsForASIN = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetPrepInstructionsForASIN'].concat(params));
    };
    MWSClientBase.prototype.PutTransportContent = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'PutTransportContent'].concat(params));
    };
    MWSClientBase.prototype.EstimateTransportRequest = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'EstimateTransportRequest'].concat(params));
    };
    MWSClientBase.prototype.GetTransportContent = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetTransportContent'].concat(params));
    };
    MWSClientBase.prototype.ConfirmTransportRequest = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'ConfirmTransportRequest'].concat(params));
    };
    MWSClientBase.prototype.VoidTransportRequest = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'VoidTransportRequest'].concat(params));
    };
    MWSClientBase.prototype.GetPackageLabels = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetPackageLabels'].concat(params));
    };
    MWSClientBase.prototype.GetUniquePackageLabels = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetUniquePackageLabels'].concat(params));
    };
    MWSClientBase.prototype.GetPalletLabels = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetPalletLabels'].concat(params));
    };
    MWSClientBase.prototype.GetBillOfLading = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'GetBillOfLading'].concat(params));
    };
    MWSClientBase.prototype.ListInboundShipments = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'ListInboundShipments'].concat(params));
    };
    MWSClientBase.prototype.ListInboundShipmentsByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'ListInboundShipmentsByNextToken'].concat(params));
    };
    MWSClientBase.prototype.ListInboundShipmentItems = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'ListInboundShipmentItems'].concat(params));
    };
    MWSClientBase.prototype.ListInboundShipmentItemsByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInboundShipment', 'ListInboundShipmentItemsByNextToken'].concat(params));
    };
    MWSClientBase.prototype.ListInventorySupply = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInventory', 'ListInventorySupply'].concat(params));
    };
    MWSClientBase.prototype.ListInventorySupplyByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentInventory', 'ListInventorySupplyByNextToken'].concat(params));
    };
    MWSClientBase.prototype.GetFulfillmentPreview = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'GetFulfillmentPreview'].concat(params));
    };
    MWSClientBase.prototype.CreateFulfillmentOrder = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'CreateFulfillmentOrder'].concat(params));
    };
    MWSClientBase.prototype.UpdateFulfillmentOrder = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'UpdateFulfillmentOrder'].concat(params));
    };
    MWSClientBase.prototype.GetFulfillmentOrder = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'GetFulfillmentOrder'].concat(params));
    };
    MWSClientBase.prototype.ListAllFulfillmentOrders = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'ListAllFulfillmentOrders'].concat(params));
    };
    MWSClientBase.prototype.ListAllFulfillmentOrdersByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'ListAllFulfillmentOrdersByNextToken'].concat(params));
    };
    MWSClientBase.prototype.GetPackageTrackingDetails = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'GetPackageTrackingDetails'].concat(params));
    };
    MWSClientBase.prototype.CancelFulfillmentOrder = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'CancelFulfillmentOrder'].concat(params));
    };
    MWSClientBase.prototype.ListReturnReasonCodes = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'ListReturnReasonCodes'].concat(params));
    };
    MWSClientBase.prototype.CreateFulfillmentReturn = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'CreateFulfillmentReturn'].concat(params));
    };
    MWSClientBase.prototype.GetEligibleShippingServices = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['MerchantFulfillment', 'GetEligibleShippingServices'].concat(params));
    };
    MWSClientBase.prototype.CreateShipment = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['MerchantFulfillment', 'CreateShipment'].concat(params));
    };
    MWSClientBase.prototype.GetShipment = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'GetShipment'].concat(params));
    };
    MWSClientBase.prototype.CancelShipment = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['FulfillmentOutboundShipment', 'CancelShipment'].concat(params));
    };
    MWSClientBase.prototype.ListOrders = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Orders', 'ListOrders'].concat(params));
    };
    MWSClientBase.prototype.ListOrdersByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Orders', 'ListOrdersByNextToken'].concat(params));
    };
    MWSClientBase.prototype.GetOrder = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Orders', 'GetOrder'].concat(params));
    };
    MWSClientBase.prototype.ListOrderItems = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Orders', 'ListOrderItems'].concat(params));
    };
    MWSClientBase.prototype.ListOrderItemsByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Orders', 'ListOrderItemsByNextToken'].concat(params));
    };
    MWSClientBase.prototype.ListMatchingProducts = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'ListMatchingProducts'].concat(params));
    };
    MWSClientBase.prototype.GetMatchingProduct = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetMatchingProduct'].concat(params));
    };
    MWSClientBase.prototype.GetMatchingProductForId = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetMatchingProductForId'].concat(params));
    };
    MWSClientBase.prototype.GetCompetitivePricingForSKU = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetCompetitivePricingForSKU'].concat(params));
    };
    MWSClientBase.prototype.GetCompetitivePricingForASIN = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetCompetitivePricingForASIN'].concat(params));
    };
    MWSClientBase.prototype.GetLowestOfferListingsForSKU = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetLowestOfferListingsForSKU'].concat(params));
    };
    MWSClientBase.prototype.GetLowestOfferListingsForASIN = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetLowestOfferListingsForASIN'].concat(params));
    };
    MWSClientBase.prototype.GetLowestPricedOffersForSKU = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetLowestPricedOffersForSKU'].concat(params));
    };
    MWSClientBase.prototype.GetLowestPricedOffersForASIN = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetLowestPricedOffersForASIN'].concat(params));
    };
    MWSClientBase.prototype.GetMyFeesEstimate = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetMyFeesEstimate'].concat(params));
    };
    MWSClientBase.prototype.GetMyPriceForSKU = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetMyPriceForSKU'].concat(params));
    };
    MWSClientBase.prototype.GetMyPriceForASIN = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetMyPriceForASIN'].concat(params));
    };
    MWSClientBase.prototype.GetProductCategoriesForSKU = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetProductCategoriesForSKU'].concat(params));
    };
    MWSClientBase.prototype.GetProductCategoriesForASIN = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Products', 'GetProductCategoriesForASIN'].concat(params));
    };
    MWSClientBase.prototype.GetLastUpdatedTimeForRecommendations = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Recommendations', 'GetLastUpdatedTimeForRecommendations'].concat(params));
    };
    MWSClientBase.prototype.ListRecommendations = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Recommendations', 'ListRecommendations'].concat(params));
    };
    MWSClientBase.prototype.ListRecommendationsByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Recommendations', 'ListRecommendationsByNextToken'].concat(params));
    };
    MWSClientBase.prototype.RequestReport = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'RequestReport'].concat(params));
    };
    MWSClientBase.prototype.GetReportRequestList = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportRequestList'].concat(params));
    };
    MWSClientBase.prototype.GetReportRequestListByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportRequestListByNextToken'].concat(params));
    };
    MWSClientBase.prototype.GetReportRequestCount = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportRequestCount'].concat(params));
    };
    MWSClientBase.prototype.CancelReportRequests = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'CancelReportRequests'].concat(params));
    };
    MWSClientBase.prototype.GetReportList = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportList'].concat(params));
    };
    MWSClientBase.prototype.GetReportListByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportListByNextToken'].concat(params));
    };
    MWSClientBase.prototype.GetReportCount = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportCount'].concat(params));
    };
    MWSClientBase.prototype.GetReport = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReport'].concat(params));
    };
    MWSClientBase.prototype.ManageReportSchedule = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'ManageReportSchedule'].concat(params));
    };
    MWSClientBase.prototype.GetReportScheduleList = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportScheduleList'].concat(params));
    };
    MWSClientBase.prototype.GetReportScheduleListByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportScheduleListByNextToken'].concat(params));
    };
    MWSClientBase.prototype.GetReportScheduleCount = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'GetReportScheduleCount'].concat(params));
    };
    MWSClientBase.prototype.UpdateReportAcknowledgements = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Reports', 'UpdateReportAcknowledgements'].concat(params));
    };
    MWSClientBase.prototype.ListMarketplaceParticipations = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Sellers', 'ListMarketplaceParticipations'].concat(params));
    };
    MWSClientBase.prototype.ListMarketplaceParticipationsByNextToken = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Sellers', 'ListMarketplaceParticipationsByNextToken'].concat(params));
    };
    MWSClientBase.prototype.RegisterDestination = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'RegisterDestination'].concat(params));
    };
    MWSClientBase.prototype.DeregisterDestination = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'DeregisterDestination'].concat(params));
    };
    MWSClientBase.prototype.ListRegisteredDestinations = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'ListRegisteredDestinations'].concat(params));
    };
    MWSClientBase.prototype.SendTestNotificationToDestination = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'SendTestNotificationToDestination'].concat(params));
    };
    MWSClientBase.prototype.CreateSubscription = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'CreateSubscription'].concat(params));
    };
    MWSClientBase.prototype.GetSubscription = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'GetSubscription'].concat(params));
    };
    MWSClientBase.prototype.DeleteSubscription = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'DeleteSubscription'].concat(params));
    };
    MWSClientBase.prototype.ListSubscriptions = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'ListSubscriptions'].concat(params));
    };
    MWSClientBase.prototype.UpdateSubscription = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['Subscriptions', 'UpdateSubscription'].concat(params));
    };
    MWSClientBase.prototype.ListPickupSlots = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['EasyShip', 'ListPickupSlots'].concat(params));
    };
    MWSClientBase.prototype.CreateScheduledPackage = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['EasyShip', 'CreateScheduledPackage'].concat(params));
    };
    MWSClientBase.prototype.UpdateScheduledPackages = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['EasyShip', 'UpdateScheduledPackages'].concat(params));
    };
    MWSClientBase.prototype.GetScheduledPackage = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return this._invokeApi.apply(this, ['EasyShip', 'GetScheduledPackage'].concat(params));
    };
    MWSClientBase.prototype.GetServiceStatus = function (section) {
        var params = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            params[_i - 1] = arguments[_i];
        }
        return this._invokeApi.apply(this, [section, 'GetServiceStatus'].concat(params));
    };
    return MWSClientBase;
}());
exports.MWSClientBase = MWSClientBase;
