const database = require("../../lib/database");

module.exports = {
  name: "welcome",
  aliases: [],
  category: "admin",
  description: "Configure the group welcome message",
  usage: ".welcome on|off|message <text>",
  permission: "admin",
  adminOnly: true,
  groupOnly: true,

  async execute({ chatId, args, helpers }) {
    const current = await database.getGroupSettings(chatId);
    const sub = (args[0] || "").toLowerCase();
    if (!sub) {
      await helpers.reply(
        [
          "Welcome",
          `Enabled: ${current.welcome.enabled ? "yes" : "no"}`,
          `Message: ${current.welcome.message}`,
          "",
          "Usage:",
          ".welcome on",
          ".welcome off",
          ".welcome message Welcome {user} to {group}"
        ].join("\n")
      );
      return;
    }
    if (sub === "on") {
      await database.updateGroupSettings(chatId, {
        welcome: { ...current.welcome, enabled: true }
      });
      await helpers.reply("Welcome messages enabled.");
      return;
    }
    if (sub === "off") {
      await database.updateGroupSettings(chatId, {
        welcome: { ...current.welcome, enabled: false }
      });
      await helpers.reply("Welcome messages disabled.");
      return;
    }
    if (sub === "message") {
      const text = args.slice(1).join(" ").trim();
      if (!text) {
        await helpers.reply("Provide a message. Placeholders: {user} {name} {group} {count}");
        return;
      }
      await database.updateGroupSettings(chatId, {
        welcome: { ...current.welcome, message: text }
      });
      await helpers.reply("Welcome message updated.");
      return;
    }
    await helpers.reply("Use: .welcome on | off | message <text>");
  }
};
