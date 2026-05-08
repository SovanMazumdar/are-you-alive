// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('detail-modal');
    const modalClose = modal?.querySelector('.modal-close');
    const modalDate = document.getElementById('detail-date');
    const modalStatus = document.getElementById('detail-status');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let cachedCheckinDates = [];
    let activeFilter = 'all';

    loadDashboard();
    setupViewToggle();
    setupFilters();
    setupModal();

    async function loadDashboard() {
        try {
            const response = await fetch('/api/dashboard');
            const dashboard = await response.json();

            if (!response.ok) {
                throw new Error(dashboard.message || 'Dashboard request failed');
            }

            cachedCheckinDates = normalizeCheckinDates(dashboard.checkins || []);

            renderCalendarView(cachedCheckinDates);
            renderListView(cachedCheckinDates);
            renderStreakSummary(dashboard);

        } catch (error) {
            const calendarContainer = document.getElementById('calendar-container');
            const listContainer = document.getElementById('list-container');

            if (calendarContainer) {
                calendarContainer.innerHTML = '<p>Error loading dashboard.</p>';
            }
            if (listContainer) {
                listContainer.innerHTML = '<p>Error loading dashboard.</p>';
            }
            console.error(error);
        }
    }

    function normalizeCheckinDates(checkins) {
        return [...new Set(checkins.map((checkin) => {
            if (typeof checkin === 'string') {
                return checkin;
            }
            return checkin?.date;
        }).filter(Boolean))];
    }

    function dateToISODate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getLastThirtyDays() {
        const today = new Date();
        return Array.from({ length: 30 }, (_, index) => {
            const date = new Date(today);
            date.setDate(date.getDate() - index);
            return { date, dateStr: dateToISODate(date) };
        });
    }

    function getVisibleDays(checkins) {
        const checkedDates = new Set(checkins);
        return getLastThirtyDays().filter(({ dateStr }) => {
            const checked = checkedDates.has(dateStr);
            if (activeFilter === 'checked') {
                return checked;
            }
            if (activeFilter === 'missed') {
                return !checked;
            }
            return true;
        });
    }

    function renderStreakSummary(dashboard) {
        const currentStreak = document.getElementById('current-streak');
        const bestStreak = document.getElementById('best-streak');

        if (currentStreak) {
            currentStreak.textContent = dashboard?.current_streak ?? dashboard?.currentStreak ?? 0;
        }
        if (bestStreak) {
            bestStreak.textContent = dashboard?.best_streak ?? dashboard?.bestStreak ?? 0;
        }
    }

    function setupViewToggle() {
        const calBtn = document.getElementById('calendar-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        const calContainer = document.getElementById('calendar-container');
        const listContainer = document.getElementById('list-container');

        if (!calBtn || !listBtn || !calContainer || !listContainer) {
            return;
        }

        calBtn.addEventListener('click', () => {
            calBtn.classList.add('active');
            listBtn.classList.remove('active');
            calContainer.style.display = '';
            listContainer.style.display = 'none';
        });

        listBtn.addEventListener('click', () => {
            listBtn.classList.add('active');
            calBtn.classList.remove('active');
            listContainer.style.display = '';
            calContainer.style.display = 'none';
        });
    }

    function setupFilters() {
        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                filterButtons.forEach((btn) => btn.classList.remove('active'));
                button.classList.add('active');
                activeFilter = button.dataset.filter || 'all';
                renderListView(cachedCheckinDates);
            });
        });
    }

    function setupModal() {
        if (!modal) {
            return;
        }

        modalClose?.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    function openModal(dateStr, checked) {
        if (!modal || !modalDate || !modalStatus) {
            return;
        }

        modalDate.textContent = new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
        modalStatus.textContent = checked ? 'Checked' : 'Missed';
        modalStatus.className = `modal-value ${checked ? 'checked' : 'missed'}`;

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        if (!modal) {
            return;
        }
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    function renderCalendarView(checkins) {
        const container = document.getElementById('calendar-container');
        if (!container) {
            return;
        }

        const checkedDates = new Set(checkins);
        const days = getLastThirtyDays().slice(0, 7).reverse();
        let html = '<div class="checkin-grid">';

        days.forEach(({ date, dateStr }) => {
            const checked = checkedDates.has(dateStr);
            html += `<button class="day ${checked ? 'checked' : 'missed'}" data-date="${dateStr}" data-checked="${checked}">
                <div class="date">${date.toLocaleDateString(undefined, {weekday: 'short'})}</div>
                <div class="daynum">${date.getDate()}</div>
                <div class="status">${checked ? '✓' : '•'}</div>
            </button>`;
        });

        html += '</div>';
        container.innerHTML = html;
        container.querySelectorAll('.day').forEach((day) => {
            day.addEventListener('click', () => {
                const dateStr = day.dataset.date;
                const checked = day.dataset.checked === 'true';
                openModal(dateStr, checked);
            });
        });
    }

    function renderListView(checkins) {
        const container = document.getElementById('list-container');
        if (!container) {
            return;
        }

        const checkedDates = new Set(checkins);
        let html = '<ul class="checkin-list">';

        getVisibleDays(checkins).forEach(({ date, dateStr }) => {
            const checked = checkedDates.has(dateStr);
            const status = checked ? 'checked' : 'missed';
            html += `<li class="list-item ${status}" data-date="${dateStr}" data-checked="${checked}">
                <div class="list-date">${date.toLocaleDateString()}</div>
                <div class="list-status">${checked ? 'Checked' : 'Missed'}</div>
            </li>`;
        });

        html += '</ul>';
        container.innerHTML = html;
        container.querySelectorAll('.list-item').forEach((item) => {
            item.addEventListener('click', () => {
                const dateStr = item.dataset.date;
                const checked = item.dataset.checked === 'true';
                openModal(dateStr, checked);
            });
        });
    }
});
