import { MWSClientBase } from './base';

const md5 = require('md5');
const createHmac = require('create-hmac');
const iconv=require('iconv-lite');

function base64(hex_str){
  return btoa(hex_str.replace(/%([0-9A-F]{2})/g,
    function toSolidBytes(match, p1) {
      return String.fromCharCode(parseInt('0x' + p1));
  }));
}

class WebBrowserMWSClient extends MWSClientBase{
  calcMD5(content:string): string{
    return base64(md5(content));
  }

  calcHMAC(content:string, secret: string): string {
    var hmac = createHmac('sha256', secret);
    hmac.update(content);
    return hmac.digest('base64');
  }

  makeHttpRequest(method, url, headers, body, cbk): void {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onreadystatechange=function(){
      if(xhr.readyState === XMLHttpRequest.DONE){
        cbk(MWSClientBase.parseResponseError(xhr.status, xhr.getAllResponseHeaders(), xhr.responseText), MWSClientBase.parseResponse(xhr.status, xhr.getAllResponseHeaders(), xhr.responseText));
      }
    }

    for(let k in headers) {
      if(k=='User-Agent'){
        // Browsers typicall doesn't allow override User-Agent header
        xhr.setRequestHeader('x-amz-user-agent', headers[k]);
      } else {
        xhr.setRequestHeader(k, headers[k]);
      }
    }

    xhr.send(body);
  }

  encodeContent(content: string, encoding: string){
    return iconv.encode(content, encoding);
  }

  getUserAgent(){
    return "LemayWebBrowserMWSClient/"+MWSClientBase.version()+" (Language=Javascript, Platform="+MWSClientBase.escapeUserAgentFieldValue(navigator.appVersion)+")";
  }
}


declare global{
  interface Window{
    WebBrowserMWSClient: any;
  }
}
module.exports=WebBrowserMWSClient;
