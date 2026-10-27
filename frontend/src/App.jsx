import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildGcpRequestUrl,
  fetchAndSaveTokenFromBackend,
  fetchHostsReport,
  fetchOrganizationApiDetails,
  runLoadBalancerForOrg,
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
  fetchOrganizationKeyValueMaps,
  fetchOrganizationEnvironmentDetails,
  fetchOrganizationEnvGroups,
  fetchOrganizationDebugMask,
  fetchOrganizationAppGroups,
  fetchOrganizationHostQueries,
  fetchOrganizationHostSecurityReports,
  fetchOrganizationHostStats,
  fetchOrganizationEnvironments,
  fetchOrganizationTargetServers,
  fetchOrganizationInstanceDetails,
  fetchOrganizationInstances,
  fetchOrganizationOperationDetails,
  fetchOrganizationOperations,
  fetchOrganizationReportDetails,
  fetchOrganizationReports,
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
  operations: ["operations"],
  reports: ["qualifier", "reports"],
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
  bulkLoading: false,
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

function normalizeResourceOption(item) {
  if (typeof item === "string") {
    const value = normalizeResourceName(item);
    return value ? { value, label: value } : null;
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const value = normalizeResourceName(item);
  if (!value) {
    return null;
  }

  const label =
    typeof item.displayName === "string" && item.displayName.trim().length > 0
      ? item.displayName.trim()
      : value;

  return { value, label };
}

function extractResourceNames(payload, resourceId) {
  const fromArray = (arr) => {
    const options = arr.map(normalizeResourceOption).filter(Boolean);
    const seen = new Set();
    const unique = [];
    for (const option of options) {
      if (seen.has(option.value)) {
        continue;
      }
      seen.add(option.value);
      unique.push(option);
    }
    return unique;
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
    case "keyValueMaps":
      return `/organizations/${encodedOrg}/keyvaluemaps`;
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
    case "operations":
      return `/organizations/${encodedOrg}/operations${encodedName ? `/${encodedName}` : ""}`;
    case "reports":
      return `/organizations/${encodedOrg}/reports${encodedName ? `/${encodedName}` : ""}`;
    case "apis":
      return `/organizations/${encodedOrg}/apis${encodedName ? `/${encodedName}` : ""}`;
    case "apiProducts":
      return `/organizations/${encodedOrg}/apiproducts${encodedName ? `/${encodedName}` : ""}`;
    case "spaces":
      return `/organizations/${encodedOrg}/spaces${encodedName ? `/${encodedName}` : ""}`;
    case "environments":
      return `/organizations/${encodedOrg}/environments${encodedName ? `/${encodedName}` : ""}`;
    case "targetServers":
      return `/organizations/${encodedOrg}/environments/${encodedName}/targetservers`;
    case "debugMask":
      return `/organizations/${encodedOrg}/environments/${encodedName}/debugmask`;
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
  const [endpointMode, setEndpointMode] = useState("regional");
  const [region, setRegion] = useState("us");
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [resultJson, setResultJson] = useState({ message: "Loading organizations from config..." });
  const [hostsReportFilter, setHostsReportFilter] = useState("");
  const [requestPath, setRequestPath] = useState("");
  const [requestUrl, setRequestUrl] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [detailControl, setDetailControl] = useState(EMPTY_DETAIL_CONTROL);
  const [loadingToken, setLoadingToken] = useState(false);
  const [activePage, setActivePage] = useState("organizations");
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
    setHostsReportFilter("");
    setDetailControl(EMPTY_DETAIL_CONTROL);
    requestPathRef.current = "";
    setRequestPath("");
    setRequestUrl("");
  };

  const handlePageChange = (pageId) => {
    if (pageId === activePage) {
      return;
    }

    setActivePage(pageId);
    setHostsReportFilter("");
    setActiveAction("");
    setDetailControl(EMPTY_DETAIL_CONTROL);
    requestPathRef.current = "";
    setRequestPath("");
    setRequestUrl("");
    setResultJson({
      message:
        pageId === "operations"
          ? "Select an organization and load operations."
          : pageId === "reports"
            ? "Select an organization and load reports."
            : "Select an organization and load a resource.",
    });
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
        selectedItem: names[0]?.value || "",
        loading: false,
        bulkLoading: false,
      });
      setResultJson(payload);
    } catch (error) {
      setResultJson(buildErrorResult(error));
      setDetailControl(EMPTY_DETAIL_CONTROL);
    } finally {
      setActiveAction("");
    }
  };

  const handleLoadBalancer = async () => {
    if (!tokenReady || !selectedOrg) {
      setResultJson({ error: "Select an organization and ensure token is saved." });
      return;
    }

    setActiveAction("loadBalancer");
    setRequestPath("");
    setRequestUrl("");
    setResultJson({ message: `Running load balancer export for ${selectedOrg}...` });

    try {
      const payload = await runLoadBalancerForOrg(token, selectedOrg);
      setResultJson(payload);
    } catch (error) {
      setResultJson(buildErrorResult(error));
    } finally {
      setActiveAction("");
    }
  };

  const handleHostsReport = async () => {
    if (!tokenReady || !selectedOrg) {
      setResultJson({ error: "Select an organization and ensure token is saved." });
      return;
    }

    setHostsReportFilter("");
    setActiveAction("hostsReport");
    setRequestPath("");
    setRequestUrl("");
    setResultJson({ message: `Generating hosts report for ${selectedOrg}...` });

    try {
      const payload = await fetchHostsReport(token, selectedOrg);
      setResultJson(payload);
    } catch (error) {
      setResultJson(buildErrorResult(error));
    } finally {
      setActiveAction("");
    }
  };

  const handleLoadResourceDetails = async () => {
    if (!tokenReady || !selectedOrg || !detailControl.selectedItem) {
      setResultJson({ error: "Select an organization and a resource name first." });
      return;
    }

    const action = allActions.find((item) => item.id === detailControl.resourceId);
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
      setDetailControl((previous) => ({ ...previous, loading: false, bulkLoading: false }));
    }
  };

  const handleLoadTargetServers = async () => {
    if (!tokenReady || !selectedOrg || !detailControl.selectedItem) {
      setResultJson({ error: "Select an organization and an environment first." });
      return;
    }

    setPreviewForAction("targetServers", detailControl.selectedItem);
    setDetailControl((previous) => ({ ...previous, targetServersLoading: true }));
    try {
      const payload = await fetchOrganizationTargetServers(
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
      setDetailControl((previous) => ({ ...previous, targetServersLoading: false }));
    }
  };

  const handleLoadDebugMask = async () => {
    if (!tokenReady || !selectedOrg || !detailControl.selectedItem) {
      setResultJson({ error: "Select an organization and an environment first." });
      return;
    }

    setPreviewForAction("debugMask", detailControl.selectedItem);
    setDetailControl((previous) => ({ ...previous, debugMaskLoading: true }));
    try {
      const payload = await fetchOrganizationDebugMask(
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
      setDetailControl((previous) => ({ ...previous, debugMaskLoading: false }));
    }
  };

  const handleLoadAllApiDetails = async () => {
    if (!tokenReady || !selectedOrg) {
      setResultJson({ error: "Select an organization and ensure token is saved." });
      return;
    }

    if (detailControl.resourceId !== "apis" || !detailControl.items.length) {
      setResultJson({ error: "Load APIs first so there is a list to fetch details for." });
      return;
    }

    const apiNames = detailControl.items.map((item) =>
      typeof item === "string" ? item : item.value
    );
    const succeeded = [];
    const failed = [];

    setDetailControl((previous) => ({ ...previous, loading: true, bulkLoading: true }));
    setResultJson({
      message: `Fetching details for ${apiNames.length} APIs and updating org JSON...`,
      total: apiNames.length,
      completed: 0,
      succeeded,
      failed,
    });

    for (let index = 0; index < apiNames.length; index += 1) {
      const apiName = apiNames[index];
      setPreviewForAction("apis", apiName);
      setDetailControl((previous) => ({
        ...previous,
        selectedItem: apiName,
        loading: true,
        bulkLoading: true,
      }));
      setResultJson({
        message: `Fetching API details (${index + 1}/${apiNames.length}): ${apiName}`,
        total: apiNames.length,
        completed: index,
        current: apiName,
        succeeded: [...succeeded],
        failed: [...failed],
      });

      try {
        await fetchOrganizationApiDetails(token, selectedOrg, apiName, endpointConfig);
        succeeded.push(apiName);
      } catch (error) {
        failed.push({
          api: apiName,
          error: error?.message || String(error),
        });
      }
    }

    updateDisplayedGcpRequestUrl();
    setResultJson({
      message: `Finished fetching API details. Updated data/orgs/${selectedOrg}/${selectedOrg}.json`,
      total: apiNames.length,
      completed: apiNames.length,
      succeeded,
      failed,
    });
    setDetailControl((previous) => ({ ...previous, loading: false, bulkLoading: false }));
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
      id: "keyValueMaps",
      label: "Load KeyValue Map",
      loadingLabel: "Loading key value map...",
      onClick: () => loadOrgResource("keyValueMaps", fetchOrganizationKeyValueMaps),
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

  const operationsActions = [
    {
      id: "operations",
      label: "Load Operations",
      loadingLabel: "Loading operations...",
      detailLabel: "Operation",
      detailButtonLabel: "Load Operation Details",
      listFetcher: fetchOrganizationOperations,
      detailFetcher: fetchOrganizationOperationDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "operations",
          listFetcher: fetchOrganizationOperations,
          detailLabel: "Operation",
          detailButtonLabel: "Load Operation Details",
        }),
    },
  ];

  const reportsActions = [
    {
      id: "reports",
      label: "Load Reports",
      loadingLabel: "Loading reports...",
      detailLabel: "Report",
      detailButtonLabel: "Load Report Details",
      listFetcher: fetchOrganizationReports,
      detailFetcher: fetchOrganizationReportDetails,
      onClick: () =>
        loadOrgResourceList({
          id: "reports",
          listFetcher: fetchOrganizationReports,
          detailLabel: "Report",
          detailButtonLabel: "Load Report Details",
        }),
    },
  ];

  const hostsActions = [
    {
      id: "loadBalancer",
      label: "Load Balancer",
      loadingLabel: "Running load balancer...",
      onClick: handleLoadBalancer,
    },
    {
      id: "hostsReport",
      label: "Hosts Report",
      loadingLabel: "Generating hosts report...",
      onClick: handleHostsReport,
    },
  ];

  const pageActions =
    activePage === "operations"
      ? operationsActions
      : activePage === "reports"
        ? reportsActions
        : activePage === "hosts"
          ? hostsActions
          : orgActions;
  const pageTitle =
    activePage === "operations"
      ? "Operations"
      : activePage === "reports"
        ? "Reports"
        : activePage === "hosts"
          ? "Hosts"
          : "Organization Controls";
  const allActions = [...orgActions, ...operationsActions, ...reportsActions];
  const normalizedHostsReportFilter = hostsReportFilter.trim().toLowerCase();
  const hostsReportRows = Array.isArray(resultJson?.rows) ? resultJson.rows : [];
  const filteredHostsReportRows = hostsReportRows.filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? "").toLowerCase().includes(normalizedHostsReportFilter)
    )
  );

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
        <SideNav activePage={activePage} onNavigate={handlePageChange} />

        <main className="content-panel">
          <section className="control-panel">
            <h2>{pageTitle}</h2>
            {loadingOrgs ? <p>Loading organizations...</p> : null}

            <OrgSelector
              orgs={orgs}
              selectedOrg={selectedOrg}
              onOrgChange={handleOrgChange}
              actions={pageActions}
              activeAction={activeAction}
              detailControl={detailControl}
              onDetailItemChange={(value) =>
                setDetailControl((previous) => ({ ...previous, selectedItem: value }))
              }
              onLoadResourceDetails={handleLoadResourceDetails}
              onLoadTargetServers={handleLoadTargetServers}
              onLoadDebugMask={handleLoadDebugMask}
              onLoadAllApiDetails={activePage === "organizations" ? handleLoadAllApiDetails : undefined}
            />
          </section>

          <section className="json-panel">
            <h2>API Response</h2>
            {requestUrl ? (
              <p className="request-url">
                <strong>GCP Request URL:</strong> {requestUrl}
              </p>
            ) : null}

            {resultJson?.type === "hostsReport" && Array.isArray(resultJson.rows) ? (
              <div className="hosts-report-content">
                <div className="hosts-report-toolbar">
                  <label className="hosts-report-search">
                    <span>Search rows</span>
                    <input
                      type="search"
                      value={hostsReportFilter}
                      onChange={(event) => setHostsReportFilter(event.target.value)}
                      placeholder="Hostname, region, service..."
                    />
                  </label>
                  <span className="hosts-report-count" aria-live="polite">
                    Showing {filteredHostsReportRows.length} of {hostsReportRows.length} rows
                  </span>
                </div>

                <div className="hosts-report-table-wrap">
                  <table className="hosts-report-table">
                    <thead>
                      <tr>
                        <th>Env Group Hostname</th>
                        <th>Routing Host</th>
                        <th>Region</th>
                        <th>Routing Rule Name</th>
                        <th>Path Prefix Match</th>
                        <th>Path Prefix Rewrite</th>
                        <th>Service</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHostsReportRows.length > 0 ? (
                        filteredHostsReportRows.map((row, index) => (
                          <tr key={`${row.envGroupHostname || row.routingHost || "row"}-${index}`}>
                            <td>{row.envGroupHostname || ""}</td>
                            <td>{row.routingHost || ""}</td>
                            <td>{row.region || ""}</td>
                            <td>{row.name || ""}</td>
                            <td>{row.pathPrefixMatch || ""}</td>
                            <td>{row.pathPrefixRewrite || ""}</td>
                            <td>{row.service || ""}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="hosts-report-empty" colSpan="7">
                            No matching rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <JsonViewer data={resultJson} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
