const { handleMessage } = require("../lib/handler");
const logger = require("../lib/logger");

function bind(sock) {
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify" && type !== "append") {
      return;
    }
    for (const message of messages || []) {
      try {
        await handleMessage(sock, message);
      } catch (err) {
        logger.error("Unhandled messages.upsert error", { error: err.message });
      }
    }
  });
}

module.exports = { bind };
