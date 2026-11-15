# Myco Raspberry Pi setup

The Myco uploader runs separately from your mushroom controller. It reads
`~/mushroom-controller/status.json` and sends readings to Supabase every 30 seconds.
It does **not** control GPIO, relays, the DHT22, or change `humidity_controller.py`.

## Beginner setup (two commands)

**Before starting:** your Myco tent must have a registered Raspberry Pi device and a
device token issued for that tent. The token is private to this Pi. The in-app device
registration/token-issuing screen is not implemented yet, so don't make up a token or
try this installation until you have received a real device token.

On the Pi, open a terminal using the same Linux account that runs your existing
`mushroom-controller` folder, then run:

1. Download the installer:

   ```bash
   curl -fsSLO https://raw.githubusercontent.com/rajrana437/myco/feature/supabase-cloud-foundation/pi/install.sh
   ```

2. Run it:

   ```bash
   bash install.sh
   ```

The installer checks that your existing `status.json` exists, downloads the uploader,
asks for your tent's device token, installs a protected configuration file, and enables
the background service. It does not install packages or modify your working controller.

After setup, check that it is running:

```bash
sudo systemctl status myco-cloud@$(whoami).service
sudo journalctl -u myco-cloud@$(whoami).service -f
```

To stop only cloud uploading (local humidity control keeps running):

```bash
sudo systemctl disable --now myco-cloud@$(whoami).service
```

## What the installer configures

- Uploader: `~/mushroom-controller/myco_cloud.py`
- Private configuration: `/etc/myco-cloud.env` (permissions restricted to root)
- Background service: `myco-cloud@YOUR_LINUX_USER.service`
- Upload interval: 30 seconds
- Supabase project URL and publishable key: configured by the installer

The Supabase publishable key is intended for client use. The device token is secret and
must not be committed to GitHub or placed in the mobile app. Never use the Supabase
secret/service-role key on the Pi.

## Troubleshooting

- **Installer says status.json is missing:** confirm your existing controller is running
  and writing `~/mushroom-controller/status.json`.
- **HTTP 401 / Unauthorized:** the token is missing, incorrect, or has not been registered
  for this tent in Supabase.
- **Network errors:** check that the Pi has internet access; the uploader retries every
  30 seconds. Local humidity control is unaffected.
- **View logs:** use the `journalctl` command above.

## Expected status.json fields

The existing status file must contain `temperature`, `humidity`, `humidifier_on`,
`fan_on`, and `sensor_ok`. An optional ISO-format `updated_at` timestamp is forwarded
as `recorded_at`.
