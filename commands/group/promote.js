const { resolveTargets } = require("../../lib/utils");

module.exports = {
  name: "promote",
  aliases: [],
  category: "group",
  description: "Promote a group member to admin",
  usage: ".promote @user",
  permission: "botadmin",
  adminOnly: true,
  botAdmin: true,
  groupOnly: true,

  async execute(ctx) {
    const targets = resolveTargets(ctx);
    if (!targets.length) {
      await ctx.helpers.reply("Mention a member, reply to their message, or provide a number.");
      return;
    }
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.chatId, targets, "promote");
      await ctx.helpers.reply("Member promoted.");
    } catch {
      await ctx.helpers.reply("Unable to promote that member.");
    }
  }
};
