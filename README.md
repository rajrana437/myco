# Myco 🍄

A beginner-friendly mushroom grow-tent dashboard built with Expo / React Native and Supabase.

## Fast setup

### 1. Start the Myco app (Windows PowerShell)

Install [Node.js LTS](https://nodejs.org/) and Git first. Then open PowerShell:

```powershell
git clone -b feature/supabase-cloud-foundation https://github.com/rajrana437/myco.git
cd myco
Copy-Item .env.example .env
notepad .env
```

In `.env`, replace `YOUR_SUPABASE_PUBLISHABLE_KEY` with the project's **publishable** key. Keep the variable names exactly as shown:

```env
EXPO_PUBLIC_SUPABASE_URL=https://brtnkceizhzdgeknbwrm.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Save the file, then run:

```powershell
npm ci
npx expo start -c
```

Open the Expo app on your phone or use the available Expo development option. Create an account or sign in. If email confirmation is enabled, confirm your email first.

### 2. Register your mushroom tent in Myco

1. Open **Connected tents** on the dashboard.
2. Tap **Add another tent** and enter a name and (optionally) mushroom species.
3. Copy the one-time device token shown on screen and paste it into the Pi installer.

Your registered tents remain listed on the dashboard. You can remove a tent or regenerate its device token. For security, an existing token cannot be viewed again: only its SHA-256 hash is stored. Regenerating a token immediately invalidates the previous one.

### 3. Connect the Raspberry Pi (two commands)

Your Pi must already be running your working local controller and writing:

```text
/home/YOUR_LINUX_USER/mushroom-controller/status.json
```

On the Pi, sign in with the same Linux user that owns `~/mushroom-controller`. Because this GitHub repository is public, no GitHub sign-in or Personal Access Token is required to clone it. Run:

```bash
git clone --branch feature/supabase-cloud-foundation https://github.com/rajrana437/myco.git
cd myco
bash pi/install.sh
```

When asked, paste the device token copied from Myco. The prompt hides what you type. The installer copies the uploader from your local repository clone, stores its configuration with restricted permissions, and starts the background service.

**Do not run the installer with `sudo`.** It asks for sudo only when installing the service/configuration.

### 4. Confirm the Pi is uploading

On the Pi:

```bash
sudo systemctl status myco-cloud@$(whoami).service
sudo journalctl -u myco-cloud@$(whoami).service -f
```

Look for `Reading uploaded successfully` in the log.

To stop cloud uploading without stopping your local humidity controller:

```bash
sudo systemctl disable --now myco-cloud@$(whoami).service
```

To start it again:

```bash
sudo systemctl enable --now myco-cloud@$(whoami).service
```

## Raspberry Pi requirements

- Raspberry Pi with internet access.
- Existing working Myco-compatible controller folder: `~/mushroom-controller`.
- Existing `status.json` file with these fields:

```json
{
  "temperature": 20.5,
  "humidity": 88.0,
  "humidifier_on": false,
  "fan_on": false,
  "sensor_ok": true,
  "updated_at": "2026-11-15T00:00:00Z"
}
```

Temperature/humidity may be JSON numbers or `null`. The two relay fields must be booleans. `sensor_ok` is optional; `updated_at` is optional.

If your existing status file uses different field names, adjust the uploader mapping before installing; do not change a working controller just to match Myco.

## What this setup does (and does not do)

- Myco creates a tent and securely registers its Raspberry Pi device.
- The Pi uploader reads `status.json` and sends a reading to Supabase every 30 seconds.
- The uploader does not access GPIO, switch relays, or modify `humidity_controller.py`.
- Your existing local controller and SSH workflow remain separate.
- The current dashboard still reads live local readings from the Pi LAN API at `http://10.0.0.198:8765/api/status`. Change `API_URL` in `src/app/index.tsx` if your Pi has a different IP.
- Cloud ingestion is enabled, but a remote/cloud-reading dashboard view is a separate follow-up; do not assume the current dashboard displays cloud readings when away from home.

## Security

- Use only the Supabase **publishable** key in the Expo app.
- Never put a Supabase secret/service-role key in the app, Pi, `.env`, or GitHub.
- Never commit `.env` or share a Pi device token.
- The Pi token is generated using cryptographic randomness, shown once, and stored in Supabase only as a SHA-256 hash.
- If a token is exposed or needs to be replaced, use **Regenerate token** for that tent, then update `MYCO_DEVICE_TOKEN` on the Pi using the replacement command shown by Myco. The old token stops working immediately.

## Troubleshooting

| Problem | What to check |
|---|---|
| Sign-in fails | Confirm the email/password and check whether email confirmation is required. |
| Connect button returns an error | Sign out/in to refresh the session, then retry. |
| Installer cannot find the controller | Run it as the Linux user who owns `~/mushroom-controller`; confirm `status.json` exists. |
| HTTP 401 in Pi logs | Re-register/replace the device token and rerun the installer with the new token. |
| Uploader reports missing fields | Inspect `cat ~/mushroom-controller/status.json`; required field names are listed above. |
| No internet / upload errors | Confirm Pi internet access; the uploader retries automatically. Local control is unaffected. |
| Need to inspect service | Use the `systemctl status` and `journalctl` commands above. |

## Developer checks

From the project folder:

```powershell
npx expo install --check
npx expo lint
npx tsc --noEmit
```

## Project links

- [Raspberry Pi guide](pi/README.md)
- [Pi installer](pi/install.sh)
- [Pull request](https://github.com/rajrana437/myco/pull/1)

Current working branch: `feature/supabase-cloud-foundation`. The `main` branch has not been changed by this setup work.
