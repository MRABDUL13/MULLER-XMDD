const config = require("./config/config");
const logger = require("./lib/logger");
const database = require("./lib/database");
const connection = require("./lib/connection");
const { loadCommands } = require("./lib/commands");
const messagesEvent = require("./events/messages");
const groupParticipantsEvent = require("./events/groupParticipants");
const connectionEvent = require("./events/connection");

let shuttingDown = false;

function registerEvents(sock) {
  connectionEvent.bind(sock);
  messagesEvent.bind(sock);
  groupParticipantsEvent.bind(sock);
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info("Graceful shutdown started", { signal });
  try {
    await connection.closeSocket();
  } catch (err) {
    logger.warn("Error closing WhatsApp socket", { error: err.message });
  }
  try {
    await database.close();
  } catch (err) {
    logger.warn("Error closing database", { error: err.message });
  }
  logger.info("Shutdown complete.");
  process.exit(0);
}

async function main() {
  await database.ensureDataFiles();
  loadCommands();
  if (!config.ownerNumber) {
    logger.warn("OWNER_NUMBER is not set. Owner commands will be unavailable.");
  }
  await connection.start({
    register: registerEvents,
    onReady: async (sock) => {
      logger.info(`${config.botName} is ready.`);
      if (sock.user?.id) {
        logger.info("Authenticated as", { jid: sock.user.id });
      }
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (config.antiCrash) {
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message });
  });
  process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error("Unhandled rejection", { error: message });
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", { error: err.message });
  process.exit(1);
});
