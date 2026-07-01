function OrgSelector({
  orgs,
  selectedOrg,
  onOrgChange,
  actions,
  activeAction,
  spaces,
  selectedSpace,
  onSpaceChange,
  showSpaceDetailsControl,
  onLoadSpaceDetails,
  loadingSpaceDetails,
}) {
  return (
    <div className="org-selector">
      <label htmlFor="orgSelect">Organization</label>
      <select
        id="orgSelect"
        value={selectedOrg}
        onChange={(event) => onOrgChange(event.target.value)}
      >
        <option value="">Select an organization</option>
        {orgs.map((org) => (
          <option key={org} value={org}>
            {org}
          </option>
        ))}
      </select>

      {actions.map((action) => (
        <div key={action.id}>
          <button
            className="btn"
            onClick={action.onClick}
            disabled={activeAction === action.id || !selectedOrg}
          >
            {activeAction === action.id ? action.loadingLabel : action.label}
          </button>

          {action.id === "spaces" && showSpaceDetailsControl ? (
            <div className="space-details-control">
              <label htmlFor="spaceSelect">Space</label>
              <select
                id="spaceSelect"
                value={selectedSpace}
                onChange={(event) => onSpaceChange(event.target.value)}
              >
                <option value="">Select a space</option>
                {spaces.map((space) => (
                  <option key={space} value={space}>
                    {space}
                  </option>
                ))}
              </select>

              <button
                className="btn"
                onClick={onLoadSpaceDetails}
                disabled={loadingSpaceDetails || !selectedSpace}
              >
                {loadingSpaceDetails ? "Loading space details..." : "Load Space Details"}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default OrgSelector;
