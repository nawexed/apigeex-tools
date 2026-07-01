const API_BASE = "http://localhost:5001/api";

async function apiGet(path, token) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token && token.trim().length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers,
  });

  const payload = await response.json().catch(() => ({ error: "Invalid JSON response" }));

  if (!response.ok) {
    const errorText = payload.error || "API request failed";
    throw new Error(errorText);
  }

  return payload;
}

async function apiPost(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => ({ error: "Invalid JSON response" }));

  if (!response.ok) {
    const errorText = payload.error || "API request failed";
    throw new Error(errorText);
  }

  return payload;
}

export async function fetchOrganizations(token) {
  const payload = await apiGet("/config/orgs", token);
  if (Array.isArray(payload.organizations)) {
    return payload.organizations;
  }

  throw new Error("Unexpected organizations payload format.");
}

export async function fetchOrganizationDetails(token, orgName) {
  return apiGet(`/orgs/${encodeURIComponent(orgName)}`, token);
}

export async function fetchOrganizationInstances(token, orgName) {
  return apiGet(`/orgs/${encodeURIComponent(orgName)}/instances`, token);
}

export async function fetchOrganizationApis(token, orgName) {
  return apiGet(`/orgs/${encodeURIComponent(orgName)}/apis`, token);
}

export async function fetchOrganizationSpaces(token, orgName) {
  return apiGet(`/orgs/${encodeURIComponent(orgName)}/spaces`, token);
}

export async function fetchOrganizationSpaceDetails(token, orgName, spaceName) {
  return apiGet(
    `/orgs/${encodeURIComponent(orgName)}/spaces/${encodeURIComponent(spaceName)}`,
    token
  );
}

export async function fetchOrganizationEnvironments(token, orgName) {
  return apiGet(`/orgs/${encodeURIComponent(orgName)}/environments`, token);
}

export async function fetchOrganizationDevelopers(token, orgName) {
  return apiGet(`/orgs/${encodeURIComponent(orgName)}/developers`, token);
}

export async function fetchOrganizationApps(token, orgName) {
  return apiGet(`/orgs/${encodeURIComponent(orgName)}/apps`, token);
}

export async function fetchOrganizationSharedflows(token, orgName) {
  return apiGet(`/orgs/${encodeURIComponent(orgName)}/sharedflows`, token);
}

export async function fetchAndSaveTokenFromBackend() {
  const payload = await apiPost("/token/refresh");
  if (!payload.accessToken) {
    throw new Error("Backend did not return an access token.");
  }
  return payload.accessToken;
}
