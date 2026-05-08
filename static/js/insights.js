document.addEventListener("DOMContentLoaded", () => {
    const monthlyCheckins = document.getElementById("monthly-checkins");
    const completionRate = document.getElementById("completion-rate");
    const longestStreak = document.getElementById("longest-streak");
    const monthlyProgress = document.getElementById("monthly-progress");
    const completionProgress = document.getElementById("completion-progress");
    const streakProgress = document.getElementById("streak-progress");
    const message = document.getElementById("insights-message");

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function daysInCurrentMonth() {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    }

    function setProgress(element, percent) {
        if (!element) return;

        requestAnimationFrame(() => {
            element.style.width = `${clamp(percent, 0, 100)}%`;
        });
    }

    function formatPercent(rate) {
        return `${Math.round(clamp(rate, 0, 1) * 100)}%`;
    }

    async function loadInsights() {
        try {
            const response = await fetch("/api/insights");
            if (!response.ok) {
                throw new Error("Unable to load insights");
            }

            const insights = await response.json();
            const monthlyCount = Number(insights.monthly_checkins || 0);
            const longest = Number(insights.longest_streak || 0);
            const completion = Number(insights.completion_rate || 0);
            const monthProgressPercent = (monthlyCount / daysInCurrentMonth()) * 100;
            const streakProgressPercent = longest ? Math.min(longest * 10, 100) : 0;

            monthlyCheckins.textContent = monthlyCount;
            completionRate.textContent = formatPercent(completion);
            longestStreak.textContent = longest;

            setProgress(monthlyProgress, monthProgressPercent);
            setProgress(completionProgress, completion * 100);
            setProgress(streakProgress, streakProgressPercent);

            message.textContent = monthlyCount > 0
                ? "Small, steady moments count."
                : "No check-ins yet this month. Start with one calm pause.";
        } catch (error) {
            message.textContent = "Insights could not load right now.";
        }
    }

    loadInsights();
});
