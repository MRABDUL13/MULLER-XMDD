const logger = require("../lib/logger");

function bind(sock) {
  sock.ev.on("connection.update", (update) => {
    if (update.connection) {
      logger.debug("Connection state changed", { connection: update.connection });
    }
  });
}

module.exports = { bind };
