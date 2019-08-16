var FunctionTree = require('function-tree');
var Credentials = require('../credentials');
var { validAmazonCredentials } = require('../nodejs/sequences');

var FT = new FunctionTree.default();

console.log(validAmazonCredentials);

describe('Sequence::Module::Connector', () => {
  it('sequence validate amazon marketplace', done => {
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
    );
  });
});
