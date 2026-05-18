document.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const closeBtn = document.getElementById('closeMenuBtn');
    const openBtn = document.getElementById('openMenuBtn');
    const sidebarContent = document.getElementById('sidebarMenuContent');

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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "/";
        };
    }

    renderReminders();
});

// ================= GLOBAL =================
let editingId = null;
let currentReminders = [];

// ✅ Get API base URL (works on localhost and Render)
function getApiBaseUrl() {
    return window.location.origin;
}

// ================= MODAL =================
function openAdd() {
    document.getElementById("reminderModal").style.display = "flex";
    document.getElementById("timeInputs").innerHTML = "";
    document.getElementById("customTimesBox").style.display = "none";
}

function closeModal() {
    document.getElementById("reminderModal").style.display = "none";
}

// ================= FREQUENCY =================
function updateTimeInputs() {
    const freq = document.getElementById("frequency").value;
    const container = document.getElementById("timeInputs");
    const customBox = document.getElementById("customTimesBox");

    container.innerHTML = "";

    if (freq === "custom") {
        customBox.style.display = "block";
        return;
    }

    customBox.style.display = "none";

    if (!freq) return;

    generateTimeInputs(parseInt(freq));
}

function updateCustomTimes() {
    const count = document.getElementById("customCount").value;
    generateTimeInputs(count);
}

function generateTimeInputs(count) {
    const container = document.getElementById("timeInputs");
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="time-input-group">
                <div class="time-label">Time ${i + 1}</div>
                <input type="time" class="form-control time-field">
            </div>
        `;
    }
}

// ================= SAVE (FIXED) =================
async function saveReminder() {
    const API_BASE_URL = getApiBaseUrl();
    
    const medicineInput = document.getElementById("medicineName").value;
    const duration = document.getElementById("duration").value;
    const language = document.getElementById("language").value;

    const timeFields = document.querySelectorAll(".time-field");

    let times = [];
    timeFields.forEach(t => {
        if (t.value) times.push(t.value);
    });

    if (!medicineInput || times.length === 0 || !duration) {
        alert("Please fill all fields");
        return;
    }

    const medicines = medicineInput.split(",").map(m => m.trim());
    const days = generateDays(duration);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + parseInt(duration) - 1);

    if (editingId) {
        // UPDATE
        await fetch(`${API_BASE_URL}/update-reminder/${editingId}`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                medicines,
                times,
                duration,
                language,
                days,
                start_date: startDate,
                end_date: endDate
            })
        });

        editingId = null;

    } else {
        // CREATE
        await fetch(`${API_BASE_URL}/add-reminder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: localStorage.getItem("userId"),
                medicines,
                times,
                duration,
                language,
                days,
                start_date: startDate,
                end_date: endDate
            })
        });
    }

    closeModal();
    renderReminders();
}

// ================= DAYS =================
function generateDays(duration) {
    const daysList = [];
    const today = new Date();

    for (let i = 0; i < duration; i++) {
        let d = new Date();
        d.setDate(today.getDate() + i);

        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        daysList.push(dayName);
    }

    return daysList;
}

function formatDate(dateStr) {
    if (!dateStr) return "N/A";

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";

    return d.toISOString().split("T")[0];
}

// ================= RENDER (FIXED) =================
async function renderReminders() {
    const API_BASE_URL = getApiBaseUrl();
    const list = document.getElementById("reminderList");
    list.innerHTML = "";

    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
        const res = await fetch(`${API_BASE_URL}/reminders?user_id=${userId}`);
        const data = await res.json();

        currentReminders = data;

        data.forEach((r) => {
            const times = Array.isArray(r.times) ? r.times : [];
            const days = Array.isArray(r.days) ? r.days : [];

            const timeHTML = times.map(t => `<div>${formatTime(t)}</div>`).join("");
            const daysHTML = days.map(d => `<span class="day-pill">${d}</span>`).join("");

            const medicinesHTML = r.medicines.map(med => `
                <div class="med-name">${med}</div>
            `).join("");

            const card = `
<div class="reminder-card">

    <div class="card-head">
        <div>
            ${medicinesHTML}
        </div>

        <div class="d-flex gap-2">
            <button class="icon-btn" onclick="editReminder(${r.id})">
                <i class="fas fa-pen"></i>
            </button>

            <button class="icon-btn delete-btn" onclick="deleteReminder(${r.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>

    <div class="info-grid">

        <div class="info-box box-teal">
            <div class="info-top">
                <i class="bi bi-clock"></i> Times
            </div>
            <div class="value">${timeHTML}</div>
        </div>

        <div class="info-box box-yellow">
            <div class="info-top">
                <i class="bi bi-bell"></i> Frequency
            </div>
            <div class="value">${getFrequencyLabel(times.length)}</div>
            <small>${formatDate(r.start_date)} → ${formatDate(r.end_date)}</small>
        </div>

        <div class="info-box box-blue">
            <div class="info-top">
                <i class="bi bi-telephone"></i> SMS
            </div>
            <div class="value">Enabled</div>
        </div>

    </div>

    <div class="days-section">
        ${daysHTML}
    </div>

    <div class="status-box">
        <strong>Status:</strong> ${getStatusBadge(r.latest_status)}
    </div>

</div>
            `;

            list.innerHTML += card;
        });
    } catch (error) {
        console.error("Error loading reminders:", error);
        list.innerHTML = `<div class="alert alert-danger">Error loading reminders</div>`;
    }
}

// ================= EDIT =================
function editReminder(id) {
    const r = currentReminders.find(x => x.id === id);
    if (!r) return;

    editingId = id;

    document.getElementById("medicineName").value = r.medicines.join(", ");
    document.getElementById("duration").value = r.duration;
    document.getElementById("language").value = r.language;

    document.getElementById("frequency").value = r.times.length;
    updateTimeInputs();

    setTimeout(() => {
        const inputs = document.querySelectorAll(".time-field");
        inputs.forEach((input, i) => {
            if (r.times[i]) input.value = r.times[i];
        });
    }, 100);

    openAdd();
}

// ================= DELETE (FIXED) =================
async function deleteReminder(id) {
    if (!confirm("Delete reminder?")) return;

    const API_BASE_URL = getApiBaseUrl();

    await fetch(`${API_BASE_URL}/delete-reminder/${id}`, {
        method: "DELETE"
    });

    renderReminders();
}

// ================= HELPERS =================
function formatTime(time) {
    let [h, m] = time.split(":");
    h = parseInt(h);

    let ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;

    return `${h}:${m} ${ampm}`;
}

function getFrequencyLabel(count) {
    if (count === 1) return "Once a day";
    if (count === 2) return "Twice a day";
    if (count === 3) return "Thrice a day";
    return `${count} times/day`;
}

function getStatusBadge(status) {
    if (status === "taken") {
        return `<span style="color:green; font-weight:600;">✅ Taken</span>`;
    }
    if (status === "missed") {
        return `<span style="color:red; font-weight:600;">❌ Missed</span>`;
    }
    return `<span style="color:orange; font-weight:600;">⏳ Pending</span>`;
}