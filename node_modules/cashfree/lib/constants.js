const _ = require('lodash');

const statuses = [
  'UNINITIALIZED',
  'UNAUTHENTICATED',
  'AUTHENTICATED',
  'TOKEN_VERIFIED'
];

module.exports = {
  URLS: {
    AUTHENTICATE: '/payout/v1/authorize',
    VERIFY_TOKEN: '/payout/v1/verifyToken',
    ADD_BENEFICIARY: '/payout/v1/addBeneficiary',
    VERIFY_BENEFICIARY: '/payout/v1/validation/bankDetails',
    GET_BENEFICIARIES: '/payout/v1/getBeneficiaries',
    GET_BENEFICIARY_ID: '/payout/v1/getBeneId',
    GET_BENEFICIARY: '/payout/v1/getBeneficiary',
    REMOVE_BENEFICIARIES: '/payout/v1/removeBeneficiary',
    REQUEST_TRANSFER: '/payout/v1/requestTransfer',
    GET_BALANCE: '/payout/v1/getBalance',
    LIST_TRANSFERS: '/payout/v1/getTransfers',
    GET_TRANSFER: '/payout/v1/getTransferStatus'
  },
  TIMEOUT: 30000,
  STATUS: _.reduce(statuses, (acc, value) => _.set(acc, value, value), {})
};
