// ================= INTRO ANIMATION =================
window.onload = function () {
    const intro = document.getElementById("intro");
    const canvas = document.getElementById("intro-canvas");
    const ctx = canvas.getContext("2d");

    let animationFrameId;
    let particles = [];

    function initCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = [];

        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 1.2,
                vy: (Math.random() - 0.5) * 1.2,
                radius: Math.random() * 2 + 1,
                color: '#2da1f8'
            });
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.strokeStyle = 'rgba(45, 161, 248, 0.15)';

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dist = Math.hypot(
                    particles[i].x - particles[j].x,
                    particles[i].y - particles[j].y
                );

                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    initCanvas();
    animate();

    window.addEventListener("resize", initCanvas);

    // Hide intro after 2.2s
    setTimeout(() => {
        cancelAnimationFrame(animationFrameId);

        intro.style.transition = "opacity 0.8s ease, visibility 0.8s";
        intro.style.opacity = "0";
        intro.style.visibility = "hidden";

        setTimeout(() => {
            intro.style.display = "none";
        }, 800);
    }, 2200);
};

// ================= FILE UPLOAD DISPLAY =================
const fileInput = document.getElementById("prescriptionFile");
const fileName = document.getElementById("fileName");
const fileInfo = document.getElementById("fileInfo");

if (fileInput) {
    fileInput.addEventListener("change", function () {
        if (this.files.length > 0) {
            fileName.textContent = this.files[0].name;
            fileInfo.classList.remove("d-none");
        }
    });
}

// ================= ANALYZE + OCR =================
// ================= ANALYZE + OCR =================
// ================= ANALYZE + PREVIEW (MATCHING YOUR BACKEND) =================

async function handleAnalyze() {
    const fileInput = document.getElementById("prescriptionFile");
    const resultBox = document.getElementById("resultBox");

    if (!fileInput.files.length) {
        alert("Please upload a prescription first");
        return;
    }

    const file = fileInput.files[0];

    resultBox.innerHTML = `
        <div class="alert alert-info text-center">
            🔄 Analyzing Prescription...
        </div>
    `;

    const formData = new FormData();
    formData.append("file", file);

    try {
        let endpoint = "";

        // ✅ SAME LOGIC AS upload.js
        if (file.type === "application/pdf") {
            endpoint = "http://localhost:8000/prescription/upload-pdf";
        } else {
            endpoint = "http://localhost:8000/prescription/upload-image";
        }

        const res = await fetch(endpoint, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        console.log("🔥 PREVIEW RESPONSE:", data);

        // 🚨 LOW CONFIDENCE CHECK
        if (data.status === "low_confidence") {
            resultBox.innerHTML = `
                <div class="alert alert-warning">
                    ⚠ Image unclear. Try again.
                </div>
            `;
            return;
        }

        if (!res.ok) {
            resultBox.innerHTML = `
                <div class="alert alert-danger">
                    ❌ Server error
                </div>
            `;
            return;
        }

        // ✅ SAVE FULL DATA (IMPORTANT FOR AFTER LOGIN)
        sessionStorage.setItem("previewData", JSON.stringify(data));

        if (!data.medicines || data.medicines.length === 0) {
            resultBox.innerHTML = `<div class="alert alert-warning">No medicines detected</div>`;
            return;
        }

        // ================= SHOW ONLY USES + SIDE EFFECTS =================
        
        // ================= SHOW PREVIEW =================
let html = `
<div class="preview-wrapper">

    <!-- HEADER -->
    <div class="preview-header text-center mb-4">
        <h3>🧾 Prescription Preview</h3>
        <p class="text-muted">Basic info available for free. Unlock full details.</p>
    </div>

    <div class="medicine-list">
`;

data.medicines.forEach((m, index) => {

    const isLocked = index >= 1; // only first 2 free

    html += `
        <div class="med-preview-card">

            <div class="med-header">
                <h5>💊 ${m.name || "Unknown Medicine"}</h5>
            </div>

            <!-- FREE CONTENT -->
            <div class="med-body">
                <p><strong>📖 Uses:</strong> ${m.uses?.replace(/💊 Uses:|📖 Uses:/g, "").trim() || "Not available"}</p>
              
            </div>

            <!-- LOCKED CONTENT -->
            <div class="${isLocked ? 'locked-content' : ''}">
           <p><span class="label">⚠️ Side Effects:</span>${isLocked ? '********' : (m.side_effects?.replace(/⚠️ Side Effects:/g, "").trim() || "Not available")}</p>
            <p><span class="label">💊 Dosage:</span> ${isLocked ? '********' : (m.dosage || "N/A")}</p>
            <p><span class="label">⏰ Frequency:</span> ${isLocked ? '********' : (m.frequency || "N/A")}</p>
            <p><span class="label">📅 Duration:</span> ${isLocked ? '********' : (m.duration || "N/A")}</p>
            <p><span class="label">📌 Instructions:</span> ${isLocked ? '********' : (m.instruction || "N/A")}</p>

                ${isLocked ? `
                <div class="lock-layer">
                    <div class="lock-icon">🔒</div>
                    <p>Free limit reached</p>
                </div>` : ''}
            </div>

        </div>
    `;
});

html += `
    </div>

    <!-- MESSAGE -->
    <div class="text-center mt-3 text-danger fw-bold">
        🔒 You’ve reached your free preview limit
    </div>

    <!-- GLOBAL CTA -->
    <div class="unlock-global text-center mt-3">
        <button class="unlock-btn" onclick="goToLoginForFullAccess()">
            🚀 Login to Unlock Full Prescription
        </button>
    </div>

</div>
`;

resultBox.innerHTML = html;

    } catch (err) {
        console.error(err);
        resultBox.innerHTML = `
            <div class="alert alert-danger">
                ❌ Error analyzing prescription
            </div>
        `;
    }
}
// ================= NAVIGATION =================
function goToLogin() {
    window.location.href = "/login.html";
}

function goToSignup() {
    window.location.href = "/signup.html";
}
function goToLoginForFullAccess() {
    sessionStorage.setItem("redirectAfterLogin", "true");
    window.location.href = "/login.html";
}
// ================= SCROLL =================
function scrollToUpload() {
    document.getElementById("upload-section").scrollIntoView({
        behavior: "smooth"
    });
}

function scrollToFeatures() {
    document.querySelector(".info-section").scrollIntoView({
        behavior: "smooth"
    });
}
