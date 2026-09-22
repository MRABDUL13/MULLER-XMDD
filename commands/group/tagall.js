const groupCache = require("../../lib/groupCache");
const { getPhoneFromJid, stripJidDevice } = require("../../lib/utils");

module.exports = {
  name: "tagall",
  aliases: ["everyone"],
  category: "group",
  description: "Mention all group participants",
  usage: ".tagall [text]",
  permission: "admin",
  adminOnly: true,
  groupOnly: true,
  cooldown: 8000,

  async execute({ sock, chatId, args, helpers }) {
    const metadata = await groupCache.safeFetch(sock, chatId);
    if (!metadata?.participants?.length) {
      await helpers.reply("Unable to load group members.");
      return;
    }
    const mentions = metadata.participants
      .map((item) => stripJidDevice(item.id || item.jid))
      .filter(Boolean);
    const note = args.join(" ");
    const lines = mentions.map((jid) => `@${getPhoneFromJid(jid) || jid.split("@")[0]}`);
    await sock.sendMessage(chatId, {
      text: `TAG ALL${note ? `\n${note}` : ""}\n\n${lines.join("\n")}`,
      mentions
    });
  }
};
