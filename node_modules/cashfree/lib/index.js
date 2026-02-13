const _ = require('lodash');
const async = require('async');
const axios = require('axios');
const bufferMethods = require('buffer-methods');

const { URLS, TIMEOUT, STATUS } = require('./constants');
const validateState = require('./validate');
const validateSubCode = require('./subCodeValidator');
const addInterceptors = require('./interceptors');

const getNetwork = (options) => axios.create(_.extend({
  timeout: TIMEOUT
}, options));

const wrapResponse = (callback, handler) => (response) => {
  const data = _.get(response, 'data');
  const subCode = _.get(data, 'subCode');
  if (!validateSubCode(subCode)) {
    console.log(subCode, subCode[0]);
    return callback(data)
  }
  return handler({ data, subCode });
}

module.exports = function({ clientId, clientSecret, preHook, postHook, initialized, axiosConfig }) {
  const network = getNetwork(axiosConfig);
  const state = {
    clientId,
    clientSecret,
    preHook,
    postHook
  };

  addInterceptors({ network, state });
  
  const methods = {
    state,
    
    validate: () => validateState(state),
    
    authenticate: (callback) => network.request({
      url: URLS.AUTHENTICATE,
      method: 'post',
      headers: {
        'X-Client-Id': clientId,
        'X-Client-Secret': clientSecret
      }
    }).then(wrapResponse(callback, ({ data }) => {
      const token = _.get(data, 'data.token');
      if (!token) {
        return callback('No token returned');
      }
      _.set(state, 'token', token);
      network.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return callback();
    })).catch(callback),

    verifyToken: (callback) => network.request({
      url: URLS.VERIFY_TOKEN,
      method: 'post'
    }).then(wrapResponse(callback, ({ data }) => {
      _.set(state, 'tokenVerified', true);
      return callback();
    })).catch(callback),

    validateBeneficiary: (params, callback) => network.request({
      url: URLS.VERIFY_BENEFICIARY,
      method: 'get',
      params: _.pick(params, ['bankAccount', 'ifsc', 'name', 'phone'])
    }).then(wrapResponse(callback, ({ data }) => {
      const info = _.get(data, 'data', {});
      if (info.accountExists !== 'YES') {
        return callback(data);
      }
      return callback(null, info);
    })).catch(callback),

    addBeneficiary: (params, callback) => network.request({
      url: URLS.ADD_BENEFICIARY,
      method: 'post',
      data: _.pick(params, ['beneId', 'name', 'email', 'phone', 'bankAccount', 'ifsc', 'address1', 'address2 ', 'city', 'state', 'pincode '])
    }).then(wrapResponse(callback, ({ data }) => callback(null, data))
    ).catch(callback),

    getBeneficiary: (params, callback) => network.request({
      url: `${URLS.GET_BENEFICIARY}/${_.get(params, 'beneId')}`
    }).then(wrapResponse(callback, ({ data }) => callback(null, _.get(data, 'data')))
    ).catch(callback),

    getBeneficiaryId: (params, callback) => network.request({
      url: URLS.GET_BENEFICIARY_ID,
      params: _.pick(params, ['bankAccount', 'ifsc'])
    }).then(wrapResponse(callback, ({ data }) => callback(null, _.get(data, 'data.beneId')))
    ).catch(callback),

    getBeneficiaries: (params, callback) => network.request({
      url: URLS.GET_BENEFICIARIES,
      params: _.pick(params, ['maxReturn', 'lastReturnId']),
    }).then(wrapResponse(callback, ({ data }) => callback(null, _.get(data, 'data.beneficiaries', [])))
    ).catch(callback),

    removeBeneficiary: (params, callback) => network.request({
      url: URLS.REMOVE_BENEFICIARIES,
      method: 'post',
      data: _.pick(params, ['beneId', 'ifsc']),
    }).then(wrapResponse(callback, ({ data }) => callback(null, data))
    ).catch(callback),
    
    requestTransfer: (params, callback) => network.request({
      url: URLS.REQUEST_TRANSFER,
      method: 'post',
      data: _.pick(params, ['beneId', 'amount', 'transferId', 'transferMode', 'remarks ']),
    }).then(wrapResponse(callback, ({ data }) => callback(null, data))
    ).catch(callback),

    getBalance: (callback) => network.request({
      url: URLS.GET_BALANCE
    }).then(wrapResponse(callback, ({ data }) => callback(null, _.get(data, 'data')))
    ).catch(callback),

    listTransfers: (params, callback) => network.request({
      url: URLS.LIST_TRANSFERS,
      data: _.pick(params, ['maxReturn', 'lastReturnId']),
    }).then(wrapResponse(callback, ({ data }) => callback(null, _.get(data, 'data.transfers', [])))
    ).catch(callback),

    getTransfer: (params, callback) => network.request({
      url: URLS.GET_TRANSFER,
      params: _.pick(params, ['referenceId', 'transferId'])
    }).then(wrapResponse(callback, ({ data }) => callback(null, _.get(data, 'data')))
    ).catch(callback),
  }

  const isInitialized = _.isUndefined(initialized) ? true : initialized;

  if (!isInitialized) {
    return methods;
  }

  const { model, resolve } = bufferMethods(
    _.omit(
      methods,
      ['authenticate', 'verifyToken']
    )
  );

  let resolution = (counter) => async.series([
    methods.authenticate,
    methods.verifyToken
  ], err => {
    let timeout = counter || 1;
    if (err) {
      setTimeout(_.partial(resolution, timeout + 1), parseInt(Math.pow(2, timeout) * 500));
      return console.log('Error while authenticating cashfree is', err);
    }
    return resolve();
  });

  resolution();

  return model;
};
