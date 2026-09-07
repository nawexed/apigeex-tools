const NAV_ITEMS = [
  { id: "organizations", label: "Organizations" },
  { id: "operations", label: "Operations" },
  { id: "settings", label: "Settings", disabled: true },
];

function SideNav({ activePage = "organizations", onNavigate }) {
  return (
    <aside className="side-nav">
      <div>
        <h3>Navigation</h3>
        <ul>
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            const isDisabled = Boolean(item.disabled);

            return (
              <li key={item.id} className={isActive ? "active" : undefined}>
                <button
                  type="button"
                  className="side-nav-item"
                  disabled={isDisabled}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    if (!isDisabled && onNavigate) {
                      onNavigate(item.id);
                    }
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <a
        className="side-nav-doc-link"
        href="https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest"
        target="_blank"
        rel="noreferrer"
      >
        Apigee APIs
      </a>
    </aside>
  );
}

export default SideNav;
