function OrgSelector({
  orgs,
  selectedOrg,
  onOrgChange,
  actions,
  activeAction,
  detailControl,
  onDetailItemChange,
  onLoadResourceDetails,
  onLoadAllApiDetails,
}) {
  const detailsBusy = detailControl.loading || detailControl.bulkLoading;

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
            disabled={activeAction === action.id || !selectedOrg || detailsBusy}
          >
            {activeAction === action.id ? action.loadingLabel : action.label}
          </button>

          {detailControl.visible && detailControl.resourceId === action.id ? (
            <div className="resource-details-control">
              <label htmlFor={`${action.id}Select`}>{detailControl.detailLabel}</label>
              <select
                id={`${action.id}Select`}
                value={detailControl.selectedItem}
                onChange={(event) => onDetailItemChange(event.target.value)}
                disabled={detailsBusy}
              >
                <option value="">Select {detailControl.detailLabel.toLowerCase()}</option>
                {detailControl.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <button
                className="btn"
                onClick={onLoadResourceDetails}
                disabled={detailsBusy || !detailControl.selectedItem}
              >
                {detailControl.loading && !detailControl.bulkLoading
                  ? `Loading ${detailControl.detailLabel.toLowerCase()} details...`
                  : detailControl.detailButtonLabel}
              </button>

              {action.id === "apis" && onLoadAllApiDetails ? (
                <button
                  className="btn"
                  onClick={onLoadAllApiDetails}
                  disabled={detailsBusy || detailControl.items.length === 0}
                >
                  {detailControl.bulkLoading
                    ? `Fetching all API details (${detailControl.selectedItem || "..."})...`
                    : "Fetch All API Details"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default OrgSelector;
