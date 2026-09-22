const util = require("node:util");
const logger = require("../../lib/logger");
const { truncate } = require("../../lib/utils");

const BLOCKED = /\b(process\.env|child_process|fs\.promises|require\s*\(|import\s*\(|Function\s*\(|AsyncFunction)/i;

module.exports = {
  name: "eval",
  aliases: [],
  category: "owner",
  description: "Owner-only JavaScript evaluation",
  usage: ".eval <code>",
  permission: "owner",

  async execute({ args, helpers, isOwner }) {
    if (!isOwner) {
      await helpers.reply("This command is restricted to the bot owner.");
      return;
    }
    const code = args.join(" ").trim();
    if (!code) {
      await helpers.reply("Provide code to evaluate.");
      return;
    }
    if (BLOCKED.test(code)) {
      await helpers.reply("That expression is not allowed.");
      return;
    }
    try {
      const AsyncFunction = Object.getPrototypeOf(async function noop() {}).constructor;
      const wrapped = code.includes("return") ? code : `return (${code})`;
      const fn = new AsyncFunction(wrapped);
      const result = await fn();
      const output = truncate(util.inspect(result, { depth: 2, colors: false }), 1500);
      logger.debug("Owner eval executed");
      await helpers.reply(output);
    } catch (err) {
      logger.warn("Owner eval failed", { error: err.message });
      await helpers.reply("Evaluation failed.");
    }
  }
};
