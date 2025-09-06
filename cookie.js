/* FILE: cookie.js */

function login(event) {
  event.preventDefault();
  let user = document.getElementById("username").value;
  document.cookie = "player=" + user + "; path=/";
  window.location.href = "menu.html";
}

function checkLogin() {
  if (!document.cookie.includes("player=")) {
    alert("Please login first!");
    window.location.href = "index.html";
  }
}

function logout() {
  document.cookie = "player=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = "index.html";
}

// NEW FUNCTION TO FETCH THE USERNAME
function getUsername() {
  const cookies = document.cookie.split(';'); // Split all cookies into an array
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim(); // Remove whitespace
    // Check if this cookie string begins with "player="
    if (cookie.startsWith('player=')) {
      // If it does, return the value after "player="
      return cookie.substring('player='.length, cookie.length);
    }
  }
  // Return null if the cookie wasn't found
  return null;
}