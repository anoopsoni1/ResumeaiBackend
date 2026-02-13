const bufferModel = require('./');

const obj = {
  print: () => console.log('42'),
  value: 5
};

const test = (obj) => {
  obj.print();
  console.log(obj.value);
}

const { model, resolve } = bufferModel(obj);

test(model);

setTimeout(resolve, 3000);

test(model);