# -*- coding: utf-8 -*-
"""ZERO local bridge.

Runs on the work PC and exposes operational telemetry to WORK AGENT.
No credentials are stored here. Other local engines can publish status by
writing zero_status.json in this same directory.
"""

import json
import os
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
STATUS_FILE = Path(os.getenv("ZERO_STATUS_FILE", BASE_DIR / "zero_status.json"))

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


def _now():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _empty_status():
    return {
        "bridge": {"connected": True, "reported_at": _now()},
        "systems": {
            "mora": {"connected": False},
            "gmail": {"connected": False},
            "scoring": {"connected": False},
        },
    }


def load_status():
    data = _empty_status()
    try:
        if STATUS_FILE.exists():
            saved = json.loads(STATUS_FILE.read_text(encoding="utf-8"))
            if isinstance(saved, dict):
                systems = saved.get("systems", saved)
                if isinstance(systems, dict):
                    for name, value in systems.items():
                        if isinstance(value, dict):
                            data["systems"][name] = value
    except Exception as exc:
        data["bridge"]["status_error"] = str(exc)
    data["bridge"]["reported_at"] = _now()
    return data


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "zero-local-bridge", "time": _now()})


@app.get("/status")
def status():
    return jsonify(load_status())


if __name__ == "__main__":
    print("ZERO local bridge listo: http://127.0.0.1:8765/status")
    print(f"Telemetria: {STATUS_FILE}")
    app.run(host="127.0.0.1", port=8765, debug=False, threaded=True)
