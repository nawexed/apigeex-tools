import { useEffect, useMemo, useState } from "react";
import {
  buildGcpRequestUrl,
  fetchAndSaveTokenFromBackend,
  fetchOrganizationApiDetails,
  fetchOrganizationApis,
  fetchOrganizationAppDetails,
  fetchOrganizationApps,
  fetchOrganizationDeveloperDetails,
  fetchOrganizationDevelopers,
  fetchOrganizationDetails,
  fetchOrganizationEnvironmentDetails,
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

function App() {
  const [token, setToken] = useState(getStoredToken());
  const [endpointMode, setEndpointMode] = useState("global");
  const [region, setRegion] = useState("us-east1");
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [resultJson, setResultJson] = useState({ message: "Loading organizations from config..." });
  const [requestPath, setRequestPath] = useState("");
  const [requestUrl, setRequestUrl] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [detailControl, setDetailControl] = useState(EMPTY_DETAIL_CONTROL);
  const [loadingToken, setLoadingToken] = useState(false);

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
      setResultJson({ error: error.message });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleOrgChange = (orgName) => {
    setSelectedOrg(orgName);
    setDetailControl(EMPTY_DETAIL_CONTROL);
  };

  const updateDisplayedGcpRequestUrl = () => {
    const latestPath = getLastGcpRequestPath();
    setRequestPath(latestPath);
    setRequestUrl(buildGcpRequestUrl(latestPath, endpointConfig));
  };

  useEffect(() => {
    handleLoadOrganizations();
  }, []);

  useEffect(() => {
    if (!requestPath) {
      setRequestUrl("");
      return;
    }
    setRequestUrl(buildGcpRequestUrl(requestPath, endpointConfig));
  }, [requestPath, endpointMode, region]);

  const handleFetchTokenFromBackend = async () => {
    setLoadingToken(true);
    try {
      const backendToken = await fetchAndSaveTokenFromBackend();
      updateDisplayedGcpRequestUrl();
      saveToken(backendToken);
      setToken(backendToken);
      setResultJson({ message: "Token retrieved from backend and saved.", tokenSource: "gcloud" });
    } catch (error) {
      setResultJson({ error: error.message });
    } finally {
      setLoadingToken(false);
    }
  };

  const loadOrgResource = async (actionId, fetcher) => {
    if (!tokenReady || !selectedOrg) {
      setResultJson({ error: "Select an organization and ensure token is saved." });
      return;
    }

    setActiveAction(actionId);
    try {
      const payload = await fetcher(token, selectedOrg, endpointConfig);
      updateDisplayedGcpRequestUrl();
      setResultJson(payload);
      setDetailControl(EMPTY_DETAIL_CONTROL);
    } catch (error) {
      setResultJson({ error: error.message });
    } finally {
      setActiveAction("");
    }
  };

  const loadOrgResourceList = async (action) => {
    if (!tokenReady || !selectedOrg) {
      setResultJson({ error: "Select an organization and ensure token is saved." });
      return;
    }

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
      setResultJson({ error: error.message });
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
      setResultJson({ error: error.message });
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
