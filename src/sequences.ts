import { sequence } from 'function-tree';
import {
  // --
  createAmazonAuthfetch,
  checkOrderServiceStatus,
  // --
  createAmazonOrderIdsBatch$,
  fetchOrderList$,
  fetchOrderListNext$,
  fetchOrderItems$,
  fetchOrderIdsBatch$,
  getReport$,
  getReportById$,
  subscribeOrderItems,
  requestReport$,
  requestReportList$,
  requestReportListNext$,
  requestReportResult$,
  tsv2json$,
  xml2json$,
  // --
  subscribeJson,
  subscribeReport,
  subscribeReportList
} from './actions';

export const Sequences = 'MWS_FUNCTION_TREE_SEQUENCES';

export const validAmazonCredentials = sequence('Validating Amazon Credentials', [
  createAmazonAuthfetch,
  checkOrderServiceStatus
]);

export const fetchAmazonOrders = sequence('Fetching Amazon Orders', [
  createAmazonAuthfetch,
  fetchOrderList$,
  fetchOrderListNext$,
  fetchOrderItems$,
  // subscribeOrderItems
]);

export const fetchAmazonOrdersByOrderIds = sequence('Fetching Amazon Order By OrderIds', [
  createAmazonAuthfetch,
  createAmazonOrderIdsBatch$,
  fetchOrderIdsBatch$,
  fetchOrderItems$
]);

export const downloadReport = sequence('Download Report', [
  createAmazonAuthfetch,
  requestReport$,
  requestReportResult$,
  getReport$,
  // subscribeReport
]);

export const downloadTsvReport = sequence('Download TSV Report', [
  createAmazonAuthfetch,
  requestReport$,
  requestReportResult$,
  getReport$,
  tsv2json$,
  // subscribeJson
]);

export const downloadTsvReportById = sequence('Download TSV Report By Id', [
  createAmazonAuthfetch,
  getReportById$,
  tsv2json$,
  // subscribeJson
]);

export const downloadReportList = sequence('Download Report List', [
  createAmazonAuthfetch,
  requestReportList$,
  requestReportListNext$,
  // subscribeReportList
]);

export const downloadXmlReport = sequence('Download XML Report', [
  createAmazonAuthfetch,
  requestReport$,
  requestReportResult$,
  getReport$,
  xml2json$,
  // subscribeJson
]);