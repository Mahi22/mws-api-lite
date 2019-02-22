"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = require("./base");
var crypto = require('crypto');
var request = require('request');
var buffer = require('buffer');
var iconv = require('iconv-lite');
var NodeJSMWSClient = (function (_super) {
    __extends(NodeJSMWSClient, _super);
    function NodeJSMWSClient() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NodeJSMWSClient.prototype.calcMD5 = function (content) {
        var hash = crypto.createHash('md5');
        hash.update(content);
        return hash.digest('base64');
    };
    NodeJSMWSClient.prototype.calcHMAC = function (content, secret) {
        var hmac = crypto.createHmac('sha256', secret);
        hmac.update(content);
        return hmac.digest('base64');
    };
    NodeJSMWSClient.prototype.makeHttpRequest = function (method, url, headers, body, cbk) {
        var options = {
            method: method,
            url: url,
            headers: headers,
            body: body
        };
        request(options, function (err, res) {
            var parsed_err = null;
            var parsed_res = null;
            if (err) {
                cbk(err, null);
            }
            else {
                cbk(base_1.MWSClientBase.parseResponseError(res.statusCode, res.headers, res.body), base_1.MWSClientBase.parseResponse(res.statusCode, res.headers, res.body));
            }
        });
    };
    NodeJSMWSClient.prototype.encodeContent = function (content, encoding) {
        return iconv.encode(content, encoding);
    };
    NodeJSMWSClient.prototype.getUserAgent = function () {
        return "LemayNodeJSMWSClient/" + base_1.MWSClientBase.version() + " (Language=Javascript; Platform=NodeJS " + process.version + ")";
    };
    return NodeJSMWSClient;
}(base_1.MWSClientBase));
exports.NodeJSMWSClient = NodeJSMWSClient;
