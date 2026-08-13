# -*- coding: utf-8 -*-
"""ZERO local bridge (fallback).

Este bridge queda reservado como servicio de respaldo en el puerto 8766.
El puerto 8765 pertenece al ZERO Local Core unificado (Whisper + estado + memoria).
No contiene credenciales.
"""

import json
import os
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
STATUS_FILE = Path(os.getenv("ZERO_STATUS_FILE", BASE_DIR / "zero_status.json"))
HOST = os.getenv("ZERO_BRIDGE_HOST", "127.0.0.1")
PORT = int(os.getenv("ZERO_BRIDGE_PORT", "8766"))

_default_gmail_cache = BASE_DIR / "zero_gmail_cache.json"
if not _default_gmail_cache.exists():
    _default_gmail_cache = Path.home() / "Desktop" / "ZERO_GMAIL" / "zero_gmail_cache.json"
GMAIL_CACHE_FILE = Path(os.getenv("ZERO_GMAIL_CACHE", _default_gmail_cache))

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "https://rodrissj23.github.io",
                "http://127.0.0.1:*",
                "http://localhost:*",
            ]
        }
    },
)


def _now():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _truthy(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "si"}


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


def load_gmail_cache():
    if not GMAIL_CACHE_FILE.exists():
        return {"updated_at": None, "messages": []}
    try:
        data = json.loads(GMAIL_CACHE_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"updated_at": None, "messages": []}
        messages = data.get("messages", [])
        if not isinstance(messages, list):
            messages = []
        return {"updated_at": data.get("updated_at"), "messages": messages}
    except Exception:
        return {"updated_at": None, "messages": []}


def public_message(item, details=False):
    result = {
        "id": item.get("id"),
        "from": str(item.get("from") or "")[:180],
        "subject": str(item.get("subject") or "(sin asunto)")[:220],
        "date": item.get("date"),
        "unread": bool(item.get("unread")),
        "priority_sender": bool(item.get("priority_sender")),
        "score": item.get("score"),
        "categories": item.get("categories") if isinstance(item.get("categories"), list) else [],
    }
    if details:
        result["snippet"] = str(item.get("snippet") or "")[:500]
    return result


@app.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "service": "zero-local-bridge",
            "time": _now(),
            "gmail_cache": GMAIL_CACHE_FILE.exists(),
            "port": PORT,
        }
    )


@app.get("/status")
def status():
    return jsonify(load_status())


@app.get("/gmail/messages")
def gmail_messages():
    cache = load_gmail_cache()
    rows = [row for row in cache["messages"] if isinstance(row, dict)]

    sender = str(request.args.get("sender") or "").strip().lower()
    if sender:
        rows = [row for row in rows if sender in str(row.get("from") or "").lower()]

    if _truthy(request.args.get("priority")):
        rows = [row for row in rows if bool(row.get("priority_sender"))]

    if _truthy(request.args.get("unread")):
        rows = [row for row in rows if bool(row.get("unread"))]

    try:
        limit = max(1, min(20, int(request.args.get("limit", "5"))))
    except ValueError:
        limit = 5

    details = _truthy(request.args.get("details"))
    items = [public_message(row, details=details) for row in rows[:limit]]

    return jsonify(
        {
            "ok": True,
            "updated_at": cache.get("updated_at"),
            "count": len(items),
            "items": items,
        }
    )


if __name__ == "__main__":
    print(f"ZERO fallback bridge listo: http://{HOST}:{PORT}/status")
    print("ZERO Local Core usa el puerto 8765; este bridge no lo ocupa.")
    print(f"Telemetria: {STATUS_FILE}")
    print(f"Cache Gmail: {GMAIL_CACHE_FILE}")
    app.run(host=HOST, port=PORT, debug=False, threaded=True)
