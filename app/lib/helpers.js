/**
 * helper functions for various tasks like hashing etc
 */

// dependencies
const crypto = require("crypto");
const config = require("../config");

const helpers = {};

// hashers
helpers.hash = function (str) {
  if (typeof str == "string" && str.length > 0) {
    const hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = function (jsonString) {
  try {
    const object = JSON.parse(jsonString);
    return object;
  } catch {
    return {};
  }
};

helpers.createRandomStrings = function (strLength) {
  strLength = typeof strLength == "number" && strLength > 0 ? strLength : false;

  if (strLength) {
    const allowedCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let str = "";
    for (let i = 0; i < strLength; i++) {
      let randomCharacter = allowedCharacters.charAt(
        Math.floor(Math.random() * allowedCharacters.length)
      );
      str += randomCharacter;
    }
    return str;
  }
};

module.exports = helpers;
