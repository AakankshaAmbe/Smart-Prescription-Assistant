document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);
    const drugName = params.get("drug");
    
    // =========================
    // SIDEBAR LOGIC
    // =========================
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

    // =========================
    // SEARCH FUNCTION
    // =========================
    window.searchMedicine = async function () {
        const input = document.getElementById("searchInput").value.trim();
        const resultDiv = document.getElementById("result");

        if (!input) {
            resultDiv.innerHTML = '<div class="alert alert-warning">⚠️ Enter medicine name</div>';
            return;
        }

        resultDiv.innerHTML = '<div class="alert alert-info">⏳ Searching...</div>';

        try {
            const API_BASE_URL = window.location.origin;
            
            const response = await fetch(`${API_BASE_URL}/search-medicine`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name: input })
            });

            const data = await response.json();

            if (data.found) {
                resultDiv.innerHTML = `
                    <div class="result-card">
                        <h2>💊 ${safe(data.name)}</h2>
                        <p><strong>📖 Uses:</strong> ${safe(data.uses)}</p>
                        <p><strong>💊 Dosage:</strong> ${safe(data.dosage)}</p>
                        <p><strong>⏰ When to take:</strong> ${safe(data.when_to_take)}</p>
                        <p><strong>⚠️ Side Effects:</strong> ${safe(data.side_effects)}</p>
                        <p><strong>🛡️ Precautions:</strong> ${safe(data.precautions)}</p>
                        <p><strong>🧠 Description:</strong> ${safe(data.description)}</p>
                        <p style="color:green;"><strong>Confidence:</strong> ${data.confidence}%</p>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `<div class="alert alert-warning">❌ ${data.message}</div>`;
            }

        } catch (error) {
            console.error("Search error:", error);
            resultDiv.innerHTML = '<div class="alert alert-danger">❌ Backend error. Please try again.</div>';
        }
    };
    
    if (drugName) {
        const inputBox = document.getElementById("searchInput");
        if (inputBox) {
            inputBox.value = drugName;
            setTimeout(() => searchMedicine(), 100);
        }
    }
});

function safe(value) {
    return value ? value : "Not available";
}