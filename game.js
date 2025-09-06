/* FILE: game.js */
// Manages level progression and progress bar

const levelOrder = [
  'soceng.html', 'phar.html', 'whl.html', 'wesp.html', 'sph.html',
  'htph.html', 'emph.html', 'anph.html', 'clph.html', 'viph.html',
  'whph.html', 'puph.html', 'dcph.html', 'etph.html', 'seph.html',
  'iph.html', 'smh.html', 'dmph.html', 'mitm.html', 'smph.html'
];

function getCurrentLevelIndex() {
  const currentPage = window.location.pathname.split("/").pop();
  return levelOrder.indexOf(currentPage);
}

function proceedToNextLevel() {
  const currentIndex = getCurrentLevelIndex();
  if (currentIndex !== -1 && currentIndex < levelOrder.length - 1) {
    const nextLevel = levelOrder[currentIndex + 1];
    window.location.href = nextLevel;
  } else {
    window.location.href = 'end.html';
  }
}

function updateProgressBar() {
  const currentIndex = getCurrentLevelIndex();
  if (currentIndex !== -1) {
    const progressPercent = ((currentIndex + 1) / levelOrder.length) * 100;
    const progressBar = document.getElementById('progress-bar');
    if(progressBar) {
        progressBar.style.width = progressPercent + '%';
    }
  }
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