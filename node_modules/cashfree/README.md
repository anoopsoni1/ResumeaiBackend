# CashFree
Npm module for [CashFree](https://www.cashfree.com/)

# Supported Methods
authenticate,
verifyToken,
validateBeneficiary,
addBeneficiary,
getBeneficiary,
getBeneficiaryId,
getBeneficiaries,
removeBeneficiary,
requestTransfer,
getBalance,
listTransfers,
getTransfer

# Usage
```
const { CashFree } = require('cashfree');

const options = {
  clientId: process.env['CLIENT_ID'],
  clientSecret: process.env['CLIENT_SECRET'],
  preHook: function(params, callback) {
    console.log('request params', params);
    return callback();
  },
  postHook: function(params, callback) {
    console.log('response params', params);
    return callback();
  },
  axiosConfig: {
    // axios config
    baseURL: process.env['CASHFREE_BASE_URL']
  }
};

const cashFree = new CashFree(options);

```
