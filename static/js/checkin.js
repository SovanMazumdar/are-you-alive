document.addEventListener("DOMContentLoaded", () => {
    const checkinBtn = document.getElementById("checkin-btn");
    const statusMessage = document.getElementById("status-message");
    const dailyStatusCard = document.getElementById("daily-status-card");

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
            const res = await fetch("/api/checkin", { method: "POST" });
            const r = await res.json();

            if (r.status === "success" || r.status === "info") {
                statusMessage.textContent = afterMsg;
                statusMessage.style.color =
                    r.status === "success" ? "green" : "#0ea5e9";

                triggerConfetti();
                await loadStatus();
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

    loadStatus();
});