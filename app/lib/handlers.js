/**
 * handlers for handling routes
 *
 * */

//dependencies
const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");
const handlers = {};
// users handlesr
handlers.users = function (data, callback) {
  const acceptableMethods = ["get", "post", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._users = {};

/**
 *
 * @TODO
 * only let authenticated users access their own data
 */
handlers._users.get = function (data, callback) {
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 14
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    const tokenId =
      typeof data.headers.token == "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(tokenId, phone, (tokenIsValid) => {
      if (tokenIsValid == false) {
        callback(403, {
          Error:
            "Missing required token in header or the token provided is invalid",
        });
      } else {
        _data.read("users", phone, (err, data) => {
          if (!err) {
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404, { Error: "User does not exist" });
          }
        });
      }
    });
  } else {
    callback(400, {
      Error: "Phone number should be a 14 digit string starting with 234",
    });
  }
};

handlers._users.post = function (data, callback) {
  // validate data
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length === 14
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  const tosAgreement =
    typeof data.payload.tosAgreement == "boolean" &&
    data.payload.tosAgreement == true
      ? true
      : false;
  if (firstName && lastName && phone && password && tosAgreement) {
    // hash the password
    _data.read("users", phone, function (err, data) {
      if (err) {
        // create the user
        const hashedPassword = helpers.hash(password);
        const userDetails = {
          firstName,
          lastName,
          phone,
          hashedPassword,
          tosAgreement,
        };
        if (hashedPassword) {
          _data.create("users", phone, userDetails, (err) => {
            if (!err) {
              callback(201);
            } else {
              callback(500, { Error: "Could not create the new user" });
            }
          });
        } else {
          callback(500, { Error: "Could not hash user's password" });
        }
      } else {
        callback(400, { Error: "A user with the phone number already exists" });
      }
    });
  } else {
    callback(400, {
      Error: "All user data must be provided in their right format",
    });
  }
};

handlers._users.put = function (data, callback) {
  //compulsory payload
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length === 14
      ? data.queryStringObject.phone.trim()
      : false;

  // optional payloads
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone) {
    const tokenId =
      typeof data.headers.token == "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(tokenId, phone, (tokenIsValid) => {
      if (!tokenIsValid) {
        callback(403, {
          Error:
            "Missing required token in header or the token provided is invalid",
        });
      } else {
        // check if user exists
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            let userDetailsUpdateObject = { ...data };
            // update user data
            if (firstName || lastName || password) {
              if (firstName) {
                userDetailsUpdateObject.firstName = firstName;
              }
              if (lastName) {
                userDetailsUpdateObject.lastName = lastName;
              }
              if (password) {
                userDetailsUpdateObject.hashedPassword = helpers.hash(password);
              }
            }
            _data.update("users", phone, userDetailsUpdateObject, (err) => {
              callback(201, { message: "User details have been updated" });
            });
          } else {
            callback(404, { Error: "User does not exist" });
          }
        });
      }
    });
  } else {
    callback(400, {
      Error:
        "phone number must be provided in the right format to update user details",
    });
  }
};

