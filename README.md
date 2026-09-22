# MULLER-XMD

A modular, secure WhatsApp multi-device bot powered by Baileys v7.0.0-rc14.

MULLER-XMD is built for VPS, cPanel Node.js, and similar Node.js hosting. It uses a command registry, JSON-backed group settings, permission middleware, reconnection with exponential backoff, and graceful shutdown.

## Features

- Multi-device WhatsApp connection via Baileys v7.0.0-rc14
- QR login and optional pairing-code login
- Automatic session persistence in `auth/`
- Automatic reconnection with exponential backoff
- Permanent logout detection (no infinite reconnect loop)
- Dynamic command loading with aliases
- Permission middleware: public, group, admin, bot-admin, owner
- Command cooldown / rate limiting
- Per-group anti-link, welcome, and goodbye settings
- Group moderation: tagall, hidetag, promote, demote, kick, mute, unmute
- Owner tools: eval (restricted), restart, shutdown, broadcast
- Structured logging with pino
- JSON storage designed to be replaced later with SQLite/MySQL
- Graceful SIGINT/SIGTERM shutdown
- Anti-crash handlers for uncaught exceptions and unhandled rejections

## Requirements

- Node.js 20 or newer
- npm 9 or newer
- A WhatsApp account that can use Linked Devices
- Outbound HTTPS access to WhatsApp servers

## Installation

```bash
git clone <your-repo-url> muller-xmd
cd muller-xmd
cp .env.example .env
npm install
```

Edit `.env` before the first start.

## Configuration

Copy `.env.example` to `.env` and set:

```bash
BOT_NAME=MULLER-XMD
OWNER_NUMBER=234XXXXXXXXXX
OWNER_NAME=Muller
PREFIX=.
SESSION_DIR=./auth
BOT_MODE=public
LOG_LEVEL=info
PAIRING_NUMBER=
WHITELIST_DOMAINS=
ANTI_CRASH=true
COMMAND_COOLDOWN_MS=1500
BROADCAST_DELAY_MS=1500
```

Notes:

- `OWNER_NUMBER` must be digits only, country code included, no plus sign.
- `BOT_MODE=private` restricts commands to the owner.
- `PAIRING_NUMBER` enables pairing-code login instead of (or in addition to) QR.
- `WHITELIST_DOMAINS` is a comma-separated list of domains that anti-link will ignore.
- Never commit `.env` or the `auth/` session folder.

## Authentication

1. Start the bot with `npm start`.
2. If no session exists, a QR code is printed in the terminal.
3. Open WhatsApp on your phone: Linked Devices -> Link a Device, then scan the QR.
4. If `PAIRING_NUMBER` is set, a pairing code is also printed. Enter it under Linked Devices.
5. Credentials are stored in `SESSION_DIR` (default `./auth`). Keep this folder private.

If the session is logged out, delete the `auth/` folder and authenticate again.

## Running locally

```bash
npm install
npm start
```

Development mode with file watching:

```bash
npm run dev
```

The bot logs connection state, QR generation, and command execution. It does not log secrets, tokens, or eval output.

## VPS deployment

Example on Ubuntu with systemd:

```bash
sudo apt update
sudo apt install -y nodejs npm
node -v
```

Install the project, then create `/etc/systemd/system/muller-xmd.service`:

```ini
[Unit]
Description=MULLER-XMD WhatsApp Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/muller-xmd
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/muller-xmd/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable muller-xmd
sudo systemctl start muller-xmd
sudo systemctl status muller-xmd
```

Use `journalctl -u muller-xmd -f` to follow logs. The first start still needs a terminal QR scan or pairing code unless `auth/` already contains a valid session.

A process manager such as PM2 also works:

```bash
npm install -g pm2
pm2 start index.js --name muller-xmd
pm2 save
pm2 startup
```

## cPanel Node.js deployment

1. Upload the project (without `node_modules/` and without `auth/` unless you intend to reuse a session).
2. In cPanel, open Setup Node.js App.
3. Choose Node.js 20+.
4. Set the application root to the project folder.
5. Set the application startup file to `index.js`.
6. Add environment variables from `.env.example`.
7. Run npm install from the cPanel Node.js interface.
8. Start the app and open the app log to scan the QR or read the pairing code.

cPanel process restarts will reuse `auth/` if that folder is writable and persisted.

## Command list

Prefix is configurable (`PREFIX` in `.env`, default `.`).

### General

