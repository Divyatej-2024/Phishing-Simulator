/* FILE: game.js */
// Manages level progression and progress bar

const levelOrder = [
  'soceng.html', 'phar.html', 'whl.html', 'wesp.html', 'sph.html',
  'htph.html', 'emph.html', 'anph.html', 'clph.html', 'viph.html',
  'whph.html', 'puph.html', 'dcph.html', 'etph.html', 'seph.html',
  'iph.html', 'smh.html', 'dmph.html', 'mitm.html', 'smph.html'
];

const COMPLETED_LEVELS_KEY = 'phishingSimCompletedLevels';
const LAST_PLAYED_INDEX_KEY = 'phishingSimLastPlayedIndex';

function getCurrentLevelIndex() {
  const currentPage = window.location.pathname.split("/").pop();
  return levelOrder.indexOf(currentPage);
}

function getCompletedLevels() {
  try {
    const raw = localStorage.getItem(COMPLETED_LEVELS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((value) => Number.isInteger(value) && value >= 0 && value < levelOrder.length)
      .sort((a, b) => a - b);
  } catch (error) {
    return [];
  }
}

function saveCompletedLevels(completedIndexes) {
  const uniqueSorted = [...new Set(completedIndexes)].sort((a, b) => a - b);
  localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify(uniqueSorted));
}

function markLevelCompleted(levelIndex) {
  if (!Number.isInteger(levelIndex) || levelIndex < 0) {
    return;
  }
  const completed = getCompletedLevels();
  if (!completed.includes(levelIndex)) {
    completed.push(levelIndex);
    saveCompletedLevels(completed);
  }
}

function setLastPlayedIndex(levelIndex) {
  if (!Number.isInteger(levelIndex) || levelIndex < 0) {
    return;
  }
  localStorage.setItem(LAST_PLAYED_INDEX_KEY, String(levelIndex));
}

function getLastPlayedIndex() {
  const raw = localStorage.getItem(LAST_PLAYED_INDEX_KEY);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= levelOrder.length) {
    return 0;
  }
  return parsed;
}

function getFirstUnfinishedLevelIndex() {
  const completed = new Set(getCompletedLevels());
  for (let i = 0; i < levelOrder.length; i += 1) {
    if (!completed.has(i)) {
      return i;
    }
  }
  return levelOrder.length - 1;
}

function proceedToNextLevel() {
  const currentIndex = getCurrentLevelIndex();
  if (currentIndex !== -1) {
    markLevelCompleted(currentIndex);
  }

  if (currentIndex !== -1 && currentIndex < levelOrder.length - 1) {
    const nextLevel = levelOrder[currentIndex + 1];
    setLastPlayedIndex(currentIndex + 1);
    window.location.href = nextLevel;
  } else {
    setLastPlayedIndex(levelOrder.length - 1);
    window.location.href = 'end.html';
  }
}

function updateProgressBar() {
  const currentIndex = getCurrentLevelIndex();
  const completedCount = getCompletedLevels().length;
  if (currentIndex !== -1) {
    setLastPlayedIndex(currentIndex);
    const progressed = Math.max(currentIndex + 1, completedCount);
    const progressPercent = (progressed / levelOrder.length) * 100;
    const progressBar = document.getElementById('progress-bar') || document.getElementById('Progress-bar');
    if(progressBar) {
        progressBar.style.width = progressPercent + '%';
    }
  }
}

function updateProgresBar() {
  updateProgressBar();
}

function updateprogressbar() {
  updateProgressBar();
}

/* Replace the existing displayUsername function in game.js with this one */

function displayUsername() {
    const user = getUsername(); // Calls the function from cookie.js
    if (user) {
        // Update the main welcome message if it exists on the page
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${user}!`;
        }

        // Update the in-level player name placeholder if it exists
        const playerNameSpan = document.getElementById('playerName');
        if (playerNameSpan) {
            playerNameSpan.textContent = user;
        }
    }
}

function renderMenuProgress() {
  const menuLinks = document.querySelectorAll('a.menu-link');
  if (!menuLinks.length) {
    return;
  }

  const completed = new Set(getCompletedLevels());

  menuLinks.forEach((link) => {
    const href = link.getAttribute('href');
    const levelIndex = levelOrder.indexOf(href);
    if (levelIndex === -1) {
      return;
    }

    if (link.querySelector('.status-badge')) {
      return;
    }

    const badge = document.createElement('span');
    badge.className = 'status-badge';
    if (completed.has(levelIndex)) {
      badge.classList.add('status-complete');
      badge.textContent = 'Completed';
    } else {
      badge.classList.add('status-pending');
      badge.textContent = 'Pending';
    }
    link.appendChild(document.createTextNode(' '));
    link.appendChild(badge);
  });

  const summary = document.getElementById('menu-summary');
  if (summary) {
    summary.textContent = `Progress: ${completed.size}/${levelOrder.length} levels completed`;
  }

  const resumeLink = document.getElementById('resume-link');
  if (resumeLink) {
    const firstUnfinishedIndex = getFirstUnfinishedLevelIndex();
    const lastPlayedIndex = getLastPlayedIndex();
    const resumeIndex = completed.has(lastPlayedIndex) ? firstUnfinishedIndex : lastPlayedIndex;
    const allDone = completed.size === levelOrder.length;
    resumeLink.href = allDone ? 'end.html' : levelOrder[resumeIndex];
    resumeLink.textContent = allDone ? 'View Completion Page' : 'Resume Training';
  }
}

function renderEndSummary() {
  const completedCount = getCompletedLevels().length;
  const summary = document.getElementById('completion-summary');
  if (!summary) {
    return;
  }
  if (completedCount >= levelOrder.length) {
    summary.textContent = `Excellent work. You completed all ${levelOrder.length} levels.`;
  } else {
    summary.textContent = `You completed ${completedCount} of ${levelOrder.length} levels. Continue from the menu to finish the simulator.`;
  }
}

function resetGameProgress() {
  localStorage.removeItem(COMPLETED_LEVELS_KEY);
  localStorage.removeItem(LAST_PLAYED_INDEX_KEY);
  window.location.href = 'menu.html';
}

function confirmResetGameProgress() {
  const shouldReset = window.confirm('Reset your saved training progress?');
  if (shouldReset) {
    resetGameProgress();
  }
}
