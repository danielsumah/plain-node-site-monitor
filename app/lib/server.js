const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");
const path = require("path");
const handlers = require("./handlers");
const helpers = require("./helpers");
const util = require("util");
const debug = util.debuglog("server");

const server = {};

// create http server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServerLogic(req, res);
});

// create https server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem")),
};

server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServerLogic(req, res);
  }
);

// initialize servers
server.init = function () {
  // start http server
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      "\x1b[35m%s\x1b[0m",
      `Server connected env: ${config.envName} port : ${config.httpPort}`
    );
  });

  //start https server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      "\x1b[36m%s\x1b[0m",
      `Server connected env: ${config.envName} port : ${config.httpsPort}`
    );
  });
};

// handles both http and https logic
server.unifiedServerLogic = function (req, res) {
  debug("A request hit the server");
  //parse the url
  const parseUrl = url.parse(req.url, true);
  const path = parseUrl.pathname;
  const trimmedPath = path.replace(/^\/|\/$/g, "");
  const requestQuery = parseUrl.query;

  const decoder = new StringDecoder("utf-8");
  buffer = "";
  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    // determine the handler to handle the request based on the route
    const requestHandler =
      typeof server.routes[trimmedPath] !== "undefined"
        ? handlers[trimmedPath]
        : handlers.notFound;

    //gather the important request data
    const data = {
      trimmedPath: trimmedPath,
      queryStringObject: requestQuery,
      method: req.method.toLowerCase(),
      headers: req.headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    requestHandler(data, (statusCode, payload) => {
      //specify some defaultstatus codes and payload
      statusCode = typeof statusCode == "number" ? statusCode : 200;

      payload = typeof payload == "object" ? payload : {};

      const stringifiedPayload = JSON.stringify(payload);

      res.setHeader("content-type", "application/json");
      res.writeHead(statusCode);
      res.end(stringifiedPayload);

      if (statusCode == 200 || statusCode == 201 || statusCode == 204) {
        debug(
          "\x1b[32m%s\x1b[0m",
          data.method.toUpperCase() +
            " /" +
            trimmedPath +
            " " +
            statusCode +
            " "
        );
      } else {
        debug(
          "\x1b[31m%s\x1b[0m",
          data.method.toUpperCase() +
            " /" +
            trimmedPath +
            " " +
            statusCode +
            " "
        );
      }
    });
  });
};

server.routes = {
  sample: handlers.sample,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

module.exports = server;
