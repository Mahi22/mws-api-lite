[![travis-ci-status](https://travis-ci.org/lemay/mws-api-lite.svg)](https://travis-ci.org/lemay/mws-api-lite)

# Introduction 

This is a light-weight javascript library for [Amazon Marketplace Web Service(Amazon MWS)](https://developer.amazonservices.com/) APIs. 
It is said to be lite-weight because it only provides essentials to use Amazon MWS, it doesn't provide abstract API data types.

This library could run under several Javascript environments like:
* Node.js
* Web Pages(useless in most cases due to the cross domain request restriction)
* Browser Extensions(you need to add the mws endpoint urls to manifest.json to allow access)
* [Google App Scripts](https://developers.google.com/apps-script/), **not working due to GAS runtime issues and bugs at the moment**

# Nodejs

## Install

```
npm install --save @lemay/mws-api-lite
```

## Usage

There are three API signatures in this client:

```js
// For API without body data, use this
apiName(params, callback);

// For special API SubmitFeed or any API that has request body, use this one, body should be a js string, client will do the encoding
apiName(params, body, callback);

// For special API GetServiceStatus, use this, the first parameter is the section name API, with whitespace striped
// it could be "Orders", "Products", "FulfillmentOutboundShipment", "Reports" etc
apiName('Orders', callback);
```

the `callback` is a standard Node.js style callback, first parameter is `err`, and second one is `response`, always compare `err` with `null` to check error, sometimes the api call may also throw an error, so a `try catch` block is recommended.

`params` is a api request parameter object, e.g. `{"CreatedAfter": '2017-10-20T00:00:00Z', "MarketplaceId.Id.1": MWSClient.getMarketplaceId('US')}`, when there are no request parameters, use a blank object `{}`.

Since marketplace id is used all the time in MWS APIs, we provide a special class method `getMarketplaceId()`, it takes a country code like `CN`, `US`, `JP`, `FR` etc, and will return the corresponding Amazon marketplace id, see examples below.

## Examples

Create and initialize an mws client instance:
```javascript
const MWSClient=require('@lemay/mws-api-lite').NodeJSMWSClient;
const client_auth = new MWSClient('US', '<your-access-id>', '<your-mws-access-secret>', '<your-seller-id>', '<your-mws-auth-token-optional>');
```

Get Orders Service Status:
```javascript
client_auth.GetServiceStatus('Orders', function(err, res){
  if(err){
    console.log(err);
  } else {
    console.log(res);
  }
});
```

List recent orders:
```javascript
client_auth.ListOrders({"CreatedAfter": '2017-10-20T00:00:00Z', "MarketplaceId.Id.1": MWSClient.getMarketplaceId('US')}, function(err, res){
  if(err){
    console.log(err);
  } else {
    console.log(res.body);
  }
});
```

Submit an xml price feed:
```javascript
var xml=`
<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>SOME-ID</MerchantIdentifier>
  </Header>
  <MessageType>Price</MessageType>
  <Message>
    <MessageID>1</MessageID>
      <Price>
        <SKU>SKU-OH7O</SKU>
        <StandardPrice currency="USD">13.80</StandardPrice>
      </Price>
  </Message>
</AmazonEnvelope>
`;

client_auth.SubmitFeed({FeedType: '_POST_PRODUCT_PRICING_DATA_', "MarketplaceIdList.Id.1": MWSClient.getMarketplaceId('US'), }, xml, function(err, res){
  if(err){
    console.log(err);
  } else {
    console.log(res);
  }
});
```

Submit a flat file(tsv) feed:
```javascript
const fs=require('fs');
const path=require('path');
const tsv=fs.readFileSync(path.join(__dirname, 'data.tsv'), {encoding: 'utf8'});

client_auth.SubmitFeed({FeedType: '_POST_FLAT_FILE_LISTINGS_DATA_', "MarketplaceIdList.Id.1": MWSClient.getMarketplaceId('US')}, tsv, function(err, res){
  if(err){
    console.log(err);
  } else {
    console.log(res.body);
  }
});
```

# Browser or Browser extensions

Use `<script>` tag with jsDelivr CDN: 

```html
<script src="https://cdn.jsdelivr.net/npm/@lemay/mws-api-lite@latest/browser/bundle.min.js"></script>
<script>
var client = new WebBrowserMWSClient(...);
</script>
```

Or download the pre-built version from [jsDelivr.com](https://cdn.jsdelivr.net/npm/@lemay/mws-api-lite@latest/browser/bundle.min.js),
then put it into your web page(will not work due to cross domain request restriction) or extension.

# Google Apps Script(GAS)

**GAS version is not working due to some GAS runtime issues and bugs.**

```js
var client = new GoogleAppsScriptMWSClient(...);
```

Download the pre-built version from [jsDelivr.com](https://cdn.jsdelivr.net/npm/@lemay/mws-api-lite@latest/google-apps-script/bundle.min.js).
