document.addEventListener('DOMContentLoaded', async () => {

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const closeBtn = document.getElementById('closeMenuBtn');
    const openBtn = document.getElementById('openMenuBtn');
    const sidebarContent = document.getElementById('sidebarMenuContent');

    // --- SIDEBAR TOGGLE LOGIC ---
    if (closeBtn && openBtn) {
        closeBtn.onclick = () => {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            sidebarContent.classList.add('d-none');
            openBtn.classList.remove('d-none');
        };

        openBtn.onclick = () => {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
            sidebarContent.classList.remove('d-none');
            openBtn.classList.add('d-none');
        };
    }

    // --- USER NAME ---
    const loggedInUser = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');

    const nameDisplay = document.getElementById('userNameDisplay');
    if (nameDisplay) {
        nameDisplay.innerText = loggedInUser ? loggedInUser : "User";
    }

    // ✅ MOBILE USERNAME — synced from same localStorage value
    const mobileNameDisplay = document.getElementById('userNameDisplayMobile');
    if (mobileNameDisplay) {
        mobileNameDisplay.innerText = loggedInUser ? loggedInUser : "User";
    }

    // --- LOGOUT ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.clear(); 
            sessionStorage.clear();
            window.location.href = "/"; 
        };
    }

    // =======================
    // 🔥 FETCH DASHBOARD DATA
    // =======================
    if (userId) {
        const res = await fetch(`/dashboard-stats?user_id=${userId}`);
        const data = await res.json();

        if (data.success) {
            const d = data.data;

            // 🎯 Animated Numbers
            animateNumber("activeMeds", d.active);
            animateNumber("dosesTaken", d.weeklyTaken);
            animateNumber("pendingRefills", d.pending);

            document.getElementById("adherenceRate").innerText = d.adherence + "%";

            // status text
            const status = document.getElementById("adherenceStatus");
            if (d.adherence >= 90) status.innerText = "🔥 Excellent!";
            else if (d.adherence >= 70) status.innerText = "👍 Good";
            else status.innerText = "⚠ Improve";

            initBarChart(d.weeklyChart);
           initLineChart(d.weeklyChart);
            showPrediction(d.prediction);
        }
    }

    initCharts(); // keep your old fallback

    animateCards();
    addRippleEffect();
});


// ================= COUNT-UP ANIMATION =================
function animateNumber(id, end) {
    let start = 0;
    const duration = 1000;
    const step = end / (duration / 16);

    const el = document.getElementById(id);
    if (!el) return;

    const counter = setInterval(() => {
        start += step;

        if (start >= end) {
            el.innerText = end;
            clearInterval(counter);
        } else {
            el.innerText = Math.floor(start);
        }
    }, 16);
}


// ================= BAR CHART =================
function initBarChart(chartData) {
    if (!chartData || chartData.length === 0) return;

    const labels = chartData.map(d => d.day);
    const taken = chartData.map(d => d.taken);
    const missed = chartData.map(d => d.missed);

    new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Completed', data: taken, backgroundColor: '#004795' },
                { label: 'Missed', data: missed, backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}


// ================= DONUT CHART (NEW UNIQUE) =================
function initDonutChart(adherence) {

    new Chart(document.getElementById('lineChart'), {
        type: 'doughnut',
        data: {
            labels: ['Adherence', 'Missed'],
            datasets: [{
                data: [adherence, 100 - adherence],
                backgroundColor: ['#22c55e', '#ef4444']
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}


// ================= EXISTING FALLBACK =================
function initCharts() {
    const barElement = document.getElementById('barChart');
    const lineElement = document.getElementById('lineChart');

    if (!barElement || !lineElement) return;
}


// ================= FLOAT ENTRY ANIMATION =================
function animateCards() {
    const cards = document.querySelectorAll('.stat-card');

    cards.forEach((card, index) => {
        card.style.opacity = 0;
        card.style.transform = "translateY(30px)";

        setTimeout(() => {
            card.style.transition = "0.6s ease";
            card.style.opacity = 1;
            card.style.transform = "translateY(0)";
        }, index * 150);
    });
}


// ================= RIPPLE CLICK EFFECT =================
function addRippleEffect() {

    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', function (e) {

            const ripple = document.createElement("span");
            ripple.classList.add("ripple");

            const rect = card.getBoundingClientRect();
            ripple.style.left = `${e.clientX - rect.left}px`;
            ripple.style.top = `${e.clientY - rect.top}px`;

            card.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });
}
// ================= LINE CHART =================
function initLineChart(chartData) {

    const labels = chartData.map(d => d.day);

    const adherence = chartData.map(d => {
        const total = d.taken + d.missed;
        return total === 0 ? 0 : Math.round((d.taken / total) * 100);
    });

    new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Adherence %',
                data: adherence,
                borderColor: '#22c55e',
                tension: 0.4,
                pointRadius: 6,
                fill: false
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: { min: 0, max: 100 }
            }
        }
    });
}


// ================= AI PREDICTION UI =================
function showPrediction(pred) {

    const card = document.createElement("div");
    card.className = "stat-card";
    card.style.marginTop = "20px";

    let color = "green";
    if (pred.risk === "MEDIUM") color = "orange";
    if (pred.risk === "HIGH") color = "red";

    card.innerHTML = `
        <div class="text-muted small fw-bold">AI Prediction</div>
        <div style="font-size:28px; font-weight:bold; color:${color}">
            ${pred.risk} Risk
        </div>
        <div class="text-muted small">
            Missed doses this week: ${pred.missed}
        </div>
    `;

    document.querySelector(".main-content").appendChild(card);
}