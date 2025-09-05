// game.js - Manages level progression

// Define the order of all levels
const levelOrder = [
  'soceng.html',
  'phar.html',
  'whl.html',
  'wesp.html',
  'sph.html',
  'htph.html',
  'emph.html',
  'anph.html',
  'clph.html',
  'viph.html',
  'whph.html',
  'puph.html',
  'dcph.html',
  'etph.html',
  'seph.html',
  'iph.html',
  'smh.html',
  'dmph.html',
  'mitm.html',
  'smph.html'
];

function proceedToNextLevel() {
  // Get the current page's file name from the URL
  const currentPage = window.location.pathname.split("/").pop();

  // Find the index of the current page in our level order array
  const currentIndex = levelOrder.indexOf(currentPage);

  // Check if the current level is in the list and not the last one
  if (currentIndex !== -1 && currentIndex < levelOrder.length - 1) {
    // If it's not the last level, get the next level's filename
    const nextLevel = levelOrder[currentIndex + 1];
    // Redirect to the next level
    window.location.href = nextLevel;
  } else {
    // If it's the last level or something went wrong, go to the end screen
    window.location.href = 'end.html';
  }
}