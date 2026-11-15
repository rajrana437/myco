#!/usr/bin/env python3
"""Upload existing Myco tent status to Supabase without controlling hardware."""

import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

LOG = logging.getLogger("myco-cloud")


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def read_status(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        status = json.load(handle)
    if not isinstance(status, dict):
        raise ValueError("status.json must contain a JSON object")

    temperature = status.get("temperature")
    humidity = status.get("humidity")
    if temperature is not None:
        temperature = float(temperature)
    if humidity is not None:
        humidity = float(humidity)

    humidifier_on = status.get("humidifier_on")
    fan_on = status.get("fan_on")
    sensor_ok = status.get("sensor_ok", True)
    if not isinstance(humidifier_on, bool) or not isinstance(fan_on, bool):
        raise ValueError("status.json must contain boolean humidifier_on and fan_on fields")
    if not isinstance(sensor_ok, bool):
        sensor_ok = bool(sensor_ok)

    updated_at = status.get("updated_at")
    if isinstance(updated_at, str):
        try:
            # Preserve the controller timestamp when it is a valid ISO date.
            recorded_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            if recorded_at.tzinfo is None:
                recorded_at = recorded_at.replace(tzinfo=timezone.utc)
            recorded_at = recorded_at.astimezone(timezone.utc).isoformat()
        except ValueError:
            recorded_at = datetime.now(timezone.utc).isoformat()
    else:
        recorded_at = datetime.now(timezone.utc).isoformat()

    return {
        "temperature": temperature,
        "humidity": humidity,
        "humidifier_on": humidifier_on,
        "fan_on": fan_on,
        "sensor_ok": sensor_ok,
        "recorded_at": recorded_at,
    }


def upload(endpoint: str, publishable_key: str, device_token: str, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        endpoint,
        data=body,
        headers={
            "Content-Type": "application/json",
            "apikey": publishable_key,
            "x-device-token": device_token,
        },
        method="POST",
    )
    with urlopen(request, timeout=20) as response:
        response_body = response.read().decode("utf-8", errors="replace")
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"Supabase returned HTTP {response.status}: {response_body}")
        LOG.info("Reading uploaded successfully: %s", response_body)


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("MYCO_LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    base_url = required_env("MYCO_SUPABASE_URL").rstrip("/")
    publishable_key = required_env("MYCO_PUBLISHABLE_KEY")
    device_token = required_env("MYCO_DEVICE_TOKEN")
    endpoint = f"{base_url}/functions/v1/ingest-mushroom-reading"
    status_path = Path(
        os.environ.get(
            "MYCO_STATUS_FILE",
            str(Path.home() / "mushroom-controller" / "status.json"),
        )
    ).expanduser()
    interval = max(15, int(os.environ.get("MYCO_UPLOAD_INTERVAL_SECONDS", "30")))

    LOG.info("Myco cloud uploader starting")
    LOG.info("Reading local status from %s; upload interval %ss", status_path, interval)

    while True:
        try:
            payload = read_status(status_path)
            upload(endpoint, publishable_key, device_token, payload)
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            LOG.error("Supabase HTTP %s: %s", exc.code, detail)
        except (URLError, TimeoutError, OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
            LOG.warning("Upload skipped; will retry in %ss: %s", interval, exc)
        except Exception:
            LOG.exception("Unexpected uploader error; will retry in %ss", interval)

        time.sleep(interval)


if __name__ == "__main__":
    main()
