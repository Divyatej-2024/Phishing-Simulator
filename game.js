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