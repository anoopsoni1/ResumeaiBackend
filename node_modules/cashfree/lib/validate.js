const { STATUS } = require('./constants');

module.exports = (state) => {
  if (!state || !state.clientId || !state.clientSecret) {
    return STATUS.UNINITIALIZED;
  }
  if (!state.token) {
    return STATUS.UNAUTHENTICATED;
  }
  if (state.token && !state.tokenVerified) {
    return STATUS.AUTHENTICATED;
  }
  if (state.tokenVerified) {
    return STATUS.TOKEN_VERIFIED;
  }
}
