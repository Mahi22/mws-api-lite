const mws_info=require('@lemay/mws-api-info');
const xmljs=require('xml-js');

const api_mapping={
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

abstract class MWSClientBase{
  marketplace_info: any;
  useragent: string;

  marketplace: string|null;
  marketplace_id: string|null;
  protocol: string|null;
  endpoint: string|null;
  site_url: string|null;

  access_key: string|null;
  access_secret: string|null;
  seller_id: string|null;
  auth_token: string|null;

  static version(){
    return "MWS_CLIENT_VERSION";
  }

  static escapeUserAgentFieldValue(v: string): string{
    /**
     * Escape special chars in user agent field value
     * @see http://docs.developer.amazonservices.com/en_US/dev_guide/DG_UserAgentHeader.html
     */
    return v.replace(/[\\\/();=]/g, function(m){
      return '\\'+m;
    });
  }

  static getMarketplaceId(country_code: string): string{
    country_code=country_code.toUpperCase();
    if(!mws_info[country_code])
      throw new Error("Invalid country code: "+country_code);
    return mws_info[country_code]['id'];
  }

  /**
   * Return null when response code is 20x, for others, return an error object with all returned data inside it
   */
  static parseResponseError(status, headers, body){
    status=parseInt(status);
    if(status>199 && status<300){
      // verify Content MD5
      if(headers['Content-MD5']){
        throw new Error("Reponse content MD5 checksum not match!");
      }
      return null;
    } else {
      var err={
        status: status,
        headers: headers,
        quota: {},
        body: body,
      };

      if(headers['x-mws-quota-max'])
        err['quota']['max']=parseInt(headers['x-mws-quota-max']);
      if(headers['x-mws-quota-remaining'])
        err['quota']['remaining']=parseInt(headers['x-mws-quota-remaining']);
      if(headers['x-mws-quota-resetsOn'] || headers['x-mws-quota-resetson'])
        err['quota']['resetsOn']=new Date(headers['x-mws-quota-resetsOn'] || headers['x-mws-quota-resetson']);

      if(headers['x-mws-request-id'])
        err['request-id']=headers['x-mws-request-id'];
      if(headers['x-mws-response-context'])
        err['response-context']=headers['x-mws-response-context'];
      if(headers['x-mws-timestamp'])
        err['timestamp']=new Date(headers['x-mws-timestamp']);

      //detailed error message in response body
      if(headers['Content-Type']=='text/xml' || headers['content-type']=='text/xml'){
        //parse xml data
        err['data']=xmljs.xml2js(body);
      } else {
        err['data']=body;
      }

      return err;
    }
  }

  /**
    * only return a data object when response code is 20x, when not, just return null
    */
  static parseResponse(status, headers, body){
    status=parseInt(status);
    if(status>199 && status<300){
      var res={
        status: status,
        headers: headers,
        body: body,
        quota: {}
      };

      if(headers['x-mws-quota-max'])
        res['quota']['max']=parseInt(headers['x-mws-quota-max']);
      if(headers['x-mws-quota-remaining'])
        res['quota']['remaining']=parseInt(headers['x-mws-quota-remaining']);
      if(headers['x-mws-quota-resetsOn'] || headers['x-mws-quota-resetson'])
        res['quota']['resetsOn']=new Date(headers['x-mws-quota-resetsOn'] || headers['x-mws-quota-resetson']);
      if(headers['x-mws-request-id'])
        res['request-id']=headers['x-mws-request-id'];
      if(headers['x-mws-response-context'])
        res['response-context']=headers['x-mws-response-context'];
      if(headers['x-mws-timestamp'])
        res['timestamp']=new Date(headers['x-mws-timestamp']);

      if(headers['Content-Type']=='text/xml' || headers['content-type']=='text/xml'){
        //parse xml data
        res['data']=xmljs.xml2js(body, {compact: true});
      } else {
        res['data']=body;
      }
      return res;
    } else {
      return null;
    }
  }

  getMarketplaceInfo(country_code: string){
    if(!mws_info[country_code])
      throw new Error("Invalid country code: "+country_code);
    return mws_info[country_code];
  }

  urlEncode(str: string): string {
    return encodeURIComponent(str).replace(/[!*()']/g, function(c){
      return '%'+c.charCodeAt(0).toString(16);
    });
  }

  createQueryString(params){
    var query_parts=[];
    var keys=Object.keys(params);
    for(let k of keys){
      query_parts.push(k+'='+this.urlEncode(params[k]));
    }
    var queryString=query_parts.join('&');
    return queryString;
  }

  abstract calcMD5(content:string): string;
  abstract calcHMAC(content:string, secret: string): string;
  abstract makeHttpRequest(method, url, headers, content_type, body): void;
  abstract getUserAgent(): string;
  abstract encodeContent(content: string, encoding: string): any;

  calcSignature(endpoint, path, params): string{
      var str='';
      var keys=Object.keys(params);
      // sort by key
      keys = keys.sort();
      for(var i=0;i<keys.length;i++) {
          if(i != 0) str += '&';
          str += keys[i] + '=' + this.urlEncode(params[keys[i]]);
      }
      var stringToSign = "POST\n" + endpoint + "\n" + path + "\n" + str;
      var hmac=this.calcHMAC(stringToSign, this.access_secret);
      return hmac;
  }

  constructor(marketplace, access_key, access_secret, seller_id, auth_token=''){
    var marketplace_info=this.getMarketplaceInfo(marketplace);
    this.useragent=null;

    this.marketplace=marketplace;
    this.marketplace_id=marketplace_info['id'];
    this.protocol='https';
    this.endpoint=marketplace_info['mws_endpoint'];
    this.site_url=marketplace_info['site'];

    this.access_key=access_key;
    this.access_secret=access_secret;
    this.seller_id=seller_id;
    this.auth_token=auth_token;
  }

  callApi(...args: any[]){
    var section=null;
    var version=null;
    var action=null;
    var params={};
    var feed=null;
    var cbk=null;

    let argc=arguments.length;
    if(argc<4){
      throw new Error("Invalid paramters, at least 4 parameter needed!");
    }

    section=arguments[0];
    version=arguments[1];
    action=arguments[2];
    if(argc==4){
      cbk=arguments[3];
    } else if(argc==5){
      params=arguments[3];
      cbk=arguments[4];
    } else{
      params=arguments[3];
      feed=arguments[4];
      cbk=arguments[5];
    }

    var headers={
      "User-Agent": this.getUserAgent(),
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
    };
    var requiredParams={
      AWSAccessKeyId: this.access_key,
      Action: action,
      SellerId: this.seller_id,
      SignatureMethod: 'HmacSHA256',
      SignatureVersion: '2',
      Timestamp: new Date().toISOString(),
      Version: version,
    };
    // merge api specific parameters supplied by user
    for(let k in params){
      requiredParams[k]=params[k];
    }

    if(this.auth_token){
      requiredParams['MWSAuthToken']=this.auth_token;
    }
    if(action=='SubmitFeed'){
      if(params['FeedType'].indexOf('FLAT_FILE')>-1){
        // flat file feed
        if(this.marketplace=='CN') {
          headers['Content-Type']='text/tab-separated-values; charset=utf-8';
          feed=this.encodeContent(feed, 'utf8');
        }
        else if (this.marketplace=='JP') {
          headers['Content-Type']='text/tab-separated-values; charset=Shift_JIS';
          feed=this.encodeContent(feed, 'shift_jis');
        } else {
          headers['Content-Type']='text/tab-separated-values; charset=iso-8859-1';
          feed=this.encodeContent(feed, 'iso-8859-1');
        }
      } else {
        headers['Content-Type']='text/xml';
        feed=this.encodeContent(feed, 'utf8');
      }

      requiredParams['ContentMD5Value']=this.calcMD5(feed);
    }
    requiredParams['Signature']=this.calcSignature(this.endpoint, '/'+section+'/'+version, requiredParams);
    var queryString=this.createQueryString(requiredParams);

    var url=this.protocol+'://'+this.endpoint+'/'+section+'/'+version;
    if(queryString)
      url=url+'?'+queryString;

    if(action=='SubmitFeed'){
      return this.makeHttpRequest('POST', url, headers, feed, cbk);
    } else {
      return this.makeHttpRequest('POST', url, headers, null, cbk);
    }
  }

  // A generic api call proxy
  _invokeApi(section, name, ...params){
    if(!api_mapping[section])
      throw new Error(`Invalid MWS API Section name: ${section}!`);
    return this.callApi(section, api_mapping[section].version, name, ...params);
  }

  // Feeds API Methods
  SubmitFeed(...params){
    return this._invokeApi('Feeds', 'SubmitFeed', ...params);
  }

  GetFeedSubmissionList(...params){
    return this._invokeApi('Feeds', 'GetFeedSubmissionList', ...params);
  }

  GetFeedSubmissionListByNextToken(...params){
    return this._invokeApi('Feeds', 'GetFeedSubmissionListByNextToken', ...params);
  }

  GetFeedSubmissionCount(...params){
    return this._invokeApi('Feeds', 'GetFeedSubmissionCount', ...params);
  }

  CancelFeedSubmissions(...params){
    return this._invokeApi('Feeds', 'CancelFeedSubmissions', ...params);
  }

  GetFeedSubmissionResult(...params){
    return this._invokeApi('Feeds', 'GetFeedSubmissionResult', ...params);
  }

  // Finance API Methods
  ListFinancialEventGroups(...params){
    return this._invokeApi('Finances', 'ListFinancialEventGroups', ...params);
  }

  ListFinancialEventGroupsByNextToken(...params){
    return this._invokeApi('Finances', 'ListFinancialEventGroupsByNextToken', ...params);
  }

  ListFinancialEvents(...params){
    return this._invokeApi('Finances', 'ListFinancialEvents', ...params);
  }

  ListFinancialEventsByNextToken(...params){
    return this._invokeApi('Finances', 'ListFinancialEventsByNextToken', ...params);
  }

  // Fulfillment Inbound Shipment API Methods
  GetInboundGuidanceForSKU(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetInboundGuidanceForSKU', ...params);
  }

  GetInboundGuidanceForASIN(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetInboundGuidanceForASIN', ...params);
  }

  CreateInboundShipmentPlan(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'CreateInboundShipmentPlan', ...params);
  }

  CreateInboundShipment(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'CreateInboundShipment', ...params);
  }

  UpdateInboundShipment(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'UpdateInboundShipment', ...params);
  }

  GetPreorderInfo(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetPreorderInfo', ...params);
  }

  ConfirmPreorder(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'ConfirmPreorder', ...params);
  }

  GetPrepInstructionsForSKU(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetPrepInstructionsForSKU', ...params);
  }

  GetPrepInstructionsForASIN(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetPrepInstructionsForASIN', ...params);
  }

  PutTransportContent(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'PutTransportContent', ...params);
  }

  EstimateTransportRequest(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'EstimateTransportRequest', ...params);
  }

  GetTransportContent(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetTransportContent', ...params);
  }

  ConfirmTransportRequest(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'ConfirmTransportRequest', ...params);
  }

  VoidTransportRequest(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'VoidTransportRequest', ...params);
  }

  GetPackageLabels(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetPackageLabels', ...params);
  }

  GetUniquePackageLabels(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetUniquePackageLabels', ...params);
  }

  GetPalletLabels(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetPalletLabels', ...params);
  }

  GetBillOfLading(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'GetBillOfLading', ...params);
  }

  ListInboundShipments(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'ListInboundShipments', ...params);
  }

  ListInboundShipmentsByNextToken(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'ListInboundShipmentsByNextToken', ...params);
  }

  ListInboundShipmentItems(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'ListInboundShipmentItems', ...params);
  }

  ListInboundShipmentItemsByNextToken(...params){
    return this._invokeApi('FulfillmentInboundShipment', 'ListInboundShipmentItemsByNextToken', ...params);
  }

  // Fulfillment Inventory API Methods
  ListInventorySupply(...params){
    return this._invokeApi('FulfillmentInventory', 'ListInventorySupply', ...params);
  }

  ListInventorySupplyByNextToken(...params){
    return this._invokeApi('FulfillmentInventory', 'ListInventorySupplyByNextToken', ...params);
  }

  // Fulfillment Outbound Shipment
  GetFulfillmentPreview(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'GetFulfillmentPreview', ...params);
  }

  CreateFulfillmentOrder(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'CreateFulfillmentOrder', ...params);
  }

  UpdateFulfillmentOrder(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'UpdateFulfillmentOrder', ...params);
  }

  GetFulfillmentOrder(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'GetFulfillmentOrder', ...params);
  }

  ListAllFulfillmentOrders(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'ListAllFulfillmentOrders', ...params);
  }

  ListAllFulfillmentOrdersByNextToken(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'ListAllFulfillmentOrdersByNextToken', ...params);
  }

  GetPackageTrackingDetails(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'GetPackageTrackingDetails', ...params);
  }

  CancelFulfillmentOrder(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'CancelFulfillmentOrder', ...params);
  }

  ListReturnReasonCodes(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'ListReturnReasonCodes', ...params);
  }

  CreateFulfillmentReturn(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'CreateFulfillmentReturn', ...params);
  }

  // Merchant Fulfillment API Methods
  GetEligibleShippingServices(...params){
    return this._invokeApi('MerchantFulfillment', 'GetEligibleShippingServices', ...params);
  }

  CreateShipment(...params){
    return this._invokeApi('MerchantFulfillment', 'CreateShipment', ...params);
  }

  GetShipment(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'GetShipment', ...params);
  }

  CancelShipment(...params){
    return this._invokeApi('FulfillmentOutboundShipment', 'CancelShipment', ...params);
  }

  // Orders API Methods
  ListOrders(...params){
    return this._invokeApi('Orders', 'ListOrders', ...params);
  }

  ListOrdersByNextToken(...params){
    return this._invokeApi('Orders', 'ListOrdersByNextToken', ...params);
  }

  GetOrder(...params){
    return this._invokeApi('Orders', 'GetOrder', ...params);
  }

  ListOrderItems(...params){
    return this._invokeApi('Orders', 'ListOrderItems', ...params);
  }

  ListOrderItemsByNextToken(...params){
    return this._invokeApi('Orders', 'ListOrderItemsByNextToken', ...params);
  }

  // Products API Methods
  ListMatchingProducts(...params){
    return this._invokeApi('Products', 'ListMatchingProducts', ...params);
  }

  GetMatchingProduct(...params){
    return this._invokeApi('Products', 'GetMatchingProduct', ...params);
  }

  GetMatchingProductForId(...params){
    return this._invokeApi('Products', 'GetMatchingProductForId', ...params);
  }

  GetCompetitivePricingForSKU(...params){
    return this._invokeApi('Products', 'GetCompetitivePricingForSKU', ...params);
  }

  GetCompetitivePricingForASIN(...params){
    return this._invokeApi('Products', 'GetCompetitivePricingForASIN', ...params);
  }

  GetLowestOfferListingsForSKU(...params){
    return this._invokeApi('Products', 'GetLowestOfferListingsForSKU', ...params);
  }

  GetLowestOfferListingsForASIN(...params){
    return this._invokeApi('Products', 'GetLowestOfferListingsForASIN', ...params);
  }

  GetLowestPricedOffersForSKU(...params){
    return this._invokeApi('Products', 'GetLowestPricedOffersForSKU', ...params);
  }

  GetLowestPricedOffersForASIN(...params){
    return this._invokeApi('Products', 'GetLowestPricedOffersForASIN', ...params);
  }

  GetMyFeesEstimate(...params){
    return this._invokeApi('Products', 'GetMyFeesEstimate', ...params);
  }

  GetMyPriceForSKU(...params){
    return this._invokeApi('Products', 'GetMyPriceForSKU', ...params);
  }

  GetMyPriceForASIN(...params){
    return this._invokeApi('Products', 'GetMyPriceForASIN', ...params);
  }

  GetProductCategoriesForSKU(...params){
    return this._invokeApi('Products', 'GetProductCategoriesForSKU', ...params);
  }

  GetProductCategoriesForASIN(...params){
    return this._invokeApi('Products', 'GetProductCategoriesForASIN', ...params);
  }

  // Recommendations API Methods
  GetLastUpdatedTimeForRecommendations(...params){
    return this._invokeApi('Recommendations', 'GetLastUpdatedTimeForRecommendations', ...params);
  }
  
  ListRecommendations(...params){
    return this._invokeApi('Recommendations', 'ListRecommendations', ...params);
  }
  
  ListRecommendationsByNextToken(...params){
    return this._invokeApi('Recommendations', 'ListRecommendationsByNextToken', ...params);
  }

  // Reports API Methods
  RequestReport(...params){
    return this._invokeApi('Reports', 'RequestReport', ...params);
  }

  GetReportRequestList(...params){
    return this._invokeApi('Reports', 'GetReportRequestList', ...params);
  }

  GetReportRequestListByNextToken(...params){
    return this._invokeApi('Reports', 'GetReportRequestListByNextToken', ...params);
  }

  GetReportRequestCount(...params){
    return this._invokeApi('Reports', 'GetReportRequestCount', ...params);
  }

  CancelReportRequests(...params){
    return this._invokeApi('Reports', 'CancelReportRequests', ...params);
  }

  GetReportList(...params){
    return this._invokeApi('Reports', 'GetReportList', ...params);
  }

  GetReportListByNextToken(...params){
    return this._invokeApi('Reports', 'GetReportListByNextToken', ...params);
  }

  GetReportCount(...params){
    return this._invokeApi('Reports', 'GetReportCount', ...params);
  }

  GetReport(...params){
    return this._invokeApi('Reports', 'GetReport', ...params);
  }

  ManageReportSchedule(...params){
    return this._invokeApi('Reports', 'ManageReportSchedule', ...params);
  }

  GetReportScheduleList(...params){
    return this._invokeApi('Reports', 'GetReportScheduleList', ...params);
  }

  GetReportScheduleListByNextToken(...params){
    return this._invokeApi('Reports', 'GetReportScheduleListByNextToken', ...params);
  }

  GetReportScheduleCount(...params){
    return this._invokeApi('Reports', 'GetReportScheduleCount', ...params);
  }

  UpdateReportAcknowledgements(...params){
    return this._invokeApi('Reports', 'UpdateReportAcknowledgements', ...params);
  }

  // Sellers API Methods
  ListMarketplaceParticipations(...params){
    return this._invokeApi('Sellers', 'ListMarketplaceParticipations', ...params);
  }

  ListMarketplaceParticipationsByNextToken(...params){
    return this._invokeApi('Sellers', 'ListMarketplaceParticipationsByNextToken', ...params);
  }

  // Subscription API Methods
  RegisterDestination(...params){
    return this._invokeApi('Subscriptions', 'RegisterDestination', ...params);
  }

  DeregisterDestination(...params){
    return this._invokeApi('Subscriptions', 'DeregisterDestination', ...params);
  }

  ListRegisteredDestinations(...params){
    return this._invokeApi('Subscriptions', 'ListRegisteredDestinations', ...params);
  }

  SendTestNotificationToDestination(...params){
    return this._invokeApi('Subscriptions', 'SendTestNotificationToDestination', ...params);
  }

  CreateSubscription(...params){
    return this._invokeApi('Subscriptions', 'CreateSubscription', ...params);
  }

  GetSubscription(...params){
    return this._invokeApi('Subscriptions', 'GetSubscription', ...params);
  }

  DeleteSubscription(...params){
    return this._invokeApi('Subscriptions', 'DeleteSubscription', ...params);
  }

  ListSubscriptions(...params){
    return this._invokeApi('Subscriptions', 'ListSubscriptions', ...params);
  }

  UpdateSubscription(...params){
    return this._invokeApi('Subscriptions', 'UpdateSubscription', ...params);
  }

  // EasyShip API Methods
  ListPickupSlots(...params) {
    return this._invokeApi('EasyShip', 'ListPickupSlots', ...params);
  }

  CreateScheduledPackage(...params) {
    return this._invokeApi('EasyShip', 'CreateScheduledPackage', ...params);
  }

  UpdateScheduledPackages(...params) {
    return this._invokeApi('EasyShip', 'UpdateScheduledPackages', ...params);
  }

  GetScheduledPackage(...params) {
    return this._invokeApi('EasyShip', 'GetScheduledPackage', ...params);
  }

  // Get API Service Status Methods
  GetServiceStatus(section, ...params){
    return this._invokeApi(section, 'GetServiceStatus', ...params);
  }
}

export { MWSClientBase };
