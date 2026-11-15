#!/usr/bin/env bash
set -Eeuo pipefail

REPO_RAW="https://raw.githubusercontent.com/rajrana437/myco/feature/supabase-cloud-foundation/pi"
APP_DIR="$HOME/mushroom-controller"
STATUS_FILE="$APP_DIR/status.json"
ENV_FILE="/etc/myco-cloud.env"
SERVICE_NAME="myco-cloud@$(id -un).service"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Please run this installer as your normal Pi user, not with sudo."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required. Install it with: sudo apt update && sudo apt install -y curl"
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "I couldn't find $APP_DIR."
  echo "This installer expects your existing mushroom-controller folder."
  exit 1
fi

if [[ ! -f "$STATUS_FILE" ]]; then
  echo "I couldn't find $STATUS_FILE."
  echo "Make sure your existing local controller is running and creating status.json."
  exit 1
fi

echo "Myco Pi cloud uploader setup"
echo "Your existing humidity_controller.py will not be changed."
echo

mkdir -p "$APP_DIR"
curl -fsSL "$REPO_RAW/myco_cloud.py" -o "$APP_DIR/myco_cloud.py"
chmod 755 "$APP_DIR/myco_cloud.py"
curl -fsSL "$REPO_RAW/myco-cloud@.service" -o /tmp/myco-cloud@.service

read -r -p "Paste the device token generated for this tent in Myco: " DEVICE_TOKEN
if [[ ${#DEVICE_TOKEN} -lt 32 ]]; then
  echo "That token looks too short. No service was installed."
  exit 1
fi

PUBLISHABLE_KEY="sb_publishable_o7cYXFqe2Izy51yIIXTFuQ_AdCln4WH"
TMP_ENV="$(mktemp)"
chmod 600 "$TMP_ENV"
cat > "$TMP_ENV" <<EOF
MYCO_SUPABASE_URL=https://brtnkceizhzdgeknbwrm.supabase.co
MYCO_PUBLISHABLE_KEY=$PUBLISHABLE_KEY
MYCO_DEVICE_TOKEN=$DEVICE_TOKEN
MYCO_UPLOAD_INTERVAL_SECONDS=30
MYCO_STATUS_FILE=$STATUS_FILE
EOF

echo
echo "Installing the uploader service..."
sudo install -m 644 /tmp/myco-cloud@.service /etc/systemd/system/myco-cloud@.service
sudo install -m 600 "$TMP_ENV" "$ENV_FILE"
rm -f "$TMP_ENV" /tmp/myco-cloud@.service
sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_NAME"

echo
echo "Setup complete. Check the uploader with:"
echo "  sudo systemctl status $SERVICE_NAME"
echo "  sudo journalctl -u $SERVICE_NAME -f"
echo
echo "To stop only the uploader:"
echo "  sudo systemctl disable --now $SERVICE_NAME"
