/**
 * This file logs and rotates logs
 *
 */

//Dependencies
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const lib = {};

lib.baseDir = path.join(__dirname, "/../.logs/");

//Append a string to afile,create thefile if it does not eist

lib.append = function (file, str, callback) {
  fs.open(lib.baseDir + file + ".log", "a", (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, str + "\n", (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing file that had data appended to it");
            }
          });
        } else {
          callback("Could not append data to file");
        }
      });
    } else {
      callback("Could not open file for appending");
    }
  });
};

// list all the kigs abd optionally include the compressed logs
lib.list = (includeCompressLogs, callback) => {
  fs.readdir(lib.baseDir, function (err, files) {
    if (!err && files && files.length > 0) {
      let trimmedFileNamess = [];
      files.forEach((fileName) => {
        // Add the .og files
        if (fileName.indexOf(".log") > -1) {
          trimmedFileNamess.push(fileName.replace(".log", ""));
        }
        if (fileName.indexOf(".gz.b64") > -1 && includeCompressLogs) {
          trimmedFiles.push(fileName.replace(".gz.b64", ""));
        }
      });
      callback(false, trimmedFileNamess);
    } else {
      callback(err);
    }
  });
};

// compress the content of one .logfile into a .gz.664 file withing the same dir
lib.compress = function (logId, newFileId, callback) {
  let sourceFile = logId + ".log";
  let destinationFile = newFileId + ".gz.b64";

  //Read ssource file
  fs.readFile(lib.baseDir + sourceFile, "utf8", (err, inputString) => {
    if (!err && inputString) {
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          fs.open(
            lib.baseDir + destinationFile,
            "wx",
            (err, fileDescriptor) => {
              if (!err && fileDescriptor) {
                fs.writeFile(
                  fileDescriptor,
                  buffer.toString("base64"),
                  (err) => {
                    if (!err) {
                      fs.close(fileDescriptor, (err) => {
                        if (!err) {
                          callback(false);
                        } else {
                          callback(err);
                        }
                      });
                    } else {
                      callback(err);
                    }
                  }
                );
              } else {
                callback(err);
              }
            }
          );
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// ddon the .gz files
lib.decompress = (fileId, callback) => {
  let fileName = fileId + ".gz.b64";
  fs.readFile(lib.baseDir, "utf8", (err, str) => {
    if (!err && str) {
      //Decompress the data
      const inputBuffer = Buffer.from(str, "base64");
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const str = outputBuffer.toString;
          callback(false, str);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

lib.truncate = function (logId, callback) {
  fs.truncate(lib.baseDir + logId + ".log", 0, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};
module.exports = lib;
