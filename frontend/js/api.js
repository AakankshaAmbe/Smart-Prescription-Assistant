const BASE = "http://127.0.0.1:8000"

// ── helper: show message under any form ──────────────────────
function showMsg(id, text, isError) {
  const el = document.getElementById(id)
  el.textContent = text
  el.style.color = isError ? "red" : "green"
}

// ── SIGNUP ────────────────────────────────────────────────────
// Called when user submits signup form
// Sends: name, email, password, phone → goes into users table
document.getElementById("signupForm").addEventListener("submit", async function(e) {
  e.preventDefault()

  const btn = document.getElementById("signupBtn")
  btn.disabled = true
  btn.textContent = "Creating..."

  const data = {
    name:     document.getElementById("signupName").value,
    email:    document.getElementById("signupEmail").value,
    password: document.getElementById("signupPassword").value,
    phone:    document.getElementById("signupPhone").value
  }

  try {
    const response = await fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)       // converts JS object → JSON string
    })

    const result = await response.json()  // parse server's response

    if (response.ok) {
      // 200 → success
      showMsg("signupMsg", "✓ Account created! You can now sign in.", false)
      document.getElementById("signupForm").reset()
    } else {
      // 400/500 → show FastAPI's error message
      showMsg("signupMsg", result.detail || "Something went wrong.", true)
    }

  } catch (err) {
    // fetch itself failed → server not running or wrong URL
    showMsg("signupMsg", "Cannot reach server. Is Uvicorn running?", true)
  }

  btn.disabled = false
  btn.textContent = "Sign Up"
})

// ── LOGIN ─────────────────────────────────────────────────────
// Called when user submits login form
// Sends: email, password → server checks DB and returns user_id
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault()

  const btn = document.getElementById("loginBtn")
  btn.disabled = true
  btn.textContent = "Signing in..."

  const data = {
    email:    document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value
  }

  try {
    const response = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (response.ok) {
      // Save to localStorage so other pages know who is logged in
      localStorage.setItem("user_id", result.user_id)
      localStorage.setItem("user_name", result.name)

      showMsg("loginMsg", "✓ Login successful! Redirecting...", false)

      // Go to dashboard after 1 second
      setTimeout(() => window.location.href = "dashboard.html", 1000)

    } else {
      showMsg("loginMsg", result.detail || "Invalid credentials.", true)
    }

  } catch (err) {
    showMsg("loginMsg", "Cannot reach server. Is Uvicorn running?", true)
  }

  btn.disabled = false
  btn.textContent = "Sign In"
})