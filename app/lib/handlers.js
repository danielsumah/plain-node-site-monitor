/**
 * handlers for handling routes
 *
 * */

//dependencies
const _data = require("./data");
const helpers = require("./helpers");

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

// users sub-handlers
handlers._users = {};

/**
 *
 * @TODO
 * only let authenticated users access their own data
 */
handlers._users.get = function (data, callback) {
  console.log(data.queryStringObject);
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 13
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    _data.read("users", phone, (err, data) => {
      if (!err) {
        delete data.hashedPassword;
        callback(200, data);
      } else {
        callback(404, { Error: "User does not exist" });
      }
    });
  } else {
    callback(400, {
      Error: "Phone number should be a 13 digit string starting with 234",
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
    data.payload.phone.trim().length === 13
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
              console.log(err);
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
    data.queryStringObject.phone.trim().length === 13
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
    data.queryStringObject.phone.trim().length == 13
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    _data.read("users", phone, (err, data) => {
      if (!err && data) {
        _data.delete("users", phone, (err) => {
          if (!err) {
            callback(200, { message: "User deleted" });
          } else {
            callback(500, { Error: "User could not be deleted" });
          }
        });
      } else {
        callback(500, { Error: "User does not exist" });
      }
    });
  } else {
    callback(204, { message: "Phone number must be in the right format" });
  }
};

//handles
handlers.sample = function (data, callback) {
  callback(406, { name: "this is sample handler" });
};

//notfound handler
handlers.notFound = function (data, callback) {
  callback(404);
};

module.exports = handlers;
