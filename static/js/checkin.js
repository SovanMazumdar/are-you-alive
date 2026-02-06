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

    // Handle check-in button click
    checkinBtn.addEventListener('click', async function() {
        checkinBtn.disabled = true;
        statusMessage.textContent = 'Checking in...';

        try {
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
                await loadDailyStatus();
            } else if (result.status === 'info') {
                statusMessage.textContent = afterCheckInMessage;
                statusMessage.style.color = '#0ea5e9';
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

    statusMessage.textContent = beforeCheckInMessage;
});
