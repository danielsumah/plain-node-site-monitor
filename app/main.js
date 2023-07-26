/**
 * Primary API file
 */

// Dependencies
const server = require("./lib/server");
const workers = require("./lib/workers");

const app = {};

app.init = function () {
  // start server
  server.init();

  // start worker
  workers.init();
};

app.init();

module.exports = app;
