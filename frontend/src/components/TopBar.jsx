function TopBar({ children }) {
  return (
    <header className="top-bar">
      <div>
        <h1>Apigee Organization Explorer</h1>
        <p>GCP Apigee org data viewer</p>
      </div>
      <div>{children}</div>
    </header>
  );
}

export default TopBar;
