const fs = require("fs");
const _data = require("./data");
const http = require("http");
const https = require("https");
const helpers = require("./helpers");
const url = require("url");
const _logs = require("./logs");
const util = require("util");
const debug = util.debuglog("workers");

const workers = {};

workers.gatherAllChecks = function () {
  _data.list("checks", (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        _data.read("checks", check, (err, originalCheckData) => {
          if ((!err, originalCheckData)) {
            workers.validateCheckData(originalCheckData);
          } else {
            debug("\nError reading check data => ", check);
            debug(err);
          }
        });
      });
    } else {
      debug("\nError: Could not find any check process");
    }
  });
};

workers.validateCheckData = (originalCheckData) => {
  originalCheckData =
    typeof originalCheckData == "object" && originalCheckData !== null
      ? originalCheckData
      : {};

  originalCheckData.id =
    typeof originalCheckData.id.trim() == "string" &&
    originalCheckData.id.trim().length == 20
      ? originalCheckData.id.trim()
      : false;

  originalCheckData.userPhone =
    typeof originalCheckData.userPhone.trim() == "string" &&
    originalCheckData.userPhone.trim().length == 14
      ? originalCheckData.userPhone.trim()
      : false;

  originalCheckData.protocol =
    typeof originalCheckData.protocol == "string" &&
    ["http", "https"].indexOf(originalCheckData.protocol) > -1
      ? originalCheckData.protocol
      : false;

  originalCheckData.url =
    typeof originalCheckData.url.trim() == "string" &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;

  originalCheckData.method =
    typeof originalCheckData.method == "string" &&
    ["get", "post", "put", "delete"].indexOf(originalCheckData.method) > -1
      ? originalCheckData.method
      : false;

  originalCheckData.successCodes =
    typeof originalCheckData.successCodes == "object" &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;

  originalCheckData.timeoutSeconds =
    typeof originalCheckData.timeoutSeconds == "number" &&
    originalCheckData.timeoutSeconds % 1 == 0 &&
    originalCheckData.timeoutSeconds >= 1 &&
    originalCheckData.timeoutSeconds <= 5
      ? originalCheckData.timeoutSeconds
      : false;

  // Set the keys that may not beset if the worker havenever seen this check before
  originalCheckData.state =
    typeof originalCheckData.state == "string" &&
    ["up", "down"].indexOf(originalCheckData.state) > -1
      ? originalCheckData.state
      : "down";

  originalCheckData.lastChecked =
    typeof originalCheckData.timeoutSeconds == "number" &&
    originalCheckData.timeoutSeconds >= 0
      ? originalCheckData.timeoutSeconds
      : false;

  // pass data to next step if all data props are valid

  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.userPhone &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    debug(
      `\nA check data (${originalCheckData.id}) is not properly formatted \n\t data: `,
      originalCheckData
    );
  }
};

// perform check, send the initialcheck data and the outcome

workers.performCheck = function (originalCheckData) {
  let checkOutcome = {
    error: false,
    responseCode: false,
  };

  let outcomeSent = false;

  // parse the hostname and the path out of the initial check data

  const parsedUrl = url.parse(
    originalCheckData.protocol + "://" + originalCheckData.url,
    true
  );
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path; // path not pathname so that I can get query string

  // construct request
  const requestDetails = {
    protocol: originalCheckData.protocol + ":",
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path: path,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  // instanciate using http or https
  const _moduleToUse = originalCheckData.protocol == "http" ? http : https;

  const req = _moduleToUse.request(requestDetails, (res) => {
    const status = res.statusCode;

    //update checkout and pass data along
    checkOutcome.responseCode = status;
    debug("\n");
    debug(originalCheckData.url, checkOutcome);

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  //   bind to the error event so it doesnt get thron

  req.on("error", (e) => {
    checkOutcome.error = {
      error: true,
      value: e,
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout
  req.on("timeout", (e) => {
    checkOutcome.error = {
      error: true,
      value: "timeout",
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// process the check outcome, update the check data as needed and finally, trigger an alert
// Special logic for acheck that has never been tested before
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
  // decide if the check status is up or own
  let state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? "up"
      : "down";

  const alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  let timeOfCheck = Date.now();
  workers.log(
    originalCheckData,
    checkOutcome,
    state,
    alertWarranted,
    timeOfCheck
  );

  //update the check data
  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  _data.update("checks", newCheckData.id, newCheckData, (err) => {
    if (!err) {
      if (alertWarranted) {
        workers.alertUserAboutStatusChange(newCheckData);
      } else {
        debug(
          `\nCheck status for ${newCheckData.id} => ${newCheckData.url} new has not changed, no alert is needed`
        );
      }
    } else {
      debug("\nError trying to save update to one of the check");
    }
  });
};

workers.alertUserAboutStatusChange = (newCheckData) => {
  const msg = `Your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}`;

  helpers.sendTwillioSms(newCheckData.userPhone, msg, (err) => {
    if (!err) {
      debug("\nUser was alerted, message: ", msg);
    } else {
      debug(
        "\nUnable to send sms to user who had a state change in their check"
      );
    }
  });
};

workers.log = (
  originalCheckData,
  checkOutcome,
  state,
  alertWarranted,
  timeOfCheck
) => {
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state: state,
    alert: alertWarranted,
    time: timeOfCheck,
  };
  const stringLogData = JSON.stringify(logData);
  const logFileName = originalCheckData.id;

  _logs.append(logFileName, stringLogData, (err) => {
    if (!err) {
      debug("\nLog to file successful");
    } else {
      debug("\nLog to file failed");
    }
  });
};
// timer to execute the workers process once per minute
workers.loop = function () {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 5);
};

workers.rotateLogs = function () {
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach((logName) => {
        let logId = logName.replace(".log", "");
        let newFileId = logId + "-" + Date.now();
        _logs.compress(logId, newFileId, (err) => {
          if (!err) {
            _logs.truncate(logId, (err) => {
              if (!err) {
                debug("\n Success truncating log file");
              } else {
                debug("\n Error truncating log file");
              }
            });
          }
        });
      });
    } else {
      debug("Error compressing one of the logs");
    }
  });
};

workers.startLogRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

workers.init = function () {
  console.log("\x1b[33m%s\x1b[0m", "Workers have started running");
  workers.gatherAllChecks();
  workers.loop();
  //compress all logs immediately
  workers.rotateLogs();
  //log rotation loop
  workers.startLogRotationLoop();
};

module.exports = workers;
