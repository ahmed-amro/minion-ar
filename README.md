# Bello AR v0.7.0 — optional conversational AI

Bello starts in local command mode every time. Your laptop is NOT required for
AR, placement, moving, resizing, touch reactions, browser speech commands/replies,
textures, or the chair/magazine routine. Browser speech recognition may still need
its provider's internet service, just as it did in v0.6.

This is an implementation candidate, not a confirmed phone-tested release.
Nothing in this package has been pushed to GitHub or deployed for you.

## Package contents

Extract `bello-ar-v0.7.0-local-ai.zip`. It contains:

- `frontend/`: ONLY the four public files to upload to GitHub.
- `laptop/`: full source, backend, Windows launcher, tests, and secret-file example.
- This guide, changelog, and testing notes at the top level for easy reference.

## 1. Update GitHub Pages — no key needed

1. Keep a copy of your current v0.6 files (the existing Project ZIP is also a rollback).
2. Open the extracted `frontend` folder. In `ahmed-amro/minion-ar`, replace `index.html`, `app.js`,
   and `style.css`, and ADD `conversation.js`, all at the repository root.
3. Commit the four files to the same branch currently used by Pages. You do not
   need another repo, GitHub Actions service, hosting account, or repository secret.
4. Wait for the Pages deployment to finish, then reload
   https://ahmed-amro.github.io/minion-ar/ . The title should show v0.7.0.
5. Before configuring anything, test voice commands with the laptop backend OFF:
   “Bello, dance”, “jump”, “read your magazine”, and “wake up”.

Upload only these four frontend files through GitHub's website. `.gitignore`
does not protect files that you manually select for upload on the website.
NEVER upload `.env.local`, an API key, or your laptop's usage database.

## 2. Run the optional backend on Windows

Python 3.10 or newer is required; no pip installs or third-party Python packages.
This backend uses Python rather than a hosted server to keep this experiment local.

1. Open the extracted `laptop` folder on your computer.
2. Open PowerShell inside that `laptop` folder and run:

   ```powershell
   Copy-Item .env.example .env.local
   notepad .env.local
   ```

   If you already have a `.env.local`, edit it instead of overwriting it.
3. In Notepad, enter your 30-day OpenAI key after `OPENAI_API_KEY=` and save.
   Confirm the filename is `.env.local`, not `.env.local.txt`.
   Do not put the key into `app.js`, `conversation.js`, or the browser UI.
4. Double-click `start-bello-backend.bat`. Keep its console window open.
5. If Windows Firewall asks, allow Python on your PRIVATE home network only.
   Do not enable router port forwarding or publish this backend on the internet.
6. The console displays a random **pairing code**. This is NOT your API key.
   It changes on every backend restart. Copy it for the phone connection.
7. In another PowerShell window, run `ipconfig`. Under your active Wi-Fi adapter,
   find the IPv4 address, for example `192.168.1.50`. Ignore VPN/virtual adapters.
   Your phone's backend address would be `http://192.168.1.50:8000`.

The backend checks that a key is configured at startup, not that OpenAI accepts it.
Model access, credit/quota, and key validity are checked by the first AI question.
A successful connection alone is not proof of an OpenAI conversation.

## 3. Connect your phone

1. Connect phone and laptop to the same trusted private Wi-Fi. Guest networks and
   some university networks prevent devices from reaching each other.
2. Open Bello's usual GitHub Pages URL in current Android Chrome.
3. Tap **💬 Local mode**, expand **Connect to laptop**.
4. Enter the laptop address above and the pairing code from its console.
   `localhost` on the phone means the phone, NOT your laptop.
5. Tap **Connect AI**. Allow local-network access if Chrome asks. Your browser must
   support permission-gated HTTP requests from HTTPS to a local IP. No browser
   security flags need disabling. This needs verification on your actual phone.
6. Try a typed question first: “My name is Ahmed. What is your name?” Then ask
   “What is my name?” to check the recent conversation context.
7. Use the normal microphone button for push-to-talk conversation. Tap again
   for each turn. Press Stop in the conversation panel to cancel a pending turn
   or spoken reply. Text remains available if speech is unsupported.

For desktop preview testing, use the same GitHub Pages frontend and connect to
`http://127.0.0.1:8000`. The frontend supplies the appropriate local/loopback
address-space hint for Chrome. Do not run a generic static web server in the
folder containing `.env.local`: that could expose the secret file.

