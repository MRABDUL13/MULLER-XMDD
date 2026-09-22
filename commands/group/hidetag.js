const groupCache = require("../../lib/groupCache");
const { stripJidDevice } = require("../../lib/utils");

module.exports = {
  name: "hidetag",
  aliases: ["htag", "hide"],
  category: "group",
  description: "Mention all members without listing them",
  usage: ".hidetag [text]",
  permission: "admin",
  adminOnly: true,
  groupOnly: true,
  cooldown: 8000,

  async execute({ sock, chatId, args, helpers, message }) {
    const metadata = await groupCache.safeFetch(sock, chatId);
    if (!metadata?.participants?.length) {
      await helpers.reply("Unable to load group members.");
      return;
    }
    const mentions = metadata.participants
      .map((item) => stripJidDevice(item.id || item.jid))
      .filter(Boolean);
    const text = args.join(" ") || "Attention everyone.";
    await sock.sendMessage(chatId, { text, mentions }, { quoted: message });
  }
};