handlers._users.delete = function (data, callback) {
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 14
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    const tokenId =
      typeof data.headers.token == "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(tokenId, phone, (tokenIsValid) => {
      if (!tokenIsValid) {
        callback(403, {
          Error:
            "Missing required token in header or the token provided is invalid",
        });
      } else {
        _data.read("users", phone, (err, userData) => {
          if (!err && userData) {
            _data.delete("users", phone, (err) => {
              if (!err) {
                //delete all checks assiciated with this user
                const userChecks =
                  typeof userData.checks == "object" &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];
                const numberOfChecksToDelete = userChecks.length;
                if (numberOfChecksToDelete > 0) {
                  let deletedCount = 0;
                  let deletionErrors = false;
                  userChecks.forEach((checkId) => {
                    _data.delete("checks", checkId, (err) => {
                      if (err) {
                        deletionErrors = true;
                      }
                      deletedCount++;
                      if (deletedCount == numberOfChecksToDelete) {
                        if (!deletionErrors) {
                          callback(200, {
                            message:
                              "User deleted.Any check the user has has also been deleted",
                          });
                        } else {
                          callback(500, {
                            Error:
                              "Errors encountered when deleting user's check. The user may still have checks in the system",
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200, {
                    message:
                      "User deleted.Any check the user has has also been deleted",
                  });
                }
              } else {
                callback(500, { Error: "User could not be deleted" });
              }
            });
          } else {
            callback(500, { Error: "User does not exist" });
          }
        });
      }
    });
  } else {
    callback(204, { message: "Phone number must be in the right format" });
  }
};

// token handlesr
handlers.tokens = function (data, callback) {
  const acceptableMethods = ["get", "post", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._tokens = {};

// use phone and password to generate token
handlers._tokens.post = function (data, callback) {
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length === 14
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone && password) {
    // hash the password
    _data.read("users", phone, function (err, data) {
      if (!err && data) {
        // create the user
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == data.hashedPassword) {
          const tokenId = helpers.createRandomStrings(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };
          _data.create("tokens", tokenId, tokenObject, (err) => {
            if (!err) {
              callback(201, tokenObject);
            } else {
              callback(500, { Error: "Could not create the new token" });
            }
          });
          //store token in database
        } else {
          callback(400, { Error: "Passwords did not match" });
        }
      } else {
        callback(400, { Error: "A user with the phone number doesnot exists" });
      }
    });
  } else {
    callback(400, {
      Error: "Phone and password must be provided in the right format to login",
    });
  }
};

handlers._tokens.get = function (data, callback) {
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    _data.read("tokens", id, (err, data) => {
      if (!err) {
        callback(200, data);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {
      Error: "Token id is not provided in the right format",
    });
  }
};

handlers._tokens.put = function (data, callback) {
  //compulsory payload
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  // optional payloads
  const extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;

  if (id && extend) {
    // check if token exists
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          _data.update("tokens", id, tokenData, (err) => {
            if (!err) {
              callback(201);
            } else {
              callback(500, { Error: "Could not update token" });
            }
          });
        } else {
          callback(404, { Error: "Token has expired and cannot be extended" });
        }
      } else {
        callback(404, { Error: "Error fetching token" });
      }
    });
  } else {
    callback(400, {
      Error: "Cannot update token",
    });
  }
};

handlers._tokens.delete = function (data, callback) {
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    _data.read("tokens", id, (err, data) => {
      if (!err && data) {
        _data.delete("tokens", id, (err) => {
          if (!err) {
            callback(200, { message: "Token deleted" });
          } else {
            callback(500, { Error: "Token could not be deleted" });
          }
        });
      } else {
        callback(500, { Error: "Token does not exist" });
      }
    });
  } else {
    callback(404, { message: "Token id must be in the right format" });
  }
};

