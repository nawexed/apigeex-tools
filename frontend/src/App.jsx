import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildGcpRequestUrl,
  fetchAndSaveTokenFromBackend,
  fetchOrganizationApiDetails,
  fetchOrganizationApiProductDetails,
  fetchOrganizationApiProducts,
  fetchOrganizationApis,
  fetchOrganizationAppDetails,
  fetchOrganizationApps,
  fetchOrganizationDeveloperDetails,
  fetchOrganizationDevelopers,
  fetchOrganizationDetails,
  fetchOrganizationDeployments,
  fetchOrganizationDataCollectors,
  fetchOrganizationEndpointAttachments,
  fetchOrganizationEnvironmentDetails,
  fetchOrganizationEnvGroups,
  fetchOrganizationAppGroups,
  fetchOrganizationHostQueries,
  fetchOrganizationHostSecurityReports,
  fetchOrganizationHostStats,
  fetchOrganizationEnvironments,
  fetchOrganizationInstanceDetails,
  fetchOrganizationInstances,
  fetchOrganizationProjectMapping,
  fetchOrganizationSpaceDetails,
  fetchOrganizationSharedflowDetails,
  fetchOrganizationSharedflows,
  fetchOrganizationSpaces,
  fetchOrganizations,
  getLastGcpRequestPath,
} from "./api/apigeeApi";
import AuthTokenControl from "./components/AuthTokenControl";
import EndpointModeControl from "./components/EndpointModeControl";
import JsonViewer from "./components/JsonViewer";
import OrgSelector from "./components/OrgSelector";
import SideNav from "./components/SideNav";
import TopBar from "./components/TopBar";
import { getStoredToken, saveToken } from "./utils/tokenStore";

const RESOURCE_ARRAY_KEYS = {
  instances: ["instances"],
  apis: ["apis", "proxies"],
  apiProducts: ["apiProduct", "apiProducts"],
  spaces: ["spaces", "spaceNames"],
  environments: ["environments"],
  developers: ["developers", "developer"],
  apps: ["apps", "app"],
  sharedflows: ["sharedflows"],
};

const EMPTY_DETAIL_CONTROL = {
  resourceId: "",
  visible: false,
  detailLabel: "Item",
  detailButtonLabel: "Load Details",
  items: [],
  selectedItem: "",
  loading: false,
};

function normalizeResourceName(item) {
  if (typeof item === "string") {
    const parts = item.split("/");
    return parts[parts.length - 1];
  }

  if (!item || typeof item !== "object") {
    return "";
  }

  const nameKeys = ["name", "email", "appId", "id", "developerId", "instanceId", "displayName"];
  for (const key of nameKeys) {
    if (typeof item[key] === "string" && item[key].trim().length > 0) {
      const parts = item[key].split("/");
      return parts[parts.length - 1];
    }
  }

  return "";
}

