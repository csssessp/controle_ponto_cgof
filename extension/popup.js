// Config — mesmas credenciais públicas já embutidas no bundle do frontend
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), seguras para código client-side.
const SUPABASE_URL = "https://yhwiertvbkeirvlieuag.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlod2llcnR2YmtlaXJ2bGlldWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzczMzAsImV4cCI6MjA5MzcxMzMzMH0.nW_XzXYfb0AeT1vBEOE8Q6xXGPSmNHctC7RjPThMObA";
const API_BASE = "https://controle-ponto-cgof.vercel.app";
const STORAGE_KEY = "chronos_session";

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}
function storageRemove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

function formatDateBR(isoDate) {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// ── Sessão Supabase ──────────────────────────────────────────────────────────
async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.msg || "Email ou senha inválidos");
  await storageSet({
    [STORAGE_KEY]: {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Date.now() + (j.expires_in || 3600) * 1000,
    },
  });
}

async function refreshSession(session) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Sessão expirada");
  const updated = {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in || 3600) * 1000,
  };
  await storageSet({ [STORAGE_KEY]: updated });
  return updated;
}

// Retorna um access_token válido (renovando se estiver perto de expirar), ou
// null se não houver sessão / a renovação falhar (sessão precisa de novo login).
async function getValidToken() {
  const { [STORAGE_KEY]: session } = await storageGet(STORAGE_KEY);
  if (!session) return null;
  if (session.expires_at - Date.now() > 60_000) return session.access_token;
  try {
    const updated = await refreshSession(session);
    return updated.access_token;
  } catch {
    await storageRemove(STORAGE_KEY);
    return null;
  }
}

async function signOut() {
  await storageRemove(STORAGE_KEY);
}

// ── Chamadas à API ────────────────────────────────────────────────────────────
async function apiCall(path, options = {}) {
  const token = await getValidToken();
  if (!token) { const e = new Error("Sessão expirada"); e.needsLogin = true; throw e; }
  const r = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { await storageRemove(STORAGE_KEY); const e = new Error("Sessão expirada"); e.needsLogin = true; throw e; }
  if (!r.ok) { const e = new Error(j.error || "Erro ao comunicar com o servidor"); e.data = j; throw e; }
  return j;
}

const getPunchStatus = () => apiCall("/api/attendance/punch/status");
const doPunch = (type) => apiCall("/api/attendance/punch", { method: "POST", body: JSON.stringify({ type }) });

// ── UI ────────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const views = { loading: $("loading"), login: $("login-view"), punch: $("punch-view") };

function showView(name) {
  for (const k of Object.keys(views)) views[k].classList.toggle("hidden", k !== name);
}

function renderStatus(status) {
  $("emp-name").textContent = status.employeeName || "Funcionário";
  $("emp-date").textContent = formatDateBR(status.date);
  $("in-time").textContent = status.checkedInAt || "—";
  $("out-time").textContent = status.checkedOutAt || "—";

  const msgEl = $("punch-msg");
  if (status.message) { msgEl.textContent = status.message; msgEl.classList.remove("hidden"); }
  else { msgEl.classList.add("hidden"); }

  const btn = $("punch-btn");
  btn.classList.remove("in", "out");
  if (status.canCheckIn) {
    btn.textContent = "Registrar Entrada";
    btn.className = "in";
    btn.disabled = false;
    btn.dataset.type = "IN";
  } else if (status.canCheckOut) {
    btn.textContent = "Registrar Saída";
    btn.className = "out";
    btn.disabled = false;
    btn.dataset.type = "OUT";
  } else {
    btn.textContent = "Ponto do dia concluído";
    btn.disabled = true;
    btn.dataset.type = "";
  }
}

async function loadPunchView() {
  showView("loading");
  try {
    const status = await getPunchStatus();
    renderStatus(status);
    showView("punch");
  } catch (e) {
    if (e.needsLogin) { showView("login"); return; }
    $("punch-error").textContent = e.message;
    $("punch-error").style.display = "block";
    showView("punch");
  }
}

async function init() {
  showView("loading");
  const token = await getValidToken();
  if (token) await loadPunchView();
  else showView("login");
}

$("login-view").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const btn = $("login-submit");
  const errEl = $("login-error");
  errEl.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Entrando…";
  try {
    await signIn($("email").value.trim(), $("password").value);
    $("password").value = "";
    await loadPunchView();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});

$("punch-btn").addEventListener("click", async () => {
  const type = $("punch-btn").dataset.type;
  if (!type) return;
  const btn = $("punch-btn");
  btn.disabled = true;
  const prevLabel = btn.textContent;
  btn.textContent = "Registrando…";
  $("punch-error").style.display = "none";
  try {
    await doPunch(type);
    await loadPunchView();
  } catch (e) {
    if (e.needsLogin) { showView("login"); return; }
    // 409 (já registrado, ordem errada) — mostra o erro e recarrega o status real
    $("punch-error").textContent = e.message;
    $("punch-error").style.display = "block";
    btn.textContent = prevLabel;
    await loadPunchView();
  }
});

$("signout").addEventListener("click", async () => {
  await signOut();
  showView("login");
});

init();
