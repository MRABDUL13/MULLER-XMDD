const pino = require("pino");
const config = require("../config/config");

const logger = pino({
  level: config.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { app: config.botName },
  transport: process.env.NODE_ENV === "production"
    ? undefined
    : {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname,app"
      }
    }
});

function info(message, extra) {
  extra ? logger.info(extra, message) : logger.info(message);
}

function warn(message, extra) {
  extra ? logger.warn(extra, message) : logger.warn(message);
}

function error(message, extra) {
  extra ? logger.error(extra, message) : logger.error(message);
}

function debug(message, extra) {
  extra ? logger.debug(extra, message) : logger.debug(message);
}

function child(bindings) {
  return logger.child(bindings);
}

module.exports = {
  logger,
  info,
  warn,
  error,
  debug,
  child
};
