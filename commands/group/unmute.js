module.exports = {
  name: "unmute",
  aliases: ["open"],
  category: "group",
  description: "Unmute the group so everyone can send messages",
  usage: ".unmute",
  permission: "botadmin",
  adminOnly: true,
  botAdmin: true,
  groupOnly: true,

  async execute({ sock, chatId, helpers }) {
    try {
      await sock.groupSettingUpdate(chatId, "not_announcement");
      await helpers.reply("Group unmuted. All members can send messages.");
    } catch {
      await helpers.reply("Unable to unmute the group.");
    }
  }
};
