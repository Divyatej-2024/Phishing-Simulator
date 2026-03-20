(function () {
  "use strict";

  const STORAGE_KEY = "aegisphish_lab_state_v1";
  const ACHIEVEMENTS = [
    { id: "first_correct", title: "First Catch", description: "Answer one scenario correctly.", check: (s) => s.stats.correct >= 1 },
    { id: "streak_5", title: "Sharp Eye", description: "Reach a 5-answer correct streak.", check: (s) => s.stats.bestStreak >= 5 },
    { id: "score_1000", title: "Threat Hunter", description: "Reach 1000 total score.", check: (s) => s.stats.score >= 1000 },
    { id: "complete_10", title: "Halfway Guardian", description: "Complete 10 unique scenarios.", check: (s) => s.stats.completedIds.length >= 10 },
    { id: "complete_all", title: "Lab Master", description: "Complete all 20 scenarios.", check: (s) => s.stats.completedIds.length >= SCENARIOS.length }
  ];

  const SCENARIOS = [
    {
      id: "social_engineering",
      title: "Social Engineering Call",
      type: "Voice Fraud",
      difficulty: 1,
      prompt: "Someone claiming to be IT asks for your password to fix a critical issue.",
      message: "\"We detected malware on your account. Share your password now so we can secure your system.\"",
      options: [
        { text: "Share password to resolve quickly", safe: false, explanation: "Legitimate IT teams never request your password directly." },
        { text: "Refuse and call official IT helpdesk", safe: true, explanation: "Using a verified internal number breaks attacker control." }
      ]
    },
    {
      id: "pharming",
      title: "Pharming Portal",
      type: "Website Attack",
      difficulty: 2,
      prompt: "Your bank page looks real but the URL is slightly different.",
      message: "\"www.mybank-login-portal.com\" asks for your account credentials.",
      options: [
        { text: "Log in since branding looks correct", safe: false, explanation: "Attackers mimic visual design to harvest credentials." },
        { text: "Close and visit the official bookmarked domain", safe: true, explanation: "Verifying the exact domain prevents domain spoofing." }
      ]
    },
    {
      id: "whaling",
      title: "Executive Wire Request",
      type: "Business Email Compromise",
      difficulty: 3,
      prompt: "A message from the CEO asks for immediate confidential wire transfer.",
      message: "\"I am in a meeting. Process this transfer now and keep it private.\"",
      options: [
        { text: "Process transfer due to urgency", safe: false, explanation: "Urgency and secrecy are common BEC pressure tactics." },
        { text: "Validate through a separate trusted channel", safe: true, explanation: "Out-of-band confirmation is required for high-risk transfers." }
      ]
    },
    {
      id: "website_spoof",
      title: "Spoofed Shopfront",
      type: "Retail Scam",
      difficulty: 1,
      prompt: "An unfamiliar store offers extreme discounts and asks card details.",
      message: "\"90% off all products today only. Checkout now.\"",
      options: [
        { text: "Buy quickly before sale ends", safe: false, explanation: "Unrealistic offers are bait to steal payment data." },
        { text: "Leave site and verify seller reputation", safe: true, explanation: "Cross-checking merchant trust prevents checkout fraud." }
      ]
    },
    {
      id: "spear_phishing",
      title: "Targeted Conference Email",
      type: "Spear Phishing",
      difficulty: 3,
      prompt: "HR email references your recent event and asks to log into a new portal.",
      message: "\"Use this link to file your conference expenses now.\"",
      options: [
        { text: "Use link because context looks personal", safe: false, explanation: "Personal details increase believability, not authenticity." },
        { text: "Use known internal portal directly", safe: true, explanation: "Manual navigation avoids credential capture pages." }
      ]
    },
    {
      id: "https_phishing",
      title: "Padlock Trap",
      type: "Credential Theft",
      difficulty: 2,
      prompt: "Page has HTTPS lock icon but domain is wrong.",
      message: "\"Secure login for Dropbox account\" on an unrelated domain.",
      options: [
        { text: "Trust because HTTPS is present", safe: false, explanation: "HTTPS only secures transport; it does not validate business legitimacy." },
        { text: "Reject due to mismatched domain", safe: true, explanation: "Domain validation is stronger than padlock-only trust." }
      ]
    },
    {
      id: "email_phishing",
      title: "Delivery Failure Email",
      type: "Email Scam",
      difficulty: 1,
      prompt: "Courier email with bad grammar claims a failed delivery and requests action.",
      message: "\"Click to reschedule or your parcel will be returned today.\"",
      options: [
        { text: "Click link to avoid missing parcel", safe: false, explanation: "Urgent delivery pressure is a common phishing lure." },
        { text: "Delete and verify via official courier app", safe: true, explanation: "Official app lookup prevents fake tracking pages." }
      ]
    },
    {
      id: "angler_phishing",
      title: "Fake Support Reply",
      type: "Social Media Fraud",
      difficulty: 2,
      prompt: "After posting complaint online, a similar account asks for passport details.",
      message: "\"DM your booking reference and passport so we can compensate you now.\"",
      options: [
        { text: "DM requested personal details", safe: false, explanation: "Support impersonators mine complaints for direct data theft." },
        { text: "Verify official account before sharing anything", safe: true, explanation: "Only verified channels should handle sensitive data." }
      ]
    },
    {
      id: "clone_phishing",
      title: "Duplicate Order Email",
      type: "Clone Phishing",
      difficulty: 2,
      prompt: "A second almost-identical order email appears with a changed link.",
      message: "\"Updated tracking link. Click to view order status.\"",
      options: [
        { text: "Click new tracking link", safe: false, explanation: "Cloned emails replace links while preserving trusted formatting." },
        { text: "Open retailer site manually", safe: true, explanation: "Direct website access defeats cloned-link manipulation." }
      ]
    },
    {
      id: "vishing",
      title: "Tax Authority Robocall",
      type: "Phone Scam",
      difficulty: 1,
      prompt: "Automated call threatens legal action unless immediate payment is made.",
      message: "\"Press 1 now to avoid arrest and clear tax debt.\"",
      options: [
        { text: "Press 1 to settle issue quickly", safe: false, explanation: "Threatening legal urgency by phone is scam behavior." },
        { text: "Hang up and verify with official tax channel", safe: true, explanation: "Independent verification neutralizes caller spoofing." }
      ]
    },
    {
      id: "waterhole",
      title: "Compromised Niche Forum",
      type: "Watering Hole",
      difficulty: 3,
      prompt: "Trusted hobby site requests plugin install through pop-up.",
      message: "\"Install media codec to continue viewing the gallery.\"",
      options: [
        { text: "Install plugin from pop-up", safe: false, explanation: "Compromised legitimate sites can serve malware payloads." },
        { text: "Decline and exit the page", safe: true, explanation: "Avoiding unsolicited downloads blocks execution risk." }
      ]
    },
    {
      id: "popup_scareware",
      title: "Scareware Browser Alert",
      type: "Malware Lure",
      difficulty: 1,
      prompt: "A dramatic pop-up claims your computer has multiple infections.",
      message: "\"Critical alert. Click now for immediate virus removal.\"",
      options: [
        { text: "Run the fake scanner", safe: false, explanation: "Scareware exploits fear to install malware or fake products." },
        { text: "Close the tab safely", safe: true, explanation: "Browser pages cannot run trusted endpoint scans by default." }
      ]
    },
    {
      id: "deceptive_billing",
      title: "Subscription Billing Notice",
      type: "Deceptive Phishing",
      difficulty: 2,
      prompt: "Streaming service email says payment failed and asks for card update.",
      message: "\"Update billing now or account will be suspended.\"",
      options: [
        { text: "Use email link to update card", safe: false, explanation: "Billing panic can redirect users to fake payment portals." },
        { text: "Open official app and check billing there", safe: true, explanation: "Direct account access avoids fake payment forms." }
      ]
    },
    {
      id: "evil_twin_wifi",
      title: "Evil Twin Wi-Fi",
      type: "Network Attack",
      difficulty: 4,
      prompt: "Airport Wi-Fi login asks for your personal email credentials.",
      message: "\"Sign in with your primary mailbox to access free airport internet.\"",
      options: [
        { text: "Authenticate with mailbox account", safe: false, explanation: "Fake captive portals steal credentials on attacker-controlled APs." },
        { text: "Disconnect and confirm official Wi-Fi SSID", safe: true, explanation: "SSID verification and caution prevent rogue AP compromise." }
      ]
    },
    {
      id: "search_ad_phish",
      title: "Search Ad Poisoning",
      type: "Search Engine Phishing",
      difficulty: 2,
      prompt: "Top sponsored result mimics government portal with similar domain.",
      message: "\"Official tax refund login\" appears as an ad result.",
      options: [
        { text: "Click first sponsored result", safe: false, explanation: "Threat actors buy ads to outrank real services." },
        { text: "Locate official domain in organic results", safe: true, explanation: "Domain authenticity is critical for government services." }
      ]
    },
    {
      id: "image_phishing",
      title: "Image-Only Bank Email",
      type: "Image Phishing",
      difficulty: 2,
      prompt: "Email contains only a clickable image that appears to be from your bank.",
      message: "\"Security update required\" displayed as one full-image link.",
      options: [
        { text: "Click image to update security", safe: false, explanation: "Image-based emails can evade simple text filtering." },
        { text: "Log in to bank through known official route", safe: true, explanation: "Independent access avoids concealed malicious URLs." }
      ]
    },
    {
      id: "smishing",
      title: "Parcel Fee SMS",
      type: "Smishing",
      difficulty: 1,
      prompt: "Text asks for a small redelivery payment through unknown link.",
      message: "\"Pay 1.99 now to release your parcel.\"",
      options: [
        { text: "Pay fee from SMS link", safe: false, explanation: "Small payment requests are often used for broad data harvesting." },
        { text: "Ignore text and use official courier site", safe: true, explanation: "Official courier channels are safer for shipment actions." }
      ]
    },
    {
      id: "domain_typosquat",
      title: "Typosquatted Sender Domain",
      type: "Domain Phishing",
      difficulty: 3,
      prompt: "Security email is from microsft-support.com and requests immediate verification.",
      message: "\"Your account is under attack, verify at once.\"",
      options: [
        { text: "Trust it because brand name is close", safe: false, explanation: "Typosquatting relies on visual similarity to trick recipients." },
        { text: "Reject due to domain misspelling", safe: true, explanation: "Domain precision is a high-confidence validation check." }
      ]
    },
    {
      id: "mitm_certificate",
      title: "Certificate Warning",
      type: "MITM Attack",
      difficulty: 4,
      prompt: "Browser warns of invalid certificate on a banking login page at public Wi-Fi.",
      message: "\"Connection is not private. Attackers might steal your information.\"",
      options: [
        { text: "Proceed anyway to continue login", safe: false, explanation: "Certificate interception warnings indicate active trust compromise." },
        { text: "Disconnect and switch to trusted network", safe: true, explanation: "Never bypass certificate errors on sensitive services." }
      ]
    },
    {
      id: "social_media_hijack",
      title: "Compromised Friend Message",
      type: "Social Media Phishing",
      difficulty: 2,
      prompt: "Friend sends out-of-character link saying it is a private video.",
      message: "\"Is this you in this clip? login here.\"",
      options: [
        { text: "Open and sign in through provided link", safe: false, explanation: "Account takeover campaigns spread through trusted contact lists." },
        { text: "Verify with friend through another channel", safe: true, explanation: "Cross-channel confirmation detects hijacked accounts quickly." }
      ]
    }
  ];

  const state = loadState();
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
  syncUI();

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

  function onLogin(event) {
    event.preventDefault();
    const name = (el.usernameInput.value || "").trim();
    if (!name) {
      window.alert("Please enter your analyst name.");
      return;
    }
    state.profile = { name };
    saveState();
    syncUI();
  }

  function onLogout() {
    clearTimer();
    state.profile = null;
    state.session = null;
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
      return shuffle(SCENARIOS.map((s) => s.id)).slice(0, 10);
    }
    return SCENARIOS.map((s) => s.id);
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
    const isCorrect = Boolean(option && option.safe);
    const points = isCorrect ? (100 + scenario.difficulty * 25) : -20;
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
    el.feedbackBody.textContent = timedOut
      ? `Time expired. ${option.explanation}`
      : option.explanation;

    const choiceButtons = el.optionContainer.querySelectorAll(".choice-btn");
    choiceButtons.forEach((button, idx) => {
      button.disabled = true;
      if (idx === optionIndex) {
        button.classList.add(isCorrect ? "choice-correct" : "choice-wrong");
      }
    });

    updateAchievements();
    saveState();
    el.nextBtn.classList.remove("hidden");
    refreshDashboardData();
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
          ? imported.stats.completedIds.filter((id) => SCENARIOS.some((s) => s.id === id))
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
    SCENARIOS.forEach((scenario) => {
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
    el.completedStat.textContent = `${state.stats.completedIds.length}/${SCENARIOS.length}`;
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
    showDashboard();
  }

  function getCurrentScenario() {
    if (!state.session) {
      return null;
    }
    return getScenarioById(state.session.queue[state.session.currentIndex]);
  }

  function getScenarioById(id) {
    return SCENARIOS.find((s) => s.id === id) || null;
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
})();
