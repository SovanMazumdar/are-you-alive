document.addEventListener('DOMContentLoaded', () => {
    const checkinBtn = document.getElementById('checkin-btn');
    const statusMessage = document.getElementById('status-message');
    const dailyStatusCard = document.getElementById('daily-status-card');
    const confettiBurst = document.getElementById('confetti-burst');

    const beforeMsg = 'Did you pause and acknowledge yourself today?';
    const afterMsg = 'Good job. You showed up today.';

    const formatter = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit'
    });

    statusMessage.textContent = beforeMsg;

    async function loadStatus() {
        const res = await fetch('/api/status');
        const s = await res.json();
        if (!s.currentStreak || !s.lastCheckInTime) {
            dailyStatusCard.hidden = true;
            return;
        }
        dailyStatusCard.innerHTML = `
            <p>You are alive for ${s.currentStreak} days in a row</p>
            <p>Last check-in: Today at ${formatter.format(new Date(s.lastCheckInTime))}</p>
        `;
        dailyStatusCard.hidden = false;
    }

    function confetti() {
        if (!confettiBurst) return;
        confettiBurst.innerHTML = '';
        for (let i = 0; i < 14; i++) {
            const s = document.createElement('span');
            s.className = 'confetti-piece';
            confettiBurst.appendChild(s);
        }
        confettiBurst.classList.add('show');
        setTimeout(() => confettiBurst.classList.remove('show'), 900);
    }

    checkinBtn.addEventListener('click', async () => {
        checkinBtn.disabled = true;
        statusMessage.textContent = 'Checking in...';

        try {
            const res = await fetch('/api/checkin', { method: 'POST' });
            const r = await res.json();

            if (r.status === 'success' || r.status === 'info') {
                statusMessage.textContent = afterMsg;
                statusMessage.style.color = r.status === 'success' ? 'green' : '#0ea5e9';
                confetti();
                await loadStatus();
            } else {
                statusMessage.textContent = 'Check-in failed.';
                statusMessage.style.color = 'red';
            }
        } catch {
            statusMessage.textContent = 'Check-in failed.';
            statusMessage.style.color = 'red';
        } finally {
            checkinBtn.disabled = false;
        }
    });

    loadStatus();
});
