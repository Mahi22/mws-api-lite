import { sequence } from 'function-tree';
import {
  createAmazonAuthfetch,
  checkOrderServiceStatus,
  fetchOrderList$,
  fetchOrderListNext$,
  fetchOrderItems$,
  subscribeOrderItems
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
