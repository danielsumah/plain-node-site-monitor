/**
 * helper functions for various tasks like hashing etc
 */

// dependencies
const crypto = require("crypto");
const config = require("./config");
const queryString = require("querystring");
const https = require("https");

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

helpers.sendTwillioSms = function (phone, msg, callback) {
  phone =
    typeof phone == "string" && phone.trim().length == 14
      ? phone.trim()
      : false;
  msg =
    typeof msg == "string" && msg.trim().length > 0 && msg.trim().length <= 1600
      ? msg.trim()
      : false;

  if (phone && msg) {
    const payload = {
      From: config.twilio.fromPhone,
      To: phone,
      Body: msg,
    };

    const stringPayload = queryString.stringify(payload);

    const requestDetails = {
      protocol: "https:",
      hostname: "api.twilio.com",
      method: "POST",
      path:
        "/2010-04-01/Accounts/" + config.twilio.accountSid + "/Messages.json",
      auth: config.twilio.accountSid + ":" + config.twilio.authToken,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(stringPayload),
      },
    };

    const req = https.request(requestDetails, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        const status = res.statusCode;

        if (status == 200 || status == 201) {
          callback(false);
        } else {
          try {
            const parsedResponse = JSON.parse(responseData);
            console.log("\nTwilio Error:", parsedResponse.message);
            callback(parsedResponse.message);
          } catch (err) {
            console.log("\nError parsing Twilio response:", err);
            callback("\nAn error occurred while processing the request.");
          }
        }
      });
    });

    //Bind to error event so it does not get thrown
    req.on("error", (e) => {
      console.log(e);
      callback(e);
    });

    req.write(stringPayload);

    req.end(); // this sends the request
  }
};
module.exports = helpers;
