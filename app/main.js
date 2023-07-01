const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");
const handlers = require("./lib/handlers");
const helpers = require("./lib/helpers");

// create and start http server
const httpServer = http.createServer((req, res) => {
  unifiedServerLogic(req, res);
});
httpServer.listen(config.httpPort, () => {
  console.log(
    `Server connected env: ${config.envName} port : ${config.httpPort}`
  );
});

// create and start https server
const httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem"),
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServerLogic(req, res);
});
httpsServer.listen(config.httpsPort, () => {
  console.log(
    `Server connected env: ${config.envName} port : ${config.httpsPort}`
  );
});

// handles both http and https logic
const unifiedServerLogic = function (req, res) {
  console.log("some one hit the server");
  //parse the url
  const parseUrl = url.parse(req.url, true);
  const trimmedPath = parseUrl.path.replace(/^\/|\/$/g, "");
  const requestQuery = parseUrl.query;

  const decoder = new StringDecoder("utf-8");
  buffer = "";
  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    // determine the handler to handle the request based on the route
    const requestHandler =
      typeof routes[trimmedPath] !== "undefined"
        ? handlers[trimmedPath]
        : handlers.notFound;

    //gather the important request data
    const data = {
      trimmedPath: trimmedPath,
      queryStringObject: requestQuery,
      method: req.method.toLocaleLowerCase(),
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

      console.log("Sending response: ", statusCode, stringifiedPayload);
    });
  });
};

const routes = {
  sample: handlers.sample,
  users: handlers.users,
};
