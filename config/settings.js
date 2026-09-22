const DEFAULT_GROUP_SETTINGS = {
  antilink: {
    enabled: false,
    action: "warn",
    warnings: 3,
    kickAdmins: false
  },
  welcome: {
    enabled: false,
    message: "Welcome {user} to {group}!\n\nYou are member #{count}.\nPlease read the group rules and enjoy your stay."
  },
  goodbye: {
    enabled: false,
    message: "Goodbye {user}!\n\nThanks for being part of {group}."
  }
};

const PERMISSIONS = {
  PUBLIC: "public",
  GROUP: "group",
  ADMIN: "admin",
  BOT_ADMIN: "botadmin",
  OWNER: "owner"
};

const CATEGORY_LABELS = {
  owner: "OWNER",
  general: "GENERAL",
  group: "GROUP",
  admin: "ADMIN"
};

const CATEGORY_ICONS = {
  owner: "OWNER",
  general: "GENERAL",
  group: "GROUP",
  admin: "ADMIN"
};

module.exports = {
  DEFAULT_GROUP_SETTINGS,
  PERMISSIONS,
  CATEGORY_LABELS,
  CATEGORY_ICONS
};
