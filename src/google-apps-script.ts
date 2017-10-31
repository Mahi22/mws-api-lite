import { MWSClientBase } from './base';

const iconv=require('iconv-lite');

declare var Utilities: any;
declare var UrlFetchApp: any;

class GoogleAppsScriptMWSClient extends MWSClientBase{
  calcMD5(content:string): string{
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, content);
    return Utilities.base64Encode(digest);
  }

  calcHMAC(content:string, secret: string): string{
    var digest = Utilities.computeHmacSha256Signature(content, secret);
    return Utilities.base64Encode(digest);
  }

  makeHttpRequest(method, url, headers, body, cbk): void{
    var options={
      method: method.toLowerCase(),
      contentType: headers['Content-Type'],
      headers: headers,
      payload: body
    };

    try{
      var res = UrlFetchApp.fetch(url, options);
      cbk(MWSClientBase.parseResponseError(res.getResponseCode(), res.getAllHeaders(), res.getContentText()), MWSClientBase.parseResponse(res.getResponseCode(), res.getAllHeaders(), res.getContentText()));
    } catch(e){
      cbk(e, null);
    }
  }

  encodeContent(content: string, encoding: string){
    return iconv.encode(content, encoding);
  }

  getUserAgent(){
    return "LemayGoogleAppsScriptClient/"+MWSClientBase.version()+" (Language=Javascript)";
  }
}

module.exports=GoogleAppsScriptMWSClient;
