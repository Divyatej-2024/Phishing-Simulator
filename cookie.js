// FILE: cookie.js
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