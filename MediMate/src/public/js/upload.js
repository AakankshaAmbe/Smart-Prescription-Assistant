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
        }  // ✅ ADD THIS LINE ONLY
        try {

            let endpoint = "";

            // ✅ decide route based on file type
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

        console.log("🔥 BACKEND RESPONSE:", data);

        // 🚨 HANDLE STATUS FIRST
        if (data.status === "low_confidence") {
            nameDisplay.innerHTML = "⚠ Image unclear. Try again.";
            uploadBtn.disabled = false;
            return;
        }

        // ❌ If API failed
        if (!res.ok) {
            nameDisplay.innerHTML = "❌ Server error";
            uploadBtn.disabled = false;
            return;
        }

        // ✅ SAVE ONLY VALID DATA
        localStorage.setItem("medResults", JSON.stringify(data));

        // ✅ REDIRECT
        window.location.href = "/results.html";

        } catch (err) {
            console.error(err);
            nameDisplay.innerHTML = "❌ Error analyzing prescription";
        }

        uploadBtn.disabled = false;
    };
});