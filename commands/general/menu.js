const { buildMenu } = require("../../lib/commands");

module.exports = {
  name: "menu",
  aliases: ["help", "commands"],
  category: "general",
  description: "Show categorized command menu",
  usage: ".menu",
  permission: "public",

  async execute({ helpers, config }) {
    await helpers.reply(buildMenu(config.prefix));
  }
};
