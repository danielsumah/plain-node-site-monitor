// dependencies
const fs = require("fs");
const path = require("path");

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
      callback(err, data);
    }
  );
};

module.exports = lib;
