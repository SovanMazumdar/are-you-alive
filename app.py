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

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

# Configuration
CONFIG = {
    'checkin_schedule': '08:00',
    'alert_time': '10:00',
    'grace_period_hours': 4,
    'emergency_email': os.environ.get('EMERGENCY_EMAIL', 'your-email@example.com'),
    'smtp_server': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
    'smtp_port': int(os.environ.get('SMTP_PORT', 587)),
    'smtp_username': os.environ.get('SMTP_USERNAME', ''),
    'smtp_password': os.environ.get('SMTP_PASSWORD', ''),
    'smtp_from_email': os.environ.get('SMTP_FROM_EMAIL', ''),
    'notification_subject': 'Daily Check-In Reminder',
    'notification_message': '''This is an automated reminder from your Daily Check-In Monitor.

You haven't checked in today. Please visit your check-in page and click the check-in button.

If you're unable to check in, please contact your emergency contact.'''
}

CHECKINS_FILE = 'checkins.json'

def normalize_checkins(checkins):
    normalized = []
    for entry in checkins:
        if isinstance(entry, dict):
            date_value = entry.get('date')
            timestamp_value = entry.get('timestamp')
        else:
            date_value = entry
            timestamp_value = None

        if not date_value:
            continue

        try:
            date_obj = datetime.fromisoformat(str(date_value)).date()
        except ValueError:
            continue

        if timestamp_value is None:
            timestamp_dt = datetime.combine(date_obj, datetime.min.time())
            timestamp_value = int(timestamp_dt.timestamp() * 1000)
        else:
            try:
                timestamp_value = int(timestamp_value)
            except (TypeError, ValueError):
                timestamp_dt = datetime.combine(date_obj, datetime.min.time())
                timestamp_value = int(timestamp_dt.timestamp() * 1000)

        normalized.append({
            'date': date_obj.isoformat(),
            'timestamp': timestamp_value
        })

    normalized.sort(key=lambda item: item['date'], reverse=True)
    return normalized

def get_checkin_dates(checkins):
    return [entry['date'] for entry in checkins]

def get_current_streak(checkins):
    if not checkins:
        return 0

    dates = get_checkin_dates(checkins)
    if not dates:
        return 0

    date_set = set(dates)
    latest_date = datetime.fromisoformat(dates[0]).date()
    streak = 0
    current_date = latest_date

    while current_date.isoformat() in date_set:
        streak += 1
        current_date -= timedelta(days=1)

    return streak

def get_last_checkin_time(checkins):
    if not checkins:
        return None
    latest_entry = max(checkins, key=lambda item: item['timestamp'])
    return latest_entry['timestamp']

def get_best_streak(checkins):
    dates = sorted({entry['date'] for entry in checkins})
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

def load_checkins():
    if os.path.exists(CHECKINS_FILE):
        with open(CHECKINS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_checkins(checkins):
    with open(CHECKINS_FILE, 'w') as f:
        json.dump(checkins, f)

def send_email(subject, message, to_email):
    try:
        msg = MIMEMultipart()
        msg['From'] = CONFIG['smtp_from_email']
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(message, 'plain'))

        server = smtplib.SMTP(CONFIG['smtp_server'], CONFIG['smtp_port'])
        server.starttls()
        server.login(CONFIG['smtp_username'], CONFIG['smtp_password'])
        text = msg.as_string()
        server.sendmail(CONFIG['smtp_from_email'], to_email, text)
        server.quit()
        print('Email sent successfully')
        return True
    except Exception as e:
        print(f'Failed to send email: {e}')
        return False

def check_missed_checkin():
    today = datetime.now().date().isoformat()
    checkins = normalize_checkins(load_checkins())
    checkin_dates = get_checkin_dates(checkins)
    
    if today not in checkin_dates:
        print(f"No check-in detected for {today}. Sending notification.")
        success = send_email(CONFIG['notification_subject'], CONFIG['notification_message'], CONFIG['emergency_email'])
        if success:
            print("Notification email sent successfully.")
        else:
            print("Failed to send notification email.")
    else:
        print(f"Check-in confirmed for {today}.")

def schedule_checker():
    # Schedule daily check at alert_time
    schedule.every().day.at(CONFIG['alert_time']).do(check_missed_checkin)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

@app.route("/privacy")
def privacy():
    return render_template(
        "privacy.html",
        current_year=datetime.now().year
    )


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

@app.route('/api/checkin', methods=['POST'])
def checkin():
    try:
        today = datetime.now().date().isoformat()
        now_timestamp = int(datetime.now().timestamp() * 1000)
        checkins = normalize_checkins(load_checkins())
        checkin_dates = get_checkin_dates(checkins)

        if today not in checkin_dates:
            checkins.append({'date': today, 'timestamp': now_timestamp})
            checkins.sort(key=lambda item: item['date'], reverse=True)
            cutoff_date = (datetime.now() - timedelta(days=30)).date().isoformat()
            checkins = [entry for entry in checkins if entry['date'] >= cutoff_date]
            save_checkins(checkins)
            return jsonify({'status': 'success', 'message': 'Check-in successful!'})
        else:
            return jsonify({'status': 'info', 'message': 'Already checked in today!'})
    except Exception as e:
        print(f"Error during check-in: {e}")
        return jsonify({'status': 'error', 'message': 'Check-in failed. Please try again.'}), 500

@app.route('/api/checkins')
def get_checkins():
    checkins = normalize_checkins(load_checkins())
    return jsonify(get_checkin_dates(checkins))

@app.route('/api/status')
def get_status():
    checkins = normalize_checkins(load_checkins())
    return jsonify({
        'currentStreak': get_current_streak(checkins),
        'lastCheckInTime': get_last_checkin_time(checkins),
        'bestStreak': get_best_streak(checkins)
    })

if __name__ == '__main__':
    print("Starting Daily Check-In Monitor...")
    print(f"Alert time: {CONFIG['alert_time']}")
    print(f"Emergency email: {CONFIG['emergency_email']}")
    
    # Start the scheduler in a separate thread
    scheduler_thread = threading.Thread(target=schedule_checker, daemon=True)
    scheduler_thread.start()
    print("Scheduler started.")
    
    app.run(debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true', 
            host='0.0.0.0', 
            port=int(os.environ.get('PORT', 5000)))
