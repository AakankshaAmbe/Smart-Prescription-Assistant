// ============ RESULTS.JS - COMPLETE FIXED VERSION FOR RENDER ============

// ============ 1. LANGUAGE SELECTOR ============
function getSelectedLanguage() {
    const select = document.getElementById('voiceLanguage');
    if (select && select.value) return select.value;
    return localStorage.getItem('preferredLanguage') || 'english';
}

// ============ 2. AUTO-SAVE FUNCTION (FIXED) ============
async function autoSaveToHistory(data) {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) { console.log("No user ID, skipping auto-save"); return; }

        // ✅ FIX: Use current domain (works on localhost and Render)
        const API_BASE_URL = window.location.origin;

        const prescriptionData = {
            user_id: userId,
            patient_name: data.patient_name || "Patient",
            doctor: data.doctor_name || data.doctor || "Not specified",
            medicines: data.medicines.map(m => m.name || m),
            date: data.date || new Date().toISOString().split('T')[0],
            status: 'active',
            filename: 'prescription.jpg',
            file_type: 'image/jpeg'
        };

        const response = await fetch(`${API_BASE_URL}/api/prescriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prescriptionData)
        });

        console.log(response.ok ? "✅ Auto-saved to history" : "⚠️ Auto-save failed");
    } catch (error) {
        console.error("Auto-save error:", error);
    }
}

// ============ 3. MAIN LOAD FUNCTION ============
document.addEventListener("DOMContentLoaded", async () => {
    const raw =
    localStorage.getItem("medResults") ||
    sessionStorage.getItem("extractedData") ||
    sessionStorage.getItem("previewData");
    const data = raw ? JSON.parse(raw) : null;
    const container = document.getElementById("results");
    const loading = document.getElementById("loading");

    if (loading) loading.style.display = "none";

    if (!data) {
        container.innerHTML = `<div class="alert alert-danger">No data found. Please upload a prescription first.</div>`;
        return;
    }

    if (data.medicines && data.medicines.length > 0) {
        await autoSaveToHistory(data);
        showToastMessage("✅ Prescription saved to history", "success");
    }

    window.currentPrescriptionData = data;

    // Prescription details card
    container.innerHTML = `
        <div class="card p-4">
            <h4>🧾 Prescription Details</h4>
            <hr>
            <p><strong>👤 Patient:</strong> ${data.patient_name || "N/A"}</p>
            <p><strong>👨‍⚕ Doctor:</strong> ${data.doctor_name || data.doctor || "N/A"}</p>
            <p><strong>📅 Date:</strong> ${data.date || new Date().toLocaleDateString()}</p>
            <p><strong>🩺 Diagnosis:</strong> ${data.diagnosis || "N/A"}</p>
        </div>
    `;

    if (!data.medicines || data.medicines.length === 0) {
        container.innerHTML += `<div class="alert alert-warning">No medicines detected</div>`;
        return;
    }

    // Action buttons
    container.innerHTML += `
        <div class="action-buttons">
            <button class="btn-voice" onclick="generateVoiceInstructions()">
                <i class="bi bi-mic-fill"></i> 🔊 Listen to All Instructions
            </button>
            <button class="btn-card" onclick="downloadPrescriptionCard()">
                <i class="bi bi-card-text"></i> 📄 Download Card
            </button>
        </div>
    `;

    // Medicine cards
    data.medicines.forEach((m, index) => {
        const card = document.createElement("div");
        card.className = "card p-4";
        card.style.animationDelay = `${index * 0.15}s`;

        const name = m.name || "Unknown";
        const dosage = m.dosage || m.dose || "N/A";
        const frequency = m.frequency || m.when || "N/A";
        const duration = m.duration || "N/A";
        const instruction = m.instruction || m.instructions || "N/A";
        const uses = m.uses || "Information not available";
        const sideEffects = m.side_effects || "Information not available";
        const confidence = (m.confidence || 0).toFixed(0);

        const badgeClass = m.source === "DATASET" ? "bg-success" :
                          m.source === "OPENFDA" ? "bg-info text-dark" :
                          m.source === "RXNORM" ? "bg-warning text-dark" : "bg-secondary";

        const safeInstruction = instruction.replace(/'/g, "\\'");

        card.innerHTML = `
            <h4>💊 ${name}</h4>
            <hr>
            <p><strong>💊 Dosage:</strong> ${dosage}</p>
            <p><strong>⏰ Frequency:</strong> ${frequency}</p>
            <p><strong>📅 Duration:</strong> ${duration}</p>
            <p><strong>📌 Instructions:</strong> ${instruction}</p>
            <hr>
            <p><strong>📖 Uses:</strong> ${uses}</p>
            <p><strong>⚠️ Side Effects:</strong> ${sideEffects}</p>
            <p><strong>📊 Confidence:</strong> ${confidence}%</p>
            <span class="badge ${badgeClass}">${m.source || "AI Extracted"}</span>
            <hr>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
                <select class="form-select action-btn" style="width:auto;" onchange="syncWithGoogleTranslate(this)">
                    <option value="">🌐 Translate</option>
                </select>
                
                <button class="btn btn-warning action-btn" onclick='openReminderFromResult(${JSON.stringify(m).replace(/'/g, "&#39;")})'>
                    ⏰ Reminder
                </button>
            </div>
        `;

        container.appendChild(card);
    });
});

// ============ 4. VOICE - ALL MEDICINES (FIXED) ============
async function generateVoiceInstructions() {
    const data = window.currentPrescriptionData;
    const language = getSelectedLanguage();

    console.log("🎤 Generating voice in language:", language);

    if (!data || !data.medicines || data.medicines.length === 0) {
        showToastMessage("No medicines found to read", "error");
        return;
    }

    const medicinesList = data.medicines.map(m => ({
        name: m.name || String(m),
        dosage: m.dosage || m.dose || "",
        frequency: m.frequency || m.when || "",
        instruction: m.instruction || m.instructions || "",
        duration: m.duration || ""
    }));

    const loadingMsg = {
        english: "Generating voice instructions...",
        hindi: "हिंदी में आवाज तैयार की जा रही है...",
        marathi: "मराठी मध्ये आवाज तयार होत आहे..."
    };

    showToastMessage(loadingMsg[language] || loadingMsg.english, "info");

    try {
        // ✅ FIX: Use current domain
        const API_BASE_URL = window.location.origin;
        
        const response = await fetch(`${API_BASE_URL}/api/voice?lang=${language}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_name: data.patient_name || "Patient",
                medicines: medicinesList,
                doctor: data.doctor_name || data.doctor || ""
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
        }

        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play();
        
        const playingMsg = {
            english: "Playing medicine instructions...",
            hindi: "हिंदी में दवा के निर्देश चल रहे हैं...",
            marathi: "मराठी मध्ये औषधांच्या सूचना प्ले होत आहेत..."
        };
        showToastMessage(playingMsg[language] || playingMsg.english, "success");

    } catch (error) {
        console.error('Voice error:', error);
        showToastMessage("Failed to generate voice instructions", "error");
    }
}

