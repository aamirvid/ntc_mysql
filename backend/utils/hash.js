const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

function hashKey(key) {
  return bcrypt.hashSync(key, SALT_ROUNDS);
}

function compareKey(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

module.exports = { hashKey, compareKey };
