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
var md5 = require('md5');
var createHmac = require('create-hmac');
var iconv = require('iconv-lite');
function base64(hex_str) {
    return btoa(hex_str.replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
        return String.fromCharCode(parseInt('0x' + p1));
    }));
}
var WebBrowserMWSClient = (function (_super) {
    __extends(WebBrowserMWSClient, _super);
    function WebBrowserMWSClient() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WebBrowserMWSClient.prototype.calcMD5 = function (content) {
        return base64(md5(content));
    };
    WebBrowserMWSClient.prototype.calcHMAC = function (content, secret) {
        var hmac = createHmac('sha256', secret);
        hmac.update(content);
        return hmac.digest('base64');
    };
    WebBrowserMWSClient.prototype.makeHttpRequest = function (method, url, headers, body, cbk) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                cbk(base_1.MWSClientBase.parseResponseError(xhr.status, xhr.getAllResponseHeaders(), xhr.responseText), base_1.MWSClientBase.parseResponse(xhr.status, xhr.getAllResponseHeaders(), xhr.responseText));
            }
        };
        for (var k in headers) {
            if (k == 'User-Agent') {
                xhr.setRequestHeader('x-amz-user-agent', headers[k]);
            }
            else {
                xhr.setRequestHeader(k, headers[k]);
            }
        }
        xhr.send(body);
    };
    WebBrowserMWSClient.prototype.encodeContent = function (content, encoding) {
        return iconv.encode(content, encoding);
    };
    WebBrowserMWSClient.prototype.getUserAgent = function () {
        return "LemayWebBrowserMWSClient/" + base_1.MWSClientBase.version() + " (Language=Javascript, Platform=" + base_1.MWSClientBase.escapeUserAgentFieldValue(navigator.appVersion) + ")";
    };
    return WebBrowserMWSClient;
}(base_1.MWSClientBase));
module.exports = WebBrowserMWSClient;
