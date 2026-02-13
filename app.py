from flask import Flask, render_template, jsonify
import json
import os
from datetime import datetime, timedelta
import logging
import schedule
import time
import threading

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CONFIG = {
    "alert_time": "10:00",
}

CHECKINS_FILE = "checkins.json"


# ----------------------------
# Storage
# ----------------------------

def load_checkins():
    if os.path.exists(CHECKINS_FILE):
        with open(CHECKINS_FILE, "r") as f:
            return json.load(f)
    return []


def save_checkins(checkins):
    with open(CHECKINS_FILE, "w") as f:
        json.dump(checkins, f)


def normalize_checkins(checkins):
    normalized = []

    for entry in checkins:
        if isinstance(entry, str):
            try:
                d = datetime.fromisoformat(entry).date()
                ts = int(datetime.combine(d, datetime.min.time()).timestamp() * 1000)
                normalized.append({"date": d.isoformat(), "timestamp": ts})
            except Exception:
                continue

        elif isinstance(entry, dict):
            date_str = entry.get("date")
            ts = entry.get("timestamp")
            if not date_str:
                continue

            try:
                d = datetime.fromisoformat(date_str).date()
                timestamp = ts or int(
                    datetime.combine(d, datetime.min.time()).timestamp() * 1000
                )
                normalized.append({"date": d.isoformat(), "timestamp": timestamp})
            except Exception:
                continue

    return sorted(normalized, key=lambda x: x["date"], reverse=True)


# ----------------------------
# Streak Logic
# ----------------------------

def get_current_streak(checkins):
    if not checkins:
        return 0

    dates = {c["date"] for c in checkins}
    streak = 0
    day = datetime.now().date()

    while day.isoformat() in dates:
        streak += 1
        day -= timedelta(days=1)

    return streak


def get_last_checkin_time(checkins):
    return max((c["timestamp"] for c in checkins), default=None)


def get_best_streak(checkins):
    dates = sorted({c["date"] for c in checkins})
    best = current = 0
    prev = None

    for d in dates:
        d_obj = datetime.fromisoformat(d).date()
        if prev and (d_obj - prev).days == 1:
            current += 1
        else:
            current = 1
        best = max(best, current)
        prev = d_obj

    return best


def get_dashboard_data(days=30):
    checkins = normalize_checkins(load_checkins())
    checked_dates = {c["date"] for c in checkins}
    today = datetime.now().date()

    window = [
        (today - timedelta(days=i)).isoformat()
        for i in range(days)
    ]

    missed = [d for d in window if d not in checked_dates]

    return {
        "checkins": sorted(checked_dates, reverse=True),
        "current_streak": get_current_streak(checkins),
        "best_streak": get_best_streak(checkins),
        "checked_dates": sorted(checked_dates, reverse=True),
        "missed_dates": missed,
    }


# ----------------------------
# Routes
# ----------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@app.route("/insights")
def insights():
    return render_template("insights.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


@app.route("/privacy")
def privacy():
    return render_template("privacy.html", current_year=datetime.now().year)


# ----------------------------
# API
# ----------------------------

@app.route("/api/checkin", methods=["POST"])
def checkin():
    try:
        today = datetime.now().date().isoformat()
        ts = int(datetime.now().timestamp() * 1000)
        checkins = normalize_checkins(load_checkins())

        if today not in {c["date"] for c in checkins}:
            checkins.append({"date": today, "timestamp": ts})

            cutoff = (datetime.now() - timedelta(days=30)).date().isoformat()
            checkins = [c for c in checkins if c["date"] >= cutoff]

            save_checkins(checkins)
            status = "success"
        else:
            status = "info"

        streak_data = get_dashboard_data()

        return jsonify({
            "status": status,
            "currentStreak": streak_data["current_streak"],
            "bestStreak": streak_data["best_streak"],
        })

    except Exception:
        logger.exception("Check-in error")
        return jsonify({"status": "error"}), 500


@app.route("/api/status")
def status():
    checkins = normalize_checkins(load_checkins())
    return jsonify({
        "currentStreak": get_current_streak(checkins),
        "lastCheckInTime": get_last_checkin_time(checkins),
        "bestStreak": get_best_streak(checkins),
    })


@app.route("/api/dashboard")
def dashboard_api():
    return jsonify(get_dashboard_data())


# ----------------------------
# Scheduler
# ----------------------------

def schedule_checker():
    def check_missed():
        today = datetime.now().date().isoformat()
        if today not in {c["date"] for c in normalize_checkins(load_checkins())}:
            logger.info("Missed check-in detected")

    schedule.every().day.at(CONFIG["alert_time"]).do(check_missed)

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    is_debug = os.environ.get("FLASK_ENV") != "production"

    if not is_debug:
        threading.Thread(target=schedule_checker, daemon=True).start()

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=is_debug,
    )