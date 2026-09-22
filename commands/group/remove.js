const { resolveTargets } = require("../../lib/utils");

module.exports = {
  name: "remove",
  aliases: [],
  category: "group",
  description: "Remove a member from the group",
  usage: ".remove @user",
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
    if (targets.some((jid) => ctx.helpers.jidsEqual(jid, ctx.botJid))) {
      await ctx.helpers.reply("I cannot remove myself with this command.");
      return;
    }
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.chatId, targets, "remove");
      await ctx.helpers.reply("Member removed.");
    } catch {
      await ctx.helpers.reply("Unable to remove that member.");
    }
  }
};
