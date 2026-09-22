const { getRuntimeStats } = require("../../lib/utils");
const { getAllCommands } = require("../../lib/commands");

module.exports = {
  name: "botinfo",
  aliases: ["info"],
  category: "general",
  description: "Display bot information and runtime statistics",
  usage: ".botinfo",
  permission: "public",

  async execute({ helpers, config }) {
    const stats = getRuntimeStats();
    await helpers.reply(
      [
        `${config.botName}`,
        "A modular, secure WhatsApp multi-device bot powered by Baileys v7.0.0-rc.14.",
        "",
        `Version: ${stats.version}`,
        `Mode: ${config.botMode}`,
        `Prefix: ${config.prefix}`,
        `Commands: ${getAllCommands().length}`,
        `Uptime: ${stats.uptime}`,
        `Node.js: ${stats.node}`,
        `Platform: ${stats.platform} (${stats.arch})`,
        `PID: ${stats.pid}`,
        `Memory RSS: ${stats.memory.rss}`,
        `Heap: ${stats.memory.heapUsed} / ${stats.memory.heapTotal}`
      ].join("\n")
    );
  }
};