function extractResourceNames(payload, resourceId) {
  const fromArray = (arr) => {
    const names = arr.map(normalizeResourceName).filter((name) => name.trim().length > 0);
    return [...new Set(names)];
  };

  if (Array.isArray(payload)) {
    return fromArray(payload);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidateKeys = RESOURCE_ARRAY_KEYS[resourceId] || [];
  for (const key of candidateKeys) {
    if (Array.isArray(payload[key])) {
      return fromArray(payload[key]);
    }
  }

  const firstArrayKey = Object.keys(payload).find((key) => Array.isArray(payload[key]));
  if (firstArrayKey) {
    return fromArray(payload[firstArrayKey]);
  }

  return [];
}

function buildErrorResult(error) {
  if (error?.responsePayload && typeof error.responsePayload === "object") {
    return error.responsePayload;
  }

  if (error && typeof error === "object" && "error" in error) {
    return error;
  }

  return { error: error?.message || "Unknown error" };
}

function buildPreviewGcpPath(actionId, orgName, resourceName = "") {
  if (!orgName) {
    return "";
  }

  const encodedOrg = encodeURIComponent(orgName);
  const encodedName = resourceName ? encodeURIComponent(resourceName) : "";

  switch (actionId) {
    case "orgDetails":
      return `/organizations/${encodedOrg}`;
    case "projectMapping":
      return `/organizations/${encodedOrg}:getProjectMapping`;
    case "endpointAttachments":
      return `/organizations/${encodedOrg}/endpointAttachments`;
    case "deployments":
      return `/organizations/${encodedOrg}/deployments`;
    case "dataCollectors":
      return `/organizations/${encodedOrg}/datacollectors`;
    case "envGroups":
      return `/organizations/${encodedOrg}/envgroups`;
    case "appGroups":
      return `/organizations/${encodedOrg}/approups`;
    case "hostQueries":
      return `/organizations/${encodedOrg}/hostQueries`;
    case "hostSecurityReports":
      return `/organizations/${encodedOrg}/hostSecurityReports`;
    case "hostStats":
      return `/organizations/${encodedOrg}/hostStats`;
    case "instances":
      return `/organizations/${encodedOrg}/instances${encodedName ? `/${encodedName}` : ""}`;
    case "apis":
      return `/organizations/${encodedOrg}/apis${encodedName ? `/${encodedName}` : ""}`;
    case "apiProducts":
      return `/organizations/${encodedOrg}/apiproducts${encodedName ? `/${encodedName}` : ""}`;
    case "spaces":
      return `/organizations/${encodedOrg}/spaces${encodedName ? `/${encodedName}` : ""}`;
    case "environments":
      return `/organizations/${encodedOrg}/environments${encodedName ? `/${encodedName}` : ""}`;
    case "developers":
      return `/organizations/${encodedOrg}/developers${encodedName ? `/${encodedName}` : ""}`;
    case "apps":
      return `/organizations/${encodedOrg}/apps${encodedName ? `/${encodedName}` : ""}`;
    case "sharedflows":
      return `/organizations/${encodedOrg}/sharedflows${encodedName ? `/${encodedName}` : ""}`;
    default:
      return "";
  }
}

function App() {
  const [token, setToken] = useState(getStoredToken());
  const [endpointMode, setEndpointMode] = useState("global");
  const [region, setRegion] = useState("us");
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [resultJson, setResultJson] = useState({ message: "Loading organizations from config..." });
  const [requestPath, setRequestPath] = useState("");
  const [requestUrl, setRequestUrl] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [detailControl, setDetailControl] = useState(EMPTY_DETAIL_CONTROL);
  const [loadingToken, setLoadingToken] = useState(false);
  const requestPathRef = useRef("");

  const tokenReady = useMemo(() => token && token.trim().length > 0, [token]);
  const endpointConfig = useMemo(
    () => ({ endpointMode, region: region.trim() }),
    [endpointMode, region]
  );

  const handleLoadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const orgList = await fetchOrganizations(token);
      updateDisplayedGcpRequestUrl();
      setOrgs(orgList);
      setSelectedOrg(orgList[0] || "");
      setResultJson({ organizations: orgList });
    } catch (error) {
      setResultJson(buildErrorResult(error));
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleOrgChange = (orgName) => {
    setSelectedOrg(orgName);
    setDetailControl(EMPTY_DETAIL_CONTROL);
    requestPathRef.current = "";
    setRequestPath("");
    setRequestUrl("");
  };

  const updateDisplayedGcpRequestUrl = (overridePath = "") => {
    const nextPath = overridePath || requestPathRef.current;
    requestPathRef.current = nextPath;
    setRequestPath(nextPath);
    setRequestUrl(buildGcpRequestUrl(nextPath, endpointConfig));
  };

  const setPreviewForAction = (actionId, resourceName = "") => {
    const previewPath = buildPreviewGcpPath(actionId, selectedOrg, resourceName);
    requestPathRef.current = previewPath;
    setRequestPath(previewPath);
    setRequestUrl(buildGcpRequestUrl(previewPath, endpointConfig));
  };

  useEffect(() => {
    handleLoadOrganizations();
  }, []);

  useEffect(() => {
    if (!requestPath) {
      setRequestUrl("");
      return;
    }
    requestPathRef.current = requestPath;
    setRequestUrl(buildGcpRequestUrl(requestPath, endpointConfig));
  }, [requestPath, endpointMode, region]);

  useEffect(() => {
    if (!selectedOrg) {
      requestPathRef.current = "";
      setRequestUrl("");
      setRequestPath("");
      return;
    }

    if (!requestPath) {
      setRequestUrl("");
    }
  }, [selectedOrg, endpointMode, region]);

  const handleFetchTokenFromBackend = async () => {
    setLoadingToken(true);
    try {
      const backendToken = await fetchAndSaveTokenFromBackend();
      updateDisplayedGcpRequestUrl();
      saveToken(backendToken);
      setToken(backendToken);
      setResultJson({ message: "Token retrieved from backend and saved.", tokenSource: "gcloud" });
    } catch (error) {
      setResultJson(buildErrorResult(error));
    } finally {
      setLoadingToken(false);
    }
  };

  const loadOrgResource = async (actionId, fetcher) => {
    if (!tokenReady || !selectedOrg) {
      setResultJson({ error: "Select an organization and ensure token is saved." });
      return;
    }

    setPreviewForAction(actionId);
    setActiveAction(actionId);
    try {
      const payload = await fetcher(token, selectedOrg, endpointConfig);
      updateDisplayedGcpRequestUrl();
      setResultJson(payload);
      setDetailControl(EMPTY_DETAIL_CONTROL);
    } catch (error) {
      setResultJson(buildErrorResult(error));
    } finally {
      setActiveAction("");
    }
  };

  const loadOrgResourceList = async (action) => {
    if (!tokenReady || !selectedOrg) {
      setResultJson({ error: "Select an organization and ensure token is saved." });
      return;
    }

    setPreviewForAction(action.id);
    setActiveAction(action.id);
    try {
      const payload = await action.listFetcher(token, selectedOrg, endpointConfig);
      updateDisplayedGcpRequestUrl();
      const names = extractResourceNames(payload, action.id);
      setDetailControl({
        resourceId: action.id,
        visible: true,
        detailLabel: action.detailLabel,
        detailButtonLabel: action.detailButtonLabel,
        items: names,
        selectedItem: names[0] || "",
        loading: false,
      });
      setResultJson(payload);
    } catch (error) {
      setResultJson(buildErrorResult(error));
      setDetailControl(EMPTY_DETAIL_CONTROL);
    } finally {
      setActiveAction("");
    }
  };

  const handleLoadResourceDetails = async () => {
    if (!tokenReady || !selectedOrg || !detailControl.selectedItem) {
      setResultJson({ error: "Select an organization and a resource name first." });
      return;
    }

    const action = orgActions.find((item) => item.id === detailControl.resourceId);
    if (!action || !action.detailFetcher) {
      setResultJson({ error: "No details endpoint configured for this resource." });
      return;
    }

    setPreviewForAction(detailControl.resourceId, detailControl.selectedItem);
    setDetailControl((previous) => ({ ...previous, loading: true }));
    try {
      const payload = await action.detailFetcher(
        token,
        selectedOrg,
        detailControl.selectedItem,
        endpointConfig
      );
      updateDisplayedGcpRequestUrl();
      setResultJson(payload);
    } catch (error) {
      setResultJson(buildErrorResult(error));
    } finally {
      setDetailControl((previous) => ({ ...previous, loading: false }));
    }
  };

  const orgActions = [
    {
      id: "orgDetails",
      label: "Load Selected Organization",
      loadingLabel: "Loading organization...",
      onClick: () => loadOrgResource("orgDetails", fetchOrganizationDetails),
    },
    {
      id: "projectMapping",
      label: "Load Project Mapping",
      loadingLabel: "Loading project mapping...",
      onClick: () => loadOrgResource("projectMapping", fetchOrganizationProjectMapping),
    },
    {
      id: "endpointAttachments",
      label: "Load Endpoint Attachments",
      loadingLabel: "Loading endpoint attachments...",
      onClick: () =>
        loadOrgResource("endpointAttachments", fetchOrganizationEndpointAttachments),
    },
    {
      id: "deployments",
      label: "Load Deployments",
      loadingLabel: "Loading deployments...",
      onClick: () => loadOrgResource("deployments", fetchOrganizationDeployments),
    },
    {
      id: "dataCollectors",
      label: "Load Data Collectors",
      loadingLabel: "Loading data collectors...",
      onClick: () => loadOrgResource("dataCollectors", fetchOrganizationDataCollectors),
    },
    {
      id: "envGroups",
      label: "Load Env Groups",
      loadingLabel: "Loading env groups...",
      onClick: () => loadOrgResource("envGroups", fetchOrganizationEnvGroups),
    },
    {
      id: "appGroups",
      label: "Load App Groups",
      loadingLabel: "Loading app groups...",
      onClick: () => loadOrgResource("appGroups", fetchOrganizationAppGroups),
    },
    {
      id: "hostQueries",
      label: "Load Host Queries",
      loadingLabel: "Loading host queries...",
      onClick: () => loadOrgResource("hostQueries", fetchOrganizationHostQueries),
    },
    {
      id: "hostSecurityReports",
      label: "Load Host Security Reports",
      loadingLabel: "Loading host security reports...",
      onClick: () =>
        loadOrgResource("hostSecurityReports", fetchOrganizationHostSecurityReports),
    },
    {
      id: "hostStats",
      label: "Load Host Stats",
      loadingLabel: "Loading host stats...",
      onClick: () => loadOrgResource("hostStats", fetchOrganizationHostStats),
    },
    {
      id: "instances",
      label: "Load Instances",
      loadingLabel: "Loading instances...",
      detailLabel: "Instance",
      detailButtonLabel: "Load Instance Details",
      listFetcher: fetchOrganizationInstances,
      detailFetcher: fetchOrganizationInstanceDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "instances",
          listFetcher: fetchOrganizationInstances,
          detailLabel: "Instance",
          detailButtonLabel: "Load Instance Details",
        }),
    },
    {
      id: "apis",
      label: "Load APIs",
      loadingLabel: "Loading APIs...",
      detailLabel: "API",
      detailButtonLabel: "Load API Details",
      listFetcher: fetchOrganizationApis,
      detailFetcher: fetchOrganizationApiDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "apis",
          listFetcher: fetchOrganizationApis,
          detailLabel: "API",
          detailButtonLabel: "Load API Details",
        }),
    },
    {
      id: "apiProducts",
      label: "Load API Products",
      loadingLabel: "Loading API Products...",
      detailLabel: "API Product",
      detailButtonLabel: "Load API Product Details",
      listFetcher: fetchOrganizationApiProducts,
      detailFetcher: fetchOrganizationApiProductDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "apiProducts",
          listFetcher: fetchOrganizationApiProducts,
          detailLabel: "API Product",
          detailButtonLabel: "Load API Product Details",
        }),
    },
    {
      id: "spaces",
      label: "Load Spaces",
      loadingLabel: "Loading spaces...",
      detailLabel: "Space",
      detailButtonLabel: "Load Space Details",
      listFetcher: fetchOrganizationSpaces,
      detailFetcher: fetchOrganizationSpaceDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "spaces",
          listFetcher: fetchOrganizationSpaces,
          detailLabel: "Space",
          detailButtonLabel: "Load Space Details",
        }),
    },
    {
      id: "environments",
      label: "Load Environments",
      loadingLabel: "Loading environments...",
      detailLabel: "Environment",
      detailButtonLabel: "Load Environment Details",
      listFetcher: fetchOrganizationEnvironments,
      detailFetcher: fetchOrganizationEnvironmentDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "environments",
          listFetcher: fetchOrganizationEnvironments,
          detailLabel: "Environment",
          detailButtonLabel: "Load Environment Details",
        }),
    },
    {
      id: "developers",
      label: "Load Developers",
      loadingLabel: "Loading developers...",
      detailLabel: "Developer",
      detailButtonLabel: "Load Developer Details",
      listFetcher: fetchOrganizationDevelopers,
      detailFetcher: fetchOrganizationDeveloperDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "developers",
          listFetcher: fetchOrganizationDevelopers,
          detailLabel: "Developer",
          detailButtonLabel: "Load Developer Details",
        }),
    },
    {
      id: "apps",
      label: "Load Apps",
      loadingLabel: "Loading apps...",
      detailLabel: "App",
      detailButtonLabel: "Load App Details",
      listFetcher: fetchOrganizationApps,
      detailFetcher: fetchOrganizationAppDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "apps",
          listFetcher: fetchOrganizationApps,
          detailLabel: "App",
          detailButtonLabel: "Load App Details",
        }),
    },
    {
      id: "sharedflows",
      label: "Load Shared Flows",
      loadingLabel: "Loading shared flows...",
      detailLabel: "Shared Flow",
      detailButtonLabel: "Load Shared Flow Details",
      listFetcher: fetchOrganizationSharedflows,
      detailFetcher: fetchOrganizationSharedflowDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "sharedflows",
          listFetcher: fetchOrganizationSharedflows,
          detailLabel: "Shared Flow",
          detailButtonLabel: "Load Shared Flow Details",
        }),
    },
  ];

  return (
    <div className="app-shell">
      <TopBar>
        <div className="top-controls">
          <EndpointModeControl
            endpointMode={endpointMode}
            region={region}
            onModeChange={setEndpointMode}
            onRegionChange={setRegion}
          />
          <AuthTokenControl
            token={token}
            onTokenSaved={setToken}
            onFetchToken={handleFetchTokenFromBackend}
            loadingToken={loadingToken}
          />
        </div>
      </TopBar>

      <div className="body-shell">
        <SideNav />

        <main className="content-panel">
          <section className="control-panel">
            <h2>Organization Controls</h2>
            {loadingOrgs ? <p>Loading organizations...</p> : null}

            <OrgSelector
              orgs={orgs}
              selectedOrg={selectedOrg}
              onOrgChange={handleOrgChange}
              actions={orgActions}
              activeAction={activeAction}
              detailControl={detailControl}
              onDetailItemChange={(value) =>
                setDetailControl((previous) => ({ ...previous, selectedItem: value }))
              }
              onLoadResourceDetails={handleLoadResourceDetails}
            />
          </section>

          <section className="json-panel">
            <h2>API Response</h2>
            {requestUrl ? (
              <p className="request-url">
                <strong>GCP Request URL:</strong> {requestUrl}
              </p>
            ) : null}
            <JsonViewer data={resultJson} />
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