// ============ 5. VOICE - SINGLE MEDICINE ============
function speakMedicine(medicineName, instruction) {
    if (!medicineName) return;
    const language = getSelectedLanguage();
    
    const texts = {
        english: `Take ${medicineName}. ${instruction}`,
        hindi: `${medicineName} लें। ${instruction}`,
        marathi: `${medicineName} घ्या। ${instruction}`
    };
    const langCodes = { english: 'en-US', hindi: 'hi-IN', marathi: 'mr-IN' };

    if (!('speechSynthesis' in window)) {
        showToastMessage("Text-to-speech not supported", "error");
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texts[language] || texts.english);
    utterance.lang = langCodes[language] || 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    
    showToastMessage(`Speaking: ${medicineName}`, "success");
}

// ============ 6. DOWNLOAD CARD (FIXED) ============
async function downloadPrescriptionCard() {
    const data = window.currentPrescriptionData;
    const language = getSelectedLanguage();

    if (!data || !data.medicines || data.medicines.length === 0) {
        showToastMessage("No medicines to create card", "error");
        return;
    }

    const medicinesList = data.medicines.map(m => ({
        name: m.name || 'Unknown',
        dosage: m.dosage || m.dose || '',
        frequency: m.frequency || m.when || 'As directed',
        instruction: m.instruction || m.instructions || '',
        duration: m.duration || ''
    }));

    showToastMessage("📄 Generating prescription card...", "info");

    try {
        // ✅ FIX: Use current domain
        const API_BASE_URL = window.location.origin;
        const userId = localStorage.getItem('userId');
        
        const response = await fetch(`${API_BASE_URL}/api/card?lang=${language}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: userId || 'unknown',
                prescription_id: Date.now().toString(),
                patient_name: data.patient_name || "Patient",
                doctor: data.doctor_name || data.doctor || "Not specified",
                date: data.date || new Date().toLocaleDateString(),
                medicines: medicinesList,
                emergency_contact: "Not provided"
            })
        });

        if (!response.ok) throw new Error('Failed to generate card');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        showToastMessage("✅ Prescription card ready!", "success");

    } catch (error) {
        console.error('Card error:', error);
        showToastMessage("Failed to generate prescription card", "error");
    }
}

// ============ 7. MEDICINE INFO ============
async function getMedicineInfo(medicineName) {
    showToastMessage(`🔍 Fetching info for ${medicineName}...`, "info");
    try {
        const response = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(medicineName)}&limit=1`);
        if (response.ok) {
            const json = await response.json();
            if (json.results && json.results[0]) {
                const r = json.results[0];
                alert(`📋 ${medicineName}\n\nPurpose: ${r.purpose?.[0] || 'N/A'}\n\nUses: ${r.indications_and_usage?.[0] || 'N/A'}\n\nWarnings: ${r.warnings?.[0] || 'N/A'}\n\nSide Effects: ${r.adverse_reactions?.[0] || 'N/A'}`);
                showToastMessage(`Info for ${medicineName} loaded`, "success");
                return;
            }
        }
        alert(`💊 ${medicineName}\n\nPlease consult your doctor for complete information.`);
    } catch {
        alert(`💊 ${medicineName}\n\nDetailed information not available online.`);
    }
}

