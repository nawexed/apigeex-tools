const TOKEN_KEY = "apigee_access_token";

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function saveToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}
