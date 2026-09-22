module.exports = {
  name: "owner",
  aliases: [],
  category: "general",
  description: "Display configured owner information",
  usage: ".owner",
  permission: "public",

  async execute({ helpers, config }) {
    const number = config.ownerNumber || "not configured";
    await helpers.reply(
      [
        `${config.botName} Owner`,
        "",
        `Name: ${config.ownerName}`,
        `Number: ${number}`
      ].join("\n")
    );
  }
};
