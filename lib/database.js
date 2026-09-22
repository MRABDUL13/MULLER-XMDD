const fs = require("node:fs/promises");
const path = require("node:path");
const config = require("../config/config");
const { DEFAULT_GROUP_SETTINGS } = require("../config/settings");
const logger = require("./logger");

const GROUPS_FILE = path.join(config.dataDir, "groups.json");
const SETTINGS_FILE = path.join(config.dataDir, "settings.json");
const writeQueues = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeGroupSettings(stored) {
  const base = clone(DEFAULT_GROUP_SETTINGS);
  if (!stored || typeof stored !== "object") {
    return base;
  }
  return {
    antilink: { ...base.antilink, ...(stored.antilink || {}) },
    welcome: { ...base.welcome, ...(stored.welcome || {}) },
    goodbye: { ...base.goodbye, ...(stored.goodbye || {}) },
    warnings: stored.warnings && typeof stored.warnings === "object" ? stored.warnings : {}
  };
}

async function ensureDataFiles() {
  await fs.mkdir(config.dataDir, { recursive: true });
  try {
    await fs.access(GROUPS_FILE);
  } catch {
    await fs.writeFile(GROUPS_FILE, "{}\n", "utf8");
  }
  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify({ bot: { name: config.botName, mode: config.botMode } }, null, 2) + "\n", "utf8");
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) {
      return clone(fallback);
    }
    return JSON.parse(raw);
  } catch (err) {
    logger.warn("Failed to read JSON store, using fallback", { file: path.basename(filePath), error: err.message });
    return clone(fallback);
  }
}

async function writeJsonAtomic(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  const payload = JSON.stringify(data, null, 2) + "\n";
  await fs.writeFile(tmpPath, payload, "utf8");
  await fs.rename(tmpPath, filePath);
}

function enqueueWrite(filePath, task) {
  const previous = writeQueues.get(filePath) || Promise.resolve();
  const next = previous.then(task, task);
  writeQueues.set(filePath, next.catch((err) => {
    logger.error("JSON store write failed", { file: path.basename(filePath), error: err.message });
  }));
  return next;
}

async function updateJson(filePath, fallback, mutator) {
  return enqueueWrite(filePath, async () => {
    const current = await readJson(filePath, fallback);
    const updated = await mutator(current);
    await writeJsonAtomic(filePath, updated);
    return updated;
  });
}

async function getAllGroupSettings() {
  await ensureDataFiles();
  return readJson(GROUPS_FILE, {});
}

async function getGroupSettings(groupId) {
  const all = await getAllGroupSettings();
  return mergeGroupSettings(all[groupId]);
}

async function updateGroupSettings(groupId, patch) {
  const all = await updateJson(GROUPS_FILE, {}, (current) => {
    const merged = mergeGroupSettings(current[groupId]);
    const next = {
      ...merged,
      ...patch,
      antilink: { ...merged.antilink, ...(patch.antilink || {}) },
      welcome: { ...merged.welcome, ...(patch.welcome || {}) },
      goodbye: { ...merged.goodbye, ...(patch.goodbye || {}) }
    };
    current[groupId] = next;
    return current;
  });
  return mergeGroupSettings(all[groupId]);
}

async function setGroupSetting(groupId, key, value) {
  return updateGroupSettings(groupId, { [key]: value });
}

async function incrementWarning(groupId, userJid) {
  const all = await updateJson(GROUPS_FILE, {}, (current) => {
    const merged = mergeGroupSettings(current[groupId]);
    merged.warnings = merged.warnings || {};
    merged.warnings[userJid] = (merged.warnings[userJid] || 0) + 1;
    current[groupId] = merged;
    return current;
  });
  return mergeGroupSettings(all[groupId]).warnings[userJid] || 0;
}

async function resetWarning(groupId, userJid) {
  await updateJson(GROUPS_FILE, {}, (current) => {
    const merged = mergeGroupSettings(current[groupId]);
    if (merged.warnings && merged.warnings[userJid]) {
      delete merged.warnings[userJid];
    }
    current[groupId] = merged;
    return current;
  });
}

async function close() {
  const pending = [...writeQueues.values()];
  writeQueues.clear();
  await Promise.allSettled(pending);
}

module.exports = {
  ensureDataFiles,
  getAllGroupSettings,
  getGroupSettings,
  updateGroupSettings,
  setGroupSetting,
  incrementWarning,
  resetWarning,
  close
};
