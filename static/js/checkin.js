<<<<<<< codex/add-daily-status-card-below-check-in-button-gt98si
// Daily Check-In JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const checkinBtn = document.getElementById('checkin-btn');
    const statusMessage = document.getElementById('status-message');
    const dailyStatusCard = document.getElementById('daily-status-card');
    const beforeCheckInMessage = 'Did you pause and acknowledge yourself today?';
    const afterCheckInMessage = 'Good job. You showed up today.';

    const statusTimeFormatter = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit'
    });

    function renderDailyStatus(status) {
        if (!status || status.currentStreak <= 0 || !status.lastCheckInTime) {
            dailyStatusCard.hidden = true;
            dailyStatusCard.textContent = '';
            return;
        }

        const formattedTime = `Today at ${statusTimeFormatter.format(new Date(status.lastCheckInTime))}`;
        dailyStatusCard.innerHTML = `
            <p class="daily-status-title">You are alive for ${status.currentStreak} days in a row</p>
            <p class="daily-status-subtitle">Last check-in: ${formattedTime}</p>
        `;
        dailyStatusCard.hidden = false;
    }

    async function loadDailyStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            renderDailyStatus(status);
        } catch (error) {
            console.error('Failed to load daily status:', error);
        }
    }

    loadDailyStatus();

    function triggerSuccessEffects() {
        checkinBtn.classList.remove('checkin-success');
        void checkinBtn.offsetWidth;
        checkinBtn.classList.add('checkin-success');

        if (typeof window.confetti !== 'function') {
            return;
        }

        window.setTimeout(() => {
            window.confetti({
                particleCount: 70,
                spread: 55,
                startVelocity: 26,
                ticks: 100,
                scalar: 0.85,
                origin: { y: 0.65 }
            });
        }, 0);
    }
=======
document.addEventListener("DOMContentLoaded", () => {
    const checkinBtn = document.getElementById("checkin-btn");
    const statusMessage = document.getElementById("status-message");
    const dailyStatusCard = document.getElementById("daily-status-card");
>>>>>>> main

    const beforeMsg = "Did you pause and acknowledge yourself today?";
    const afterMsg = "Good job. You showed up today.";

    const formatter = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit"
    });

    statusMessage.textContent = beforeMsg;

    async function loadStatus() {
        const res = await fetch("/api/status");
        const s = await res.json();

        if (!s.currentStreak || !s.lastCheckInTime) {
            dailyStatusCard.hidden = true;
            return;
        }

        dailyStatusCard.innerHTML = `
            <p class="daily-status-title">
                You are alive for ${s.currentStreak} days in a row
            </p>
            <p class="daily-status-subtitle">
                Last check-in: Today at ${formatter.format(new Date(s.lastCheckInTime))}
            </p>
        `;

        dailyStatusCard.hidden = false;
    }

    function triggerConfetti() {
        if (typeof window.confetti !== "function") return;

        window.confetti({
            particleCount: 80,
            spread: 60,
            startVelocity: 30,
            ticks: 120,
            scalar: 0.9,
            origin: { y: 0.65 }
        });
    }

    checkinBtn.addEventListener("click", async () => {
        checkinBtn.disabled = true;
        statusMessage.textContent = "Checking in...";

        try {
<<<<<<< codex/add-daily-status-card-below-check-in-button-gt98si
            const response = await fetch('/api/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.status === 'success') {
                statusMessage.textContent = afterCheckInMessage;
                statusMessage.style.color = 'green';
                triggerSuccessEffects();
                await loadDailyStatus();
            } else if (result.status === 'info') {
                statusMessage.textContent = afterCheckInMessage;
                statusMessage.style.color = '#0ea5e9';
                await loadDailyStatus();
=======
            const res = await fetch("/api/checkin", { method: "POST" });
            const r = await res.json();

            if (r.status === "success" || r.status === "info") {
                statusMessage.textContent = afterMsg;
                statusMessage.style.color =
                    r.status === "success" ? "green" : "#0ea5e9";

                triggerConfetti();
                await loadStatus();
>>>>>>> main
            } else {
                statusMessage.textContent = "Check-in failed.";
                statusMessage.style.color = "red";
            }
        } catch {
            statusMessage.textContent = "Check-in failed.";
            statusMessage.style.color = "red";
        } finally {
            checkinBtn.disabled = false;
        }
    });

<<<<<<< codex/add-daily-status-card-below-check-in-button-gt98si
    statusMessage.textContent = beforeCheckInMessage;
});
=======
    loadStatus();
});
>>>>>>> main
