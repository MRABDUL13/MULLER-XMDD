const database = require("../../lib/database");

const ACTIONS = new Set(["on", "off", "warn", "kick"]);

module.exports = {
  name: "antilink",
  aliases: ["al"],
  category: "admin",
  description: "Configure per-group anti-link protection",
  usage: ".antilink on|off|warn|kick",
  permission: "admin",
  adminOnly: true,
  groupOnly: true,

  async execute({ chatId, args, helpers }) {
    const current = await database.getGroupSettings(chatId);
    const sub = (args[0] || "").toLowerCase();
    if (!sub) {
      await helpers.reply(
        [
          "Anti-Link",
          `Enabled: ${current.antilink.enabled ? "yes" : "no"}`,
          `Action: ${current.antilink.action}`,
          `Warnings: ${current.antilink.warnings}`,
          "",
          "Usage: .antilink on | off | warn | kick"
        ].join("\n")
      );
      return;
    }
    if (!ACTIONS.has(sub)) {
      await helpers.reply("Use: .antilink on | off | warn | kick");
      return;
    }
    if (sub === "on") {
      await database.updateGroupSettings(chatId, {
        antilink: { ...current.antilink, enabled: true }
      });
      await helpers.reply("Anti-link enabled.");
      return;
    }
    if (sub === "off") {
      await database.updateGroupSettings(chatId, {
        antilink: { ...current.antilink, enabled: false }
      });
      await helpers.reply("Anti-link disabled.");
      return;
    }
    await database.updateGroupSettings(chatId, {
      antilink: { ...current.antilink, enabled: true, action: sub }
    });
    await helpers.reply(`Anti-link action set to ${sub}.`);
  }
};
