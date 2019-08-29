var FunctionTree = require('function-tree').FunctionTree;
// var Devtools = require('function-tree/devtools').Devtools;
var moment = require('moment');
var Credentials = require('../credentials');
var { validAmazonCredentials, fetchAmazonOrders, downloadTsvReport } = require('../nodejs/sequences');

var FT = new FunctionTree();

// var devTools = new Devtools({
//   // Set url of remote debugger
//   host: 'localhost:8590',

//   // By default debugger tries to reconnect when it is not active
//   reconnect: true,

//   // By default devtools connects to "ws://". This option should be set to true
//   // when browser operates on https. Follow debugger instructions for
//   // further configuration
//   https: false
// });

// devTools.add(FT);

describe('Sequence', () => {
  step('sequence validate amazon marketplace', done => {
    FT.run(
      [
        validAmazonCredentials,
        ({ props }) => {
          console.log(props);
          done();
        }
      ],
      {
        credentials: Credentials
      }
    ).catch(console.error);
  });

/**
 * {
        CreatedAfter: moment()
          .subtract({ days })
          .toISOString(),
        'MarketplaceId.Id': credentials.marketplaceId
      }
 */

  // step('sequence fetch order List', done => {
  //   FT.run(
  //     [
  //       fetchAmazonOrders,
  //       ({ props: { orderItems } }) => {
  //         console.log('-----');
  //         console.log(JSON.stringify(orderItems));
  //         console.log('-----');
  //         done();
  //       }
  //     ],
  //     {
  //       fetchOrderListParams: {
  //         CreatedAfter: moment().subtract(3, 'days').toISOString(),
  //         'MarketplaceId.Id': Credentials.marketplaceId
  //       },
  //       credentials: Credentials
  //     }
  //   )
  // }).timeout(12000000)

  step('sequence request Report FBA Amazon Fulfilled Inventory Report', done => {
    const StartDate = moment()
      .subtract(1, 'days')
      .startOf('day')
      .toISOString();
    const EndDate = moment()
      .startOf('day')
      .toISOString();

    FT.run(
      [
        downloadTsvReport,
        ({ props }) => {
          console.log('-----');
          console.log(JSON.stringify(props.json));
          done();
        }
      ],
      {
        credentials: Credentials,
        requestReportParams: {
          ReportType: '_GET_MERCHANT_LISTINGS_ALL_DATA_',
          StartDate,
          EndDate
        },
        tsvSeperator: '\n'
      }
    )
  }).timeout(12000000);

  // step('sequence request Report XML RETURNS DATA Report', done => {
  //   const StartDate = moment()
  //     .subtract(30, 'days')
  //     .startOf('day')
  //     .toISOString();

  //   FT.run(
  //     [
  //       downloadTsvReport,
  //       ({ props }) => {
  //         console.log('-----');
  //         console.log(props.json);
  //         done();
  //       }
  //     ],
  //     {
  //       credentials: Credentials,
  //       requestReportParams: {
  //         ReportType: '_GET_XML_RETURNS_DATA_BY_RETURN_DATE_',
  //         StartDate
  //       }
  //     }
  //   )
  // }).timeout(12000000);
});