| Command | Description |
| --- | --- |
| `.ping` / `.p` | Response latency and uptime |
| `.alive` | Bot name, version, uptime, Node.js, platform, memory |
| `.menu` / `.help` | Categorized menu generated from the command registry |
| `.owner` | Configured owner name and number |
| `.botinfo` | Runtime statistics |
| `.uptime` | Formatted uptime |

### Group

| Command | Permission | Description |
| --- | --- | --- |
| `.groupinfo` | Group | Name, ID, description, members, admins, created, owner |
| `.tagall` | Admin | Mention all members |
| `.hidetag` | Admin | Hidden mention of all members |
| `.promote @user` | Admin + bot admin | Promote a member |
| `.demote @user` | Admin + bot admin | Demote an admin |
| `.kick @user` | Admin + bot admin | Remove a member |
| `.remove @user` | Admin + bot admin | Remove a member |
| `.add 234XXXXXXXXXX` | Admin + bot admin | Add a number where WhatsApp allows it |
| `.mute` | Admin + bot admin | Admins-only chat |
| `.unmute` | Admin + bot admin | Allow all members to chat |

### Admin

| Command | Permission | Description |
| --- | --- | --- |
| `.antilink on\|off\|warn\|kick` | Admin | Per-group anti-link |
| `.welcome on\|off\|message` | Admin | Join messages with `{user} {name} {group} {count}` |
| `.goodbye on\|off\|message` | Admin | Leave messages |
| `.delete` | Admin + bot admin | Delete the quoted message |
| `.settings` | Admin | Show group bot settings |

### Owner

| Command | Description |
| --- | --- |
| `.eval <code>` | Restricted owner-only evaluation |
| `.restart` | Exit so a process manager can restart |
| `.shutdown` | Graceful stop |
| `.broadcast <text>` | Rate-limited group broadcast |

`.menu` is built from loaded commands, not a hardcoded duplicate list.

## Permission system

Every command declares a `permission` field. The handler runs a shared middleware instead of copying checks into each file.

- `public`: everyone (unless `BOT_MODE=private`)
- `group`: groups only
- `admin`: group admins or owner
- `botadmin`: sender admin and bot admin
- `owner`: configured `OWNER_NUMBER` only

Owner detection uses the sender phone number from the WhatsApp JID. Group admin and bot-admin status use cached group metadata.

Failed checks return a short, safe error. Stack traces, file paths, and secrets are never sent to chat.

## Troubleshooting

**QR does not appear**

- Confirm the process is attached to a terminal.
- Set `LOG_LEVEL=info`.
- Delete a corrupted `auth/` folder and start again.

**Logged out immediately**

- Another device may have replaced the session.
- Delete `auth/` and link again. The bot will not reconnect after a permanent logout.

**Commands do not run**

- Confirm `PREFIX` matches what you type.
- In private mode only the owner can run commands.
- Group admin commands require both sender admin and, where marked, bot admin.

**Anti-link is not deleting messages**

- The bot must be a group admin.
- Check `.settings` and `.antilink`.
- Add trusted hosts to `WHITELIST_DOMAINS` if false positives appear.

**Add participant fails**

- WhatsApp often rejects adding private numbers. Send an invite link instead.

**cPanel or VPS keeps restarting during QR login**

- Keep the process alive long enough to scan.
- After the first successful login, `auth/` is reused automatically.

## Security notes

- Never commit `.env` or `auth/`.
- Owner commands are blocked for everyone except `OWNER_NUMBER`.
- `.eval` is owner-only and blocks `process.env`, `child_process`, dynamic `require`, and `Function`.
- Eval output is not written to info logs.
- Command errors send a generic chat message and a structured log without secrets.
- Broadcast is owner-only, length-limited, and delayed between groups.
- Anti-link never kicks group admins unless `kickAdmins` is enabled in group settings.
- Do not store extra personal data in `data/`. Group settings store JIDs only as needed for warnings.

## Updating dependencies

```bash
npm outdated
npm install
```

Pin Baileys to the published RC14 build (npm tag `7.0.0-rc14`, the same release as `7.0.0-rc.14`):

```bash
npm install @whiskeysockets/baileys@7.0.0-rc14
```

Do not silently replace Baileys with another version. After upgrading Node.js or system libraries, run `npm start` once in a terminal to confirm the session still connects.

## Project structure

```text
whatsapp-bot/
├── index.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── auth/
├── config/
├── lib/
├── commands/
├── events/
└── data/
```

## License

MIT
