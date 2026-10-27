const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
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

function isAuthenticationError(payload, response) {
  const text = `${payload?.error || ""} ${payload?.details || ""} ${payload?.message || ""}`.toLowerCase();
  return response?.status === 401 || text.includes("auth") || text.includes("unauthorized") || text.includes("invalid credentials") || text.includes("missing bearer token");
}

function buildApiError(payload, response, fallbackMessage = "API request failed") {
  const errorPayload = {
    error: payload?.error || fallbackMessage,
    status: response?.status ?? null,
    details: payload?.details ?? payload?.message ?? null,
  };

  if (payload && typeof payload === "object") {
    Object.entries(payload).forEach(([key, value]) => {
      if (!(key in errorPayload)) {
        errorPayload[key] = value;
      }
    });
  }

  if (isAuthenticationError(payload, response)) {
    errorPayload.possibleFix = "Make sure to run `gcloud auth login` in the terminal";
  }

  const error = new Error(errorPayload.error);
  error.responsePayload = errorPayload;
  return error;
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
    throw buildApiError(payload, response);
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
    throw buildApiError(payload, response);
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

export async function fetchHostsReport(token, orgName) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(`/orgs/${encodedOrg}/hosts-report`, token, `/organizations/${encodedOrg}/hosts-report`, {
    endpointMode: "global",
    region: "us",
  });
}

export async function runLoadBalancerForOrg(token, orgName) {
  const encodedOrg = encodeURIComponent(orgName);
  const response = await fetch(`${API_BASE}/orgs/${encodedOrg}/load-balancer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && token.trim().length > 0 ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const payload = await response.json().catch(() => ({ error: "Invalid JSON response" }));

  if (!response.ok) {
    throw buildApiError(payload, response, "Load balancer export failed");
  }

  return payload;
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

export async function fetchOrganizationEndpointAttachments(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/endpoint-attachments`,
    token,
    `/organizations/${encodedOrg}/endpointAttachments`,
    endpointConfig
  );
}

export async function fetchOrganizationKeyValueMaps(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/keyvaluemaps`,
    token,
    `/organizations/${encodedOrg}/keyvaluemaps`,
    endpointConfig
  );
}

export async function fetchOrganizationDeployments(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/deployments`,
    token,
    `/organizations/${encodedOrg}/deployments`,
    endpointConfig
  );
}

export async function fetchOrganizationDataCollectors(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/datacollectors`,
    token,
    `/organizations/${encodedOrg}/datacollectors`,
    endpointConfig
  );
}

export async function fetchOrganizationEnvGroups(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/envgroups`,
    token,
    `/organizations/${encodedOrg}/envgroups`,
    endpointConfig
  );
}

export async function fetchOrganizationAppGroups(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/approups`,
    token,
    `/organizations/${encodedOrg}/approups`,
    endpointConfig
  );
}

export async function fetchOrganizationHostQueries(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/hostQueries`,
    token,
    `/organizations/${encodedOrg}/hostQueries`,
    endpointConfig
  );
}

export async function fetchOrganizationHostSecurityReports(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/hostSecurityReports`,
    token,
    `/organizations/${encodedOrg}/hostSecurityReports`,
    endpointConfig
  );
}

export async function fetchOrganizationHostStats(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/hostStats`,
    token,
    `/organizations/${encodedOrg}/hostStats`,
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

export async function fetchOrganizationOperations(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/operations`,
    token,
    `/organizations/${encodedOrg}/operations`,
    endpointConfig
  );
}

export async function fetchOrganizationOperationDetails(
  token,
  orgName,
  operationName,
  endpointConfig = {}
) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedOperation = encodeURIComponent(operationName);
  return apiGet(
    `/orgs/${encodedOrg}/operations/${encodedOperation}`,
    token,
    `/organizations/${encodedOrg}/operations/${encodedOperation}`,
    endpointConfig
  );
}

export async function fetchOrganizationReports(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/reports`,
    token,
    `/organizations/${encodedOrg}/reports`,
    endpointConfig
  );
}

export async function fetchOrganizationReportDetails(
  token,
  orgName,
  reportName,
  endpointConfig = {}
) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedReport = encodeURIComponent(reportName);
  return apiGet(
    `/orgs/${encodedOrg}/reports/${encodedReport}`,
    token,
    `/organizations/${encodedOrg}/reports/${encodedReport}`,
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

export async function fetchOrganizationApiDeployments(token, orgName, apiName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedApi = encodeURIComponent(apiName);
  return apiGet(
    `/orgs/${encodedOrg}/apis/${encodedApi}/deployments`,
    token,
    `/organizations/${encodedOrg}/apis/${encodedApi}/deployments`,
    endpointConfig
  );
}

export async function fetchOrganizationApiDetails(token, orgName, apiName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedApi = encodeURIComponent(apiName);
  const [apiDetails, deployments] = await Promise.all([
    apiGet(
      `/orgs/${encodedOrg}/apis/${encodedApi}`,
      token,
      `/organizations/${encodedOrg}/apis/${encodedApi}`,
      endpointConfig
    ),
    fetchOrganizationApiDeployments(token, orgName, apiName, endpointConfig),
  ]);

  return {
    ...apiDetails,
    deployments,
  };
}

export async function fetchOrganizationApiProducts(token, orgName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  return apiGet(
    `/orgs/${encodedOrg}/apiproducts`,
    token,
    `/organizations/${encodedOrg}/apiproducts`,
    endpointConfig
  );
}

export async function fetchOrganizationApiProductDetails(
  token,
  orgName,
  productName,
  endpointConfig = {}
) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedProduct = encodeURIComponent(productName);
  return apiGet(
    `/orgs/${encodedOrg}/apiproducts/${encodedProduct}`,
    token,
    `/organizations/${encodedOrg}/apiproducts/${encodedProduct}`,
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

export async function fetchOrganizationTargetServers(token, orgName, environmentName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedEnvironment = encodeURIComponent(environmentName);
  return apiGet(
    `/orgs/${encodedOrg}/environments/${encodedEnvironment}/targetservers`,
    token,
    `/organizations/${encodedOrg}/environments/${encodedEnvironment}/targetservers`,
    endpointConfig
  );
}

export async function fetchOrganizationDebugMask(token, orgName, environmentName, endpointConfig = {}) {
  const encodedOrg = encodeURIComponent(orgName);
  const encodedEnvironment = encodeURIComponent(environmentName);
  return apiGet(
    `/orgs/${encodedOrg}/environments/${encodedEnvironment}/debugmask`,
    token,
    `/organizations/${encodedOrg}/environments/${encodedEnvironment}/debugmask`,
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
