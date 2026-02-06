from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import schedule
import time
import threading

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

CONFIG = {
    'alert_time': '10:00',
    'emergency_email': os.environ.get('EMERGENCY_EMAIL', 'your-email@example.com'),
    'smtp_server': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
    'smtp_port': int(os.environ.get('SMTP_PORT', 587)),
    'smtp_username': os.environ.get('SMTP_USERNAME', ''),
    'smtp_password': os.environ.get('SMTP_PASSWORD', ''),
    'smtp_from_email': os.environ.get('SMTP_FROM_EMAIL', ''),
    'notification_subject': 'Daily Check-In Reminder',
    'notification_message': 'No check-in detected today.'
}

CHECKINS_FILE = 'checkins.json'


def load_checkins():
    if os.path.exists(CHECKINS_FILE):
        with open(CHECKINS_FILE, 'r') as f:
            return json.load(f)
    return []


def save_checkins(checkins):
    with open(CHECKINS_FILE, 'w') as f:
        json.dump(checkins, f)


def normalize_checkins(checkins):
    normalized = []
    for entry in checkins:
        date_str = entry.get('date')
        ts = entry.get('timestamp')
        if not date_str:
            continue
        date_obj = datetime.fromisoformat(date_str).date()
        timestamp = ts or int(datetime.combine(date_obj, datetime.min.time()).timestamp() * 1000)
        normalized.append({'date': date_obj.isoformat(), 'timestamp': timestamp})
    return sorted(normalized, key=lambda x: x['date'], reverse=True)


def get_current_streak(checkins):
    if not checkins:
        return 0
    dates = {c['date'] for c in checkins}
    streak = 0
    day = datetime.now().date()
    while day.isoformat() in dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


def get_last_checkin_time(checkins):
    return max((c['timestamp'] for c in checkins), default=None)


def get_best_streak(checkins):
    dates = sorted({c['date'] for c in checkins})
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


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/insights')
def insights():
    return render_template('insights.html')


@app.route('/settings')
def settings():
    return render_template('settings.html')


@app.route('/privacy')
def privacy():
    return render_template('privacy.html', current_year=datetime.now().year)


@app.route('/api/checkin', methods=['POST'])
def checkin():
    try:
        today = datetime.now().date().isoformat()
        ts = int(datetime.now().timestamp() * 1000)
        checkins = normalize_checkins(load_checkins())

        if today not in {c['date'] for c in checkins}:
            checkins.append({'date': today, 'timestamp': ts})
            save_checkins(checkins)
            return jsonify({'status': 'success'})
        return jsonify({'status': 'info'})
    except Exception:
        return jsonify({'status': 'error'}), 500


@app.route('/api/status')
def status():
    checkins = normalize_checkins(load_checkins())
    return jsonify({
        'currentStreak': get_current_streak(checkins),
        'lastCheckInTime': get_last_checkin_time(checkins),
        'bestStreak': get_best_streak(checkins)
    })


def schedule_checker():
    def check_missed():
        today = datetime.now().date().isoformat()
        if today not in {c['date'] for c in normalize_checkins(load_checkins())}:
            print('Missed check-in')

    schedule.every().day.at(CONFIG['alert_time']).do(check_missed)
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == '__main__':
    threading.Thread(target=schedule_checker, daemon=True).start()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
