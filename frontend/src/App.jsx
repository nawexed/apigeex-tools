import { useEffect, useMemo, useState } from "react";
import {
  fetchAndSaveTokenFromBackend,
  fetchOrganizationApis,
  fetchOrganizationApps,
  fetchOrganizationDevelopers,
  fetchOrganizationDetails,
  fetchOrganizationEnvironments,
  fetchOrganizationInstances,
  fetchOrganizationSpaceDetails,
  fetchOrganizationSharedflows,
  fetchOrganizationSpaces,
  fetchOrganizations,
} from "./api/apigeeApi";
import AuthTokenControl from "./components/AuthTokenControl";
import JsonViewer from "./components/JsonViewer";
import OrgSelector from "./components/OrgSelector";
import SideNav from "./components/SideNav";
import TopBar from "./components/TopBar";
import { getStoredToken, saveToken } from "./utils/tokenStore";

function App() {
  const [token, setToken] = useState(getStoredToken());
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [resultJson, setResultJson] = useState({ message: "Loading organizations from config..." });
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState("");
  const [showSpaceDetailsControl, setShowSpaceDetailsControl] = useState(false);
  const [loadingSpaceDetails, setLoadingSpaceDetails] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);

  const tokenReady = useMemo(() => token && token.trim().length > 0, [token]);

  const handleLoadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const orgList = await fetchOrganizations(token);
      setOrgs(orgList);
      setSelectedOrg(orgList[0] || "");
      setResultJson({ organizations: orgList });
    } catch (error) {
      setResultJson({ error: error.message });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const extractSpaceNames = (payload) => {
    if (Array.isArray(payload)) {
      return payload.filter((item) => typeof item === "string" && item.trim().length > 0);
    }

    if (Array.isArray(payload.spaces)) {
      return payload.spaces
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (item && typeof item.name === "string") {
            const parts = item.name.split("/");
            return parts[parts.length - 1];
          }
          return "";
        })
        .filter((name) => name.trim().length > 0);
    }

    return [];
  };

  const handleOrgChange = (orgName) => {
    setSelectedOrg(orgName);
    setShowSpaceDetailsControl(false);
    setSpaces([]);
    setSelectedSpace("");
  };

  useEffect(() => {
    handleLoadOrganizations();
  }, []);

  const handleFetchTokenFromBackend = async () => {
    setLoadingToken(true);
    try {
      const backendToken = await fetchAndSaveTokenFromBackend();
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
      const payload = await fetcher(token, selectedOrg);
      setResultJson(payload);
    } catch (error) {
      setResultJson({ error: error.message });
    } finally {
      setActiveAction("");
    }
  };

  const handleLoadSpaces = async () => {
    if (!tokenReady || !selectedOrg) {
      setResultJson({ error: "Select an organization and ensure token is saved." });
      return;
    }

    setActiveAction("spaces");
    try {
      const payload = await fetchOrganizationSpaces(token, selectedOrg);
      const spaceNames = extractSpaceNames(payload);
      setSpaces(spaceNames);
      setSelectedSpace(spaceNames[0] || "");
      setShowSpaceDetailsControl(true);
      setResultJson(payload);
    } catch (error) {
      setResultJson({ error: error.message });
      setShowSpaceDetailsControl(false);
      setSpaces([]);
      setSelectedSpace("");
    } finally {
      setActiveAction("");
    }
  };

  const handleLoadSpaceDetails = async () => {
    if (!tokenReady || !selectedOrg || !selectedSpace) {
      setResultJson({ error: "Select an organization and a space name first." });
      return;
    }

    setLoadingSpaceDetails(true);
    try {
      const payload = await fetchOrganizationSpaceDetails(token, selectedOrg, selectedSpace);
      setResultJson(payload);
    } catch (error) {
      setResultJson({ error: error.message });
    } finally {
      setLoadingSpaceDetails(false);
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
      id: "instances",
      label: "Load Instances",
      loadingLabel: "Loading instances...",
      onClick: () => loadOrgResource("instances", fetchOrganizationInstances),
    },
    {
      id: "apis",
      label: "Load APIs",
      loadingLabel: "Loading APIs...",
      onClick: () => loadOrgResource("apis", fetchOrganizationApis),
    },
    {
      id: "spaces",
      label: "Load Spaces",
      loadingLabel: "Loading spaces...",
      onClick: handleLoadSpaces,
    },
    {
      id: "environments",
      label: "Load Environments",
      loadingLabel: "Loading environments...",
      onClick: () => loadOrgResource("environments", fetchOrganizationEnvironments),
    },
    {
      id: "developers",
      label: "Load Developers",
      loadingLabel: "Loading developers...",
      onClick: () => loadOrgResource("developers", fetchOrganizationDevelopers),
    },
    {
      id: "apps",
      label: "Load Apps",
      loadingLabel: "Loading apps...",
      onClick: () => loadOrgResource("apps", fetchOrganizationApps),
    },
    {
      id: "sharedflows",
      label: "Load Shared Flows",
      loadingLabel: "Loading shared flows...",
      onClick: () => loadOrgResource("sharedflows", fetchOrganizationSharedflows),
    },
  ];

  return (
    <div className="app-shell">
      <TopBar>
        <AuthTokenControl
          token={token}
          onTokenSaved={setToken}
          onFetchToken={handleFetchTokenFromBackend}
          loadingToken={loadingToken}
        />
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
              spaces={spaces}
              selectedSpace={selectedSpace}
              onSpaceChange={setSelectedSpace}
              showSpaceDetailsControl={showSpaceDetailsControl}
              onLoadSpaceDetails={handleLoadSpaceDetails}
              loadingSpaceDetails={loadingSpaceDetails}
            />
          </section>

          <section className="json-panel">
            <h2>API Response</h2>
            <JsonViewer data={resultJson} />
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
