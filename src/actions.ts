import { compose, tail, split, flatten } from 'ramda';
import { from, throwError, timer, empty, of } from 'rxjs';
import { mergeMap, retryWhen, expand, delay, concatMap, toArray, map, skip, catchError, bufferCount, tap } from 'rxjs/operators';
import * as parser from 'fast-xml-parser';
import { NodeJSMWSClient as MWSClient } from './nodejs';

const retry = require('retry');

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

      // console.log(retryAttempt);
      // console.log(scalingDuration);
      // console.log(retryAttempt * scalingDuration);

      return timer(retryAttempt * scalingDuration);
    })
  )
};

const retryStrategyShort = {
  retries: 6,
  factor: 3,
  minTimeout: 2 * 1000
};

const retryStrategyMedium = {
  retries: 8,
  factor: 4,
  minTimeout: 2 * 1000
};

const retryStrategyLong = {
  retries: 10,
  factor: 5,
  minTimeout: 2 * 1000
};

/*
 * ---- 
 * Async Actions
 * ----
 */

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

/*
 * ---- 
 * Observer Functions
 * ----
 */
// const downloadReport$ = authfetch => reportId =>
//   from(new Promise((resolve, reject) => {
//     if (reportId === null) {
//       resolve('');
//     } else {
//       authfetch.GetReport({ ReportId: reportId }, (error, response) => {
//         if (error) {
//           reject(error);
//         } else {
//           // console.log('GOT DOWNLOAD RESPONSE');
//           resolve(response.body);
//         }
//       });
//     }
//   })).pipe(
//     retryWhen(genericRetryStrategy({
//       scalingDuration: 60000,
//       includedStatusCodes: [503],
//       excludedStatusCodes: [404]
//     }))
//   );

const downloadReport$ = authfetch => reportId =>
  from(new Promise((resolve, reject) => {
    if (reportId === null) {
      resolve('');
    } else {
      var operation = retry.operation(retryStrategyLong);

      operation.attempt(function() {
        authfetch.GetReport({ ReportId: reportId }, (error, response) => {
          if (error) {
            if (operation.retry(error)) {
              return;
            }
            reject(error);
          } else {
            // console.log('GOT DOWNLOAD RESPONSE');
            resolve(response.body);
          }
        });
      });
    }
  }));

// const orderItems$ = authfetch => orderId =>
//   from(new Promise((resolve, reject) => {
//     console.log('FETCHING');
//     console.log(retry);
//     authfetch.ListOrderItems(orderId, (error, response) => {
//       console.log(orderId);
//       if (error) {
//         console.log(error);
//         reject(error)
//       } else {
//         console.log('resolved');
//         resolve((parser.parse(response.body)).ListOrderItemsResponse.ListOrderItemsResult);
//       }
//     })
//   })).pipe(
//     retryWhen(genericRetryStrategy({
//       scalingDuration: 30000,
//       includedStatusCodes: [503]
//     }))
//   );

const orderItems$ = authfetch => orderId =>
    from(new Promise((resolve, reject) => {
      var operation = retry.operation(retryStrategyShort);

      operation.attempt(function() {
        authfetch.ListOrderItems(orderId, (error, response) => {
          // console.log(orderId);
          if (error) {
            // console.log(error);
            if (operation.retry(error)) {
              return;
            }
            reject(error);
          } else {
            // console.log('resolved');
            resolve((parser.parse(response.body)).ListOrderItemsResponse.ListOrderItemsResult);
          }
        })
      });
    }));


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

// const orderListNext$ = authfetch => NextToken =>
//   from(new Promise((resolve, reject) => {
//     authfetch.ListOrdersByNextToken({
//       NextToken
//     }, (error, response) => {
//       if (error) {
//         reject(error)
//       } else {
//         resolve((parser.parse(response.body)).ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult);
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
    var operation = retry.operation(retryStrategyShort);

    operation.attempt(function() {
      authfetch.ListOrdersByNextToken({
        NextToken
      }, (error, response) => {
        if (error) {
          if (operation.retry(error)) {
            return;
          }
          reject(error)
        } else {
          resolve((parser.parse(response.body)).ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult);
        }
      })
    });
  }));

// const reportListNext$ = authfetch => NextToken =>
//   from(new Promise((resolve, reject) => {
//     // console.log('REQUESTION REPORT');
//     authfetch.GetReportListByNextToken({
//       NextToken
//     }, (error, response) => {
//       if (error) {
//         reject(error)
//       } else {
//         resolve((parser.parse(response.body)).GetReportListByNextTokenResponse.GetReportListByNextTokenResult);
//       }
//     })
//   })).pipe(
//     retryWhen(genericRetryStrategy({
//       scalingDuration: 30000,
//       includedStatusCodes: [503]
//     }))
//   );

const reportListNext$ = authfetch => NextToken =>
  from(new Promise((resolve, reject) => {
    // console.log('REQUESTION REPORT');
    var operation = retry.operation(retryStrategyMedium);

    operation.attempt(function() {
      authfetch.GetReportListByNextToken({
        NextToken
      }, (error, response) => {
        if (error) {
          if (operation.retry(error)) {
            return;
          }
          reject(error);
        } else {
          resolve((parser.parse(response.body)).GetReportListByNextTokenResponse.GetReportListByNextTokenResult);
        }
      });
    });
  }));

