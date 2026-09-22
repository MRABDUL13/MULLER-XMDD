const { resolveTargets } = require("../../lib/utils");

module.exports = {
  name: "demote",
  aliases: [],
  category: "group",
  description: "Demote a group admin",
  usage: ".demote @user",
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
      await ctx.sock.groupParticipantsUpdate(ctx.chatId, targets, "demote");
      await ctx.helpers.reply("Member demoted.");
    } catch {
      await ctx.helpers.reply("Unable to demote that member.");
    }
  }
};
