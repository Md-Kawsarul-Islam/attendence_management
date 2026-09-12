function showForm(formId) {
    document.querySelectorAll('.form-box').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(formId).classList.add('active');
}

async function loadSessionData() {
    const res = await fetch('/session-data');
    const data = await res.json();

    // Login error
    if (data.login_error) {
        const loginError = document.getElementById("login-error");
        loginError.innerText = data.login_error;
        loginError.style.display = "block";
    } else {
        document.getElementById("login-error").style.display = "none";
    }

    // Register error
    if (data.register_error) {
        const registerError = document.getElementById("register-error");
        registerError.innerText = data.register_error;
        registerError.style.display = "block";
    } else {
        document.getElementById("register-error").style.display = "none";
    }

    // Show active form
    if (data.active_form === "register") {
        showForm('register-form');
    } else {
        showForm('login-form');
    }
}

// Load when page opens
window.onload = loadSessionData;