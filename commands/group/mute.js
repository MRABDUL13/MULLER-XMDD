module.exports = {
  name: "mute",
  aliases: ["close"],
  category: "group",
  description: "Mute the group so only admins can send messages",
  usage: ".mute",
  permission: "botadmin",
  adminOnly: true,
  botAdmin: true,
  groupOnly: true,

  async execute({ sock, chatId, helpers }) {
    try {
      await sock.groupSettingUpdate(chatId, "announcement");
      await helpers.reply("Group muted. Only admins can send messages.");
    } catch {
      await helpers.reply("Unable to mute the group.");
    }
  }
};
