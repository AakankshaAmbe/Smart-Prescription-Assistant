document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);
    const drugName = params.get("drug");
        // =========================
    // SIDEBAR LOGIC (FIXED)
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
            resultDiv.innerHTML = "⚠ Enter medicine name";
            return;
        }

        resultDiv.innerHTML = "⏳ Searching...";

        try {
            const response = await fetch("http://127.0.0.1:8000/search-medicine", {
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

                        <p><b>Uses:</b> ${safe(data.uses)}</p>
                        <p><b>Dosage:</b> ${safe(data.dosage)}</p>
                        <p><b>When to take:</b> ${safe(data.when_to_take)}</p>
                        <p><b>Side Effects:</b> ${safe(data.side_effects)}</p>
                        <p><b>Precautions:</b> ${safe(data.precautions)}</p>

                        <p><b>🧠 Description:</b> ${safe(data.description)}</p>

                        <p style="color:green;"><b>Confidence:</b> ${data.confidence}%</p>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `<p style="color:red;">❌ ${data.message}</p>`;
            }

        } catch (error) {
            console.error(error);
            resultDiv.innerHTML = "❌ Backend error";
        }
    };
     if (drugName) {
        const inputBox = document.getElementById("searchInput");
        inputBox.value = drugName;

        searchMedicine(); // now safe ✅
    }
});

// =========================
// SAFE FUNCTION
// =========================
function safe(value) {
    return value ? value : "Not available";
}