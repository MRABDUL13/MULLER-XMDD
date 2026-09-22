const fs = require("node:fs");
const path = require("node:path");
const qrcode = require("qrcode-terminal");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers
} = require("@whiskeysockets/baileys");
const config = require("../config/config");
const logger = require("./logger");
const { sleep, getPhoneFromJid } = require("./utils");

let sock = null;
let reconnecting = false;
let shuttingDown = false;
let reconnectAttempts = 0;
let pairingRequested = false;
const MAX_RECONNECT_ATTEMPTS = 12;
const BASE_DELAY_MS = 2000;

function sessionPath() {
  return path.resolve(process.cwd(), config.sessionDir);
}

function ensureSessionDir() {
  const dir = sessionPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function shouldReconnect(statusCode) {
  return statusCode !== DisconnectReason.loggedOut
    && statusCode !== DisconnectReason.badSession
    && statusCode !== DisconnectReason.multideviceMismatch
    && statusCode !== DisconnectReason.forbidden;
}

function delayForAttempt(attempt) {
  const exp = Math.min(attempt, 8);
  const delay = BASE_DELAY_MS * (2 ** exp);
  return Math.min(delay, 60_000);
}

function describeDisconnect(statusCode) {
  switch (statusCode) {
    case DisconnectReason.connectionClosed:
      return "Connection closed";
    case DisconnectReason.connectionLost:
      return "Temporary network failure";
    case DisconnectReason.connectionReplaced:
      return "Connection replaced";
    case DisconnectReason.timedOut:
      return "Connection timed out";
    case DisconnectReason.restartRequired:
      return "Restart required";
    case DisconnectReason.unavailableService:
      return "Server-side disconnect";
    case DisconnectReason.badSession:
      return "Bad session";
    case DisconnectReason.loggedOut:
      return "Logged out";
    case DisconnectReason.multideviceMismatch:
      return "Multi-device mismatch";
    case DisconnectReason.forbidden:
      return "Forbidden";
    default:
      return "Unknown disconnect";
  }
}

async function requestPairingCode(socket) {
  if (!config.pairingNumber || pairingRequested) {
    return;
  }
  pairingRequested = true;
  try {
    const code = await socket.requestPairingCode(config.pairingNumber);
    logger.info("Pairing code generated. Enter it in WhatsApp Linked Devices.", {
      number: config.pairingNumber,
      code
    });
  } catch (err) {
    logger.error("Failed to request pairing code", { error: err.message });
    pairingRequested = false;
  }
}

async function createSocket(handlers) {
  if (sock && !shuttingDown) {
    logger.warn("A WhatsApp socket already exists. Reusing the current instance.");
    return sock;
  }
  ensureSessionDir();
  logger.info("Starting WhatsApp connection...");
  let version;
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
  } catch (err) {
    logger.warn("Could not fetch latest Baileys version, using library default", { error: err.message });
  }
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath());
  const pinoLogger = logger.child({ module: "baileys" });
  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pinoLogger)
    },
    logger: pinoLogger,
    browser: Browsers.ubuntu("Chrome"),
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    await onConnectionUpdate(update, handlers);
  });
  if (typeof handlers.register === "function") {
    handlers.register(sock);
  }
  return sock;
}

async function onConnectionUpdate(update, handlers) {
  const { connection, lastDisconnect, qr } = update;
  if (qr) {
    logger.info("QR code generated.");
    qrcode.generate(qr, { small: true });
    await requestPairingCode(sock);
  }
  if (connection === "open") {
    reconnectAttempts = 0;
    reconnecting = false;
    pairingRequested = false;
    const number = getPhoneFromJid(sock.user?.id || "");
    logger.info("WhatsApp connected.", { number, name: sock.user?.name || config.botName });
    if (typeof handlers.onReady === "function") {
      await handlers.onReady(sock);
    }
  }
  if (connection === "close") {
    const statusCode = lastDisconnect?.error?.output?.statusCode
      || lastDisconnect?.error?.status
      || lastDisconnect?.error?.output?.payload?.statusCode;
    const reason = describeDisconnect(statusCode);
    if (shuttingDown) {
      logger.info("Socket closed during shutdown.");
      return;
    }
    if (!shouldReconnect(statusCode)) {
      if (statusCode === DisconnectReason.loggedOut) {
        logger.error("Session logged out. Delete auth session and authenticate again.");
      } else if (statusCode === DisconnectReason.badSession) {
        logger.error("Bad session. Delete the auth folder and scan QR again.", { reason });
      } else {
        logger.error("Permanent disconnect. Not reconnecting.", { reason, statusCode });
      }
      sock = null;
      return;
    }
    logger.warn("Connection closed. Reconnecting...", { reason, statusCode, attempt: reconnectAttempts + 1 });
    await scheduleReconnect(handlers);
  }
}

async function scheduleReconnect(handlers) {
  if (reconnecting || shuttingDown) {
    return;
  }
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error("Maximum reconnect attempts reached. Stopping.");
    sock = null;
    return;
  }
  reconnecting = true;
  reconnectAttempts += 1;
  const wait = delayForAttempt(reconnectAttempts);
  logger.info("Waiting before reconnect", { waitMs: wait, attempt: reconnectAttempts });
  await sleep(wait);
  reconnecting = false;
  sock = null;
  pairingRequested = false;
  try {
    await createSocket(handlers);
  } catch (err) {
    logger.error("Reconnect failed", { error: err.message });
    await scheduleReconnect(handlers);
  }
}

async function start(handlers = {}) {
  shuttingDown = false;
  reconnectAttempts = 0;
  return createSocket(handlers);
}

async function closeSocket() {
  shuttingDown = true;
  if (!sock) {
    return;
  }
  try {
    sock.end(undefined);
  } catch (err) {
    logger.warn("Error while closing WhatsApp socket", { error: err.message });
  }
  sock = null;
}

function getSocket() {
  return sock;
}

function isShuttingDown() {
  return shuttingDown;
}

module.exports = {
  start,
  closeSocket,
  getSocket,
  isShuttingDown
};
