import { useEffect, useState } from "react";
import { saveToken } from "../utils/tokenStore";

function AuthTokenControl({ token, onTokenSaved, onFetchToken, loadingToken }) {
  const [draftToken, setDraftToken] = useState(token || "");

  useEffect(() => {
    setDraftToken(token || "");
  }, [token]);

  const handleSave = () => {
    saveToken(draftToken);
    onTokenSaved(draftToken);
  };

  return (
    <div className="auth-control">
      <input
        type="password"
        value={draftToken}
        placeholder="Paste GCP access token"
        onChange={(event) => setDraftToken(event.target.value)}
      />
      <button className="btn" onClick={handleSave}>Auth: Save Token</button>
      <button className="btn" onClick={onFetchToken} disabled={loadingToken}>
        {loadingToken ? "Getting token..." : "Get Token (gcloud)"}
      </button>
    </div>
  );
}

export default AuthTokenControl;
