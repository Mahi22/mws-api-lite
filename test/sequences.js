var FunctionTree = require('function-tree');
var Credentials = require('../credentials');
var { validAmazonCredentials, fetchAmazonOrders } = require('../nodejs/sequences');

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

  step('sequence fetch order List', done => {
    FT.run(
      [
        fetchAmazonOrders,
        ({ props: { orderItems } }) => {
          console.log(orderItems);
          done();
        }
      ],
      {
        credentials: Credentials,
        days: 3
      }
    )
  }).timeout(12000000)
});
