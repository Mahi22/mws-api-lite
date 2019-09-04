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
    actions_1.fetchOrderItems$,
    actions_1.subscribeOrderItems
]);
exports.downloadReport = function_tree_1.sequence('Download Report', [
    actions_1.createAmazonAuthfetch,
    actions_1.requestReport$,
    actions_1.requestReportResult$,
    actions_1.getReport$,
    actions_1.subscribeReport
]);
exports.downloadTsvReport = function_tree_1.sequence('Download TSV Report', [
    actions_1.createAmazonAuthfetch,
    actions_1.requestReport$,
    actions_1.requestReportResult$,
    actions_1.getReport$,
    actions_1.tsv2json$,
    actions_1.subscribeJson
]);
exports.downloadTsvReportById = function_tree_1.sequence('Download TSV Report By Id', [
    actions_1.createAmazonAuthfetch,
    actions_1.getReportById$,
    actions_1.tsv2json$,
    actions_1.subscribeJson
]);
exports.downloadReportList = function_tree_1.sequence('Download Report List', [
    actions_1.createAmazonAuthfetch,
    actions_1.requestReportList$,
    actions_1.requestReportListNext$,
    actions_1.subscribeReportList
]);
exports.downloadXmlReport = function_tree_1.sequence('Download XML Report', [
    actions_1.createAmazonAuthfetch,
    actions_1.requestReport$,
    actions_1.requestReportResult$,
    actions_1.getReport$,
    actions_1.xml2json$,
    actions_1.subscribeJson
]);
