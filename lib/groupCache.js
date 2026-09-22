const logger = require("./logger");
const { stripJidDevice, jidsEqual } = require("./utils");

const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

function set(groupId, metadata) {
  if (!groupId || !metadata) {
    return;
  }
  cache.set(groupId, {
    metadata,
    expiresAt: Date.now() + TTL_MS
  });
}

function get(groupId) {
  const entry = cache.get(groupId);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(groupId);
    return null;
  }
  return entry.metadata;
}

function invalidate(groupId) {
  cache.delete(groupId);
}

function clear() {
  cache.clear();
}

async function fetchMetadata(sock, groupId, force = false) {
  if (!force) {
    const cached = get(groupId);
    if (cached) {
      return cached;
    }
  }
  const metadata = await sock.groupMetadata(groupId);
  set(groupId, metadata);
  return metadata;
}

function findParticipant(metadata, jid) {
  if (!metadata || !Array.isArray(metadata.participants)) {
    return null;
  }
  return metadata.participants.find((item) => {
    return jidsEqual(item.id, jid)
      || jidsEqual(item.jid, jid)
      || jidsEqual(item.lid, jid)
      || jidsEqual(item.phoneNumber, jid);
  }) || null;
}

function getParticipantJids(metadata) {
  if (!metadata || !Array.isArray(metadata.participants)) {
    return [];
  }
  return metadata.participants
    .map((item) => stripJidDevice(item.id || item.jid || item.lid))
    .filter(Boolean);
}

function applyParticipantsUpdate(groupId, action, participants) {
  const metadata = get(groupId);
  if (!metadata) {
    return;
  }
  const current = Array.isArray(metadata.participants) ? [...metadata.participants] : [];
  if (action === "add") {
    for (const jid of participants) {
      if (!findParticipant({ participants: current }, jid)) {
        current.push({ id: jid, admin: null });
      }
    }
  } else if (action === "remove") {
    metadata.participants = current.filter((item) => !participants.some((jid) => jidsEqual(item.id, jid) || jidsEqual(item.jid, jid)));
    set(groupId, metadata);
    return;
  } else if (action === "promote" || action === "demote") {
    for (const item of current) {
      if (participants.some((jid) => jidsEqual(item.id, jid) || jidsEqual(item.jid, jid))) {
        item.admin = action === "promote" ? "admin" : null;
      }
    }
  }
  metadata.participants = current;
  set(groupId, metadata);
}

async function safeFetch(sock, groupId) {
  try {
    return await fetchMetadata(sock, groupId);
  } catch (err) {
    logger.warn("Failed to fetch group metadata", { groupId, error: err.message });
    return get(groupId);
  }
}

module.exports = {
  set,
  get,
  invalidate,
  clear,
  fetchMetadata,
  findParticipant,
  getParticipantJids,
  applyParticipantsUpdate,
  safeFetch
};
