const database = require("../../lib/database");

module.exports = {
  name: "goodbye",
  aliases: ["bye"],
  category: "admin",
  description: "Configure the group goodbye message",
  usage: ".goodbye on|off|message <text>",
  permission: "admin",
  adminOnly: true,
  groupOnly: true,

  async execute({ chatId, args, helpers }) {
    const current = await database.getGroupSettings(chatId);
    const sub = (args[0] || "").toLowerCase();
    if (!sub) {
      await helpers.reply(
        [
          "Goodbye",
          `Enabled: ${current.goodbye.enabled ? "yes" : "no"}`,
          `Message: ${current.goodbye.message}`,
          "",
          "Usage:",
          ".goodbye on",
          ".goodbye off",
          ".goodbye message Goodbye {user}"
        ].join("\n")
      );
      return;
    }
    if (sub === "on") {
      await database.updateGroupSettings(chatId, {
        goodbye: { ...current.goodbye, enabled: true }
      });
      await helpers.reply("Goodbye messages enabled.");
      return;
    }
    if (sub === "off") {
      await database.updateGroupSettings(chatId, {
        goodbye: { ...current.goodbye, enabled: false }
      });
      await helpers.reply("Goodbye messages disabled.");
      return;
    }
    if (sub === "message") {
      const text = args.slice(1).join(" ").trim();
      if (!text) {
        await helpers.reply("Provide a message. Placeholders: {user} {name} {group} {count}");
        return;
      }
      await database.updateGroupSettings(chatId, {
        goodbye: { ...current.goodbye, message: text }
      });
      await helpers.reply("Goodbye message updated.");
      return;
    }
    await helpers.reply("Use: .goodbye on | off | message <text>");
  }
};
