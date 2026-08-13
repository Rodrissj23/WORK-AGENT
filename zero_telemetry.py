# -*- coding: utf-8 -*-
"""Small reusable telemetry publisher for ZERO local engines."""

import json
import os
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STATUS_FILE = Path(os.getenv("ZERO_STATUS_FILE", BASE_DIR / "zero_status.json"))


def _now():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _load():
    try:
        if STATUS_FILE.exists():
            data = json.loads(STATUS_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                data.setdefault("systems", {})
                return data
    except Exception:
        pass
    return {"systems": {}}


def publish(system, **fields):
    """Merge one engine report into zero_status.json using a temp + replace."""
    data = _load()
    report = dict(fields)
    report["connected"] = True
    report["reported_at"] = _now()
    data["systems"][system] = report
    data["updated_at"] = _now()

    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATUS_FILE.with_suffix(STATUS_FILE.suffix + ".tmp")
    tmp.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    os.replace(tmp, STATUS_FILE)
    return report


def publish_error(system, error, **fields):
    fields.update(ok=False, errores=fields.get("errores", 1), error=str(error))
    return publish(system, **fields)
