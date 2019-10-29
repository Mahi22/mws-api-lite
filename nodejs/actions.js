"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var ramda_1 = require("ramda");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var parser = require("fast-xml-parser");
var nodejs_1 = require("./nodejs");
var retry = require('retry');
var isIsoDate = function (str) { return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/.test(str); };
var genericRetryStrategy = function (_a) {
    var _b = _a.maxRetryAttempts, maxRetryAttempts = _b === void 0 ? 5 : _b, _c = _a.scalingDuration, scalingDuration = _c === void 0 ? 1000 : _c, _d = _a.includedStatusCodes, includedStatusCodes = _d === void 0 ? [] : _d, _e = _a.excludedStatusCodes, excludedStatusCodes = _e === void 0 ? [] : _e;
    return function (attempts) {
        return attempts.pipe(operators_1.mergeMap(function (error, i) {
            var retryAttempt = i + 1;
            if (retryAttempt > maxRetryAttempts || !includedStatusCodes.includes(error.status) || excludedStatusCodes.includes(error.status)) {
                return rxjs_1.throwError(error);
            }
            return rxjs_1.timer(retryAttempt * scalingDuration);
        }));
    };
};
var retryStrategyShort = {
    retries: 6,
    factor: 3,
    minTimeout: 2 * 1000
};
var retryStrategyMedium = {
    retries: 8,
    factor: 4,
    minTimeout: 2 * 1000
};
var retryStrategyLong = {
    retries: 10,
    factor: 5,
    minTimeout: 2 * 1000
};
exports.checkOrderServiceStatus = function (_a) {
    var authfetch = _a.props.authfetch;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            return [2, new Promise(function (resolve, reject) {
                    authfetch.ListMarketplaceParticipations(function (err, response) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            if (response.status === 200) {
                                resolve({ valid: true });
                            }
                            else {
                                resolve({ valid: false, response: response });
                            }
                        }
                    });
                })];
        });
    });
};
exports.createAmazonAuthfetch = function (_a) {
    var credentials = _a.props.credentials;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            return [2, ({
                    authfetch: new nodejs_1.NodeJSMWSClient(ramda_1.compose(ramda_1.tail, ramda_1.split(' '))(credentials.marketplace), credentials.appId, credentials.appSecret, credentials.sellerId, credentials.authToken)
                })];
        });
    });
};
var downloadReport$ = function (authfetch) { return function (reportId) {
    return rxjs_1.from(new Promise(function (resolve, reject) {
        if (reportId === null) {
            resolve('');
        }
        else {
            var operation = retry.operation(retryStrategyLong);
            operation.attempt(function () {
                authfetch.GetReport({ ReportId: reportId }, function (error, response) {
                    if (error) {
                        if (operation.retry(error)) {
                            return;
                        }
                        reject(error);
                    }
                    else {
                        resolve(response.body);
                    }
                });
            });
        }
    }));
}; };
var orderItems$ = function (authfetch) { return function (orderId) {
    return rxjs_1.from(new Promise(function (resolve, reject) {
        var operation = retry.operation(retryStrategyShort);
        operation.attempt(function () {
            authfetch.ListOrderItems(orderId, function (error, response) {
                if (error) {
                    if (operation.retry(error)) {
                        return;
                    }
                    reject(error);
                }
                else {
                    resolve((parser.parse(response.body)).ListOrderItemsResponse.ListOrderItemsResult);
                }
            });
        });
    }));
}; };
var orderListNext$ = function (authfetch) { return function (NextToken) {
    return rxjs_1.from(new Promise(function (resolve, reject) {
        var operation = retry.operation(retryStrategyShort);
        operation.attempt(function () {
            authfetch.ListOrdersByNextToken({
                NextToken: NextToken
            }, function (error, response) {
                if (error) {
                    if (operation.retry(error)) {
                        return;
                    }
                    reject(error);
                }
                else {
                    resolve((parser.parse(response.body)).ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult);
                }
            });
        });
    }));
}; };
var reportListNext$ = function (authfetch) { return function (NextToken) {
    return rxjs_1.from(new Promise(function (resolve, reject) {
        var operation = retry.operation(retryStrategyMedium);
        operation.attempt(function () {
            authfetch.GetReportListByNextToken({
                NextToken: NextToken
            }, function (error, response) {
                if (error) {
                    if (operation.retry(error)) {
                        return;
                    }
                    reject(error);
                }
                else {
                    resolve((parser.parse(response.body)).GetReportListByNextTokenResponse.GetReportListByNextTokenResult);
                }
            });
        });
    }));
}; };
var reportResult$ = function (authfetch) { return function (reportId) {
    return rxjs_1.from(new Promise(function (resolve, reject) {
        var operation = retry.operation(retryStrategyMedium);
        operation.attempt(function () {
            authfetch.GetReportRequestList({ 'ReportRequestIdList.Id.1': reportId }, function (error, res) {
                if (error) {
                    if (operation.retry(error)) {
                        return;
                    }
                    reject(error);
                }
                else {
                    var response = parser.parse(res.body, { parseTrueNumberOnly: true });
                    if (response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo
                        .ReportProcessingStatus === '_DONE_') {
                        resolve(response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo.GeneratedReportId);
                    }
                    else if (response.GetReportRequestListResponse.GetReportRequestListResult.ReportRequestInfo
                        .ReportProcessingStatus === '_DONE_NO_DATA_') {
                        resolve(null);
                    }
                    else {
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
}; };
exports.createAmazonOrderIdsBatch$ = function (_a) {
    var orderIds$ = _a.props.orderIds$;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            return [2, ({
                    orderIdsBatch$: orderIds$.pipe(operators_1.bufferCount(50))
                })];
        });
    });
};
exports.fetchOrderItems$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, orderListNext$ = _b.orderListNext$;
    return ({
        orderItems$: orderListNext$.pipe(operators_1.delay(900), operators_1.concatMap(function (_a) {
            var AmazonOrderId = _a.AmazonOrderId;
            return orderItems$(authfetch)({ AmazonOrderId: AmazonOrderId });
        }, function (order, _a) {
            var OrderItems = _a.OrderItems;
            if (Array.isArray(OrderItems.OrderItem)) {
                return OrderItems.OrderItem.map(function (item) { return (__assign({}, order, { item: item })); });
            }
            else {
                return [__assign({}, order, { item: OrderItems.OrderItem, orderItemId: OrderItems.OrderItem.OrderItemId })];
            }
        }))
    });
};
exports.fetchOrderList$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, fetchOrderListParams = _b.fetchOrderListParams;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_c) {
            return [2, ({
                    orderList$: rxjs_1.from(new Promise(function (resolve, reject) {
                        var operation = retry.operation(retryStrategyShort);
                        operation.attempt(function () {
                            authfetch.ListOrders(fetchOrderListParams, function (error, response) {
                                if (error) {
                                    if (operation.retry(error)) {
                                        return;
                                    }
                                    reject(error);
                                }
                                else {
                                    resolve((parser.parse(response.body)).ListOrdersResponse.ListOrdersResult);
                                }
                            });
                        });
                    }))
                })];
        });
    });
};
exports.fetchOrderListNext$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, orderList$ = _b.orderList$;
    return ({
        orderListNext$: orderList$.pipe(operators_1.expand(function (_a) {
            var NextToken = _a.NextToken;
            return NextToken ? orderListNext$(authfetch)(NextToken).pipe(operators_1.delay(10000)) : rxjs_1.empty();
        }), operators_1.concatMap(function (_a) {
            var Orders = _a.Orders;
            return Orders ? typeof Orders.Order === 'string' ? [Orders.Order] : Orders.Order : rxjs_1.empty();
        }))
    });
};
exports.fetchOrderIdsBatch$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, orderIdsBatch$ = _b.orderIdsBatch$;
    return ({
        orderListNext$: orderIdsBatch$.pipe(operators_1.concatMap(function (orderIdsBatch) { return rxjs_1.from(new Promise(function (resolve, reject) {
            var operation = retry.operation(retryStrategyShort);
            var rqstIds = orderIdsBatch.reduce(function (acc, curr, index) {
                var _a;
                return (__assign({}, acc, (_a = {}, _a["AmazonOrderId.Id." + (index + 1)] = curr, _a)));
            }, {});
            operation.attempt(function () {
                authfetch.GetOrder(rqstIds, function (error, response) {
                    if (error) {
                        if (operation.retry(error)) {
                            return;
                        }
                        reject(error);
                    }
                    else {
                        resolve((parser.parse(response.body)).GetOrderResponse.GetOrderResult);
                    }
                });
            });
        })); }), operators_1.concatMap(function (_a) {
            var Orders = _a.Orders;
            return Orders ? typeof Orders.Order === 'string' ? [Orders.Order] : Orders.Order : rxjs_1.empty();
        }))
    });
};
exports.getReport$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, generatedReportId$ = _b.generatedReportId$;
    return ({
        report$: generatedReportId$.pipe(operators_1.concatMap(downloadReport$(authfetch)))
    });
};
exports.getReportById$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, reportId = _b.reportId;
    return ({
        report$: downloadReport$(authfetch)(reportId)
    });
};
exports.requestReport$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, requestReportParams = _b.requestReportParams;
    return ({
        requestedReportId$: rxjs_1.from(new Promise(function (resolve, reject) {
            var operation = retry.operation(retryStrategyShort);
            operation.attempt(function () {
                authfetch.RequestReport(requestReportParams, function (error, response) {
                    if (error) {
                        if (operation.retry(error)) {
                            return;
                        }
                        reject(error);
                    }
                    else {
                        resolve((parser.parse(response.body, { parseTrueNumberOnly: true })).RequestReportResponse.RequestReportResult.ReportRequestInfo.ReportRequestId);
                    }
                });
            });
        }))
    });
};
exports.requestReportList$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, requestReportParams = _b.requestReportParams;
    return ({
        reportList$: rxjs_1.from(new Promise(function (resolve, reject) {
            var operation = retry.operation(retryStrategyShort);
            operation.attempt(function () {
                authfetch.GetReportList(requestReportParams, function (error, response) {
                    if (error) {
                        if (operation.retry(error)) {
                            return;
                        }
                        reject(error);
                    }
                    else {
                        resolve((parser.parse(response.body, { parseTrueNumberOnly: true })).GetReportListResponse.GetReportListResult);
                    }
                });
            });
        }))
    });
};
exports.requestReportListNext$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, reportList$ = _b.reportList$;
    return ({
        reportListNext$: reportList$.pipe(operators_1.expand(function (_a) {
            var NextToken = _a.NextToken;
            return NextToken ? reportListNext$(authfetch)(NextToken).pipe(operators_1.delay(10000)) : rxjs_1.empty();
        }), operators_1.concatMap(function (_a) {
            var ReportInfo = _a.ReportInfo;
            return ReportInfo ? typeof ReportInfo === 'string' ? [ReportInfo] : ReportInfo : rxjs_1.empty();
        }))
    });
};
exports.requestReportResult$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, requestedReportId$ = _b.requestedReportId$;
    return ({
        generatedReportId$: requestedReportId$.pipe(operators_1.delay(30000), operators_1.concatMap(reportResult$(authfetch)))
    });
};
exports.tsv2json$ = function (_a) {
    var _b = _a.props, report$ = _b.report$, _c = _b.tsvSeperator, tsvSeperator = _c === void 0 ? '\r\n' : _c;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_d) {
            return [2, ({
                    json$: report$.pipe(operators_1.concatMap(function (tsv) {
                        var arr = tsv.split(tsvSeperator);
                        var header = arr[0].split('\t');
                        var rows$ = rxjs_1.from(arr).pipe(operators_1.skip(1), operators_1.map(function (row) { return row.split('\t'); }));
                        return rows$.pipe(operators_1.map(function (row) {
                            return row.reduce(function (rowObj, cell, i) {
                                rowObj[header[i]] = cell;
                                return rowObj;
                            }, {});
                        }));
                    }))
                })];
        });
    });
};
exports.xml2json$ = function (_a) {
    var report$ = _a.props.report$;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            return [2, ({
                    json$: report$.pipe(operators_1.map(function (val) { return parser.parse(val); }))
                })];
        });
    });
};
exports.subscribeJson = function (_a) {
    var json$ = _a.props.json$;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_b) {
            return [2, new Promise(function (resolve) {
                    json$.pipe(operators_1.toArray()).subscribe(function (json) {
                        resolve({ json: json });
                    });
                })];
        });
    });
};
exports.subscribeOrderItems = function (_a) {
    var orderItems$ = _a.props.orderItems$;
    return new Promise(function (resolve, reject) {
        var orderItems = [];
        orderItems$
            .pipe(operators_1.toArray(), operators_1.map(function (arr) { return ramda_1.flatten(arr); }), operators_1.catchError(function (err) { return Promise.reject(err); }))
            .subscribe({
            next: function (result) {
                orderItems = result;
            },
            complete: function () {
                resolve({ orderItems: orderItems });
            },
            error: function (err) {
                reject(new Error(JSON.stringify(err)));
            }
        });
    });
};
exports.subscribeReport = function (_a) {
    var report$ = _a.props.report$;
    return new Promise(function (resolve, reject) {
        report$.pipe(operators_1.catchError(function (err) { return Promise.reject(err); })).subscribe(function (response) { return resolve({ response: response }); }, function (err) { return reject(new Error(JSON.stringify(err))); });
    });
};
exports.subscribeReportList = function (_a) {
    var reportListNext$ = _a.props.reportListNext$;
    return new Promise(function (resolve, reject) {
        reportListNext$.pipe(operators_1.toArray(), operators_1.catchError(function (err) { return Promise.reject(err); })).subscribe(function (response) { return resolve({ response: response }); }, function (err) { return reject(new Error(JSON.stringify(err))); });
    });
};
exports.orderIdsObservable = function (_a) {
    var orderIds = _a.props.orderIds;
    return ({
        orderIds$: rxjs_1.from(orderIds)
    });
};