// ============ 8. TOAST ============
function showToastMessage(message, type = 'success') {
    document.querySelector('.toast-message')?.remove();
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    const icons = { success: '✅', error: '❌', info: '🔊' };
    toast.innerHTML = `${icons[type] || '✅'} ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ 9. GOOGLE TRANSLATE ============
function populateLanguages() {
    const interval = setInterval(() => {
        const googleDropdown = document.querySelector(".goog-te-combo");
        if (!googleDropdown) return;
        document.querySelectorAll("select[onchange='syncWithGoogleTranslate(this)']").forEach(select => {
            select.innerHTML = `<option value="">🌐 Translate</option>`;
            Array.from(googleDropdown.options).forEach(opt => {
                if (opt.value) {
                    const o = document.createElement("option");
                    o.value = opt.value;
                    o.textContent = opt.text;
                    select.appendChild(o);
                }
            });
        });
        clearInterval(interval);
    }, 500);
}

function syncWithGoogleTranslate(select) {
    const googleDropdown = document.querySelector(".goog-te-combo");
    if (googleDropdown && select.value) {
        googleDropdown.value = select.value;
        googleDropdown.dispatchEvent(new Event("change"));
    }
}
window.addEventListener("load", populateLanguages);

let selectedMedicine = null;

// OPEN MODAL
function openReminderFromResult(med) {
    selectedMedicine = med;

    document.getElementById("resultReminderModal").style.display = "flex";

    // prefill
    document.getElementById("r_medicineName").value = med.name || "";
    document.getElementById("r_duration").value = med.duration || 5;
}

// CLOSE
function closeResultModal() {
    document.getElementById("resultReminderModal").style.display = "none";
}

// FREQUENCY
function updateResultTimes() {
    const freq = document.getElementById("r_frequency").value;
    const box = document.getElementById("r_timeInputs");
    const custom = document.getElementById("r_customBox");

    box.innerHTML = "";

    if (freq === "custom") {
        custom.style.display = "block";
        return;
    }

    custom.style.display = "none";

    generateResultTimes(parseInt(freq));
}

function updateResultCustom() {
    const count = document.getElementById("r_customCount").value;
    generateResultTimes(count);
}

function generateResultTimes(count) {
    const box = document.getElementById("r_timeInputs");
    box.innerHTML = "";

    for (let i = 0; i < count; i++) {
        box.innerHTML += `
        <input type="time" class="form-control r_time mb-2">
        `;
    }
}

// SAVE
async function saveResultReminder() {
    // ✅ FIX: Use current domain for reminder API
    const API_BASE_URL = window.location.origin;
    
    const medicine = document.getElementById("r_medicineName").value;
    const duration = document.getElementById("r_duration").value;
    const language = document.getElementById("r_language").value;

    const timeFields = document.querySelectorAll(".r_time");

    let times = [];
    timeFields.forEach(t => {
        if (t.value) times.push(t.value);
    });

    if (!medicine || times.length === 0 || !duration) {
        alert("Fill all fields");
        return;
    }

    const medicines = medicine.split(",").map(m => m.trim());

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + parseInt(duration) - 1);

    const days = generateDays(duration);

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

    alert("✅ Reminder Added");

    closeResultModal();
}

// reuse from reminders.js
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

// ============ 10. BACKGROUND PARTICLES ============
const canvas = document.getElementById("bgCanvas");
if (canvas) {
    const ctx = canvas.getContext("2d");
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6
    }));

    (function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fill();
        });
        requestAnimationFrame(animate);
    })();
}// ============ RESULTS.JS - COMPLETE FIXED VERSION FOR RENDER ============

// ============ 1. LANGUAGE SELECTOR ============
function getSelectedLanguage() {
    const select = document.getElementById('voiceLanguage');
    if (select && select.value) return select.value;
    return localStorage.getItem('preferredLanguage') || 'english';
}

// ============ 2. AUTO-SAVE FUNCTION (FIXED) ============
async function autoSaveToHistory(data) {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) { console.log("No user ID, skipping auto-save"); return; }

        // ✅ FIX: Use current domain (works on localhost and Render)
        const API_BASE_URL = window.location.origin;

        const prescriptionData = {
            user_id: userId,
            patient_name: data.patient_name || "Patient",
            doctor: data.doctor_name || data.doctor || "Not specified",
            medicines: data.medicines.map(m => m.name || m),
            date: data.date || new Date().toISOString().split('T')[0],
            status: 'active',
            filename: 'prescription.jpg',
            file_type: 'image/jpeg'
        };

        const response = await fetch(`${API_BASE_URL}/api/prescriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prescriptionData)
        });

        console.log(response.ok ? "✅ Auto-saved to history" : "⚠️ Auto-save failed");
    } catch (error) {
        console.error("Auto-save error:", error);
    }
}

