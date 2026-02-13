const _ = require('lodash');
const async = require('async');
const chance = require('chance').Chance();

const validateSubCode = require('./subCodeValidator');

const getNetworkId = () => chance.guid();

const addNetworkTracking = (data, path) => _.set(
  data,
  'networkId',
  _.get(data, path) || getNetworkId()
);

const addRequestNetworkTracking =
  (hook) =>
    data => hook(addNetworkTracking(data, 'networkId'));

const addResponseNetworkTracking =
  (hook) =>
    data => hook(addNetworkTracking(data, 'config.networkId'));

const promisify = ({ hook, error, data, params }) => new Promise((resolve, reject) => {
  if (hook) {
    return hook({ error, data, params }, (err) => {
      const combinedError = err ? {
        hookError: err,
        networkId: _.get(error || data, 'networkId')
      } : error;
      if (combinedError) {
        return reject(combinedError);
      }
      return resolve(data);
    });
  }
  if (error) {
    return reject(error);
  }
  return resolve(data);
});

module.exports = ({ network, state }) => {
  const preHook = (data) => promisify({
    hook: state.preHook,
    data,
    params: _.pick(data, ['headers', 'method', 'baseURL', 'url', 'params', 'networkId'])
  });
  const preErrorHook = (error) => promisify({
    hook: state.preHook,
    error
  });
  const postHook = (data) => {
    const params = _.get(data, 'data');
    _.set(params, 'networkId', _.get(data, 'networkId'));
    const error = validateSubCode(_.get(params, 'subCode')) ? null: params;
    return promisify({
      hook: state.postHook,
      data,
      params: error ? null: params,
      error
    });
  }
  const postErrorHook = (error) => promisify({
    hook: state.postHook,
    error
  });
  network.interceptors.request.use(
    addRequestNetworkTracking(preHook),
    addRequestNetworkTracking(preErrorHook)
  );
  network.interceptors.response.use(
    addResponseNetworkTracking(postHook),
    addResponseNetworkTracking(postErrorHook)
  );
}
