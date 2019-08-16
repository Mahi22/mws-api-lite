import { sequence } from 'function-tree';
import { createAmazonAuthfetch, checkOrderServiceStatus } from './actions';

export const Sequences = 'MWS_FUNCTION_TREE_SEQUENCES';

export const validAmazonCredentials = sequence('Validating Amazon Credentials', [
  createAmazonAuthfetch,
  checkOrderServiceStatus
]);
