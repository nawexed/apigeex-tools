function SideNav() {
  return (
    <aside className="side-nav">
      <div>
        <h3>Navigation</h3>
        <ul>
          <li className="active">Organizations</li>
          <li>Settings</li>
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
