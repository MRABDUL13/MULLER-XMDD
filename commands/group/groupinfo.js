const groupCache = require("../../lib/groupCache");

function countAdmins(metadata) {
  if (!metadata?.participants) {
    return 0;
  }
  return metadata.participants.filter((item) => item.admin === "admin" || item.admin === "superadmin").length;
}

function formatCreated(metadata) {
  if (!metadata?.creation) {
    return "unknown";
  }
  const date = new Date(Number(metadata.creation) * 1000);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  return date.toISOString().slice(0, 10);
}

module.exports = {
  name: "groupinfo",
  aliases: ["ginfo"],
  category: "group",
  description: "Display group information",
  usage: ".groupinfo",
  permission: "group",
  groupOnly: true,

  async execute({ sock, chatId, helpers }) {
    const metadata = await groupCache.safeFetch(sock, chatId);
    if (!metadata) {
      await helpers.reply("Unable to load group metadata right now.");
      return;
    }
    const owner = metadata.owner || metadata.ownerJid || "unknown";
    await helpers.reply(
      [
        "Group Info",
        "",
        `Name: ${metadata.subject || "unknown"}`,
        `ID: ${chatId}`,
        `Description: ${metadata.desc || "none"}`,
        `Members: ${metadata.participants?.length || 0}`,
        `Admins: ${countAdmins(metadata)}`,
        `Created: ${formatCreated(metadata)}`,
        `Owner: ${owner}`
      ].join("\n")
    );
  }
};
