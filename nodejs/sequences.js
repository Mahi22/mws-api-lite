"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var function_tree_1 = require("function-tree");
var actions_1 = require("./actions");
exports.Sequences = 'MWS_FUNCTION_TREE_SEQUENCES';
exports.validAmazonCredentials = function_tree_1.sequence('Validating Amazon Credentials', [
    actions_1.createAmazonAuthfetch,
    actions_1.checkOrderServiceStatus
]);
exports.fetchAmazonOrders = function_tree_1.sequence('Fetching Amazon Orders', [
    actions_1.createAmazonAuthfetch,
    actions_1.fetchOrderList$,
    actions_1.fetchOrderListNext$,
    actions_1.fetchOrderItems$
]);
