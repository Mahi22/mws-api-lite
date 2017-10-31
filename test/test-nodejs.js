const fs=require('fs');
const path=require('path');
const http=require('http');
const url=require('url');
const qs=require('querystring');
const assert=require('assert');
const iconv=require('iconv-lite');
const crypto = require('crypto');
const MWSClient=require('../nodejs/nodejs').NodeJSMWSClient;

const now=new Date();
const MWS_ACCESS_ID='mws-access-id';
const MWS_ACCESS_SECRET='mws-access-secret';
const MWS_SELLER_ID='mws-seller-id';
const MWS_AUTH_TOKEN='mws-auth-token';
const RESPONSE_XML=fs.readFileSync(path.join(__dirname, './response.xml'), {encoding: 'utf8'});
const PRICE_XML=fs.readFileSync(path.join(__dirname, './price.xml'), {encoding: 'utf8'});
const TSV_US=" ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ";
const TSV_JP="abc123ｴｵｶｷﾐﾑﾒﾓﾔ眸睇睚睨睫睛②③④⑤⑥⑦⑧ひびぴふぶぷへ♭♪†‡¶";
const TSV_CN="abc123你好世界©®™";

function writeHeaders(res){
  res.setHeader('x-mws-request-id', 'requestid');
  res.setHeader('x-mws-response-context', 'requestcontext');
  res.setHeader('x-mws-quota-max', '30');
  res.setHeader('x-mws-quota-remaining', '20');
  res.setHeader('x-mws-quota-resetsOn', now.toISOString());
  res.setHeader('x-mws-timestamp', now.toISOString());
}

function writeRes(res){
  res.setHeader('Content-Type', 'text/xml');
  res.statusCode=200;
  res.end(RESPONSE_XML);
}

function writeError(res, e){
  res.setHeader('Content-Type', 'text/plain');
  res.statusCode=500;
  res.end(e.message);
}

function extract_encoding_from_header(content_type){
  content_type=content_type.toLowerCase();
  if(content_type.indexOf('iso-8859-1')>-1){
    return 'iso-8859-1';
  } else if(content_type.indexOf('shift_jis')>-1){
    return 'shift_jis';
  } else if(content_type.indexOf('utf16')>-1){
    return 'utf16';
  } else {
    return 'utf8';
  }
}

// Setup test double for mws service
const server = http.createServer((req, res) => {
  var body=Buffer.alloc(0, 0);
  req.on('data', function(chunk){
    body=Buffer.concat([body, chunk]);
  });
  req.on('end', function(){
    var headers=req.headers;
    var params=qs.parse(url.parse(req.url).query);
    try{
      writeHeaders(res);
      assert.strictEqual(params.AWSAccessKeyId, MWS_ACCESS_ID);
      assert.strictEqual(params.SellerId, MWS_SELLER_ID);
      assert.strictEqual(params.MWSAuthToken, MWS_AUTH_TOKEN);
      assert.strictEqual(params.SignatureMethod, 'HmacSHA256');
      assert.strictEqual(params.SignatureVersion, '2');
      assert.ok(params.Signature.length>0, 'Signature is valid!');
      assert.ok(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z/.test(params.Timestamp), 'Timestamp is valid');
      assert.ok(params.Version && /\d{4}-\d{2}-\d{2}/.test(params.Version), 'Version is valid');
      if(params['Action']=='SubmitFeed'){
        assert.ok(/_POST_(.*)_/.test(params.FeedType), "FeedType is valid!");
        // verify content md5
        var hash = crypto.createHash('md5');
        hash.update(body);
        var md5=hash.digest('base64');
        assert.strictEqual(params.ContentMD5Value, md5, 'ContentMD5 is right!');
        // verify content
        var content=iconv.decode(body, extract_encoding_from_header(headers['content-type']));
        if(params.FeedType=='_POST_PRODUCT_PRICING_DATA_'){
          assert.strictEqual(content, PRICE_XML, "XML feed content is right!");
        } else {
          if(params['MarketplaceIdList.Id.1']==MWSClient.getMarketplaceId('US')){
            assert.strictEqual(content, TSV_US, "TSV(US) feed content is right!");
          } else if(params['MarketplaceIdList.Id.1']==MWSClient.getMarketplaceId('JP')){
            assert.strictEqual(content, TSV_JP, "TSV(JP) feed content is right!");
          } else if(params['MarketplaceIdList.Id.1']==MWSClient.getMarketplaceId('CN')){
            assert.strictEqual(content, TSV_CN, "TSV(CN) feed content is right!");
          }
        }
      }
      writeRes(res);
    } catch(e) {
      writeError(res, e);
    }
  });
});

const client_us = new MWSClient('US', MWS_ACCESS_ID, MWS_ACCESS_SECRET, MWS_SELLER_ID, MWS_AUTH_TOKEN);
const client_cn = new MWSClient('CN', MWS_ACCESS_ID, MWS_ACCESS_SECRET, MWS_SELLER_ID, MWS_AUTH_TOKEN);
const client_jp = new MWSClient('JP', MWS_ACCESS_ID, MWS_ACCESS_SECRET, MWS_SELLER_ID, MWS_AUTH_TOKEN);

// setup to use local test server
client_us.protocol='http';
client_us.endpoint='localhost:8000';
client_cn.protocol='http';
client_cn.endpoint='localhost:8000';
client_jp.protocol='http';
client_jp.endpoint='localhost:8000';

before(function(done){
  server.listen(8000, done);
});

describe('API Call Without Body Data', function() {
  it('should send the right request without parameters', function(done) {
    client_us.ListOrders(function(err, res){
      done(err?new Error(err.body):null);
    });
  });
});

describe('API Call With Body Data', function() {
  it('should send xml feed', function(done) {
    client_us.SubmitFeed({ FeedType: '_POST_PRODUCT_PRICING_DATA_', "MarketplaceIdList.Id.1": MWSClient.getMarketplaceId('US'), }, PRICE_XML, function(err, res){
      done(err?new Error(err.body):null);
    });
  });
  it('should send tsv feed for US marketplace', function(done) {
    client_us.SubmitFeed({ FeedType: '_POST_FLAT_FILE_LISTINGS_DATA_', "MarketplaceIdList.Id.1": MWSClient.getMarketplaceId('US'), }, TSV_US, function(err, res){
      done(err?new Error(err.body):null);
    });
  });
  it('should send tsv feed for CN marketplace', function(done) {
    client_cn.SubmitFeed({ FeedType: '_POST_FLAT_FILE_LISTINGS_DATA_', "MarketplaceIdList.Id.1": MWSClient.getMarketplaceId('CN'), }, TSV_CN, function(err, res){
      done(err?new Error(err.body):null);
    });
  });
  it('should send tsv feed for JP marketplace', function(done) {
    client_jp.SubmitFeed({ FeedType: '_POST_FLAT_FILE_LISTINGS_DATA_', "MarketplaceIdList.Id.1": MWSClient.getMarketplaceId('JP'), }, TSV_JP, function(err, res){
      done(err?new Error(err.body):null);
    });
  });
});

after(function(done){
  server.close(done);
});
