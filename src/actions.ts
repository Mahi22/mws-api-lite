import { compose, tail, split, flatten } from 'ramda';
import { from, throwError, timer, empty } from 'rxjs';
import { mergeMap, retryWhen, expand, delay, tap, concatMap, toArray, map } from 'rxjs/operators';
import * as moment from 'moment';
import * as parser from 'fast-xml-parser';
import { NodeJSMWSClient as MWSClient } from './nodejs';

const genericRetryStrategy = ({
  maxRetryAttempts = 5,
  scalingDuration = 1000,
  includedStatusCodes = []
}) => attempts => {
  return attempts.pipe(
    mergeMap((error, i) => {
      const retryAttempt = i + 1;
      if (
        // @ts-ignore
        retryAttempt > maxRetryAttempts || !includedStatusCodes.includes(error.status)
      ) {
        return throwError(error);
      }

      return timer(retryAttempt * scalingDuration);
    })
  )
};

// interface Credentials {
//   marketplace: string,
//   appId: string,
//   appSecret: string,
//   sellerId: string,
//   authToken: string
// };

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

export const fetchOrderList$ = async ({ props: { authfetch, credentials, days } }) =>
  ({
    orderList$: from(new Promise((resolve, reject) => {
      authfetch.ListOrders({
        CreatedAfter: moment()
          .subtract({ days })
          .toISOString(),
        'MarketplaceId.Id': credentials.marketplaceId
      }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve((parser.parse(response.body)).ListOrdersResponse.ListOrdersResult);
        }
      });
    })).pipe(
      retryWhen(genericRetryStrategy({
        scalingDuration: 3000,
        includedStatusCodes: [503]
      }))
    )
  });

const orderListNext$ = authfetch => NextToken =>
  from(new Promise((resolve, reject) => {
    authfetch.ListOrdersByNextToken({
      NextToken
    }, (error, response) => {
      if (error) {
        reject(error)
      } else {
        resolve((parser.parse(response.body)).ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult);
      }
    })
  })).pipe(
    retryWhen(genericRetryStrategy({
      scalingDuration: 30000,
      includedStatusCodes: [503]
    }))
  );

export const fetchOrderListNext$ = ({ props: { authfetch, orderList$ } }) =>
  ({
    orderListNext$: orderList$.pipe(
      expand(({ NextToken }) => NextToken ? orderListNext$(authfetch)(NextToken).pipe(delay(10000)) : empty()),
      concatMap(({ Orders }) => typeof Orders.Order === 'string' ? [Orders.Order] : Orders.Order),
      // toArray()
    )
  });

const orderItems$ = authfetch => orderId =>
  from(new Promise((resolve, reject) => {
    authfetch.ListOrderItems(orderId, (error, response) => {
      if (error) {
        reject(error)
      } else {
        resolve((parser.parse(response.body)).ListOrderItemsResponse.ListOrderItemsResult);
      }
    })
  })).pipe(
    retryWhen(genericRetryStrategy({
      scalingDuration: 30000,
      includedStatusCodes: [503]
    }))
  );

export const fetchOrderItems$ = ({ props: { authfetch, orderListNext$ } }) =>
  ({
    orderItems$: orderListNext$.pipe(
      concatMap(({ AmazonOrderId }) => orderItems$(authfetch)({ AmazonOrderId }), (order, { OrderItems }) => {
        if (Array.isArray(OrderItems.OrderItem)) {
          return OrderItems.OrderItem.map(item => ({ ...order, item }));
        } else {
          return [{ ...order, item: OrderItems.OrderItem }];
        }
      }),
      // tap(console.log),
      toArray(),
      map(arr => flatten(arr))
    )
  });