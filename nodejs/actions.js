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
var moment = require("moment");
var parser = require("fast-xml-parser");
var nodejs_1 = require("./nodejs");
var genericRetryStrategy = function (_a) {
    var _b = _a.maxRetryAttempts, maxRetryAttempts = _b === void 0 ? 5 : _b, _c = _a.scalingDuration, scalingDuration = _c === void 0 ? 1000 : _c, _d = _a.includedStatusCodes, includedStatusCodes = _d === void 0 ? [] : _d;
    return function (attempts) {
        return attempts.pipe(operators_1.mergeMap(function (error, i) {
            var retryAttempt = i + 1;
            if (retryAttempt > maxRetryAttempts || !includedStatusCodes.includes(error.status)) {
                return rxjs_1.throwError(error);
            }
            return rxjs_1.timer(retryAttempt * scalingDuration);
        }));
    };
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
exports.fetchOrderList$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, credentials = _b.credentials, days = _b.days;
    return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_c) {
            return [2, ({
                    orderList$: rxjs_1.from(new Promise(function (resolve, reject) {
                        authfetch.ListOrders({
                            CreatedAfter: moment()
                                .subtract({ days: days })
                                .toISOString(),
                            'MarketplaceId.Id': credentials.marketplaceId
                        }, function (error, response) {
                            if (error) {
                                reject(error);
                            }
                            else {
                                resolve((parser.parse(response.body)).ListOrdersResponse.ListOrdersResult);
                            }
                        });
                    })).pipe(operators_1.retryWhen(genericRetryStrategy({
                        scalingDuration: 3000,
                        includedStatusCodes: [503]
                    })))
                })];
        });
    });
};
var orderListNext$ = function (authfetch) { return function (NextToken) {
    return rxjs_1.from(new Promise(function (resolve, reject) {
        authfetch.ListOrdersByNextToken({
            NextToken: NextToken
        }, function (error, response) {
            if (error) {
                reject(error);
            }
            else {
                resolve((parser.parse(response.body)).ListOrdersByNextTokenResponse.ListOrdersByNextTokenResult);
            }
        });
    })).pipe(operators_1.retryWhen(genericRetryStrategy({
        scalingDuration: 30000,
        includedStatusCodes: [503]
    })));
}; };
exports.fetchOrderListNext$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, orderList$ = _b.orderList$;
    return ({
        orderListNext$: orderList$.pipe(operators_1.expand(function (_a) {
            var NextToken = _a.NextToken;
            return NextToken ? orderListNext$(authfetch)(NextToken).pipe(operators_1.delay(10000)) : rxjs_1.empty();
        }), operators_1.concatMap(function (_a) {
            var Orders = _a.Orders;
            return typeof Orders.Order === 'string' ? [Orders.Order] : Orders.Order;
        }))
    });
};
var orderItems$ = function (authfetch) { return function (orderId) {
    return rxjs_1.from(new Promise(function (resolve, reject) {
        authfetch.ListOrderItems(orderId, function (error, response) {
            if (error) {
                reject(error);
            }
            else {
                resolve((parser.parse(response.body)).ListOrderItemsResponse.ListOrderItemsResult);
            }
        });
    })).pipe(operators_1.retryWhen(genericRetryStrategy({
        scalingDuration: 30000,
        includedStatusCodes: [503]
    })));
}; };
exports.fetchOrderItems$ = function (_a) {
    var _b = _a.props, authfetch = _b.authfetch, orderListNext$ = _b.orderListNext$;
    return ({
        orderItems$: orderListNext$.pipe(operators_1.concatMap(function (_a) {
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
        }), operators_1.toArray(), operators_1.map(function (arr) { return ramda_1.flatten(arr); }))
    });
};
exports.subscribeOrderItems = function (_a) {
    var orderItems$ = _a.props.orderItems$;
    return new Promise(function (resolve) {
        orderItems$.subscribe(function (orderItems) {
            resolve({ orderItems: orderItems });
        });
    });
};
