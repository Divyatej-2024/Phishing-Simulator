(function () {
  "use strict";

  const STORAGE_KEY = "aegisphish_lab_state_v1";
  const USER_ID_KEY = "aegisphish_user_id";
  const SESSION_KEY = "aegisphish_session_id";
  const API_TIMEOUT_MS = 4000;
  const ACHIEVEMENTS = [
    { id: "first_correct", title: "First Catch", description: "Answer one scenario correctly.", check: (s) => s.stats.correct >= 1 },
    { id: "streak_5", title: "Sharp Eye", description: "Reach a 5-answer correct streak.", check: (s) => s.stats.bestStreak >= 5 },
    { id: "score_1000", title: "Threat Hunter", description: "Reach 1000 total score.", check: (s) => s.stats.score >= 1000 },
    { id: "complete_10", title: "Halfway Guardian", description: "Complete 10 unique scenarios.", check: (s) => s.stats.completedIds.length >= 10 },
    { id: "complete_all", title: "Lab Master", description: "Complete all scenarios.", check: (s) => s.stats.completedIds.length >= scenarioList.length }
  ];

  let scenarioList = [];

  let state = loadState();
  let apiAvailable = false;
  let timerHandle = null;

  const el = {
    authView: document.getElementById("authView"),
    dashboardView: document.getElementById("dashboardView"),
    sessionView: document.getElementById("sessionView"),
    loginForm: document.getElementById("loginForm"),
    usernameInput: document.getElementById("usernameInput"),
    logoutBtn: document.getElementById("logoutBtn"),
    welcomeText: document.getElementById("welcomeText"),
    summaryText: document.getElementById("summaryText"),
    scoreStat: document.getElementById("scoreStat"),
    accuracyStat: document.getElementById("accuracyStat"),
    streakStat: document.getElementById("streakStat"),
    completedStat: document.getElementById("completedStat"),
    riskStat: document.getElementById("riskStat"),
    weakStat: document.getElementById("weakStat"),
    progressChart: document.getElementById("progressChart"),
    timerToggle: document.getElementById("timerToggle"),
    timePerQuestion: document.getElementById("timePerQuestion"),
    startLearningBtn: document.getElementById("startLearningBtn"),
    startChallengeBtn: document.getElementById("startChallengeBtn"),
    continueBtn: document.getElementById("continueBtn"),
    continueHint: document.getElementById("continueHint"),
    resetProgressBtn: document.getElementById("resetProgressBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importInput: document.getElementById("importInput"),
    achievementList: document.getElementById("achievementList"),
    libraryBody: document.getElementById("libraryBody"),
    sessionMode: document.getElementById("sessionMode"),
    scenarioTitle: document.getElementById("scenarioTitle"),
    timerBox: document.getElementById("timerBox"),
    timerValue: document.getElementById("timerValue"),
    sessionProgressBar: document.getElementById("sessionProgressBar"),
    sessionCounter: document.getElementById("sessionCounter"),
    scenarioPrompt: document.getElementById("scenarioPrompt"),
    scenarioMessage: document.getElementById("scenarioMessage"),
    optionContainer: document.getElementById("optionContainer"),
    feedbackPanel: document.getElementById("feedbackPanel"),
    feedbackTitle: document.getElementById("feedbackTitle"),
    feedbackBody: document.getElementById("feedbackBody"),
    nextBtn: document.getElementById("nextBtn"),
    endSessionBtn: document.getElementById("endSessionBtn"),
    achievementTemplate: document.getElementById("achievementTemplate")
  };

  bindEvents();
  bootstrap();

  function getDefaultState() {
    return {
      profile: null,
      settings: {
        timerEnabled: true,
        timePerQuestion: 35
      },
      stats: {
        answered: 0,
        correct: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        completedIds: []
      },
      achievements: [],
      history: [],
      session: null
    };
  }

  function loadState() {
    const fallback = getDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return {
        ...fallback,
        ...parsed,
        settings: { ...fallback.settings, ...(parsed.settings || {}) },
        stats: { ...fallback.stats, ...(parsed.stats || {}) },
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
    } catch (error) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (apiAvailable && getUserId()) {
      saveStateToServer();
    }
  }

  function bindEvents() {
    el.loginForm.addEventListener("submit", onLogin);
    el.logoutBtn.addEventListener("click", onLogout);
    el.startLearningBtn.addEventListener("click", () => startSession("learning"));
    el.startChallengeBtn.addEventListener("click", () => startSession("challenge"));
    el.continueBtn.addEventListener("click", onContinueSession);
    el.nextBtn.addEventListener("click", moveToNextScenario);
    el.endSessionBtn.addEventListener("click", endSessionEarly);
    el.resetProgressBtn.addEventListener("click", resetProgress);
    el.exportBtn.addEventListener("click", exportProgress);
    el.importInput.addEventListener("change", importProgress);
    el.timerToggle.addEventListener("change", updateSettingsFromForm);
    el.timePerQuestion.addEventListener("change", updateSettingsFromForm);
    el.libraryBody.addEventListener("click", onLibraryAction);
    window.addEventListener("keydown", onKeyControls);
  }

  async function onLogin(event) {
    event.preventDefault();
    const name = (el.usernameInput.value || "").trim();
    if (!name) {
      window.alert("Please enter your analyst name.");
      return;
    }
    if (apiAvailable) {
      const result = await apiLogin(name);
      if (result && result.userId) {
        setUserId(result.userId);
        if (result.state) {
          state = loadImportedState(result.state);
        }
        state.profile = { name };
        saveState();
        syncUI();
        return;
      }
    }
    state.profile = { name };
    saveState();
    syncUI();
  }

  function onLogout() {
    clearTimer();
    state.profile = null;
    state.session = null;
    clearUserId();
    saveState();
    syncUI();
  }

  function onContinueSession() {
    if (!state.session) {
      window.alert("No active session found.");
      return;
    }
    showSession();
    renderScenario();
  }

  function updateSettingsFromForm() {
    const seconds = Number(el.timePerQuestion.value);
    state.settings.timerEnabled = Boolean(el.timerToggle.checked);
    state.settings.timePerQuestion = Number.isFinite(seconds) ? clamp(seconds, 10, 120) : 35;
    el.timePerQuestion.value = String(state.settings.timePerQuestion);
    saveState();
  }

  function startSession(mode, singleScenarioId) {
    const queue = buildQueue(mode, singleScenarioId);
    if (!queue.length) {
      window.alert("No scenarios available.");
      return;
    }

    clearTimer();
    state.session = {
      mode,
      queue,
      currentIndex: 0,
      answered: {},
      startedAt: Date.now(),
      currentTimer: state.settings.timePerQuestion
    };

    saveState();
    showSession();
    renderScenario();
  }

  function buildQueue(mode, singleScenarioId) {
    if (singleScenarioId) {
      return [singleScenarioId];
    }
    if (mode === "challenge") {
      return shuffle(scenarioList.map((s) => s.id)).slice(0, 10);
    }
    return scenarioList.map((s) => s.id);
  }

  function showSession() {
    el.authView.classList.add("hidden");
    el.dashboardView.classList.add("hidden");
    el.sessionView.classList.remove("hidden");
    el.logoutBtn.classList.remove("hidden");
  }

  function showDashboard() {
    el.authView.classList.add("hidden");
    el.dashboardView.classList.remove("hidden");
    el.sessionView.classList.add("hidden");
    el.logoutBtn.classList.remove("hidden");
  }

  function renderScenario() {
    if (!state.session) {
      syncUI();
      return;
    }
    const session = state.session;
    const scenarioId = session.queue[session.currentIndex];
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      endSession();
      return;
    }

    el.sessionMode.textContent = session.mode === "challenge" ? "Rapid Challenge" : "Guided Learning";
    el.scenarioTitle.textContent = scenario.title;
    el.scenarioPrompt.textContent = scenario.prompt;
    el.scenarioMessage.textContent = scenario.message;
    el.sessionCounter.textContent = `Scenario ${session.currentIndex + 1}/${session.queue.length}`;
    el.sessionProgressBar.style.width = `${((session.currentIndex + 1) / session.queue.length) * 100}%`;
    el.optionContainer.innerHTML = "";
    el.feedbackPanel.classList.add("hidden");
    el.nextBtn.classList.add("hidden");

    scenario.options.forEach((option, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.textContent = `${idx + 1}. ${option.text}`;
      btn.dataset.optionIndex = String(idx);
      btn.addEventListener("click", () => handleAnswer(idx));
      el.optionContainer.appendChild(btn);
    });

    applyTimerRules();
    saveState();
  }

  function applyTimerRules() {
    clearTimer();
    const useTimer = state.settings.timerEnabled || state.session.mode === "challenge";
    if (!useTimer) {
      el.timerBox.classList.add("hidden");
      return;
    }
    el.timerBox.classList.remove("hidden");
    state.session.currentTimer = state.settings.timePerQuestion;
    el.timerValue.textContent = String(state.session.currentTimer);
    timerHandle = window.setInterval(() => {
      if (!state.session) {
        clearTimer();
        return;
      }
      state.session.currentTimer -= 1;
      el.timerValue.textContent = String(state.session.currentTimer);
      if (state.session.currentTimer <= 0) {
        clearTimer();
        forceTimeoutAnswer();
      }
    }, 1000);
  }

  function forceTimeoutAnswer() {
    const scenario = getCurrentScenario();
    if (!scenario) {
      return;
    }
    const wrongIndex = scenario.options.findIndex((opt) => !opt.safe);
    const index = wrongIndex >= 0 ? wrongIndex : 0;
    handleAnswer(index, true);
  }

  function handleAnswer(optionIndex, timedOut) {
    const scenario = getCurrentScenario();
    if (!scenario || !state.session) {
      return;
    }
    const answerKey = `${state.session.currentIndex}`;
    if (state.session.answered[answerKey]) {
      return;
    }

    clearTimer();
    const option = scenario.options[optionIndex];
    const userVerdict = optionIndex === 1 ? "Phishing" : "Safe";

    submitAnswerToApi(scenario, userVerdict, timedOut)
      .then((result) => {
        const verdict = result && result.verdict ? result.verdict : (option && option.safe ? "Phishing" : "Safe");
        const isCorrect = verdict === userVerdict;
        const points = isCorrect ? (100 + difficultyPoints(scenario.difficulty) * 25) : -20;

        state.stats.answered += 1;
        state.stats.score = Math.max(0, state.stats.score + points);
        state.stats.streak = isCorrect ? state.stats.streak + 1 : 0;
        state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
        if (isCorrect) {
          state.stats.correct += 1;
          if (!state.stats.completedIds.includes(scenario.id)) {
            state.stats.completedIds.push(scenario.id);
          }
        }

        state.history.unshift({
          timestamp: new Date().toISOString(),
          scenarioId: scenario.id,
          result: isCorrect ? "correct" : "incorrect",
          mode: state.session.mode,
          timedOut: Boolean(timedOut)
        });
        state.history = state.history.slice(0, 100);

        state.session.answered[answerKey] = true;
        el.feedbackPanel.classList.remove("hidden");
        el.feedbackPanel.classList.toggle("ok", isCorrect);
        el.feedbackPanel.classList.toggle("bad", !isCorrect);
        el.feedbackTitle.textContent = isCorrect ? "Correct Decision" : "Risky Decision";
        el.feedbackBody.textContent = buildFeedbackMessage(result, option, timedOut);

        const choiceButtons = el.optionContainer.querySelectorAll(".choice-btn");
        choiceButtons.forEach((button, idx) => {
          button.disabled = true;
          if (idx === optionIndex) {
            button.classList.add(isCorrect ? "choice-correct" : "choice-wrong");
          }
        });

        updateAchievements();
        saveState();
        fetchDashboard();
        el.nextBtn.classList.remove("hidden");
        refreshDashboardData();
      })
      .catch(() => {
        state.session.answered[answerKey] = true;
        el.feedbackPanel.classList.remove("hidden");
        el.feedbackPanel.classList.toggle("ok", false);
        el.feedbackPanel.classList.toggle("bad", true);
        el.feedbackTitle.textContent = "Submission Error";
        el.feedbackBody.textContent = "Unable to submit to server. Please try again.";
      });
  }

  function moveToNextScenario() {
    if (!state.session) {
      return;
    }
    state.session.currentIndex += 1;
    if (state.session.currentIndex >= state.session.queue.length) {
      endSession();
      return;
    }
    renderScenario();
  }

  function endSessionEarly() {
    if (!state.session) {
      return;
    }
    const confirmed = window.confirm("End this session and return to dashboard?");
    if (!confirmed) {
      return;
    }
    endSession();
  }

  function endSession() {
    clearTimer();
    state.session = null;
    saveState();
    syncUI();
  }

  function resetProgress() {
    const confirmed = window.confirm("This will erase your score, achievements, and history. Continue?");
    if (!confirmed) {
      return;
    }
    const name = state.profile ? state.profile.name : null;
    const fresh = getDefaultState();
    if (name) {
      fresh.profile = { name };
    }
    Object.assign(state, fresh);
    saveState();
    syncUI();
  }

  function exportProgress() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "aegisphish-progress.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        const safe = loadImportedState(imported);
        Object.assign(state, safe);
        saveState();
        syncUI();
        window.alert("Progress imported.");
      } catch (error) {
        window.alert("Import failed. Invalid JSON format.");
      } finally {
        el.importInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function loadImportedState(imported) {
    const fallback = getDefaultState();
    return {
      ...fallback,
      ...imported,
      settings: { ...fallback.settings, ...(imported.settings || {}) },
      stats: {
        ...fallback.stats,
        ...(imported.stats || {}),
        completedIds: Array.isArray(imported.stats && imported.stats.completedIds)
          ? imported.stats.completedIds.filter((id) => scenarioList.some((s) => s.id === id))
          : []
      },
      achievements: Array.isArray(imported.achievements) ? imported.achievements : [],
      history: Array.isArray(imported.history) ? imported.history.slice(0, 100) : [],
      session: null
    };
  }

  function onLibraryAction(event) {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const id = target.dataset.practiceId;
    if (!id) {
      return;
    }
    startSession("practice", id);
  }

  function onKeyControls(event) {
    if (!state.session || el.sessionView.classList.contains("hidden")) {
      return;
    }
    if (event.key === "1" || event.key === "2") {
      const idx = Number(event.key) - 1;
      handleAnswer(idx, false);
    }
    if (event.key.toLowerCase() === "n" && !el.nextBtn.classList.contains("hidden")) {
      moveToNextScenario();
    }
  }

  function updateAchievements() {
    ACHIEVEMENTS.forEach((achievement) => {
      const unlocked = state.achievements.includes(achievement.id);
      if (!unlocked && achievement.check(state)) {
        state.achievements.push(achievement.id);
      }
    });
  }

  function renderAchievements() {
    el.achievementList.innerHTML = "";
    ACHIEVEMENTS.forEach((achievement) => {
      const item = el.achievementTemplate.content.firstElementChild.cloneNode(true);
      const unlocked = state.achievements.includes(achievement.id);
      item.classList.toggle("locked", !unlocked);
      item.querySelector("h4").textContent = achievement.title;
      item.querySelector("p").textContent = achievement.description;
      el.achievementList.appendChild(item);
    });
  }

  function renderLibrary() {
    el.libraryBody.innerHTML = "";
    const completed = new Set(state.stats.completedIds);
    scenarioList.forEach((scenario) => {
      const row = document.createElement("tr");
      row.innerHTML = [
        `<td>${escapeHtml(scenario.title)}</td>`,
        `<td>${escapeHtml(scenario.type)}</td>`,
        `<td>${scenario.difficulty}</td>`,
        `<td>${completed.has(scenario.id) ? "Completed" : "Pending"}</td>`,
        `<td><button type="button" data-practice-id="${scenario.id}">Practice</button></td>`
      ].join("");
      el.libraryBody.appendChild(row);
    });
  }

  function refreshDashboardData() {
    const answered = state.stats.answered;
    const correct = state.stats.correct;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    el.welcomeText.textContent = `Welcome, ${state.profile ? state.profile.name : "Analyst"}`;
    el.summaryText.textContent = "Analyze, decide, and build resilience against phishing campaigns.";
    el.scoreStat.textContent = String(state.stats.score);
    el.accuracyStat.textContent = `${accuracy}%`;
    el.streakStat.textContent = String(state.stats.bestStreak);
    el.completedStat.textContent = `${state.stats.completedIds.length}/${scenarioList.length}`;
    el.riskStat.textContent = riskFromAccuracy(accuracy);
    el.continueHint.textContent = state.session
      ? `${state.session.mode} - scenario ${state.session.currentIndex + 1}/${state.session.queue.length}`
      : "No active session";
    el.timerToggle.checked = Boolean(state.settings.timerEnabled);
    el.timePerQuestion.value = String(state.settings.timePerQuestion);
  }

  function syncUI() {
    clearTimer();
    if (!state.profile) {
      el.authView.classList.remove("hidden");
      el.dashboardView.classList.add("hidden");
      el.sessionView.classList.add("hidden");
      el.logoutBtn.classList.add("hidden");
      return;
    }
    refreshDashboardData();
    renderAchievements();
    renderLibrary();
    fetchDashboard();
    showDashboard();
  }

  function getCurrentScenario() {
    if (!state.session) {
      return null;
    }
    return getScenarioById(state.session.queue[state.session.currentIndex]);
  }

  function getScenarioById(id) {
    return scenarioList.find((s) => s.id === id) || null;
  }

  function clearTimer() {
    if (timerHandle) {
      window.clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function shuffle(values) {
    const arr = values.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function bootstrap() {
    apiAvailable = await checkApiHealth();
    if (apiAvailable) {
      const userId = getUserId();
      if (userId) {
        const serverState = await loadStateFromServer();
        if (serverState) {
          state = loadImportedState(serverState);
        }
      }
    }
    await loadScenarios();
    syncUI();
  }

  function getUserId() {
    return localStorage.getItem(USER_ID_KEY);
  }

  function setUserId(id) {
    localStorage.setItem(USER_ID_KEY, id);
  }

  function clearUserId() {
    localStorage.removeItem(USER_ID_KEY);
  }

  async function checkApiHealth() {
    try {
      const result = await apiRequest("/api/health", { method: "GET" });
      return Boolean(result && result.ok);
    } catch (error) {
      return false;
    }
  }

  async function apiLogin(name) {
    try {
      return await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ name })
      });
    } catch (error) {
      return null;
    }
  }

  async function loadStateFromServer() {
    const userId = getUserId();
    if (!userId) {
      return null;
    }
    try {
      return await apiRequest("/api/state", {
        method: "GET",
        headers: {
          "x-user-id": userId
        }
      });
    } catch (error) {
      return null;
    }
  }

  async function saveStateToServer() {
    const userId = getUserId();
    if (!userId) {
      return;
    }
    try {
      await apiRequest("/api/state", {
        method: "POST",
        headers: {
          "x-user-id": userId
        },
        body: JSON.stringify(state)
      });
    } catch (error) {
      return;
    }
  }

  async function apiRequest(path, options) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const sessionId = getSessionId();
      const response = await fetch(path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
          ...(options && options.headers ? options.headers : {})
        },
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function riskFromAccuracy(accuracy) {
    if (accuracy >= 85) return "Low";
    if (accuracy >= 60) return "Medium";
    return "High";
  }

  function getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  async function fetchDashboard() {
    if (!apiAvailable) {
      renderProgressChart([]);
      return;
    }
    try {
      const data = await apiRequest("/api/dashboard", { method: "GET" });
      if (data) {
        if (Array.isArray(data.weakAreas) && data.weakAreas.length > 0) {
          el.weakStat.textContent = data.weakAreas[0];
        } else {
          el.weakStat.textContent = "-";
        }
        renderProgressChart(Array.isArray(data.progress) ? data.progress : []);
      }
    } catch (error) {
      renderProgressChart([]);
    }
  }

  function renderProgressChart(samples) {
    if (!el.progressChart) {
      return;
    }
    if (!samples || samples.length === 0) {
      el.progressChart.innerHTML = "<p class=\"mono\">No progress data yet.</p>";
      return;
    }
    const width = 600;
    const height = 120;
    const padding = 12;
    const values = samples.map((s) => Number(s.accuracy || 0));
    const max = Math.max(100, ...values);
    const min = Math.min(0, ...values);
    const step = (width - padding * 2) / Math.max(1, values.length - 1);

    const points = values.map((val, i) => {
      const x = padding + i * step;
      const y = height - padding - ((val - min) / (max - min || 1)) * (height - padding * 2);
      return `${x},${y}`;
    });

    const path = `M ${points.join(" L ")}`;
    el.progressChart.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <polyline points="${points.join(" ")}" fill="none" stroke="#0f766e" stroke-width="3"/>
        <path d="${path}" fill="none" stroke="rgba(15,118,110,0.2)" stroke-width="10" stroke-linecap="round"/>
      </svg>
    `;
  }
  async function loadScenarios() {
    try {
      if (!apiAvailable) {
        scenarioList = [];
        return;
      }
      const response = await apiRequest("/api/scenarios", { method: "GET" });
      scenarioList = Array.isArray(response.scenarios) ? normalizeScenarioResponse(response.scenarios) : [];
    } catch (error) {
      scenarioList = [];
    }
  }

  function normalizeScenarioResponse(items) {
    return items
      .filter((item) => item && item.id)
      .map((item) => ({
        id: String(item.id),
        title: item.title || item.id,
        type: item.type || "unknown",
        difficulty: normalizeDifficulty(item.difficulty),
        prompt: item.content || "",
        message: "",
        options: [
          { text: "Mark as Safe", safe: false, explanation: "Rule-based analysis pending." },
          { text: "Mark as Phishing", safe: true, explanation: "Rule-based analysis pending." }
        ],
        indicators: Array.isArray(item.indicators) ? item.indicators : []
      }));
  }

  function normalizeDifficulty(value) {
    if (value === "easy" || value === "medium" || value === "hard") {
      return value;
    }
    return "medium";
  }

  function difficultyPoints(value) {
    if (value === "hard") return 3;
    if (value === "medium") return 2;
    return 1;
  }

  async function submitAnswerToApi(scenario, userVerdict, timedOut) {
    if (!apiAvailable) {
      return null;
    }
    return apiRequest("/api/submit", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: scenario.id,
        content: scenario.prompt || scenario.content || "",
        indicators: scenario.indicators || [],
        userVerdict,
        timedOut: Boolean(timedOut)
      })
    });
  }

  function buildFeedbackMessage(result, option, timedOut) {
    if (!result) {
      return timedOut ? `Time expired. ${option.explanation}` : option.explanation;
    }
    const reasons = Array.isArray(result.reasons) ? result.reasons.join(" ") : "";
    return timedOut
      ? `Time expired. ${reasons || option.explanation}`
      : reasons || option.explanation;
  }
})();
