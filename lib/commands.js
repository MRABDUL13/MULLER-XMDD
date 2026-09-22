const fs = require("node:fs");
const path = require("node:path");
const config = require("../config/config");
const { CATEGORY_LABELS } = require("../config/settings");
const logger = require("./logger");

const commands = new Map();
const aliases = new Map();

function isCommandModule(exported) {
  return Boolean(
    exported
    && typeof exported === "object"
    && typeof exported.name === "string"
    && typeof exported.execute === "function"
  );
}

function registerCommand(command, filePath) {
  const name = command.name.toLowerCase();
  if (commands.has(name)) {
    logger.warn("Duplicate command name skipped", { name, filePath });
    return;
  }
  const record = {
    ...command,
    name,
    aliases: Array.isArray(command.aliases) ? command.aliases.map((item) => String(item).toLowerCase()) : [],
    category: command.category || "general",
    description: command.description || "",
    usage: command.usage || `${config.prefix}${name}`,
    permission: command.permission || "public",
    cooldown: Number(command.cooldown || 0),
    filePath
  };
  commands.set(name, record);
  for (const alias of record.aliases) {
    if (commands.has(alias) || aliases.has(alias)) {
      logger.warn("Duplicate command alias skipped", { alias, name });
      continue;
    }
    aliases.set(alias, name);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function loadCommands() {
  commands.clear();
  aliases.clear();
  const root = config.commandsDir;
  if (!fs.existsSync(root)) {
    logger.warn("Commands directory not found", { root });
    return { commands, aliases };
  }
  const files = walk(root);
  for (const filePath of files) {
    try {
      delete require.cache[require.resolve(filePath)];
      const exported = require(filePath);
      if (!isCommandModule(exported)) {
        logger.warn("Invalid command module skipped", { filePath });
        continue;
      }
      registerCommand(exported, filePath);
    } catch (err) {
      logger.error("Failed to load command", { filePath, error: err.message });
    }
  }
  logger.info("Commands loaded", { count: commands.size, aliases: aliases.size });
  return { commands, aliases };
}

function getCommand(name) {
  const key = String(name || "").toLowerCase();
  if (commands.has(key)) {
    return commands.get(key);
  }
  if (aliases.has(key)) {
    return commands.get(aliases.get(key));
  }
  return null;
}

function getAllCommands() {
  return [...commands.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function getCommandsByCategory() {
  const grouped = {};
  for (const command of getAllCommands()) {
    const category = command.category || "general";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(command);
  }
  return grouped;
}

function buildMenu(prefix = config.prefix) {
  const grouped = getCommandsByCategory();
  const order = ["owner", "general", "group", "admin"];
  const lines = [
    `╭━━━〔 ${config.botName} 〕━━━╮`,
    "┃"
  ];
  const categories = [
    ...order.filter((key) => grouped[key]),
    ...Object.keys(grouped).filter((key) => !order.includes(key)).sort()
  ];
  for (const category of categories) {
    const label = CATEGORY_LABELS[category] || category.toUpperCase();
    lines.push(`┃ ${label}`);
    for (const command of grouped[category]) {
      lines.push(`┃ • ${prefix}${command.name}`);
    }
    lines.push("┃");
  }
  lines.push("╰━━━━━━━━━━━━━━━━━━╯");
  return lines.join("\n");
}

module.exports = {
  loadCommands,
  getCommand,
  getAllCommands,
  getCommandsByCategory,
  buildMenu,
  commands,
  aliases
};
