const _ = require('lodash');

module.exports = (model) => {
  let _methodBuffer = [];
  let _resolved = false;
  const _model = _.reduce(
    _.keys(model),
    (acc, key) => {
      if (_.isFunction(model[key])) {
        acc[key] = (...args) => {
          if (!_resolved) {
            _methodBuffer.push({ key, args });
          } else {
            model[key](...args);
          }
        };
      } else {
        acc[key] = model[key];
      }
      return acc;
    },
    {}
  );
  return {
    model: _model,
    resolve: function (newModel) {
      _.extendWith(_model, model, newModel);
      _resolved = true;
      _.forEach(_methodBuffer, ({ key, args }) => model[key](...args));
      _methodBuffer = [];
    }
  }
};
