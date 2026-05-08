from flask import Flask, render_template, jsonify
import json
import os
from datetime import datetime, timedelta
import logging
from functools import wraps
import schedule
import time
import threading
from dotenv import load_dotenv

load_dotenv()


# ---------------------------------------------------
# App Setup
# ---------------------------------------------------

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CONFIG = {
    "alert_time": os.environ.get("ALERT_TIME", "10:00"),
}

CHECKINS_FILE = "checkins.json"
DASHBOARD_WINDOW_DAYS = 30


# ---------------------------------------------------
# Storage Helpers
# ---------------------------------------------------

def load_checkins():
    if not os.path.exists(CHECKINS_FILE):
        return []

    with open(CHECKINS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_checkins(checkins):
    with open(CHECKINS_FILE, "w", encoding="utf-8") as f:
        json.dump(checkins, f)


def _parse_checkin_date(date_str):
    if not isinstance(date_str, str) or not date_str.strip():
        raise ValueError("check-in date must be a non-empty string")

    return datetime.fromisoformat(date_str).date()


def _timestamp_for_date(date_obj):
    return int(datetime.combine(date_obj, datetime.min.time()).timestamp() * 1000)


def normalize_checkins(checkins):
    """Normalize legacy string and current dict check-ins into one entry per date."""
    normalized_by_date = {}

    if not checkins:
        return []

    for entry in checkins:
        try:
            if isinstance(entry, str):
                date_obj = _parse_checkin_date(entry)
                timestamp = _timestamp_for_date(date_obj)
            elif isinstance(entry, dict):
                date_obj = _parse_checkin_date(entry.get("date"))
                raw_timestamp = entry.get("timestamp")
                timestamp = (
                    int(raw_timestamp)
                    if raw_timestamp is not None
                    else _timestamp_for_date(date_obj)
                )
            else:
                logger.warning("Skipping unsupported check-in entry type: %r", entry)
                continue
        except (TypeError, ValueError) as exc:
            logger.warning("Skipping invalid check-in entry %r: %s", entry, exc)
            continue

        date_key = date_obj.isoformat()
        existing = normalized_by_date.get(date_key)
        if existing is None or timestamp > existing["timestamp"]:
            normalized_by_date[date_key] = {"date": date_key, "timestamp": timestamp}

    return sorted(normalized_by_date.values(), key=lambda x: x["date"], reverse=True)


# ---------------------------------------------------
# Streak Logic
# ---------------------------------------------------

def get_checkin_dates(checkins):
    return {c["date"] for c in normalize_checkins(checkins)}


def get_current_streak(checkins, today=None):
    dates = get_checkin_dates(checkins)
    if not dates:
        return 0

    streak = 0
    day = today or datetime.now().date()

    while day.isoformat() in dates:
        streak += 1
        day -= timedelta(days=1)

    return streak


def get_best_streak(checkins):
    dates = sorted(get_checkin_dates(checkins))
    if not dates:
        return 0

    best = 1
    current = 1
    previous_date = datetime.fromisoformat(dates[0]).date()

    for date_str in dates[1:]:
        current_date = datetime.fromisoformat(date_str).date()

        if (current_date - previous_date).days == 1:
            current += 1
        else:
            best = max(best, current)
            current = 1

        previous_date = current_date

    return max(best, current)


def get_last_checkin_time(checkins):
    normalized = normalize_checkins(checkins)
    return max((c["timestamp"] for c in normalized), default=None)


def get_dashboard_window(days=DASHBOARD_WINDOW_DAYS, today=None):
    window_end = today or datetime.now().date()
    return [(window_end - timedelta(days=i)).isoformat() for i in range(days)]


def get_dashboard_data(days=DASHBOARD_WINDOW_DAYS):
    checkins = normalize_checkins(load_checkins())
    checkin_dates = sorted({c["date"] for c in checkins}, reverse=True)

    return {
        "checkins": checkin_dates,
        "current_streak": get_current_streak(checkins),
        "best_streak": get_best_streak(checkins),
    }


def get_filter_data(days=DASHBOARD_WINDOW_DAYS):
    dashboard_data = get_dashboard_data(days=days)
    checked_dates = set(dashboard_data["checkins"])
    window = get_dashboard_window(days=days)

    return {
        "all": window,
        "checked": [date for date in window if date in checked_dates],
        "missed": [date for date in window if date not in checked_dates],
    }


def api_error_response(route_name):
    def decorator(route):
        @wraps(route)
        def wrapper(*args, **kwargs):
            try:
                return route(*args, **kwargs)
            except Exception as exc:
                logger.exception("%s failed", route_name)
                return jsonify({"status": "error", "message": str(exc)}), 500

        return wrapper

    return decorator


# ---------------------------------------------------
# Routes
# ---------------------------------------------------

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


# ---------------------------------------------------
# API
# ---------------------------------------------------

@app.route("/api/checkin", methods=["POST"])
@api_error_response("Check-in")
def checkin():
    now = datetime.now()
    today = now.date().isoformat()
    timestamp = int(now.timestamp() * 1000)

    checkins = normalize_checkins(load_checkins())
    checked_dates = {c["date"] for c in checkins}

    if today in checked_dates:
        status = "info"
    else:
        checkins.append({"date": today, "timestamp": timestamp})
        status = "success"

    checkins = normalize_checkins(checkins)
    save_checkins(checkins)

    current_streak = get_current_streak(checkins)
    best_streak = get_best_streak(checkins)

    return jsonify({
        "status": status,
        "checkins": sorted({c["date"] for c in checkins}, reverse=True),
        "current_streak": current_streak,
        "best_streak": best_streak,
        "currentStreak": current_streak,
        "bestStreak": best_streak,
    })


@app.route("/api/status")
@api_error_response("Status")
def status():
    checkins = normalize_checkins(load_checkins())
    return jsonify({
        "currentStreak": get_current_streak(checkins),
        "lastCheckInTime": get_last_checkin_time(checkins),
        "bestStreak": get_best_streak(checkins),
    })


@app.route("/api/dashboard")
@api_error_response("Dashboard")
def dashboard_api():
    return jsonify(get_dashboard_data())


@app.route("/api/checkins")
@api_error_response("Check-ins")
def checkins_api():
    return jsonify(get_dashboard_data()["checkins"])


@app.route("/api/dashboard/filters")
@api_error_response("Dashboard filters")
def dashboard_filters_api():
    return jsonify(get_filter_data())


@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200


# ---------------------------------------------------
# Scheduler (local use only)
# ---------------------------------------------------

def schedule_checker():
    def check_missed():
        today = datetime.now().date().isoformat()
        if today not in {c["date"] for c in normalize_checkins(load_checkins())}:
            logger.info("Missed check-in detected")

    schedule.every().day.at(CONFIG["alert_time"]).do(check_missed)

    while True:
        schedule.run_pending()
        time.sleep(60)


# ---------------------------------------------------
# Main Entry
# ---------------------------------------------------

if __name__ == "__main__":
    is_debug = os.environ.get("FLASK_ENV") != "production"

    if is_debug:
        threading.Thread(target=schedule_checker, daemon=True).start()

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=is_debug,
    )
