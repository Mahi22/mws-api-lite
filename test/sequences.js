var FunctionTree = require('function-tree');
var Credentials = require('../credentials');
var { SEQUENCES } = require('../nodejs/sequences');

var FT = new FunctionTree.default();

console.log(SEQUENCES);

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
