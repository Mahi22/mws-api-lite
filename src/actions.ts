import { compose, tail, split } from 'ramda';
import { NodeJSMWSClient as MWSClient } from './nodejs';

/**
 * @param credentials - { marketplace, accesskey, secret, sellerID, mwsAuthToken }
 * @return authfetch
 */
export const createAmazonAuthfetch = async ({ props: { credentials } }) => ({
  authfetch: new MWSClient(
    compose(
      tail,
      split(' ')
    )(credentials.marketplace),
    credentials.appId,
    credentials.appSecret,
    credentials.sellerId,
    credentials.authToken
  )
});

/**
 * @param authfetch
 */
export const checkOrderServiceStatus = async ({ props: { authfetch } }) =>
new Promise((resolve, reject) => {
  authfetch.ListMarketplaceParticipations(function(err, response) {
    if (err) {
      reject(err);
    } else {
      if (response.status === 200) {
        resolve({ valid: true });
      } else {
        resolve({ valid: false, response });
      }
    }
  });
});
