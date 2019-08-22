var FunctionTree = require('function-tree');
var moment = require('moment');
var Credentials = require('../credentials');
var { validAmazonCredentials, fetchAmazonOrders, downloadTsvReport } = require('../nodejs/sequences');

var FT = new FunctionTree.default();

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

  step('sequence fetch order List', done => {
    FT.run(
      [
        fetchAmazonOrders,
        ({ props: { orderItems } }) => {
          console.log('-----');
          console.log(JSON.stringify(orderItems));
          console.log('-----');
          done();
        }
      ],
      {
        fetchOrderListParams: {
          CreatedAfter: moment().subtract(3, 'days').toISOString(),
          'MarketplaceId.Id': Credentials.marketplaceId
        },
        credentials: Credentials
      }
    )
  }).timeout(12000000)

  step('sequence request Report FBA Amazon Fulfilled Inventory Report', done => {
    const StartDate = moment()
    .subtract(1, 'days')
    .startOf('day')
    .toISOString();
    const EndDate = moment()
    .startOf('day')
    .toISOString();

    console.log(StartDate);
    console.log(EndDate);
    FT.run(
      [
        downloadTsvReport,
        ({ props }) => {
          console.log('-----');
          console.log(props.json);
          done();
        }
      ],
      {
        credentials: Credentials,
        requestReportParams: {
          ReportType: '_GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA_',
          StartDate,
          EndDate
        }
      }
    )
  }).timeout(12000000);
});
