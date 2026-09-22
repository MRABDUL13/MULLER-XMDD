const { formatUptime } = require("../../lib/utils");

module.exports = {
  name: "ping",
  aliases: ["p"],
  category: "general",
  description: "Check bot response speed",
  usage: ".ping",
  permission: "public",

  async execute({ message, helpers }) {
    const start = Date.now();
    const rawTs = Number(message.messageTimestamp || 0);
    const messageMs = rawTs > 0 && String(Math.trunc(rawTs)).length <= 10 ? rawTs * 1000 : rawTs;
    const fromMessage = messageMs ? Math.max(0, start - messageMs) : 0;
    await helpers.reply(
      `Pong!\n\nSpeed: ${fromMessage || Date.now() - start} ms\nUptime: ${formatUptime()}`
    );
  }
};