// ============ 3. MAIN LOAD FUNCTION ============
document.addEventListener("DOMContentLoaded", async () => {
    const raw =
    localStorage.getItem("medResults") ||
    sessionStorage.getItem("extractedData") ||
    sessionStorage.getItem("previewData");
    const data = raw ? JSON.parse(raw) : null;
    const container = document.getElementById("results");
    const loading = document.getElementById("loading");

    if (loading) loading.style.display = "none";

    if (!data) {
        container.innerHTML = `<div class="alert alert-danger">No data found. Please upload a prescription first.</div>`;
        return;
    }

    if (data.medicines && data.medicines.length > 0) {
        await autoSaveToHistory(data);
        showToastMessage("✅ Prescription saved to history", "success");
    }

    window.currentPrescriptionData = data;

    // Prescription details card
    container.innerHTML = `
        <div class="card p-4">
            <h4>🧾 Prescription Details</h4>
            <hr>
            <p><strong>👤 Patient:</strong> ${data.patient_name || "N/A"}</p>
            <p><strong>👨‍⚕ Doctor:</strong> ${data.doctor_name || data.doctor || "N/A"}</p>
            <p><strong>📅 Date:</strong> ${data.date || new Date().toLocaleDateString()}</p>
            <p><strong>🩺 Diagnosis:</strong> ${data.diagnosis || "N/A"}</p>
        </div>
    `;

    if (!data.medicines || data.medicines.length === 0) {
        container.innerHTML += `<div class="alert alert-warning">No medicines detected</div>`;
        return;
    }

    // Action buttons
    container.innerHTML += `
        <div class="action-buttons">
            <button class="btn-voice" onclick="generateVoiceInstructions()">
                <i class="bi bi-mic-fill"></i> 🔊 Listen to All Instructions
            </button>
            <button class="btn-card" onclick="downloadPrescriptionCard()">
                <i class="bi bi-card-text"></i> 📄 Download Card
            </button>
        </div>
    `;

    // Medicine cards
    data.medicines.forEach((m, index) => {
        const card = document.createElement("div");
        card.className = "card p-4";
        card.style.animationDelay = `${index * 0.15}s`;

        const name = m.name || "Unknown";
        const dosage = m.dosage || m.dose || "N/A";
        const frequency = m.frequency || m.when || "N/A";
        const duration = m.duration || "N/A";
        const instruction = m.instruction || m.instructions || "N/A";
        const uses = m.uses || "Information not available";
        const sideEffects = m.side_effects || "Information not available";
        const confidence = (m.confidence || 0).toFixed(0);

        const badgeClass = m.source === "DATASET" ? "bg-success" :
                          m.source === "OPENFDA" ? "bg-info text-dark" :
                          m.source === "RXNORM" ? "bg-warning text-dark" : "bg-secondary";

        const safeInstruction = instruction.replace(/'/g, "\\'");

        card.innerHTML = `
            <h4>💊 ${name}</h4>
            <hr>
            <p><strong>💊 Dosage:</strong> ${dosage}</p>
            <p><strong>⏰ Frequency:</strong> ${frequency}</p>
            <p><strong>📅 Duration:</strong> ${duration}</p>
            <p><strong>📌 Instructions:</strong> ${instruction}</p>
            <hr>
            <p><strong>📖 Uses:</strong> ${uses}</p>
            <p><strong>⚠️ Side Effects:</strong> ${sideEffects}</p>
            <p><strong>📊 Confidence:</strong> ${confidence}%</p>
            <span class="badge ${badgeClass}">${m.source || "AI Extracted"}</span>
            <hr>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
                <select class="form-select action-btn" style="width:auto;" onchange="syncWithGoogleTranslate(this)">
                    <option value="">🌐 Translate</option>
                </select>
                
                <button class="btn btn-warning action-btn" onclick='openReminderFromResult(${JSON.stringify(m).replace(/'/g, "&#39;")})'>
                    ⏰ Reminder
                </button>
            </div>
        `;

        container.appendChild(card);
    });
});

// ============ 4. VOICE - ALL MEDICINES (FIXED) ============
async function generateVoiceInstructions() {
    const data = window.currentPrescriptionData;
    const language = getSelectedLanguage();

    console.log("🎤 Generating voice in language:", language);

    if (!data || !data.medicines || data.medicines.length === 0) {
        showToastMessage("No medicines found to read", "error");
        return;
    }

    const medicinesList = data.medicines.map(m => ({
        name: m.name || String(m),
        dosage: m.dosage || m.dose || "",
        frequency: m.frequency || m.when || "",
        instruction: m.instruction || m.instructions || "",
        duration: m.duration || ""
    }));

    const loadingMsg = {
        english: "Generating voice instructions...",
        hindi: "हिंदी में आवाज तैयार की जा रही है...",
        marathi: "मराठी मध्ये आवाज तयार होत आहे..."
    };

    showToastMessage(loadingMsg[language] || loadingMsg.english, "info");

    try {
        // ✅ FIX: Use current domain
        const API_BASE_URL = window.location.origin;
        
        const response = await fetch(`${API_BASE_URL}/api/voice?lang=${language}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_name: data.patient_name || "Patient",
                medicines: medicinesList,
                doctor: data.doctor_name || data.doctor || ""
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
        }

        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play();
        
        const playingMsg = {
            english: "Playing medicine instructions...",
            hindi: "हिंदी में दवा के निर्देश चल रहे हैं...",
            marathi: "मराठी मध्ये औषधांच्या सूचना प्ले होत आहेत..."
        };
        showToastMessage(playingMsg[language] || playingMsg.english, "success");

    } catch (error) {
        console.error('Voice error:', error);
        showToastMessage("Failed to generate voice instructions", "error");
    }
}

// ============ 5. VOICE - SINGLE MEDICINE ============
function speakMedicine(medicineName, instruction) {
    if (!medicineName) return;
    const language = getSelectedLanguage();
    
    const texts = {
        english: `Take ${medicineName}. ${instruction}`,
        hindi: `${medicineName} लें। ${instruction}`,
        marathi: `${medicineName} घ्या। ${instruction}`
    };
    const langCodes = { english: 'en-US', hindi: 'hi-IN', marathi: 'mr-IN' };

    if (!('speechSynthesis' in window)) {
        showToastMessage("Text-to-speech not supported", "error");
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texts[language] || texts.english);
    utterance.lang = langCodes[language] || 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    
    showToastMessage(`Speaking: ${medicineName}`, "success");
}

// ============ 6. DOWNLOAD CARD (FIXED) ============
async function downloadPrescriptionCard() {
    const data = window.currentPrescriptionData;
    const language = getSelectedLanguage();

    if (!data || !data.medicines || data.medicines.length === 0) {
        showToastMessage("No medicines to create card", "error");
        return;
    }

    const medicinesList = data.medicines.map(m => ({
        name: m.name || 'Unknown',
        dosage: m.dosage || m.dose || '',
        frequency: m.frequency || m.when || 'As directed',
        instruction: m.instruction || m.instructions || '',
        duration: m.duration || ''
    }));

    showToastMessage("📄 Generating prescription card...", "info");

    try {
        // ✅ FIX: Use current domain
        const API_BASE_URL = window.location.origin;
        const userId = localStorage.getItem('userId');
        
        const response = await fetch(`${API_BASE_URL}/api/card?lang=${language}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: userId || 'unknown',
                prescription_id: Date.now().toString(),
                patient_name: data.patient_name || "Patient",
                doctor: data.doctor_name || data.doctor || "Not specified",
                date: data.date || new Date().toLocaleDateString(),
                medicines: medicinesList,
                emergency_contact: "Not provided"
            })
        });

        if (!response.ok) throw new Error('Failed to generate card');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        showToastMessage("✅ Prescription card ready!", "success");

    } catch (error) {
        console.error('Card error:', error);
        showToastMessage("Failed to generate prescription card", "error");
    }
}

