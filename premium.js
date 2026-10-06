(function () {
  const client = window.siteSupabase;
  const membershipPanel = document.getElementById("membership-panel");
  const membershipTitle = document.getElementById("membership-title");
  const membershipDescription = document.getElementById("membership-description");
  const membershipBadge = document.getElementById("membership-badge");
  const adminPanel = document.getElementById("admin-panel");
  const adminMessage = document.getElementById("admin-message");
  const usersSelect = document.getElementById("subscription-user");
  const activeInput = document.getElementById("subscription-active");
  const expiryInput = document.getElementById("subscription-expiry");
  const subscriptionList = document.getElementById("subscription-list");
  const subscriptionForm = document.getElementById("subscription-form");
  const saveButton = document.getElementById("subscription-save");
  const refreshButton = document.getElementById("admin-refresh");

  window.premiumAccess = false;
  window.premiumContent = {};

  if (!client) return;

  let profiles = [];
  let subscriptions = [];

  function setMessage(element, text, isError) {
    element.textContent = text;
    element.classList.toggle("is-error", Boolean(isError));
    element.classList.toggle("is-success", Boolean(text) && !isError);
  }

  function isSubscriptionActive(subscription) {
    return Boolean(
      subscription &&
      subscription.is_active &&
      (!subscription.starts_at || new Date(subscription.starts_at).getTime() <= Date.now()) &&
      (!subscription.expires_at || new Date(subscription.expires_at).getTime() > Date.now())
    );
  }

  function formatDate(value) {
    if (!value) return "Fără dată de expirare";
    return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
  }

  function updateMembership(user, subscription) {
    membershipPanel.hidden = !user;
    if (!user) return;

    const active = window.premiumAccess;
    membershipTitle.textContent = active ? "Ai acces Premium" : "Cont gratuit";
    membershipBadge.textContent = active ? "Premium" : "Gratuit";
    membershipBadge.classList.toggle("is-premium", active);

    if (active) {
      const expiresAt = subscription && subscription.expires_at;
      membershipDescription.textContent = expiresAt
        ? `Acces activ până la ${formatDate(expiresAt)}.`
        : "Accesul tău Premium este activ, fără dată de expirare.";
    } else {
      membershipDescription.textContent = "Poți citi lecțiile disponibile gratuit. Abonamentul se acordă manual în această versiune de test.";
    }
  }

  function renderUserList() {
    const currentId = usersSelect.value;
    usersSelect.replaceChildren(new Option("Alege un utilizator", ""));
    const subscriptionsByUser = new Map(subscriptions.map(item => [item.user_id, item]));

    profiles.forEach(profile => {
      const subscription = subscriptionsByUser.get(profile.id);
      const status = isSubscriptionActive(subscription) ? "Premium" : "Gratuit";
      const option = new Option(`${profile.email} — ${status}`, profile.id);
      usersSelect.add(option);
    });

    if (profiles.some(profile => profile.id === currentId)) usersSelect.value = currentId;
    renderSubscriptionRows();
  }

  function renderSubscriptionRows() {
    subscriptionList.replaceChildren();
    if (profiles.length === 0) {
      const empty = document.createElement("p");
      empty.className = "admin-description";
      empty.textContent = "Nu există conturi înregistrate.";
      subscriptionList.append(empty);
      return;
    }

    const heading = document.createElement("h3");
    heading.textContent = "Conturi și abonamente";
    subscriptionList.append(heading);
    const list = document.createElement("ul");
    list.className = "subscription-rows";

    profiles.forEach(profile => {
      const subscription = subscriptions.find(item => item.user_id === profile.id);
      const active = isSubscriptionActive(subscription);
      const row = document.createElement("li");
      const email = document.createElement("span");
      email.className = "subscription-email";
      email.textContent = profile.email;
      const status = document.createElement("span");
      status.className = active ? "subscription-status is-premium" : "subscription-status";
      status.textContent = active ? "Premium" : "Gratuit";
      const expiry = document.createElement("span");
      expiry.className = "subscription-expiry";
      expiry.textContent = active ? formatDate(subscription.expires_at) : "";
      row.append(email, status, expiry);
      list.append(row);
    });

    subscriptionList.append(list);
  }

  async function loadAdminData() {
    setMessage(adminMessage, "Se încarcă lista de conturi...", false);
    const [profilesResult, subscriptionsResult] = await Promise.all([
      client.from("user_profiles").select("id,email,created_at").order("created_at", { ascending: false }),
      client.from("premium_subscriptions").select("user_id,is_active,plan_name,starts_at,expires_at")
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (subscriptionsResult.error) throw subscriptionsResult.error;

    profiles = profilesResult.data;
    subscriptions = subscriptionsResult.data;
    renderUserList();
    setMessage(adminMessage, "", false);
  }

  async function loadPremiumContent() {
    window.premiumContent = {};
    if (!window.premiumAccess) {
      window.dispatchEvent(new Event("premium-data-changed"));
      return;
    }

    const { data, error } = await client
      .from("premium_lesson_content")
      .select("lesson_id,title,body");
    if (error) throw error;

    window.premiumContent = Object.fromEntries(data.map(item => [item.lesson_id, item]));
    window.dispatchEvent(new Event("premium-data-changed"));
  }

  async function loadAccount(user) {
    window.premiumAccess = false;
    window.premiumContent = {};
    membershipPanel.hidden = !user;
    adminPanel.hidden = true;
    setMessage(adminMessage, "", false);
    window.dispatchEvent(new Event("premium-data-changed"));
    if (!user) return;

    membershipTitle.textContent = "Se verifică abonamentul...";
    membershipDescription.textContent = "";
    membershipBadge.textContent = "Se verifică";
    membershipBadge.classList.remove("is-premium");

    try {
      const [adminResult, premiumResult, subscriptionResult] = await Promise.all([
        client.rpc("is_site_admin"),
        client.rpc("is_premium_active"),
        client.from("premium_subscriptions")
          .select("is_active,plan_name,starts_at,expires_at")
          .eq("user_id", user.id)
          .maybeSingle()
      ]);
      if (adminResult.error) throw adminResult.error;
      if (premiumResult.error) throw premiumResult.error;
      if (subscriptionResult.error) throw subscriptionResult.error;

      const isAdmin = adminResult.data === true;
      window.premiumAccess = premiumResult.data === true;
      updateMembership(user, subscriptionResult.data);
      adminPanel.hidden = !isAdmin;

      if (isAdmin) {
        await loadAdminData();
      }
      await loadPremiumContent();
    } catch (error) {
      membershipTitle.textContent = "Nu s-a putut verifica abonamentul";
      membershipDescription.textContent = error.message || "Verifică setările de acces Premium din Supabase.";
      membershipBadge.textContent = "Eroare";
      membershipBadge.classList.remove("is-premium");
      window.premiumAccess = false;
      window.premiumContent = {};
      window.dispatchEvent(new Event("premium-data-changed"));
      if (!adminPanel.hidden) setMessage(adminMessage, error.message || "Nu s-au putut încărca datele.", true);
    }
  }

  usersSelect.addEventListener("change", () => {
    const subscription = subscriptions.find(item => item.user_id === usersSelect.value);
    activeInput.checked = isSubscriptionActive(subscription);
    expiryInput.value = subscription && subscription.expires_at
      ? new Date(subscription.expires_at).toISOString().slice(0, 10)
      : "";
  });

  subscriptionForm.addEventListener("submit", async event => {
    event.preventDefault();
    const userId = usersSelect.value;
    if (!userId) {
      setMessage(adminMessage, "Alege un utilizator înainte de a salva.", true);
      return;
    }

    saveButton.disabled = true;
    setMessage(adminMessage, "Se salvează abonamentul...", false);

    try {
      const expiresAt = expiryInput.value
        ? new Date(`${expiryInput.value}T23:59:59Z`).toISOString()
        : null;
      const { error } = await client.from("premium_subscriptions").upsert({
        user_id: userId,
        is_active: activeInput.checked,
        plan_name: "Premium",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) throw error;

      await loadAdminData();
      const currentUser = usersSelect.value;
      usersSelect.value = currentUser || userId;
      usersSelect.dispatchEvent(new Event("change"));
      setMessage(adminMessage, "Abonamentul a fost salvat.", false);
      if (window.siteUser && window.siteUser.id === userId) await loadAccount(window.siteUser);
    } catch (error) {
      setMessage(adminMessage, error.message || "Nu s-a putut salva abonamentul.", true);
    } finally {
      saveButton.disabled = false;
    }
  });

  refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;
    try {
      await loadAdminData();
    } catch (error) {
      setMessage(adminMessage, error.message || "Nu s-a putut reîncărca lista.", true);
    } finally {
      refreshButton.disabled = false;
    }
  });

  window.addEventListener("site-auth-state", event => {
    loadAccount(event.detail.user);
  });

  window.addEventListener("premium-lesson-locked", event => {
    const dialog = document.getElementById("auth-dialog");
    const message = document.getElementById("auth-message");
    if (!event.detail.signedIn) {
      if (!dialog.open) dialog.showModal();
      message.textContent = "Autentifică-te pentru a verifica accesul la lecțiile Premium.";
      message.classList.remove("is-error");
      return;
    }

    membershipPanel.hidden = false;
    membershipDescription.textContent = "Această lecție este inclusă în Premium. În acest prototip, abonamentele sunt acordate manual de administrator.";
    membershipPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  if (window.siteUser) loadAccount(window.siteUser);
})();
