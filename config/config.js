const path = require("node:path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

function parseList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOwnerNumber(value) {
  if (!value) {
    return "";
  }
  return String(value).replace(/[^\d]/g, "");
}

const config = {
  botName: process.env.BOT_NAME || "MULLER-XMD",
  ownerNumber: normalizeOwnerNumber(process.env.OWNER_NUMBER),
  ownerName: process.env.OWNER_NAME || "Muller",
  prefix: process.env.PREFIX || ".",
  sessionDir: process.env.SESSION_DIR || "./auth",
  botMode: (process.env.BOT_MODE || "public").toLowerCase(),
  logLevel: process.env.LOG_LEVEL || "info",
  pairingNumber: normalizeOwnerNumber(process.env.PAIRING_NUMBER),
  whitelistDomains: parseList(process.env.WHITELIST_DOMAINS),
  antiCrash: String(process.env.ANTI_CRASH || "true").toLowerCase() !== "false",
  commandCooldownMs: Number(process.env.COMMAND_COOLDOWN_MS || 1500),
  broadcastDelayMs: Number(process.env.BROADCAST_DELAY_MS || 1500),
  version: "1.0.0",
  dataDir: path.join(process.cwd(), "data"),
  commandsDir: path.join(process.cwd(), "commands")
};

module.exports = config;
