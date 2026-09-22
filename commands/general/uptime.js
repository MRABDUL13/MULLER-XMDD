const { formatUptime } = require("../../lib/utils");

module.exports = {
  name: "uptime",
  aliases: ["up"],
  category: "general",
  description: "Display formatted uptime",
  usage: ".uptime",
  permission: "public",

  async execute({ helpers }) {
    await helpers.reply(`Uptime: ${formatUptime()}`);
  }
};