// const reportResult$ = authfetch => reportId =>
//   from(new Promise((resolve, reject) => {
//     authfetch.GetReportRequestList({'ReportRequestIdList.Id.1': reportId }, (error, res) => {
//       if (error) {
//         reject(error);
//       } else {
//         const response = parser.parse(res.body, { parseTrueNumberOnly: true });
//         if (
//           response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo
//             .ReportProcessingStatus === '_DONE_'
//         ) {
//           resolve(response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo.GeneratedReportId);
//         } else if (
//           response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo
//               .ReportProcessingStatus === '_DONE_NO_DATA_'
//         ) {
//           resolve(null);
//         } else {
//           reject({
//             status: 555,
//             message: response 
//           });
//         }
//       }
//     });
//   })).pipe(
//   retryWhen(genericRetryStrategy({
//     scalingDuration: 60000,
//     includedStatusCodes: [503, 555],
//     excludedStatusCodes: [404]
//   }))
// );

const reportResult$ = authfetch => reportId =>
  from(new Promise((resolve, reject) => {
    var operation = retry.operation(retryStrategyMedium);

    operation.attempt(function() {
      authfetch.GetReportRequestList({'ReportRequestIdList.Id.1': reportId }, (error, res) => {
        if (error) {
          if (operation.retry(error)) {
            return;
          }
          reject(error);
        } else {
          const response = parser.parse(res.body, { parseTrueNumberOnly: true });
          // console.log(JSON.stringify(response));
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
            if (operation.retry({
              status: 555,
              message: response 
            })) {
              return;
            }
            reject({
              status: 555,
              message: response 
            });
          }
        }
      });
    });
  }));

/*
 * ---- 
 * Observer Actions
 * ----
 */

export const createAmazonOrderIdsBatch$ = async ({ props: { orderIds$ } }) => ({
  orderIdsBatch$: orderIds$.pipe(
    bufferCount(50),
    tap(val => {
      console.log('CREATED ARRAY');
      console.log(val);
    })
  )
});

