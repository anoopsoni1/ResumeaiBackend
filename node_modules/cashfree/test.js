require('dotenv').config()
const async = require('async');
const _ = require('lodash');

const { CashFree } = require('./index');
const { STATUS } = require('./lib/constants');
const chance = require('chance').Chance();

const networkCache = {};

const hook = (key) => ({ error, params }, callback) => {
  const data = error || params;
  _.set(networkCache, [data.networkId, key], data);
  return callback();
}

const options = {
  clientId: process.env['CLIENT_ID'],
  clientSecret: process.env['CLIENT_SECRET'],
  preHook: hook('request'),
  postHook: hook('response'),
  axiosConfig: {
    // axios config
    baseURL: process.env['CASHFREE_BASE_URL']
  }
};

const cashFree = new CashFree(options);

const getStatusMessage = ({ status1, status2 }, callback) => callback(
  status1 !== status2 ?
  `Status should've been ${ status2 } but found ${status1}.` :
  null
)

const checkCashFreeStatus = (cashFree, status) => (callback) => getStatusMessage({
  status1: cashFree.validate(),
  status2: status
}, callback)

const verifyRequestsComplete = (no) => (callback) => {
  const completed = _.keys(networkCache).length
  return callback(
    (completed !== no)
    ? `Expected ${no} to be completed but found ${completed} completed requests`
    : null
  )
};

const beneId = chance.string({
  length: 10,
  pool: 'abcdefghijklmnopqrstuvwxyz'
});
const transferId = chance.string({
  length: 10,
  pool: 'abcdefghijklmnopqrstuvwxyz'
});

const beneficiaryDetails = {
  bankAccount: process.env['CASHFREE_TEST_BANK_ACCOUNT'],
  ifsc: process.env['CASHFREE_TEST_IFSC'],
  name: process.env['CASHFREE_TEST_NAME'],
  beneId,
  email: process.env['CASHFREE_TEST_EMAIL'],
  phone: process.env['CASHFREE_TEST_PHONE'],
  address1: process.env['CASHFREE_TEST_ADDRESS']
};

async.auto({
  completedRequestsStart: verifyRequestsComplete(0),
  
  /* status1: checkCashFreeStatus(cashFree2, STATUS.UNAUTHENTICATED),
   * 
   * authenticate: ['status1', cashFree2.authenticate], // request

   * status2: ['authenticate', checkCashFreeStatus(cashFree2, STATUS.AUTHENTICATED)],

   * verifyToken: ['authenticate', cashFree2.verifyToken], // request

   * status3: ['verifyToken', checkCashFreeStatus(cashFree2, STATUS.TOKEN_VERIFIED)],*/

  getBeneficiaries: _.partial(
    cashFree.getBeneficiaries,
    {}
  ), // request

  completedRequestsMid: ['getBeneficiaries', verifyRequestsComplete(3)],

  removeBeneficiaries: ['getBeneficiaries', (callback, { getBeneficiaries }) =>
    async.map(
      getBeneficiaries,
      (data, next) => cashFree.removeBeneficiary(
        _.pick(data, ['beneId', 'ifsc']),
        next
      ),
      callback
    )
  ], // request

  findValidBeneficiary: ['removeBeneficiaries', _.partial(
    cashFree.validateBeneficiary,
    beneficiaryDetails
  )], // request

  addBeneficiary: ['findValidBeneficiary', (callback, { findValidBeneficiary }) =>
    cashFree.addBeneficiary(_.extend(
      beneficiaryDetails, {
        name: findValidBeneficiary.nameAtBank
      }
    ), callback)
  ], // request

  getBeneficiaryId: ['addBeneficiary', (callback, { addBeneficiary }) =>
    cashFree.getBeneficiaryId(
      beneficiaryDetails,
      callback)
  ], // request
  
  getBeneficiary: ['getBeneficiaryId', (callback, { getBeneficiaryId }) =>
    cashFree.getBeneficiary({
      beneId: getBeneficiaryId
    }, callback)
  ], // request

  requestTransfer: ['getBeneficiary', _.partial(
    cashFree.requestTransfer,
    {
      beneId,
      amount: 10,
      transferId
    }
  )], // request

  getBalance: ['requestTransfer', cashFree.getBalance], // request

  listTransfers: ['getBalance', _.partial(
    cashFree.listTransfers,
    {}
  )], // request

  getTransfer: ['listTransfers', (callback, { listTransfers }) =>
    cashFree.getTransfer(_.last(listTransfers), callback)
  ], // request

  completedRequestsEnd: ['getTransfer', verifyRequestsComplete(12)],
  
}, (err, { getBeneficiaryId, getBeneficiary }) => {
  /* console.log(networkCache)*/
  if (err) {
    console.log(err);
    process.exit(1);
    return;
  }
  console.log('All tests successful');
  process.exit(0);
});

