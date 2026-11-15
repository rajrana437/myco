# Myco Raspberry Pi cloud uploader

This uploader is deliberately separate from `humidity_controller.py`. It reads the existing
`~/mushroom-controller/status.json` file and posts readings to the Supabase
`ingest-mushroom-reading` Edge Function. It does not access GPIO, relays, or the DHT22.

## Files

- `myco_cloud.py`: standalone uploader (Python standard library only).
- `myco-cloud@.service`: systemd template; run it as the same Linux user that owns
  the `mushroom-controller` directory.

## Install on the Pi

Copy `myco_cloud.py` into `~/mushroom-controller/`, then:

```bash
sudo install -m 600 /dev/null /etc/myco-cloud.env
sudo nano /etc/myco-cloud.env
```

Put these values in the file (replace the placeholders):

```ini
MYCO_SUPABASE_URL=https://brtnkceizhzdgeknbwrm.supabase.co
MYCO_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
MYCO_DEVICE_TOKEN=YOUR_UNIQUE_DEVICE_TOKEN
MYCO_UPLOAD_INTERVAL_SECONDS=30
MYCO_STATUS_FILE=/home/YOUR_LINUX_USER/mushroom-controller/status.json
```

The publishable key is not a secret. The device token is private to this Pi; do not commit
it to GitHub or put it in the mobile app. Never use the Supabase secret/service-role key.

Install the service template:

```bash
sudo install -m 644 myco-cloud@.service /etc/systemd/system/myco-cloud@.service
sudo systemctl daemon-reload
sudo systemctl enable --now myco-cloud@$(whoami).service
```

Check status and logs:

```bash
sudo systemctl status myco-cloud@$(whoami).service
sudo journalctl -u myco-cloud@$(whoami).service -f
```

Stop or disable only the uploader:

```bash
sudo systemctl disable --now myco-cloud@$(whoami).service
```

## Expected status.json fields

The existing controller status file should contain `temperature`, `humidity`,
`humidifier_on`, `fan_on`, and `sensor_ok`. The optional `updated_at` timestamp is
forwarded as `recorded_at`.

## Important

The uploader needs a device token whose SHA-256 hash has already been registered in the
Supabase `devices.token_hash` table for the correct tent. Device-token provisioning is a
separate secure setup step; do not invent a token or manually insert its plaintext into the
database. Until a token is issued and registered, the function correctly returns HTTP 401.
