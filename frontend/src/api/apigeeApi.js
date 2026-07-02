const API_BASE = "http://localhost:5001/api";
const GCP_API_BASE = "https://apigee.googleapis.com/v1";
let lastRequestUrl = "";
let lastGcpRequestUrl = "";
let lastGcpRequestPath = "";

function resolveGcpBaseUrl(endpointConfig) {
  if (endpointConfig?.endpointMode === "regional" && endpointConfig?.region?.trim()) {
    return `https://${endpointConfig.region.trim()}-apigee.googleapis.com/v1`;
  }
  return GCP_API_BASE;
}

export function buildGcpRequestUrl(gcpPath, endpointConfig = {}) {
  if (!gcpPath) {
    return "";
  }
  return `${resolveGcpBaseUrl(endpointConfig)}${gcpPath}`;
}

export function getLastRequestUrl() {
  return lastRequestUrl;
}

export function getLastGcpRequestUrl() {
  return lastGcpRequestUrl;
}

export function getLastGcpRequestPath() {
  return lastGcpRequestPath;
}

async function apiGet(path, token, gcpPath = "", endpointConfig = {}) {
  lastRequestUrl = `${API_BASE}${path}`;
  lastGcpRequestPath = gcpPath;
  lastGcpRequestUrl = buildGcpRequestUrl(gcpPath, endpointConfig);
  const headers = {
    "Content-Type": "application/json",
    "X-Apigee-Endpoint-Mode": endpointConfig.endpointMode || "global",
    "X-Apigee-Region": endpointConfig.region || "",
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
  lastRequestUrl = `${API_BASE}${path}`;
  lastGcpRequestPath = "";
  lastGcpRequestUrl = "";
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

export async function fetchOrganizationDetails(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(`/orgs/${encodedOrg}`, token, `/organizations/${encodedOrg}`, endpointConfig);
}

export async function fetchOrganizationProjectMapping(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/project-mapping`,
    token,
    `/organizations/${encodedOrg}:getProjectMapping`,
    endpointConfig
  );
}

export async function fetchOrganizationInstances(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/instances`,
    token,
    `/organizations/${encodedOrg}/instances`,
    endpointConfig
  );
}

export async function fetchOrganizationInstanceDetails(
  token,
  orgName,
  instanceName,
  endpointConfig = {}
) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedInstance = encodeURIComponent(instanceName);
  return apiGet(
    `/orgs/${encodedOrg}/instances/${encodedInstance}`,
    token,
    `/organizations/${encodedOrg}/instances/${encodedInstance}`,
    endpointConfig
  );
}

export async function fetchOrganizationApis(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(`/orgs/${encodedOrg}/apis`, token, `/organizations/${encodedOrg}/apis`, endpointConfig);
}

export async function fetchOrganizationApiDetails(token, orgName, apiName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedApi = encodeURIComponent(apiName);
  return apiGet(
    `/orgs/${encodedOrg}/apis/${encodedApi}`,
    token,
    `/organizations/${encodedOrg}/apis/${encodedApi}`,
    endpointConfig
  );
}

export async function fetchOrganizationSpaces(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(`/orgs/${encodedOrg}/spaces`, token, `/organizations/${encodedOrg}/spaces`, endpointConfig);
}

export async function fetchOrganizationSpaceDetails(
  token,
  orgName,
  spaceName,
  endpointConfig = {}
) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedSpace = encodeURIComponent(spaceName);
  return apiGet(
    `/orgs/${encodedOrg}/spaces/${encodedSpace}`,
    token,
    `/organizations/${encodedOrg}/spaces/${encodedSpace}`,
    endpointConfig
  );
}

export async function fetchOrganizationEnvironments(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/environments`,
    token,
    `/organizations/${encodedOrg}/environments`,
    endpointConfig
  );
}

export async function fetchOrganizationEnvironmentDetails(
  token,
  orgName,
  environmentName,
  endpointConfig = {}
) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedEnvironment = encodeURIComponent(environmentName);
  return apiGet(
    `/orgs/${encodedOrg}/environments/${encodedEnvironment}`,
    token,
    `/organizations/${encodedOrg}/environments/${encodedEnvironment}`,
    endpointConfig
  );
}

export async function fetchOrganizationDevelopers(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/developers`,
    token,
    `/organizations/${encodedOrg}/developers`,
    endpointConfig
  );
}

export async function fetchOrganizationDeveloperDetails(
  token,
  orgName,
  developerId,
  endpointConfig = {}
) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedDeveloper = encodeURIComponent(developerId);
  return apiGet(
    `/orgs/${encodedOrg}/developers/${encodedDeveloper}`,
    token,
    `/organizations/${encodedOrg}/developers/${encodedDeveloper}`,
    endpointConfig
  );
}

export async function fetchOrganizationApps(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(`/orgs/${encodedOrg}/apps`, token, `/organizations/${encodedOrg}/apps`, endpointConfig);
}

export async function fetchOrganizationAppDetails(token, orgName, appName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedApp = encodeURIComponent(appName);
  return apiGet(
    `/orgs/${encodedOrg}/apps/${encodedApp}`,
    token,
    `/organizations/${encodedOrg}/apps/${encodedApp}`,
    endpointConfig
  );
}

export async function fetchOrganizationSharedflows(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/sharedflows`,
    token,
    `/organizations/${encodedOrg}/sharedflows`,
    endpointConfig
  );
}

export async function fetchOrganizationSharedflowDetails(
  token,
  orgName,
  sharedflowName,
  endpointConfig = {}
) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedSharedflow = encodeURIComponent(sharedflowName);
  return apiGet(
    `/orgs/${encodedOrg}/sharedflows/${encodedSharedflow}`,
    token,
    `/organizations/${encodedOrg}/sharedflows/${encodedSharedflow}`,
    endpointConfig
  );
}

export async function fetchAndSaveTokenFromBackend() {
  const payload = await apiPost("/token/refresh");
  if (!payload.accessToken) {
    throw new Error("Backend did not return an access token.");
  }
  return payload.accessToken;
}