// ============ 7. MEDICINE INFO ============
async function getMedicineInfo(medicineName) {
    showToastMessage(`🔍 Fetching info for ${medicineName}...`, "info");
    try {
        const response = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(medicineName)}&limit=1`);
        if (response.ok) {
            const json = await response.json();
            if (json.results && json.results[0]) {
                const r = json.results[0];
                alert(`📋 ${medicineName}\n\nPurpose: ${r.purpose?.[0] || 'N/A'}\n\nUses: ${r.indications_and_usage?.[0] || 'N/A'}\n\nWarnings: ${r.warnings?.[0] || 'N/A'}\n\nSide Effects: ${r.adverse_reactions?.[0] || 'N/A'}`);
                showToastMessage(`Info for ${medicineName} loaded`, "success");
                return;
            }
        }
        alert(`💊 ${medicineName}\n\nPlease consult your doctor for complete information.`);
    } catch {
        alert(`💊 ${medicineName}\n\nDetailed information not available online.`);
    }
}

// ============ 8. TOAST ============
function showToastMessage(message, type = 'success') {
    document.querySelector('.toast-message')?.remove();
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    const icons = { success: '✅', error: '❌', info: '🔊' };
    toast.innerHTML = `${icons[type] || '✅'} ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ 9. GOOGLE TRANSLATE ============
function populateLanguages() {
    const interval = setInterval(() => {
        const googleDropdown = document.querySelector(".goog-te-combo");
        if (!googleDropdown) return;
        document.querySelectorAll("select[onchange='syncWithGoogleTranslate(this)']").forEach(select => {
            select.innerHTML = `<option value="">🌐 Translate</option>`;
            Array.from(googleDropdown.options).forEach(opt => {
                if (opt.value) {
                    const o = document.createElement("option");
                    o.value = opt.value;
                    o.textContent = opt.text;
                    select.appendChild(o);
                }
            });
        });
        clearInterval(interval);
    }, 500);
}

function syncWithGoogleTranslate(select) {
    const googleDropdown = document.querySelector(".goog-te-combo");
    if (googleDropdown && select.value) {
        googleDropdown.value = select.value;
        googleDropdown.dispatchEvent(new Event("change"));
    }
}
window.addEventListener("load", populateLanguages);

let selectedMedicine = null;

// OPEN MODAL
function openReminderFromResult(med) {
    selectedMedicine = med;

    document.getElementById("resultReminderModal").style.display = "flex";

    // prefill
    document.getElementById("r_medicineName").value = med.name || "";
    document.getElementById("r_duration").value = med.duration || 5;
}

// CLOSE
function closeResultModal() {
    document.getElementById("resultReminderModal").style.display = "none";
}

// FREQUENCY
function updateResultTimes() {
    const freq = document.getElementById("r_frequency").value;
    const box = document.getElementById("r_timeInputs");
    const custom = document.getElementById("r_customBox");

    box.innerHTML = "";

    if (freq === "custom") {
        custom.style.display = "block";
        return;
    }

    custom.style.display = "none";

    generateResultTimes(parseInt(freq));
}

function updateResultCustom() {
    const count = document.getElementById("r_customCount").value;
    generateResultTimes(count);
}

function generateResultTimes(count) {
    const box = document.getElementById("r_timeInputs");
    box.innerHTML = "";

    for (let i = 0; i < count; i++) {
        box.innerHTML += `
        <input type="time" class="form-control r_time mb-2">
        `;
    }
}

// SAVE
async function saveResultReminder() {
    // ✅ FIX: Use current domain for reminder API
    const API_BASE_URL = window.location.origin;
    
    const medicine = document.getElementById("r_medicineName").value;
    const duration = document.getElementById("r_duration").value;
    const language = document.getElementById("r_language").value;

    const timeFields = document.querySelectorAll(".r_time");

    let times = [];
    timeFields.forEach(t => {
        if (t.value) times.push(t.value);
    });

    if (!medicine || times.length === 0 || !duration) {
        alert("Fill all fields");
        return;
    }

    const medicines = medicine.split(",").map(m => m.trim());

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + parseInt(duration) - 1);

    const days = generateDays(duration);

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

    alert("✅ Reminder Added");

    closeResultModal();
}

// reuse from reminders.js
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

// ============ 10. BACKGROUND PARTICLES ============
const canvas = document.getElementById("bgCanvas");
if (canvas) {
    const ctx = canvas.getContext("2d");
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6
    }));

    (function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fill();
        });
        requestAnimationFrame(animate);
    })();
}