handlers._tokens.verifyToken = function (id, phone, callback) {
  _data.read("tokens", id, (err, tokenData) => {
    if (!err && tokenData) {
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// token handlesr
handlers.checks = function (data, callback) {
  const acceptableMethods = ["get", "post", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};
//checks
handlers._checks = {};
/**
 * checks post
 * @param { protocol, url, method, successCodes, timeoutSeconds} data
 * @param {statusCode, data} callback
 */
handlers._checks.post = function (data, callback) {
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["http", "https"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  const successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;
  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 == 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    _data.read("tokens", token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        _data.read("users", userPhone, (err, userData) => {
          if ((!err, userData)) {
            const userChecks =
              typeof userData.checks == "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];
            console.log(userChecks);
            //check that the user has less than the 5 checks which is the max checks
            if (userChecks.length < config.maxChecks) {
              const checkId = helpers.createRandomStrings(20);
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };

              _data.create("checks", checkId, checkObject, (err) => {
                if (!err) {
                  userData.checks = userChecks;
                  userData.checks.push(checkId);
                  _data.update("users", userPhone, userData, (err) => {
                    if (!err) {
                      callback(201, checkObject);
                    } else {
                      callback(200, {
                        Error: "Could not update the user with the new cheeck",
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not create new check" });
                }
              });
            } else {
              callback(400, {
                Error: `Your number of checks is at maximum ${config.maxChecks}`,
              });
            }
          } else {
            callback(400, {
              Error: "User with this phone number does not exist",
            });
          }
        });
      } else {
        callback(403, { Error: "Token must be provided" });
      }
    });
  } else {
    callback(400, { Error: "Invalid inputs provided" });
  }
};

handlers._checks.get = function (data, callback) {
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    const tokenId =
      typeof data.headers.token == "string" ? data.headers.token : false;
    if (tokenId) {
      _data.read("checks", id, (err, checkData) => {
        if (!err && checkData) {
          handlers._tokens.verifyToken(
            tokenId,
            checkData.userPhone,
            (tokenIsValid) => {
              if (tokenIsValid) {
                callback(200, checkData);
              } else {
                callback(403, {
                  Error: "Unauthorised ",
                });
              }
            }
          );
        } else {
          callback(404, { Error: "Check with the id provided does not exist" });
        }
      });
    } else {
      callback(404, { Error: "You must provide a token" });
    }
  } else {
    callback(400, {
      Error: "Phone number should be a 14 digit string starting with 234",
    });
  }
};

handlers._checks.put = function (data, callback) {
  // compulsory
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;

  //optional
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["http", "https"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  const successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;
  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 == 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  if (id) {
    if (protocol || url || method || successCodes || timeoutSeconds) {
      _data.read("checks", id, (err, checkData) => {
        if (!err && checkData) {
          const tokenId =
            typeof data.headers.token == "string" ? data.headers.token : false;

          handlers._tokens.verifyToken(
            tokenId,
            checkData.userPhone,
            (tokenIsValid) => {
              if (tokenIsValid) {
                // update check here

                if (protocol) {
                  checkData.protocol = protocol;
                }
                if (url) {
                  checkData.url = url;
                }
                if (method) {
                  checkData.method = method;
                }
                if (timeoutSeconds) {
                  checkData.timeoutSeconds = timeoutSeconds;
                }
                if (successCodes) {
                  checkData.successCodes = successCodes;
                }

                _data.update("checks", id, checkData, (err) => {
                  if (!err) {
                    callback(201, checkData);
                  } else {
                    callback(500, { Error: "Error updating check" });
                  }
                });
              } else {
                callback(403, {
                  Error: "Unauthorised ",
                });
              }
            }
          );
        } else {
          callback(404, { Error: "Check with that id does not exist" });
        }
      });
    } else {
      callback(400, { Error: "Invalid inputs provided" });
    }
  } else {
    callback(400, { Error: "Check id must be provided" });
  }
};

handlers._checks.delete = function (data, callback) {
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        const tokenId =
          typeof data.headers.token == "string" ? data.headers.token : false;
        handlers._tokens.verifyToken(
          tokenId,
          checkData.userPhone,
          (tokenIsValid) => {
            if (tokenIsValid) {
              _data.delete("checks", id, (err) => {
                if (!err) {
                  _data.read("users", checkData.userPhone, (err, userData) => {
                    if (!err && userData) {
                      const userChecks =
                        typeof userData.checks == "object" &&
                        userData.checks instanceof Array
                          ? userData.checks
                          : [];
                      //remove the deleted checks from user check list
                      const checkPosition = userChecks.indexOf(id);
                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1);
                        _data.update(
                          "users",
                          userData.phone,
                          userData,
                          (err) => {
                            if (!err) {
                              callback(201, {
                                message:
                                  "User data updated after deleting check",
                              });
                            } else {
                              callback(500, {
                                Error:
                                  "Could not update user data after finding deleting user",
                              });
                            }
                          }
                        );
                      } else {
                        callback(500, {
                          Error: "Could not find the check in user object",
                        });
                      }
                    } else {
                      callback(500, {
                        Error:
                          "Could not find the user who created the check. Hence, check could not be dissassociaated from the user",
                      });
                    }
                  });
                } else {
                  callback(400, {
                    Error: "Could not delete the check",
                  });
                }
              });
            } else {
              callback(403, {
                Error:
                  "Missing required token in header or the token provided is invalid",
              });
            }
          }
        );
      } else {
        callback(500, { Error: "Check does not exist" });
      }
    });
  } else {
    callback(404, { message: "Check id must be in the right format" });
  }
};
handlers.sample = function (data, callback) {
  callback(406, { name: "this is sample handler" });
};

//notfound handler
handlers.notFound = function (data, callback) {
  callback(404);
};

module.exports = handlers;
