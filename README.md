# Daily Safety Check Monitor  -  ["Dead?" / "Alive?"]- 

Short description: Open-source Python Flask app for daily wellness check-ins, automated email alerts, and a simple dashboard Ideal for parents, senior citizens, families, lone workers in India.
It supports Indian email providers.

Keywords/Tags: Are You Alive; AreYouAlive; daily check-in; check-in monitor; check-in reminder; daily check-in app; wellness check; elderly monitoring; senior safety; caregiver alerts; family alerts; emergency contact; email alerts; automated alerts; Python; Flask; SMTP; background tasks; scheduled tasks; cron; responsive web app; mobile-friendly; accessibility; 'I'm Alive' button; check-in dashboard; 7-day history; health monitoring; fall detection; home safety; lone worker check-in; Elderly; Check-in Reminder; Daily Check-in; Are you alive?; Are you dead?.

A simple, open-source server-based daily check-in system that helps you monitor well-being and sends automated email alerts if a check-in is missed.


Developed by [Alexander Ezharjan](https://ezharjan.github.io/).

<br>

Redeveloped by [Sovan Dibyajyoti](https://github.com/SovanMazumdar).

<br>

Inspired by the 'Are you dead?' / 'Are you alive?' software

---

## 🚀 Quick Start

### Prerequisites
- Python 3.7 or higher
- A Gmail account (recommended) or another SMTP provider for email delivery

### Installation
1. Clone or download the project:
   ```bash
   git clone https://github.com/your/repo.git
   cd AreYouAlive
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in your values.
     - On macOS / Linux: `cp .env.example .env`
     - On Windows (PowerShell): `Copy-Item .env.example .env`

4. Run the application:
   ```bash
   python app.py
   ```

---

## ⚙️ Configuration

Configure the application using environment variables. Create a `.env` file with the following values:

```bash
# Required
EMERGENCY_EMAIL=your-email@example.com          # Where to send alerts
SMTP_USERNAME=your-gmail@gmail.com              # SMTP username
SMTP_PASSWORD=your-app-password                 # SMTP password (App Password for Gmail)
SMTP_FROM_EMAIL=your-gmail@gmail.com            # Sender email

# Optional (defaults provided)
SMTP_SERVER=smtp.gmail.com                      # SMTP server
SMTP_PORT=587                                    # SMTP port
CHECKIN_SCHEDULE=10:00                            # Expected check-in time (HH:MM)
ALERT_TIME=20:00                                  # Time to check for missed check-ins (HH:MM)
GRACE_PERIOD_HOURS=4                              # Hours of grace after schedule
```

---

## 📊 How It Works

1. Daily Check-In: Click the "Check In" button on the main page.
2. Automated Monitoring: The server checks daily at the configured time for missed check-ins.
3. Email Alerts: If no check-in is detected within the grace period, an alert is sent to the emergency contact.
4. Dashboard: View a 7-day history of check-ins on `/dashboard`.

---

## 🔧 Features

- ✅ Simple, clean interface with a prominent check-in button
- ✅ Automated email notifications via SMTP
- ✅ 7-day check-in history dashboard
- ✅ Server-side data persistence
- ✅ Scheduled monitoring with background tasks
- ✅ Mobile-responsive design

---

## 🧪 Local Testing

1. Start the server:
   ```bash
   python app.py
   ```
2. Test check-in:
   - Visit `http://localhost:5000` and click the "Check In" button.
   - Confirm you see a "Check-in successful!" message and a log entry in the server output.
3. Test the dashboard:
   - Visit `http://localhost:5000/dashboard` and verify the 7-day grid renders correctly.
4. Test email notifications (optional):
   - Wait until the configured alert time, or temporarily set `ALERT_TIME` to a time near the current time to test immediately.

---

## 🔎 Troubleshooting

**Application won't start**
- Ensure the Python version is 3.7 or higher: `python --version`.
- Install dependencies: `pip install -r requirements.txt`.
- Verify required environment variables are set.
- Check for port conflicts (default port 5000).

**Emails not sending**
- Verify SMTP credentials and server settings.
- For Gmail, use an App Password (not your regular password).
- Check spam/junk folders and server logs for SMTP errors.

**Check-in not working**
- Check the browser console for JavaScript errors (F12 → Console).
- Confirm the server is running and API endpoints are reachable.
- Verify CORS settings if accessing from another domain.

**Dashboard not loading**
- Ensure `/api/checkins` is accessible.
- Confirm the data file (e.g., `checkins.json`) exists and is readable.
- Look for JavaScript errors in the browser console.

---

## 📝 License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

## 🤝 Contributing

This project is intended for personal use, but pull requests and improvements are welcome. Please open an issue or a PR if you'd like to suggest changes.
