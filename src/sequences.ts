import { sequence } from 'function-tree';
import {
  // --
  createAmazonAuthfetch,
  checkOrderServiceStatus,
  // --
  fetchOrderList$,
  fetchOrderListNext$,
  fetchOrderItems$,
  getReport$,
  subscribeOrderItems,
  requestReport$,
  requestReportResult$,
  tsv2json$,
  xml2json$,
  // --
  subscribeJson,
  subscribeReport
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
  subscribeOrderItems
]);

export const downloadReport = sequence('Download Report', [
  createAmazonAuthfetch,
  requestReport$,
  requestReportResult$,
  getReport$,
  subscribeReport
]);

export const downloadTsvReport = sequence('Download TSV Report', [
  createAmazonAuthfetch,
  requestReport$,
  requestReportResult$,
  getReport$,
  tsv2json$,
  subscribeJson
]);

export const downloadXmlReport = sequence('Download XML Report', [
  createAmazonAuthfetch,
  requestReport$,
  requestReportResult$,
  getReport$,
  xml2json$,
  subscribeJson
]);