export const fetchOrderItems$ = ({ props: { authfetch, orderListNext$ } }) =>
  ({
    orderItems$: orderListNext$.pipe(
      delay(900),
      concatMap(({ AmazonOrderId }) => orderItems$(authfetch)({ AmazonOrderId }), (order, { OrderItems }) => {
        if (Array.isArray(OrderItems.OrderItem)) {
          return OrderItems.OrderItem.map(item => ({ ...order, item }));
        } else {
          return [{ ...order, item: OrderItems.OrderItem, orderItemId: OrderItems.OrderItem.OrderItemId }];
        }
      }),
      tap(res => {
        console.log('GOT RESULT');
        console.log(res);
      })
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

// export const fetchOrderList$ = async ({ props: { authfetch, fetchOrderListParams } }) =>
//   ({
//     orderList$: from(new Promise((resolve, reject) => {
//       authfetch.ListOrders(fetchOrderListParams, (error, response) => {
//         if (error) {
//           reject(error);
//         } else {
//           resolve((parser.parse(response.body)).ListOrdersResponse.ListOrdersResult);
//         }
//       });
//     })).pipe(
//       retryWhen(genericRetryStrategy({
//         scalingDuration: 3000,
//         includedStatusCodes: [503]
//       }))
//     )
//   });

export const fetchOrderList$ = async ({ props: { authfetch, fetchOrderListParams } }) =>
  ({
    orderList$: from(new Promise((resolve, reject) => {
      var operation = retry.operation(retryStrategyShort);

      operation.attempt(function() {
        authfetch.ListOrders(fetchOrderListParams, (error, response) => {
          if (error) {
            if (operation.retry(error)) {
              return;
            }
            reject(error);
          } else {
            resolve((parser.parse(response.body)).ListOrdersResponse.ListOrdersResult);
          }
        });
      });
    }))
  });

export const fetchOrderListNext$ = ({ props: { authfetch, orderList$ } }) =>
  ({
    orderListNext$: orderList$.pipe(
      // tap(console.log),
      // tap(() => { console.log('*****') }),
      expand(({ NextToken }) => NextToken ? orderListNext$(authfetch)(NextToken).pipe(delay(10000)) : empty()),
      concatMap(({ Orders }) => Orders ? typeof Orders.Order === 'string' ? [Orders.Order] : Orders.Order : empty()),
      // tap(console.log)
      // toArray()
    )
  });

export const fetchOrderIdsBatch$ = ({ props: { authfetch, orderIdsBatch$ } }) =>
  ({
    orderListNext$: orderIdsBatch$.pipe(
      concatMap((orderIdsBatch: any[]) => from(new Promise((resolve, reject) => {
        var operation = retry.operation(retryStrategyShort);

        const rqstIds = orderIdsBatch.reduce((acc, curr, index) => ({ ...acc, [`AmazonOrderId.Id.${index + 1}`]: curr }), {});

        console.log('FETCHING');
        console.log(rqstIds);

        operation.attempt(function() {
          authfetch.GetOrder(rqstIds, (error, response) => {
            if (error) {
              if (operation.retry(error)) {
                return;
              }
              reject(error);
            } else {
              resolve((parser.parse(response.body)).GetOrderResponse.GetOrderResult);
            }
          });
        });
      }))),
      concatMap(({ Orders }) => Orders ? typeof Orders.Order === 'string' ? [Orders.Order] : Orders.Order : empty()),
    )
  });

export const getReport$ = ({ props: { authfetch, generatedReportId$ } }) =>
  ({
    report$: generatedReportId$.pipe(concatMap(downloadReport$(authfetch)))
  });

export const getReportById$ = ({ props: { authfetch, reportId } }) => {
  return ({
    report$: downloadReport$(authfetch)(reportId)
  });
};


// export const requestReport$ = ({ props: { authfetch, requestReportParams } }) =>
//   ({
//     requestedReportId$: from(new Promise((resolve, reject) => {
//       authfetch.RequestReport(requestReportParams, (error, response) => {
//         if (error) {
//           reject(error);
//         } else {
//           resolve((parser.parse(response.body, { parseTrueNumberOnly: true })).RequestReportResponse.RequestReportResult.ReportRequestInfo.ReportRequestId);
//         }
//       });
//     })).pipe(
//       retryWhen(genericRetryStrategy({
//         scalingDuration: 3000,
//         includedStatusCodes: [503],
//         excludedStatusCodes: [404]
//       }))
//     )
//   });

export const requestReport$ = ({ props: { authfetch, requestReportParams } }) =>
  ({
    requestedReportId$: from(new Promise((resolve, reject) => {
      var operation = retry.operation(retryStrategyShort);

      operation.attempt(function() {
        authfetch.RequestReport(requestReportParams, (error, response) => {
          if (error) {
            if (operation.retry(error)) {
              return;
            }
            reject(error);
          } else {
            resolve((parser.parse(response.body, { parseTrueNumberOnly: true })).RequestReportResponse.RequestReportResult.ReportRequestInfo.ReportRequestId);
          }
        });
      });
    }))
  });  

// export const requestReportList$ = ({ props: { authfetch, requestReportParams } }) =>
//   ({
//     reportList$: from(new Promise((resolve, reject) => {
//       authfetch.GetReportList(requestReportParams, (error, response) => {
//         if (error) {
//           reject(error);
//         } else {
//           resolve((parser.parse(response.body, { parseTrueNumberOnly: true })).GetReportListResponse.GetReportListResult);
//         }
//       });
//     })).pipe(
//       retryWhen(genericRetryStrategy({
//         scalingDuration: 3000,
//         includedStatusCodes: [503],
//         excludedStatusCodes: [404]
//       }))
//     )
//   });

export const requestReportList$ = ({ props: { authfetch, requestReportParams } }) =>
  ({
    reportList$: from(new Promise((resolve, reject) => {
      var operation = retry.operation(retryStrategyShort);

      operation.attempt(function() {
        authfetch.GetReportList(requestReportParams, (error, response) => {
          if (error) {
            if (operation.retry(error)) {
              return;
            }
            reject(error);
          } else {
            resolve((parser.parse(response.body, { parseTrueNumberOnly: true })).GetReportListResponse.GetReportListResult);
          }
        });
      });
    }))
  });

export const requestReportListNext$ = ({ props: { authfetch, reportList$ } }) =>
  ({
    reportListNext$: reportList$.pipe(
      // tap(console.log),
      expand(({ NextToken }) => NextToken ? reportListNext$(authfetch)(NextToken).pipe(delay(10000)) : empty()),
      concatMap(({ ReportInfo }) => ReportInfo ? typeof ReportInfo === 'string' ? [ReportInfo] : ReportInfo : empty()),
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
      // console.log(tsv);
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
  new Promise((resolve, reject) => {
    let orderItems = [];
    orderItems$
      .pipe(
        toArray(),
        map(arr => flatten(arr)),
        catchError(err => Promise.reject(err))
      )
      .subscribe({
        next: result => {
          // console.log('NEXT CALLED');
          orderItems = result;
        },
        complete: () => {
          // console.log('COMPLETED');
          resolve({ orderItems });
        },
        error: err => {
          // console.log('CAUGHT ERRROR');
          // console.log(err);
          reject(new Error(JSON.stringify(err)));
        }
      });
  });

export const subscribeReport = ({ props: { report$ } }) =>
  new Promise((resolve, reject) => {
    report$.pipe(catchError(err => Promise.reject(err))).subscribe(response => resolve({ response }), err => reject(new Error(JSON.stringify(err))));
  });

export const subscribeReportList = ({ props: { reportListNext$ } }) =>
  new Promise((resolve, reject) => {
    reportListNext$.pipe(toArray(), catchError(err => Promise.reject(err))).subscribe(response => resolve({ response }), err => reject(new Error(JSON.stringify(err))));
  });


/*
  * -- Test Helpers
  */

export const orderIdsObservable = ({ props: { orderIds } }) => ({
  orderIds$: from(orderIds)
});
