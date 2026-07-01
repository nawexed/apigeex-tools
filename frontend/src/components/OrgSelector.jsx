function OrgSelector({
  orgs,
  selectedOrg,
  onOrgChange,
  actions,
  activeAction,
  detailControl,
  onDetailItemChange,
  onLoadResourceDetails,
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

          {detailControl.visible && detailControl.resourceId === action.id ? (
            <div className="resource-details-control">
              <label htmlFor={`${action.id}Select`}>{detailControl.detailLabel}</label>
              <select
                id={`${action.id}Select`}
                value={detailControl.selectedItem}
                onChange={(event) => onDetailItemChange(event.target.value)}
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
                disabled={detailControl.loading || !detailControl.selectedItem}
              >
                {detailControl.loading
                  ? `Loading ${detailControl.detailLabel.toLowerCase()} details...`
                  : detailControl.detailButtonLabel}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default OrgSelector;