## 4. What happens when the laptop stops?

- Startup is always local mode; there is no automatic backend connection or polling.
- Clear commands in AI mode (e.g. “dance”, “Bello, jump”, “read your magazine”) execute
  locally without waiting for the laptop or using OpenAI tokens.
- If an open-ended AI request fails or times out, Bello returns to local mode and
  sends that same phrase through the original v0.6 command parser.
- A general question cannot be answered by the fallback; Bello gives his existing
  command-help reply instead. AR and manual controls remain available.
- A failed request may take up to about 22 seconds. You can tap **Use local mode**
  immediately rather than wait. Reconnect manually when the laptop is available.
- Restarting the backend requires its new pairing code. Refreshing the frontend
  also returns it to local mode. The browser does not save the pairing code.
- Basic voice commands still depend on Chrome's speech recognition support/service;
  the fallback is not a guarantee of fully offline speech recognition.

## 5. Cost and privacy controls

- OpenAI receives text only: the current utterance, up to five recent exchanges,
  and Bello's personality instructions. No app camera frames or raw app-recorded
  microphone audio are sent to OpenAI. Browser speech may process audio remotely.
- Replies are capped at 400 output tokens; input is bounded to 1,200 characters per
  message and ten history messages. Only seven harmless animation values are accepted.
- Default model: `gpt-5.4-mini`, reasoning effort `none`. No web search or other paid tools.
- Hard request allowance: 50 AI attempts per UTC day, six per minute, one at a time.
  The daily count persists in `.bello-usage.sqlite3` across backend restarts. Failures
  count too, conservatively. This is a REQUEST cap, not a precise dollar spending cap.
- No automatic retries. Pressing Stop discards late results, but a request already
  received by OpenAI may still finish and be billed.
- A new pairing code is generated on every backend start. CORS is restricted to
  `https://ahmed-amro.github.io` and loopback development origins; CORS is not auth.
- The LAN HTTP connection is not encrypted. Use only a trusted private Wi-Fi;
  other devices on the LAN with interception capability could observe transcripts
  and the temporary pairing code. The OpenAI key is never sent to the phone.
- Chat history and pairing code live in browser memory, not localStorage. Clear chat
  removes the app's current history and display; it does not delete provider records.
- The backend logs no transcripts or credentials. The database stores only daily
  request counts. OpenAI requests set `store:false`; this does not override OpenAI's
  service-level retention policies. There is no connection to ChatGPT memory.
- Your 30-day key will expire. Replace its value in the laptop's `.env.local` and
  restart the backend when needed. An expired key triggers local fallback.

## 6. Troubleshooting

| Symptom | Check |
|---|---|
| Python launcher missing | Install Python 3.10+ with the Windows `py` launcher, or run `python backend/server.py` from the extracted folder. |
| Backend will not start | Confirm `.env.local` filename and non-empty key; check port 8000 is free. |
| Cannot connect | Laptop awake, backend window open, correct Wi-Fi IPv4, same network, current pairing code, private-network firewall access. |
| Chrome blocks local access | In site settings for `ahmed-amro.github.io`, allow local-network access; use a numeric private IP. Support varies by browser/version. |
| Connection succeeds but questions fail | Key may be expired, invalid, out of credit/quota, or lack model access. The frontend falls back deliberately. Check the key/project in OpenAI Platform; no key needs sharing here. |
| Voice fails but typing works | Check microphone permission and browser speech service/network. This is separate from the AI backend. |
| Limit reached | Wait for the minute limit or the next UTC day; deliberate 50-attempt test cap. |
| Old interface | Confirm Pages finished deploying; reload or clear cached site files. All four frontend files must be uploaded together. |
| Unable to connect on campus/guest Wi-Fi | Test on trusted home Wi-Fi; client isolation or policy may block LAN connections. |

Do not disable browser security protections or expose the local backend publicly to
work around a network problem. A local HTTPS option can be added if phone testing
shows the current Chrome permission path is unavailable.

## 7. Verification and rollback

See TESTING.md for exact checks performed and the phone acceptance checklist.
Automated checks and simulated speech do not validate actual Android WebXR,
microphone quality, browser speech playback, Windows Firewall, or LAN permissions.
No live OpenAI call was made while preparing this package.

To roll back, restore the original three public files from the v0.6 ZIP. Remove
`conversation.js` if desired. Stop the backend. No database migration is needed.

## Source references

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developer.chrome.com/blog/local-network-access
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
