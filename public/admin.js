(function () {
  const adminKeyInput = document.getElementById("adminKey");
  const scenarioJson = document.getElementById("scenarioJson");
  const loadBtn = document.getElementById("loadBtn");
  const upsertBtn = document.getElementById("upsertBtn");
  const statusText = document.getElementById("statusText");
  const scenarioTable = document.getElementById("scenarioTable");

  loadBtn.addEventListener("click", loadScenarios);
  upsertBtn.addEventListener("click", upsertScenarios);

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      "x-admin-key": adminKeyInput.value.trim()
    };
  }

  async function loadScenarios() {
    statusText.textContent = "Loading...";
    try {
      const res = await fetch("/api/admin/scenarios", { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      scenarioJson.value = JSON.stringify(data.scenarios || [], null, 2);
      renderTable(data.scenarios || []);
      statusText.textContent = "Loaded.";
    } catch (err) {
      statusText.textContent = "Error: " + err.message;
    }
  }

  async function upsertScenarios() {
    statusText.textContent = "Saving...";
    try {
      const payload = JSON.parse(scenarioJson.value || "[]");
      const res = await fetch("/api/admin/scenarios", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ scenarios: payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      statusText.textContent = `Upserted ${data.count || 0} scenarios.`;
      renderTable(payload);
    } catch (err) {
      statusText.textContent = "Error: " + err.message;
    }
  }

  async function deleteScenario(id) {
    statusText.textContent = "Deleting...";
    try {
      const res = await fetch(`/api/admin/scenarios/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      statusText.textContent = "Deleted.";
      loadScenarios();
    } catch (err) {
      statusText.textContent = "Error: " + err.message;
    }
  }

  function renderTable(scenarios) {
    scenarioTable.innerHTML = "";
    scenarios.forEach((s) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(s.id)}</td>
        <td>${escapeHtml(s.type)}</td>
        <td>${escapeHtml(s.difficulty)}</td>
        <td><button type="button" data-id="${escapeHtml(s.id)}">Delete</button></td>
      `;
      row.querySelector("button").addEventListener("click", () => deleteScenario(s.id));
      scenarioTable.appendChild(row);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
