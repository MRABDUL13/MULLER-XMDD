const { toWhatsAppJid } = require("../../lib/utils");

module.exports = {
  name: "add",
  aliases: [],
  category: "group",
  description: "Add a participant to the group",
  usage: ".add 234XXXXXXXXXX",
  permission: "botadmin",
  adminOnly: true,
  botAdmin: true,
  groupOnly: true,

  async execute({ sock, chatId, args, helpers }) {
    const input = (args[0] || "").trim();
    const jid = toWhatsAppJid(input);
    if (!jid) {
      await helpers.reply("Provide a valid phone number, for example: .add 234XXXXXXXXXX");
      return;
    }
    try {
      const result = await sock.groupParticipantsUpdate(chatId, [jid], "add");
      const status = Array.isArray(result) ? result[0]?.status : null;
      if (status && Number(status) >= 400) {
        await helpers.reply("WhatsApp rejected the add request. The user may need a group invite instead.");
        return;
      }
      await helpers.reply("Add request sent.");
    } catch {
      await helpers.reply("Unable to add that number. WhatsApp may require an invite link instead.");
    }
  }
};
