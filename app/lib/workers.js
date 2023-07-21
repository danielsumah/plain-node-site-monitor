const fs = require("fs");
const _data = require("./data");
const http = require("http");
const https = require("https");
const helpers = require("./helpers");
const url = require("url");

const workers = {};

workers.gatherAllChecks = function () {
  _data.list("checks", (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        _data.read("check", check, (err, initialCheckData) => {
          if ((!err, initialCheckData)) {
            workers.validateCheckData(initialCheckData);
          } else {
            console.log("Error reading check data => ", check);
          }
        });
      });
    } else {
      console.log("Error: Could not find any check process");
    }
  });
};

workers.validateCheckData = (initialCheckData) => {
  initialCheckData =
    typeof initialCheckData == "object" && initialCheckData !== null
      ? initialCheckData
      : {};

  initialCheckData.id =
    typeof initialCheckData.id.trim() == "string" &&
    initialCheckData.id.trim().length == 20
      ? initialCheckData.id.trim()
      : false;

  initialCheckData.userPhone =
    typeof initialCheckData.userPhone.trim() == "string" &&
    initialCheckData.userPhone.trim().length == 13
      ? initialCheckData.userPhone.trim()
      : false;

  initialCheckData.protocal =
    typeof initialCheckData.protocal == "string" &&
    ["http", "https"].indexOf(initialCheckData.protocal) > -1
      ? initialCheckData.protocal
      : false;

  initialCheckData.url =
    typeof initialCheckData.url.trim() == "string" &&
    initialCheckData.url.trim().length > 0
      ? initialCheckData.url.trim()
      : false;

  initialCheckData.method =
    typeof initialCheckData.method == "string" &&
    ["get", "post", "put", "delete"].indexOf(initialCheckData.method) > -1
      ? initialCheckData.method
      : false;

  initialCheckData.successCodes =
    typeof initialCheckData.successCodes == "object" &&
    initialCheckData.successCodes instanceof Array &&
    initialCheckData.successCodes.length > 0
      ? initialCheckData.successCodes
      : false;

  initialCheckData.timeoutSeconds =
    typeof initialCheckData.timeoutSeconds == "number" &&
    initialCheckData.timeoutSeconds % 1 == 0 &&
    initialCheckData.timeoutSeconds >= 1 &&
    initialCheckData.timeoutSeconds <= 5
      ? initialCheckData.timeoutSeconds
      : false;

  // Set the keys that may not beset if the worker havenever seen this check before
  initialCheckData.state =
    typeof initialCheckData.state == "string" &&
    ["up", "down"].indexOf(initialCheckData.state) > -1
      ? initialCheckData.state
      : "down";

  initialCheckData.lastChecked =
    typeof initialCheckData.timeoutSeconds == "number" &&
    initialCheckData.timeoutSeconds >= 0
      ? initialCheckData.timeoutSeconds
      : false;

  // pass data to next step if all data props are valid

  if (
    initialCheckData.id &&
    initialCheckData.userPhone &&
    initialCheckData.protocal &&
    initialCheckData.userPhone &&
    initialCheckData.method &&
    initialCheckData.successCodes &&
    initialCheckData.timeoutSeconds &&
    initialCheckData.state &&
    initialCheckData.lastChecked
  ) {
    workers.performCheck(initialCheckData);
  } else {
    console.log(`A check data is not properly formatted`);
  }
};

// perform check, send the initialcheck data and the outcome

workers.performCheck = function (initialCheckData) {
  let checkOutcome = {
    error: false,
    responseCode: false,
  };

  let outcomeSent = false;

  // parse the hostname and the path out of the initial check data

  const parsedUrl = url.parse(
    initialCheckData.protocal + "://" + initialCheckData.url,
    true
  );
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path; // path not pathname so that I can get query string

  // construct request
  const requestDetails = {
    protocal: initialCheckData.protocal + ":",
    hostname: hostName,
    method: initialCheckData.method.toUpperCase(),
    path: path,
    timeout: initialCheckData.timeoutSeconds * 1000,
  };

  // instanciate using http or https
  const _moduleToUse = initialCheckData.protocal == "http" ? http : https;

  const req = _moduleToUse.request(requestDetails, (res) => {
    const status = res.statusCode;

    //update checkout and pass data along
    checkOutcome.responseCode = status;

    if (!outcomeSent) {
      workers.processCheckOutcome(initialCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  //   bind to the error event so it doesnt get thron

  req.on("error", (e) => {
    checkOutcome.error = {};
  });
};
