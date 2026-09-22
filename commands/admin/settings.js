const database = require("../../lib/database");

module.exports = {
  name: "settings",
  aliases: ["gsettings"],
  category: "admin",
  description: "Show current group bot settings",
  usage: ".settings",
  permission: "admin",
  adminOnly: true,
  groupOnly: true,

  async execute({ chatId, helpers }) {
    const settings = await database.getGroupSettings(chatId);
    await helpers.reply(
      [
        "Group Settings",
        "",
        `Anti-link: ${settings.antilink.enabled ? "on" : "off"} (${settings.antilink.action})`,
        `Anti-link warnings: ${settings.antilink.warnings}`,
        `Welcome: ${settings.welcome.enabled ? "on" : "off"}`,
        `Goodbye: ${settings.goodbye.enabled ? "on" : "off"}`
      ].join("\n")
    );
  }
};
