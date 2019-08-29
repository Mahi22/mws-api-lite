import { compose, tail, split, flatten } from 'ramda';
import { from, throwError, timer, empty, of } from 'rxjs';
import { mergeMap, retryWhen, expand, delay, concatMap, toArray, map, skip } from 'rxjs/operators';
import * as parser from 'fast-xml-parser';
import { NodeJSMWSClient as MWSClient } from './nodejs';

/*
 * ----
 * Helper Utilities
 * ----
 */
const isIsoDate = (str: string) => /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/.test(str);

const genericRetryStrategy = ({
  maxRetryAttempts = 5,
  scalingDuration = 1000,
  includedStatusCodes = [],
  excludedStatusCodes = []
}) => attempts => {
  return attempts.pipe(
    mergeMap((error, i) => {
      const retryAttempt = i + 1;
      if (
        // @ts-ignore
        retryAttempt > maxRetryAttempts || !includedStatusCodes.includes(error.status) || excludedStatusCodes.includes(error.status)
      ) {
        return throwError(error);
      }

      return timer(retryAttempt * scalingDuration);
    })
  )
};

/*
 * ---- 
 * Async Actions
 * ----
 */

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

/*
 * ---- 
 * Observer Functions
 * ----
 */
const downloadReport$ = authfetch => reportId =>
  from(new Promise((resolve, reject) => {
    if (reportId === null) {
      resolve('');
    } else {
      authfetch.GetReport({ ReportId: reportId }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response.body);
        }
      });
    }
  })).pipe(
    retryWhen(genericRetryStrategy({
      scalingDuration: 60000,
      includedStatusCodes: [503],
      excludedStatusCodes: [404]
    }))
  );

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

// const orderItemsNext$ = authfetch => NextToken =>
//   from(new Promise((resolve, reject) => {
//     authfetch.ListOrderItemsByNextToken({
//       NextToken
//     }, (error, response) => {
//       if (error) {
//         reject(error)
//       } else {
//         resolve((parser.parse(response.body)).ListOrderItemsByNextTokenResponse.ListOrderItemsByNextTokenResult);
//       }
//     })
//   })).pipe(
//     retryWhen(genericRetryStrategy({
//       scalingDuration: 30000,
//       includedStatusCodes: [503]
//     }))
//   );

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

const reportResult$ = authfetch => reportId =>
  from(new Promise((resolve, reject) => {
    authfetch.GetReportRequestList({'ReportRequestIdList.Id.1': reportId }, (error, res) => {
      if (error) {
        reject(error);
      } else {
        const response = parser.parse(res.body, { parseTrueNumberOnly: true });
        if (
          response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo
            .ReportProcessingStatus === '_DONE_'
        ) {
          resolve(response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo.GeneratedReportId);
        } else if (
          response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo
              .ReportProcessingStatus === '_DONE_NO_DATA_'
        ) {
          resolve(null);
        } else {
          reject({
            status: 555,
            message: response 
          });
        }
      }
    });
  })).pipe(
  retryWhen(genericRetryStrategy({
    scalingDuration: 60000,
    includedStatusCodes: [503, 555],
    excludedStatusCodes: [404]
  }))
);

/*
 * ---- 
 * Observer Actions
 * ----
 */

export const fetchOrderItems$ = ({ props: { authfetch, orderListNext$ } }) =>
  ({
    orderItems$: orderListNext$.pipe(
      concatMap(({ AmazonOrderId }) => orderItems$(authfetch)({ AmazonOrderId }), (order, { OrderItems }) => {
        if (Array.isArray(OrderItems.OrderItem)) {
          return OrderItems.OrderItem.map(item => ({ ...order, item }));
        } else {
          return [{ ...order, item: OrderItems.OrderItem, orderItemId: OrderItems.OrderItem.OrderItemId }];
        }
      }),
    )
  });

// export const fetchOrderItemsNext$ = ({ props: { authfetch, orderItems$ } }) =>
//   ({
//     orderItemsNext$: orderItems$.pipe(
//       expand(({ NextToken }) => NextToken ? orderItemsNext$(authfetch)(NextToken).pipe(delay(10000)) : empty()),
//       concatMap(({ OrderItems }) => typeof OrderItems.OrderItem === 'string' ? [OrderItems.OrderItem] : Orders.Order),
//       // toArray()
//     )
//   });

export const fetchOrderList$ = async ({ props: { authfetch, fetchOrderListParams } }) =>
  ({
    orderList$: from(new Promise((resolve, reject) => {
      authfetch.ListOrders(fetchOrderListParams, (error, response) => {
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

export const fetchOrderListNext$ = ({ props: { authfetch, orderList$ } }) =>
  ({
    orderListNext$: orderList$.pipe(
      expand(({ NextToken }) => NextToken ? orderListNext$(authfetch)(NextToken).pipe(delay(10000)) : empty()),
      concatMap(({ Orders }) => typeof Orders.Order === 'string' ? [Orders.Order] : Orders.Order),
      // toArray()
    )
  });

export const getReport$ = ({ props: { authfetch, generatedReportId$ } }) =>
  ({
    report$: generatedReportId$.pipe(concatMap(downloadReport$(authfetch)))
  });


export const requestReport$ = ({ props: { authfetch, requestReportParams } }) =>
  ({
    requestedReportId$: from(new Promise((resolve, reject) => {
      authfetch.RequestReport(requestReportParams, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve((parser.parse(response.body, { parseTrueNumberOnly: true })).RequestReportResponse.RequestReportResult.ReportRequestInfo.ReportRequestId);
        }
      });
    })).pipe(
      retryWhen(genericRetryStrategy({
        scalingDuration: 3000,
        includedStatusCodes: [503],
        excludedStatusCodes: [404]
      }))
    )
  });

export const requestReportResult$ = ({ props: { authfetch, requestedReportId$ } }) =>
  ({
    generatedReportId$: requestedReportId$.pipe(delay(30000), concatMap(reportResult$(authfetch)))
  });

export const tsv2json$ = async ({ props: { report$, tsvSeperator = '\r\n' } }) =>
({
  json$: report$.pipe(
    concatMap((tsv: string) => {
      const arr = tsv.split(tsvSeperator);
      const header = arr[0].split('\t');
      const rows$ = from(arr).pipe(skip(1), map(row => row.split('\t')));
      return rows$.pipe(
        map(row => {
        return row.reduce((rowObj, cell, i) => {
          // @ts-ignore
          rowObj[header[i]] = cell;
          return rowObj
        }, {});
      }));
    })
  )
});

export const xml2json$ = async ({ props: { report$ } }) =>
({
  json$: report$.pipe(
    map((val: any) => parser.parse(val))
  )
})

/*
 * ----
 * Subscriptions
 * ----
 */

export const subscribeJson = async ({ props: { json$ } }) =>
  new Promise((resolve) => {
    json$.pipe(toArray()).subscribe(json => {
      resolve({ json });
    })
  });


export const subscribeOrderItems = ({ props: { orderItems$ } }) =>
  new Promise((resolve) => {
    orderItems$
    .pipe(
      toArray(),
      map(arr => flatten(arr)))
    .subscribe(orderItems => {
      resolve({ orderItems });
    });
  });

export const subscribeReport = ({ props: { report$ } }) =>
  new Promise((resolve) => {
    report$.subscribe(response => resolve({ response }));
  });

