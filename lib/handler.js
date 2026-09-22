const config = require("../config/config");
const logger = require("./logger");
const database = require("./database");
const groupCache = require("./groupCache");
const permissions = require("./permissions");
const { getCommand } = require("./commands");
const {
  stripJidDevice,
  extractTextFromContent,
  extractQuotedMessage,
  extractMentionedJids,
  getMessageType,
  parseCommand,
  isGroupJid,
  jidsEqual,
  getPhoneFromJid,
  truncate
} = require("./utils");

const cooldowns = new Map();
const LINK_PATTERNS = [
  /https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/i,
  /https?:\/\/wa\.me\/[^\s]+/i,
  /https?:\/\/t(?:elegram)?\.me\/[^\s]+/i,
  /https?:\/\/(?:www\.)?discord(?:\.gg|\.com\/invite)\/[^\s]+/i,
  /https?:\/\/(?:www\.)?facebook\.com\/[^\s]+/i,
  /https?:\/\/(?:www\.)?fb\.com\/[^\s]+/i,
  /https?:\/\/(?:www\.)?instagram\.com\/[^\s]+/i,
  /https?:\/\/(?:www\.)?tiktok\.com\/[^\s]+/i,
  /https?:\/\/(?:www\.)?youtu(?:\.be|be\.com)\/[^\s]+/i,
  /https?:\/\/[^\s]+/i
];

function isWhitelistedUrl(text) {
  const domains = config.whitelistDomains || [];
  if (!domains.length) {
    return false;
  }
  try {
    const matches = text.match(/https?:\/\/[^\s]+/gi) || [];
    return matches.every((url) => {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
    });
  } catch {
    return false;
  }
}

function containsProhibitedLink(text) {
  if (!text) {
    return false;
  }
  if (isWhitelistedUrl(text)) {
    return false;
  }
  return LINK_PATTERNS.some((pattern) => pattern.test(text));
}

function cooldownKey(sender, commandName) {
  return `${sender}:${commandName}`;
}

function checkCooldown(sender, command, now) {
  const duration = Number(command.cooldown || config.commandCooldownMs || 0);
  if (!duration) {
    return { ok: true };
  }
  const key = cooldownKey(sender, command.name);
  const until = cooldowns.get(key) || 0;
  if (now < until) {
    return { ok: false, remaining: until - now };
  }
  cooldowns.set(key, now + duration);
  return { ok: true };
}

async function reply(sock, message, text) {
  await sock.sendMessage(message.key.remoteJid, { text }, { quoted: message });
}

function resolveSender(message) {
  const chatId = message.key.remoteJid;
  if (message.key.fromMe) {
    return stripJidDevice(message.key.participant || chatId);
  }
  if (isGroupJid(chatId)) {
    return stripJidDevice(message.key.participant || message.participant || "");
  }
  return stripJidDevice(chatId);
}

function getBotJid(sock) {
  const user = sock.user || {};
  return stripJidDevice(user.id || user.jid || "");
}

async function handleAntiLink(sock, ctx) {
  if (!ctx.isGroup || ctx.isOwner || ctx.isSenderAdmin || !ctx.text) {
    return false;
  }
  const settings = await database.getGroupSettings(ctx.chatId);
  if (!settings.antilink?.enabled) {
    return false;
  }
  if (!containsProhibitedLink(ctx.text)) {
    return false;
  }
  const action = settings.antilink.action || "warn";
  try {
    await sock.sendMessage(ctx.chatId, { delete: ctx.message.key });
  } catch (err) {
    logger.warn("Failed to delete link message", { error: err.message });
  }
  if (action === "off") {
    return true;
  }
  const count = await database.incrementWarning(ctx.chatId, ctx.sender);
  const limit = Number(settings.antilink.warnings || 3);
  await sock.sendMessage(ctx.chatId, {
    text: `Links are not allowed here.\nWarning ${count}/${limit}.`
  });
  if (action === "kick" && count >= limit) {
    if (ctx.isSenderAdmin && !settings.antilink.kickAdmins) {
      return true;
    }
    try {
      await sock.groupParticipantsUpdate(ctx.chatId, [ctx.sender], "remove");
      await database.resetWarning(ctx.chatId, ctx.sender);
    } catch (err) {
      logger.warn("Failed to kick after antilink warnings", { error: err.message });
    }
  }
  return true;
}

async function buildContext(sock, message) {
  const content = message.message || {};
  const text = extractTextFromContent(content).trim();
  const chatId = message.key.remoteJid;
  const sender = resolveSender(message);
  const senderPn = message.key.senderPn || message.senderPn || sender;
  const botJid = getBotJid(sock);
  const group = isGroupJid(chatId);
  let metadata = null;
  if (group) {
    metadata = await groupCache.safeFetch(sock, chatId);
  }
  const owner = permissions.isOwner(sender, senderPn) || permissions.isOwner(senderPn);
  const senderAdmin = group ? permissions.isAdmin(sender, metadata) || permissions.isAdmin(senderPn, metadata) : false;
  const botAdmin = group ? permissions.isBotAdmin(botJid, metadata) : false;
  const parsed = parseCommand(text, config.prefix);
  return {
    sock,
    message,
    chatId,
    sender,
    senderPn,
    botJid,
    isGroup: group,
    isPrivate: !group,
    isOwner: owner,
    isSenderAdmin: senderAdmin,
    isBotAdmin: botAdmin,
    metadata,
    text,
    args: parsed ? parsed.args : [],
    commandName: parsed ? parsed.name : null,
    quoted: extractQuotedMessage(message),
    mentions: extractMentionedJids(message),
    type: getMessageType(content),
    config,
    helpers: {
      reply: (body) => reply(sock, message, body),
      isOwner: () => owner,
      isAdmin: () => senderAdmin,
      isBotAdmin: () => botAdmin,
      isGroup: () => group,
      isPrivate: () => !group,
      getPhoneFromJid,
      jidsEqual
    }
  };
}

async function handleMessage(sock, message) {
  try {
    if (!message || !message.message || !message.key) {
      return;
    }
    if (message.key.remoteJid === "status@broadcast") {
      return;
    }
    if (message.message.protocolMessage) {
      return;
    }
    const ctx = await buildContext(sock, message);
    if (!ctx.sender) {
      return;
    }
    if (message.key.fromMe && !ctx.commandName) {
      return;
    }
    const blocked = await handleAntiLink(sock, ctx);
    if (blocked) {
      return;
    }
    if (!ctx.commandName) {
      return;
    }
    const command = getCommand(ctx.commandName);
    if (!command) {
      return;
    }
    const access = permissions.checkPermission(command, ctx);
    if (!access.ok) {
      await reply(sock, message, access.error);
      return;
    }
    const cool = checkCooldown(ctx.sender, command, Date.now());
    if (!cool.ok) {
      await reply(sock, message, `Please wait ${Math.ceil(cool.remaining / 1000)}s before using this command again.`);
      return;
    }
    logger.info("Executing command", {
      command: command.name,
      sender: getPhoneFromJid(ctx.senderPn || ctx.sender),
      chat: ctx.isGroup ? "group" : "private"
    });
    await command.execute(ctx);
  } catch (err) {
    logger.error("Command handler error", { error: err.message, stack: truncate(err.stack || "", 500) });
    try {
      await sock.sendMessage(message.key.remoteJid, {
        text: "Something went wrong while processing that command."
      }, { quoted: message });
    } catch (sendErr) {
      logger.error("Failed to send generic error message", { error: sendErr.message });
    }
  }
}

module.exports = {
  handleMessage,
  buildContext,
  containsProhibitedLink
};
