const environments = {};

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: "staging",
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "production",
};

// determine which env was called by the command line
const currentEnv =
  typeof process.env.NODE_ENV == "string"
    ? process.env.NODE_ENV.toLocaleLowerCase()
    : "";

// check that the currentEnv is one of the env in the config
const envToExport =
  typeof environments[currentEnv] == "object"
    ? environments[currentEnv]
    : environments.staging;

module.exports = envToExport;
