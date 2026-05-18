document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarContent = document.getElementById('sidebarMenuContent');
    const closeBtn = document.getElementById('closeMenuBtn');
    const openBtn = document.getElementById('openMenuBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // --- SIDEBAR TOGGLE ---
    closeBtn.addEventListener('click', () => {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
        sidebarContent.classList.add('d-none');
        openBtn.classList.remove('d-none');
    });

    openBtn.addEventListener('click', () => {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
        sidebarContent.classList.remove('d-none');
        openBtn.classList.add('d-none');
    });

    // --- LOGOUT ---
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
    });

    // --- FILE UPLOAD ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const nameDisplay = document.getElementById('file-name-display');
    const uploadBtn = document.getElementById('uploadBtn');

    dropZone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            nameDisplay.innerHTML = `<i class="bi bi-file-earmark-check me-1"></i>Selected: ${fileName}`;
            nameDisplay.style.color = "#28a745"; 
            dropZone.style.borderColor = "#28a745";
        }
    };

    uploadBtn.onclick = async () => {
        if (fileInput.files.length === 0) {
            nameDisplay.innerHTML = "Please select a file first!";
            nameDisplay.style.color = "red";
            return;
        }

        nameDisplay.innerHTML = "🔄 Analyzing Prescription...";
        uploadBtn.disabled = true;

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append("file", file);
        const userId = localStorage.getItem("userId");

        if (userId) {
            formData.append("user_id", userId);
        }

        try {
            // Get the current domain (works on localhost and Render)
            const API_BASE_URL = window.location.origin;
            
            let endpoint = "";
            
            // Decide route based on file type
            if (file.type === "application/pdf") {
                endpoint = `${API_BASE_URL}/prescription/upload-pdf`;
            } else {
                endpoint = `${API_BASE_URL}/prescription/upload-image`;
            }

            console.log("📤 Uploading to:", endpoint);

            const res = await fetch(endpoint, {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            console.log("🔥 BACKEND RESPONSE:", data);

            // Handle low confidence case
            if (data.status === "low_confidence") {
                nameDisplay.innerHTML = "⚠ Image unclear. Try again.";
                uploadBtn.disabled = false;
                return;
            }

            // If API failed
            if (!res.ok) {
                nameDisplay.innerHTML = "❌ Server error";
                uploadBtn.disabled = false;
                return;
            }

            // Save valid data
            localStorage.setItem("medResults", JSON.stringify(data));

            // Redirect to results page
            window.location.href = "/results.html";

        } catch (err) {
            console.error("Upload error:", err);
            nameDisplay.innerHTML = "❌ Error analyzing prescription. Please try again.";
        }

        uploadBtn.disabled = false;
    };
});