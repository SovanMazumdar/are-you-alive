// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('detail-modal');
    const modalClose = modal?.querySelector('.modal-close');
    const modalDate = document.getElementById('detail-date');
    const modalStatus = document.getElementById('detail-status');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let cachedCheckins = [];
    let activeFilter = 'all';

    loadDashboard();
    setupViewToggle();
    setupFilters();
    setupModal();

    async function loadDashboard() {
        try {
            const [checkinsResponse, statusResponse] = await Promise.all([
                fetch('/api/checkins'),
                fetch('/api/status')
            ]);
            const checkins = await checkinsResponse.json();
            const status = await statusResponse.json();
            cachedCheckins = checkins;

            renderCalendarView(checkins);
            renderListView(checkins);
            renderStreakSummary(status);

        } catch (error) {
            document.getElementById('calendar-container').innerHTML = '<p>Error loading dashboard.</p>';
            document.getElementById('list-container').innerHTML = '<p>Error loading dashboard.</p>';
            console.error(error);
        }
    }

    function renderStreakSummary(status) {
        const currentStreak = document.getElementById('current-streak');
        const bestStreak = document.getElementById('best-streak');

        if (currentStreak) {
            currentStreak.textContent = status?.currentStreak ?? 0;
        }
        if (bestStreak) {
            bestStreak.textContent = status?.bestStreak ?? 0;
        }
    }

    function setupViewToggle() {
        const calBtn = document.getElementById('calendar-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        const calContainer = document.getElementById('calendar-container');
        const listContainer = document.getElementById('list-container');

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
                renderListView(cachedCheckins);
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

        modalDate.textContent = new Date(dateStr).toLocaleDateString(undefined, {
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
        const today = new Date();
        const container = document.getElementById('calendar-container');
        let html = '<div class="checkin-grid">';

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const checked = checkins.includes(dateStr);
            html += `<button class="day ${checked ? 'checked' : 'missed'}" data-date="${dateStr}" data-checked="${checked}">
                <div class="date">${date.toLocaleDateString(undefined, {weekday: 'short'})}</div>
                <div class="daynum">${date.getDate()}</div>
                <div class="status">${checked ? '✓' : '•'}</div>
            </button>`;
        }

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
        const today = new Date();
        let html = '<ul class="checkin-list">';

        // last 14 days
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const checked = checkins.includes(dateStr);
            const status = checked ? 'checked' : 'missed';
            if (activeFilter !== 'all' && activeFilter !== status) {
                continue;
            }
            html += `<li class="list-item ${status}" data-date="${dateStr}" data-checked="${checked}">
                <div class="list-date">${date.toLocaleDateString()}</div>
                <div class="list-status">${checked ? 'Checked' : 'Missed'}</div>
            </li>`;
        }

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
