function EndpointModeControl({ endpointMode, region, onModeChange, onRegionChange }) {
  return (
    <div className="endpoint-control">
      <label htmlFor="endpointMode">Endpoint</label>
      <select
        id="endpointMode"
        value={endpointMode}
        onChange={(event) => onModeChange(event.target.value)}
      >
        <option value="global">Global</option>
        <option value="regional">Regional</option>
      </select>

      <input
        type="text"
        value={region}
        placeholder="Region (e.g. us-east1)"
        onChange={(event) => onRegionChange(event.target.value)}
        disabled={endpointMode !== "regional"}
      />
    </div>
  );
}

export default EndpointModeControl;
