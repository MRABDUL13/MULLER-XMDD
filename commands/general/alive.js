const { getRuntimeStats } = require("../../lib/utils");

module.exports = {
  name: "alive",
  aliases: ["a"],
  category: "general",
  description: "Show bot status and runtime info",
  usage: ".alive",
  permission: "public",

  async execute({ helpers, config }) {
    const stats = getRuntimeStats();
    await helpers.reply(
      [
        `${config.botName} is alive`,
        "",
        `Name: ${stats.botName}`,
        `Version: ${stats.version}`,
        `Uptime: ${stats.uptime}`,
        `Node.js: ${stats.node}`,
        `Platform: ${stats.platform}`,
        `Memory: ${stats.memory.heapUsed} / ${stats.memory.heapTotal}`
      ].join("\n")
    );
  }
};
