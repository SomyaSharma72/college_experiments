const form = document.querySelector("#auth-form");
const authPanel = document.querySelector("#auth-panel");
const accountPanel = document.querySelector("#account-panel");
const message = document.querySelector("#message");
const submitButton = document.querySelector("#submit-button");
let mode = "login";

async function send(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...options.headers }
    });
    if (response.status === 204) return null;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The request could not be completed.");
    return result;
}

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

function showAccount(user) {
    authPanel.hidden = true;
    accountPanel.hidden = false;
    document.querySelector("#account-email").textContent = user.email;
}

document.querySelector(".tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    mode = button.dataset.mode;
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    submitButton.textContent = mode === "login" ? "Sign in" : "Create account";
    form.elements.password.autocomplete = mode === "login" ? "current-password" : "new-password";
    showMessage("");
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    try {
        const data = Object.fromEntries(new FormData(form));
        const result = await send(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(data) });
        showAccount(result.user);
        showMessage(mode === "login" ? "You are signed in." : "Your account has been created.");
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        submitButton.disabled = false;
    }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
    try {
        await send("/api/auth/logout", { method: "POST" });
        accountPanel.hidden = true;
        authPanel.hidden = false;
        form.reset();
        showMessage("You have signed out.");
    } catch (error) {
        showMessage(error.message, true);
    }
});

send("/api/auth/me")
    .then((result) => showAccount(result.user))
    .catch((error) => {
        if (!error.message.includes("sign in")) showMessage(error.message, true);
    });
