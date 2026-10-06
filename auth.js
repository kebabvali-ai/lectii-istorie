(function () {
  const dialog = document.getElementById("auth-dialog");
  const openButton = document.getElementById("account-open");
  const closeButton = document.getElementById("auth-close");
  const signOutButton = document.getElementById("account-signout");
  const accountEmail = document.getElementById("account-email");
  const form = document.getElementById("auth-form");
  const emailLabel = document.querySelector('label[for="auth-email"]');
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const passwordLabel = document.querySelector('label[for="auth-password"]');
  const submitButton = document.getElementById("auth-submit");
  const resetButton = document.getElementById("password-reset");
  const title = document.getElementById("auth-title");
  const description = document.getElementById("auth-description");
  const message = document.getElementById("auth-message");
  const modeButtons = [...document.querySelectorAll("[data-auth-mode]")];

  const config = window.SUPABASE_CONFIG;
  const configured = config &&
    /^https?:\/\/.+/.test(config.url) &&
    !config.url.includes("PASTE_") &&
    config.anonKey &&
    !config.anonKey.includes("PASTE_");
  const client = configured && window.supabase
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;

  window.siteSupabase = client;
  let mode = "login";

  function showMessage(text, kind) {
    message.textContent = text;
    message.classList.toggle("is-error", kind === "error");
    message.classList.toggle("is-success", kind === "success");
  }

  function setMode(nextMode) {
    mode = nextMode;
    const recoveryMode = mode === "reset" || mode === "update-password";
    const passwordRequired = mode !== "reset";

    modeButtons.forEach(button => {
      const isActive = button.dataset.authMode === mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
      button.hidden = recoveryMode;
    });

    emailLabel.hidden = mode === "update-password";
    emailInput.hidden = mode === "update-password";
    emailInput.required = mode !== "update-password";
    passwordLabel.textContent = mode === "update-password" ? "Parolă nouă" : "Parola";
    passwordInput.autocomplete = mode === "update-password" || mode === "signup" ? "new-password" : "current-password";
    passwordInput.hidden = !passwordRequired;
    passwordLabel.hidden = !passwordRequired;
    passwordInput.required = passwordRequired;
    resetButton.hidden = mode !== "login";

    const copy = {
      login: ["Autentificare", "Intră în cont sau creează unul nou. Lecțiile pot fi accesate și fără cont.", "Autentificare"],
      signup: ["Creează un cont", "Îți trimitem un email de confirmare pentru activarea contului.", "Creează cont"],
      reset: ["Resetează parola", "Introdu adresa de email și îți vom trimite un link pentru resetarea parolei.", "Trimite linkul"],
      "update-password": ["Alege o parolă nouă", "Alege o parolă nouă, de cel puțin 8 caractere.", "Salvează parola"]
    }[mode];

    title.textContent = copy[0];
    description.textContent = copy[1];
    submitButton.textContent = copy[2];
    showMessage("", "");
  }

  function showDialog() {
    setMode("login");
    if (!client) {
      const text = !window.supabase
        ? "Lipsește biblioteca de autentificare. Verifică conexiunea la internet și reîncarcă pagina."
        : "Autentificarea nu este configurată. Completează adresa URL și cheia publică Supabase în supabase-config.js.";
      showMessage(text, "error");
    }
    dialog.showModal();
  }

  openButton.addEventListener("click", showDialog);
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  modeButtons.forEach(button => {
    button.addEventListener("click", () => setMode(button.dataset.authMode));
  });

  resetButton.addEventListener("click", () => {
    setMode("reset");
    emailInput.focus();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!client) {
      showDialog();
      return;
    }
    if (!form.reportValidity()) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    submitButton.disabled = true;
    resetButton.disabled = true;
    showMessage("Se procesează...", "");

    try {
      let result;
      if (mode === "signup") {
        result = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href.split("#")[0] }
        });
      } else if (mode === "login") {
        result = await client.auth.signInWithPassword({ email, password });
      } else if (mode === "reset") {
        result = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.href.split("#")[0]
        });
      } else {
        result = await client.auth.updateUser({ password });
      }

      if (result.error) throw result.error;

      if (mode === "signup") {
        showMessage(
          result.data.session
            ? "Contul a fost creat și ești autentificat."
            : "Cont creat. Verifică emailul pentru confirmare.",
          "success"
        );
        if (result.data.session) window.setTimeout(() => dialog.close(), 900);
      } else if (mode === "login") {
        showMessage("Te-ai autentificat cu succes.", "success");
        window.setTimeout(() => dialog.close(), 500);
      } else if (mode === "reset") {
        showMessage("Dacă adresa este înregistrată, vei primi un email cu pașii de resetare.", "success");
      } else {
        showMessage("Parola a fost schimbată.", "success");
        window.setTimeout(() => dialog.close(), 900);
      }
      passwordInput.value = "";
    } catch (error) {
      showMessage(error.message || "Autentificarea nu a reușit. Încearcă din nou.", "error");
    } finally {
      submitButton.disabled = false;
      resetButton.disabled = false;
    }
  });

  signOutButton.addEventListener("click", async () => {
    if (!client) return;
    signOutButton.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    } catch (error) {
      showDialog();
      showMessage(error.message || "Deconectarea nu a reușit.", "error");
    } finally {
      signOutButton.disabled = false;
    }
  });

  if (!client) return;

  function updateAccount(session) {
    const user = session && session.user;
    window.siteUser = user || null;
    openButton.hidden = Boolean(user);
    accountEmail.hidden = !user;
    signOutButton.hidden = !user;
    accountEmail.textContent = user ? user.email : "";
    window.dispatchEvent(new CustomEvent("site-auth-state", { detail: { user: user || null } }));
  }

  client.auth.onAuthStateChange((event, session) => {
    updateAccount(session);
    if (event === "PASSWORD_RECOVERY") {
      setMode("update-password");
      if (!dialog.open) dialog.showModal();
    }
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      showDialog();
      showMessage(error.message, "error");
      return;
    }
    updateAccount(data.session);
  }).catch(error => {
    showDialog();
    showMessage(error.message || "Nu s-a putut verifica sesiunea.", "error");
  });
})();
