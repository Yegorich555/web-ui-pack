/* eslint-disable @typescript-eslint/no-unused-vars */
const deadCode = "deadCode";
window.test = "dsd";
const messages = {
  require: "This field is required",
  min: "Min length is"
};

const messages2 = {
  require2: "This field is required",
  min2: "Min length is"
};

const message = { required: true };

console.warn(messages);
console.warn(messages2);
// eslint-disable-next-line dot-notation
console.warn(message["required"]);
