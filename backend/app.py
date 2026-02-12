from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), "records.json")


app = Flask(__name__)
CORS(app)
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"ok": True})

def load_records():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return []

def save_records(records):
    with open(DATA_FILE, "w") as f:
        json.dump(records, f, indent=2)

@app.route('/save-record', methods=['POST'])
def save_record():
    try:
        body = request.get_json()
        if not body:
            return jsonify({"success": False, "error": "No body"}), 400
        records = load_records()
        record = {
            "heartRate": body.get("heartRate", {}),
            "hrv": body.get("hrv", {}),
            "ppgData": body.get("ppgData", []),
            "timestamp": body.get("timestamp") or datetime.utcnow().isoformat(),
        }
        records.append(record)
        save_records(records)
        return jsonify({"success": True, "data": record}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400