import { MWSClientBase } from './base';

const crypto = require('crypto');
const request = require('request');
const buffer = require('buffer');
const iconv = require('iconv-lite');

class NodeJSMWSClient extends MWSClientBase{
  calcMD5(content): string{
    var hash = crypto.createHash('md5');
    hash.update(content);
    return hash.digest('base64');
  }

  calcHMAC(content, secret): string{
    var hmac = crypto.createHmac('sha256', secret);
    hmac.update(content);
    return hmac.digest('base64');
  }

  makeHttpRequest(method, url, headers, body, cbk): void{
    var options={
      method: method,
      url: url,
      headers: headers,
      body: body
    };
    return request(options, function(err, res){
      var parsed_err=null;
      var parsed_res=null;
      if(err){
        cbk(err, null);
      } else {
        cbk(MWSClientBase.parseResponseError(res.statusCode, res.headers, res.body), MWSClientBase.parseResponse(res.statusCode, res.headers, res.body));
      }
    });
  }

  encodeContent(content: string, encoding: string){
    return iconv.encode(content, encoding);
  }

  getUserAgent(){
    return "LemayNodeJSMWSClient/"+MWSClientBase.version()+" (Language=Javascript; Platform=NodeJS "+process.version+")";
  }
}

exports.NodeJSMWSClient=NodeJSMWSClient;
