let config = null;
let latestRun = null;
let latestTab = "accuracy";
let drawerRun = null;
let drawerTab = "parsed";

const $ = (id) => document.getElementById(id);

function jsonText(value) {
  return JSON.stringify(value, null, 2);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setStatus(message, ok = true) {
  $("status").innerHTML = `<span class="${ok ? "status-ok" : "status-bad"}">${message}</span>`;
}

function showView(view) {
  document.querySelectorAll(".view").forEach((item) => item.classList.toggle("active", item.id === view));
  document.querySelectorAll(".nav").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  if (view === "history") loadRuns();
}

function fillConfigForm(data) {
  config = data;
  $("baseUrl").value = data.base_url || "";
  $("apiKey").value = data.api_key || "";
  $("defaultModel").value = data.model || "";
  $("runModel").value = data.model || "";
  $("temperature").value = data.temperature ?? 0.2;
  $("maxTokens").value = data.max_tokens ?? 10000;
  $("timeout").value = data.timeout ?? 300;
  $("alvadescExe").value = data.alvadesc_exe || "";
  $("alvadescWrapperPath").value = data.alvadesc_wrapper_path || "";
  setStatus(`Reference DB: ${data.reference_count || 0} records`);
}

async function loadConfig() {
  fillConfigForm(await api("/api/config"));
}

async function saveConfig() {
  const payload = {
    base_url: $("baseUrl").value,
    api_key: $("apiKey").value,
    model: $("defaultModel").value,
    temperature: Number($("temperature").value || 0.2),
    max_tokens: Number($("maxTokens").value || 10000),
    timeout: Number($("timeout").value || 300),
    alvadesc_exe: $("alvadescExe").value,
    alvadesc_wrapper_path: $("alvadescWrapperPath").value,
  };
  fillConfigForm(await api("/api/config", { method: "POST", body: JSON.stringify(payload) }));
  setStatus("Config saved.");
}

function runPayload() {
  return {
    strategy: $("strategy").value,
    model: $("runModel").value || config?.model,
    max_k: Number($("maxK").value || 6),
    chemical_description: $("chemicalDescription").value,
    canonical_smiles: $("canonicalSmiles").value,
    target_experiments: $("targetExperiments").value,
  };
}

async function runStrategy() {
  $("runButton").disabled = true;
  setStatus("Running...");
  try {
    latestRun = await api("/api/run", { method: "POST", body: JSON.stringify(runPayload()) });
    latestTab = "accuracy";
    renderLatest();
    setStatus(`Run saved: ${latestRun.id}`);
  } catch (error) {
    setStatus(error.message, false);
  } finally {
    $("runButton").disabled = false;
  }
}

function outputContent(run, tab) {
  if (!run) return "No run selected.";
  return {
    accuracy: run.accuracy ?? "No accuracy judgment.",
    parsed: run.parsed_json ?? "No parsed JSON.",
    raw: run.raw_output,
    prompt: run.prompt,
    retrieval: run.retrieval_context,
  }[tab];
}

function renderLatest() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === latestTab);
  });
  const content = outputContent(latestRun, latestTab);
  $("latestOutput").textContent = typeof content === "string" ? content : jsonText(content);
}

function accuracyLabel(accuracy) {
  if (!accuracy || !accuracy.available) return "Accuracy unavailable";
  const pct = accuracy.accuracy == null ? "-" : `${(accuracy.accuracy * 100).toFixed(2)}%`;
  return `${accuracy.correct}/${accuracy.total} correct · ${pct}`;
}

async function loadRuns() {
  const runs = await api("/api/runs");
  $("runs").innerHTML = runs
    .map(
      (run) => `
        <div class="run-row">
          <div>${run.target}<br><span class="muted">${run.id}</span></div>
          <div>${run.strategy} · ${run.model} · Max-${run.max_k}<br><span class="muted">${accuracyLabel(run.accuracy)}</span></div>
          <div class="row-actions">
            <button data-id="${run.id}" class="open-run">Open</button>
            <button data-id="${run.id}" class="delete-run">Delete</button>
          </div>
        </div>
      `,
    )
    .join("");
  document.querySelectorAll(".open-run").forEach((button) => {
    button.addEventListener("click", async () => {
      drawerRun = await api(`/api/runs/${button.dataset.id}`);
      drawerTab = "parsed";
      openDrawer();
    });
  });
  document.querySelectorAll(".delete-run").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm(`Delete run ${button.dataset.id}?`)) return;
      await api(`/api/runs/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
      if (drawerRun?.id === button.dataset.id) closeDrawer();
      await loadRuns();
    });
  });
}

function openDrawer() {
  $("drawerKicker").textContent = `${drawerRun.strategy} · ${drawerRun.model} · Max-${drawerRun.max_k}`;
  $("drawerTitle").textContent = drawerRun.target?.chemical_description || drawerRun.id;
  $("runDrawer").classList.add("open");
  $("runDrawer").setAttribute("aria-hidden", "false");
  renderDrawer();
}

function closeDrawer() {
  $("runDrawer").classList.remove("open");
  $("runDrawer").setAttribute("aria-hidden", "true");
}

function renderDrawer() {
  document.querySelectorAll(".drawer-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === drawerTab);
  });
  const content = outputContent(drawerRun, drawerTab);
  $("drawerOutput").textContent = typeof content === "string" ? content : jsonText(content);
}

document.querySelectorAll(".nav").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  latestTab = button.dataset.tab;
  renderLatest();
}));
document.querySelectorAll(".drawer-tab").forEach((button) => button.addEventListener("click", () => {
  drawerTab = button.dataset.tab;
  renderDrawer();
}));
$("closeDrawer").addEventListener("click", closeDrawer);
document.addEventListener(
  "pointerdown",
  (event) => {
    const drawer = $("runDrawer");
    if (!drawer.classList.contains("open")) return;
    if (event.target.closest("#runDrawer")) return;
    closeDrawer();
  },
  true,
);
$("saveConfig").addEventListener("click", () => saveConfig().catch((error) => setStatus(error.message, false)));
$("runButton").addEventListener("click", runStrategy);

loadConfig().catch((error) => setStatus(error.message, false));
