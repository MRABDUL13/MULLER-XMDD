const os = require("node:os");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const { jidNormalizedUser, areJidsSameUser } = require("@whiskeysockets/baileys");
const config = require("../config/config");

const startedAt = Date.now();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripJidDevice(jid) {
  if (!jid || typeof jid !== "string") {
    return "";
  }
  try {
    return jidNormalizedUser(jid) || jid.replace(/:\d+(?=@)/, "");
  } catch {
    return jid.replace(/:\d+(?=@)/, "");
  }
}

function getPhoneFromJid(jid) {
  const clean = stripJidDevice(jid);
  const user = clean.split("@")[0] || "";
  return user.replace(/[^\d]/g, "");
}

function normalizeJid(input) {
  if (!input) {
    return "";
  }
  const value = String(input).trim();
  if (value.includes("@")) {
    return stripJidDevice(value);
  }
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }
  return `${digits}@s.whatsapp.net`;
}

function toWhatsAppJid(phoneOrJid) {
  if (!phoneOrJid) {
    return "";
  }
  const raw = String(phoneOrJid).trim();
  if (raw.endsWith("@g.us") || raw.endsWith("@lid") || raw.endsWith("@s.whatsapp.net") || raw.endsWith("@broadcast")) {
    return stripJidDevice(raw);
  }
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  const e164 = parsed && parsed.isValid() ? parsed.number.replace("+", "") : digits;
  return `${e164}@s.whatsapp.net`;
}

function jidsEqual(a, b) {
  if (!a || !b) {
    return false;
  }
  try {
    if (areJidsSameUser(String(a), String(b))) {
      return true;
    }
  } catch {
    // fall through to phone-number comparison
  }
  const left = stripJidDevice(String(a));
  const right = stripJidDevice(String(b));
  if (left === right) {
    return true;
  }
  const leftPhone = getPhoneFromJid(left);
  const rightPhone = getPhoneFromJid(right);
  return Boolean(leftPhone && rightPhone && leftPhone === rightPhone);
}

function isGroupJid(jid) {
  return typeof jid === "string" && jid.endsWith("@g.us");
}

function isUserJid(jid) {
  return typeof jid === "string" && (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"));
}

function formatUptime(ms = Date.now() - startedAt) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) {
    parts.push(`${days}d`);
  }
  if (hours || parts.length) {
    parts.push(`${hours}h`);
  }
  if (minutes || parts.length) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes) || 0;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: formatBytes(usage.rss),
    heapUsed: formatBytes(usage.heapUsed),
    heapTotal: formatBytes(usage.heapTotal),
    external: formatBytes(usage.external)
  };
}

function getRuntimeStats() {
  const memory = getMemoryUsage();
  return {
    botName: config.botName,
    version: config.version,
    uptime: formatUptime(),
    node: process.version,
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    pid: process.pid,
    memory
  };
}

function extractMentionedJids(message) {
  const context = message?.message?.extendedTextMessage?.contextInfo
    || message?.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo
    || {};
  const mentioned = context.mentionedJid || [];
  return mentioned.map(stripJidDevice).filter(Boolean);
}

function extractQuotedMessage(message) {
  const context = message?.message?.extendedTextMessage?.contextInfo
    || message?.message?.imageMessage?.contextInfo
    || message?.message?.videoMessage?.contextInfo
    || message?.message?.documentMessage?.contextInfo
    || message?.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo
    || {};
  if (!context.quotedMessage && !context.stanzaId) {
    return null;
  }
  return {
    key: {
      remoteJid: message.key.remoteJid,
      fromMe: Boolean(context.fromMe),
      id: context.stanzaId,
      participant: context.participant
    },
    message: context.quotedMessage || null,
    participant: context.participant || "",
    text: extractTextFromContent(context.quotedMessage || {})
  };
}

function extractTextFromContent(content) {
  if (!content || typeof content !== "object") {
    return "";
  }
  if (content.conversation) {
    return content.conversation;
  }
  if (content.extendedTextMessage?.text) {
    return content.extendedTextMessage.text;
  }
  if (content.imageMessage?.caption) {
    return content.imageMessage.caption;
  }
  if (content.videoMessage?.caption) {
    return content.videoMessage.caption;
  }
  if (content.documentMessage?.caption) {
    return content.documentMessage.caption;
  }
  if (content.buttonsResponseMessage?.selectedButtonId) {
    return content.buttonsResponseMessage.selectedButtonId;
  }
  if (content.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return content.listResponseMessage.singleSelectReply.selectedRowId;
  }
  if (content.templateButtonReplyMessage?.selectedId) {
    return content.templateButtonReplyMessage.selectedId;
  }
  if (content.ephemeralMessage?.message) {
    return extractTextFromContent(content.ephemeralMessage.message);
  }
  if (content.viewOnceMessage?.message) {
    return extractTextFromContent(content.viewOnceMessage.message);
  }
  if (content.viewOnceMessageV2?.message) {
    return extractTextFromContent(content.viewOnceMessageV2.message);
  }
  if (content.viewOnceMessageV2Extension?.message) {
    return extractTextFromContent(content.viewOnceMessageV2Extension.message);
  }
  if (content.documentWithCaptionMessage?.message) {
    return extractTextFromContent(content.documentWithCaptionMessage.message);
  }
  return "";
}

function getMessageType(content) {
  if (!content || typeof content !== "object") {
    return "unknown";
  }
  const keys = Object.keys(content).filter((key) => key !== "messageContextInfo" && key !== "senderKeyDistributionMessage");
  return keys[0] || "unknown";
}

function parseCommand(text, prefix) {
  if (!text || typeof text !== "string") {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed.startsWith(prefix)) {
    return null;
  }
  const withoutPrefix = trimmed.slice(prefix.length).trim();
  if (!withoutPrefix) {
    return null;
  }
  const [name, ...args] = withoutPrefix.split(/\s+/);
  return {
    name: name.toLowerCase(),
    args,
    raw: withoutPrefix
  };
}

function sanitizeForLog(value) {
  if (value == null) {
    return value;
  }
  const text = String(value);
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "[redacted]")
    .replace(/(api[_-]?key|token|secret|password|session)[=:]\s*\S+/gi, "$1=[redacted]");
}

function truncate(text, max = 400) {
  const value = String(text || "");
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}...`;
}

function replacePlaceholders(template, values) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => {
    return values[key] != null ? String(values[key]) : `{${key}}`;
  });
}

function displayNameFromJid(jid) {
  const phone = getPhoneFromJid(jid);
  return phone ? `+${phone}` : jid;
}

function resolveTargets({ mentions = [], message, args = [] } = {}) {
  const fromMentions = (mentions || []).map(stripJidDevice).filter(Boolean);
  if (fromMentions.length) {
    return fromMentions;
  }
  const quoted = extractQuotedMessage(message);
  if (quoted?.participant) {
    return [stripJidDevice(quoted.participant)];
  }
  if (args[0]) {
    const jid = toWhatsAppJid(args[0]);
    return jid ? [jid] : [];
  }
  return [];
}

function startedTimestamp() {
  return startedAt;
}

module.exports = {
  sleep,
  stripJidDevice,
  getPhoneFromJid,
  normalizeJid,
  toWhatsAppJid,
  jidsEqual,
  isGroupJid,
  isUserJid,
  formatUptime,
  formatBytes,
  getMemoryUsage,
  getRuntimeStats,
  extractMentionedJids,
  extractQuotedMessage,
  extractTextFromContent,
  getMessageType,
  parseCommand,
  sanitizeForLog,
  truncate,
  replacePlaceholders,
  displayNameFromJid,
  resolveTargets,
  startedTimestamp
};
