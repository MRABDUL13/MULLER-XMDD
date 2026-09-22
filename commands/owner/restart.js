const logger = require("../../lib/logger");

module.exports = {
  name: "restart",
  aliases: [],
  category: "owner",
  description: "Restart the bot process",
  usage: ".restart",
  permission: "owner",

  async execute({ helpers, isOwner }) {
    if (!isOwner) {
      await helpers.reply("This command is restricted to the bot owner.");
      return;
    }
    await helpers.reply("Restarting...");
    logger.info("Owner requested restart");
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }
};
