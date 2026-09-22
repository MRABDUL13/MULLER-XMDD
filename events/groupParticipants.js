const database = require("../lib/database");
const groupCache = require("../lib/groupCache");
const logger = require("../lib/logger");
const { replacePlaceholders, stripJidDevice, getPhoneFromJid } = require("../lib/utils");

function mentionUser(jid) {
  return {
    text: `@${getPhoneFromJid(jid) || jid.split("@")[0]}`,
    mentions: [jid]
  };
}

async function sendTemplate(sock, groupId, template, participant, metadata) {
  const jid = stripJidDevice(participant);
  const mention = mentionUser(jid);
  const count = metadata?.participants?.length || 0;
  const body = replacePlaceholders(template, {
    user: mention.text,
    name: mention.text,
    group: metadata?.subject || "this group",
    count
  });
  await sock.sendMessage(groupId, {
    text: body,
    mentions: mention.mentions
  });
}

function bind(sock) {
  sock.ev.on("groups.update", (updates) => {
    for (const update of updates || []) {
      if (update.id) {
        groupCache.invalidate(update.id);
      }
    }
  });

  sock.ev.on("group-participants.update", async (event) => {
    try {
      const groupId = event.id;
      const action = event.action;
      const participants = event.participants || [];
      groupCache.applyParticipantsUpdate(groupId, action, participants);
      groupCache.invalidate(groupId);
      const metadata = await groupCache.safeFetch(sock, groupId);
      const settings = await database.getGroupSettings(groupId);

      if (action === "add" && settings.welcome?.enabled) {
        for (const participant of participants) {
          await sendTemplate(sock, groupId, settings.welcome.message, participant, metadata);
        }
      }

      if (action === "remove" && settings.goodbye?.enabled) {
        for (const participant of participants) {
          await sendTemplate(sock, groupId, settings.goodbye.message, participant, metadata);
        }
      }
    } catch (err) {
      logger.error("group-participants.update handler failed", { error: err.message });
    }
  });
}

module.exports = { bind };
