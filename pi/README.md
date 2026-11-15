# Myco Raspberry Pi — quick setup

This installs the **cloud uploader only**. Your existing local humidity controller keeps running as it is.

## Before you start

- Your tent is already created in the Myco app.
- You copied the one-time device token from **Dashboard → Connect your Raspberry Pi**.
- Your Pi has internet access.
- You are logged in as the same Linux user that owns `~/mushroom-controller`.
- Your existing controller is creating `~/mushroom-controller/status.json`.

## Install (two commands)

Run these on the Raspberry Pi terminal. Do not add `sudo` to either command.

```bash
curl -fsSLO https://raw.githubusercontent.com/rajrana437/myco/feature/supabase-cloud-foundation/pi/install.sh
bash install.sh
```

When prompted, paste the device token from Myco. Your typing is hidden. The installer:

1. Checks your existing controller folder and status file.
2. Downloads the cloud uploader and systemd service.
3. Saves the token in a root-protected config file.
4. Enables and starts the cloud uploader.

It does **not** install a second controller, access GPIO, change relays, or edit `humidity_controller.py`.

## Check that it works

```bash
sudo systemctl status myco-cloud@$(whoami).service
sudo journalctl -u myco-cloud@$(whoami).service -f
```

A successful log includes `Reading uploaded successfully`.

## Stop / restart cloud upload

Stop only the cloud uploader (local humidity control continues):

```bash
sudo systemctl disable --now myco-cloud@$(whoami).service
```

Start it again:

```bash
sudo systemctl enable --now myco-cloud@$(whoami).service
```

## Required status.json fields

Your existing `~/mushroom-controller/status.json` must contain:

- `temperature`: number or `null`
- `humidity`: number or `null`
- `humidifier_on`: `true` or `false`
- `fan_on`: `true` or `false`
- `sensor_ok`: optional boolean
- `updated_at`: optional ISO timestamp

Inspect it with:

```bash
cat ~/mushroom-controller/status.json
```

If your file uses different field names, the uploader mapping needs to be adapted. Do not modify a working hardware controller just to match this schema.

## Troubleshooting

- **Installer cannot find `status.json`:** confirm the local controller is running and writing to the expected folder.
- **HTTP 401 / Unauthorized:** token is wrong, expired/replaced, or belongs to another device. Generate a replacement from Myco and rerun the installer.
- **Missing reading fields:** compare your JSON with the field list above.
- **Network errors:** check internet access. The uploader retries every 30 seconds.
- **Service logs:** `sudo journalctl -u myco-cloud@$(whoami).service -f`.

## Security

The device token is a password for this Pi. Do not share it or paste it into GitHub. Myco shows it once and stores only its SHA-256 hash. The installer hides token input and writes it to `/etc/myco-cloud.env` with root-only permissions.

Never use a Supabase secret/service-role key on the Pi.
