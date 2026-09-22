const logger = require("../../lib/logger");
const { sleep, truncate } = require("../../lib/utils");

module.exports = {
  name: "broadcast",
  aliases: ["bc"],
  category: "owner",
  description: "Broadcast a message to all groups",
  usage: ".broadcast <text>",
  permission: "owner",
  cooldown: 30000,

  async execute({ sock, args, helpers, isOwner, config }) {
    if (!isOwner) {
      await helpers.reply("This command is restricted to the bot owner.");
      return;
    }
    const text = args.join(" ").trim();
    if (!text) {
      await helpers.reply("Provide a broadcast message.");
      return;
    }
    if (text.length > 2000) {
      await helpers.reply("Broadcast text is too long (max 2000 characters).");
      return;
    }
    let groups = [];
    try {
      groups = await sock.groupFetchAllParticipating();
    } catch (err) {
      logger.warn("Failed to fetch groups for broadcast", { error: err.message });
      await helpers.reply("Unable to load group list.");
      return;
    }
    const ids = Object.keys(groups || {});
    if (!ids.length) {
      await helpers.reply("No groups available for broadcast.");
      return;
    }
    await helpers.reply(`Broadcasting to ${ids.length} groups...`);
    let sent = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await sock.sendMessage(id, { text: `[${config.botName} Broadcast]\n\n${text}` });
        sent += 1;
      } catch {
        failed += 1;
      }
      await sleep(config.broadcastDelayMs);
    }
    logger.info("Broadcast completed", { sent, failed });
    await helpers.reply(`Broadcast finished.\nSent: ${sent}\nFailed: ${failed}`);
  }
};
