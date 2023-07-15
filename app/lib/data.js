// dependencies
const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");

const lib = {};

lib.baseDir = path.join(__dirname, "/../.data/");

// Write data to file
lib.create = function (dir, file, data, callback) {
  fs.open(
    lib.baseDir + dir + "/" + file + ".json",
    "wx",
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);
        fs.writeFile(fileDescriptor, stringData, function (err) {
          if (!err) {
            fs.close(fileDescriptor, function (err) {
              if (!err) {
                callback(false);
              } else {
                callback("Error closing new file");
              }
            });
          } else {
            callback("Error writing to file");
          }
        });
      } else {
        console.log(err);
        callback("Error creating new file, it may already exists");
      }
    }
  );
};

lib.read = function (dir, fileName, callback) {
  fs.readFile(
    lib.baseDir + dir + "/" + fileName + ".json",
    "utf8",
    function (err, data) {
      if (!err && data) {
        callback(err, helpers.parseJsonToObject(data));
      } else {
        callback(err, data);
      }
    }
  );
};

// Write data to file
lib.update = function (dir, file, data, callback) {
  fs.open(
    lib.baseDir + dir + "/" + file + ".json",
    "r+",
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);

        fs.ftruncate(fileDescriptor, (err) => {
          if (!err) {
            fs.writeFile(fileDescriptor, stringData, function (err) {
              if (!err) {
                fs.close(fileDescriptor, function (err) {
                  if (!err) {
                    callback(false);
                  } else {
                    callback("Error closing existing file");
                  }
                });
              } else {
                callback("Error writing to existing file");
              }
            });
          } else {
            callback("Error truncating file");
          }
        });
      } else {
        console.log(err);
        callback("Error pening file for editing, it may already exists");
      }
    }
  );
};

lib.delete = function (dir, file, callback) {
  fs.unlink(lib.baseDir + dir + "/" + file + ".json", function (err) {
    if (!err) {
      callback(false);
    } else callback("Error deleting file");
  });
};

module.exports = lib;
