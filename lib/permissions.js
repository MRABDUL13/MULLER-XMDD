const config = require("../config/config");
const { PERMISSIONS } = require("../config/settings");
const { jidsEqual, getPhoneFromJid, isGroupJid } = require("./utils");

function isOwner(senderJid, senderPn) {
  const owner = config.ownerNumber;
  if (!owner) {
    return false;
  }
  const senderPhone = getPhoneFromJid(senderPn || senderJid);
  return senderPhone === owner || jidsEqual(senderJid, `${owner}@s.whatsapp.net`);
}

function isGroup(chatId) {
  return isGroupJid(chatId);
}

function isPrivate(chatId) {
  return !isGroupJid(chatId);
}

function isAdmin(senderJid, metadata) {
  if (!metadata || !Array.isArray(metadata.participants)) {
    return false;
  }
  const participant = metadata.participants.find((item) => {
    return jidsEqual(item.id, senderJid) || jidsEqual(item.jid, senderJid) || jidsEqual(item.lid, senderJid) || jidsEqual(item.phoneNumber, senderJid);
  });
  if (!participant) {
    return false;
  }
  return participant.admin === "admin" || participant.admin === "superadmin";
}

function isBotAdmin(botJid, metadata) {
  return isAdmin(botJid, metadata);
}

function getPermissionError(permission) {
  switch (permission) {
    case PERMISSIONS.OWNER:
      return "This command is restricted to the bot owner.";
    case PERMISSIONS.ADMIN:
      return "This command can only be used by group admins.";
    case PERMISSIONS.BOT_ADMIN:
      return "I need to be a group admin to run this command.";
    case PERMISSIONS.GROUP:
      return "This command can only be used in groups.";
    default:
      return "You do not have permission to use this command.";
  }
}

function checkPermission(command, ctx) {
  const required = command.permission || PERMISSIONS.PUBLIC;
  const groupOnly = command.groupOnly || required === PERMISSIONS.ADMIN || required === PERMISSIONS.BOT_ADMIN || required === PERMISSIONS.GROUP;

  if (config.botMode === "private" && !ctx.isOwner) {
    return { ok: false, error: "The bot is currently in private mode." };
  }

  if (required === PERMISSIONS.OWNER && !ctx.isOwner) {
    return { ok: false, error: getPermissionError(PERMISSIONS.OWNER) };
  }

  if (groupOnly && !ctx.isGroup) {
    return { ok: false, error: getPermissionError(PERMISSIONS.GROUP) };
  }

  if ((required === PERMISSIONS.ADMIN || command.adminOnly) && !ctx.isOwner && !ctx.isSenderAdmin) {
    return { ok: false, error: getPermissionError(PERMISSIONS.ADMIN) };
  }

  if ((required === PERMISSIONS.BOT_ADMIN || command.botAdmin) && !ctx.isBotAdmin) {
    return { ok: false, error: getPermissionError(PERMISSIONS.BOT_ADMIN) };
  }

  return { ok: true };
}

module.exports = {
  isOwner,
  isAdmin,
  isBotAdmin,
  isGroup,
  isPrivate,
  checkPermission,
  getPermissionError
};
