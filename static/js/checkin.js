// Daily Check-In JavaScript
document.addEventListener('DOMContentLoaded', function () {
    const checkinBtn = document.getElementById('checkin-btn');
    const statusMessage = document.getElementById('status-message');
    const dailyStatusCard = document.getElementById('daily-status-card');
    const confettiBurst = document.getElementById('confetti-burst');

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

    function triggerSuccessEffects() {
        checkinBtn.classList.remove('checkin-success');
        void checkinBtn.offsetWidth;
        checkinBtn.classList.add('checkin-success');

        if (!confettiBurst) return;

        confettiBurst.innerHTML = '';
        confettiBurst.classList.remove('show');
        void confettiBurst.offsetWidth;

        for (let i = 0; i < 14; i++) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.setProperty('--x', `${Math.random() * 160 - 80}px`);
            piece.style.setProperty('--y', `${Math.random() * -120 - 40}px`);
            piece.style.setProperty('--r', `${Math.random() * 360}deg`);
            piece.style.setProperty('--d', `${Math.random() * 0.35 + 0.65}s`);
            confettiBurst.appendChild(piece);
        }

        confettiBurst.classList.add('show');
        setTimeout(() => {
            confettiBurst.classList.remove('show');
            confettiBurst.innerHTML = '';
        }, 900);
    }

    loadDailyStatus();
    statusMessage.textContent = beforeCheckInMessage;

    checkinBtn.addEventListener('click', async function () {
        checkinBtn.disabled = true;
        statusMessage.textContent = 'Checking in...';

        try {
            const response = await fetch('/api/checkin', { method: 'POST' });
            const result = await response.json();

            if (result.status === 'success' || result.status === 'info') {
                statusMessage.textContent = afterCheckInMessage;
                statusMessage.style.color = result.status === 'success' ? 'green' : '#0ea5e9';
                triggerSuccessEffects();
                await loadDailyStatus();
            } else {
                statusMessage.textContent = result.message || 'Check-in failed.';
                statusMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Check-in failed:', error);
            statusMessage.textContent = 'Check-in failed. Please try again.';
            statusMessage.style.color = 'red';
        } finally {
            checkinBtn.disabled = false;
        }
    });
});
