module.exports = {
  name: "delete",
  aliases: ["del", "d"],
  category: "admin",
  description: "Delete a quoted message",
  usage: ".delete",
  permission: "admin",
  adminOnly: true,
  botAdmin: true,
  groupOnly: true,

  async execute({ sock, chatId, quoted, message, helpers, isBotAdmin }) {
    if (!quoted?.key?.id) {
      await helpers.reply("Reply to the message you want to delete.");
      return;
    }
    if (!isBotAdmin && !quoted.key.fromMe) {
      await helpers.reply("I need to be a group admin to delete other people's messages.");
      return;
    }
    try {
      await sock.sendMessage(chatId, { delete: quoted.key });
    } catch {
      await helpers.reply("That message could not be deleted.");
      return;
    }
    try {
      await sock.sendMessage(chatId, { delete: message.key });
    } catch {
      // Command message may already be gone or lack permission.
    }
  }
};
