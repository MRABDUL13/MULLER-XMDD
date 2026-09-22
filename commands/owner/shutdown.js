const logger = require("../../lib/logger");

module.exports = {
  name: "shutdown",
  aliases: ["stop"],
  category: "owner",
  description: "Shut down the bot gracefully",
  usage: ".shutdown",
  permission: "owner",

  async execute({ helpers, isOwner }) {
    if (!isOwner) {
      await helpers.reply("This command is restricted to the bot owner.");
      return;
    }
    await helpers.reply("Shutting down...");
    logger.info("Owner requested shutdown");
    process.emit("SIGINT");
  }
};
