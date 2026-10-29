# Bello v0.7.1 connection diagnostic patch

This patch does not claim to fix the connection yet. It makes the failure visible.

1. Upload the FOUR files inside frontend/ to the root of your existing GitHub repo,
   replacing their v0.7.0 copies. Wait for Pages to publish; reload and confirm 0.7.1.
2. On the laptop stop the old backend with Ctrl+C. Replace ONLY backend/server.py
   with the supplied laptop/backend/server.py. Leave .env.local unchanged.
3. Start the usual .bat again. Use the NEW pairing code printed in its window.
4. Connect from Bello using http://10.0.0.95:8000.
5. If connection fails, send the specific frontend error and any NEW lines in the
   backend window. Do not send the API key or .env.local.

Reading the diagnostic lines:
- POST /health -> 200: pairing and backend connectivity succeeded.
- POST /health -> 401: pairing code does not match the running backend.
- OPTIONS ... -> 403 or POST ... -> 403: website origin rejected.
- OPTIONS /health -> 204 alone: preflight arrived but POST did not complete.
- No new line: the request did not reach this Python process; inspect Chrome's
  Console on the laptop after pressing Connect AI for the browser's exact reason.

Changes: explicit connection errors, safe method/endpoint/status/origin logs,
removal of optional targetAddressSpace fetch hint (the validated addresses are
already private IP literals, localhost or .local), cache versions bumped to 0.7.1.
No security checks were removed. Local command fallback remains intact.

Validation: 18 automated checks pass (12 JavaScript, 6 Python). No live OpenAI,
Android browser, Windows LAN or deployment success is claimed.
