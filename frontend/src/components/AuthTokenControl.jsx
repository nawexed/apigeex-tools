import { useEffect, useState } from "react";
import { saveToken } from "../utils/tokenStore";

function AuthTokenControl({ token, onTokenSaved, onFetchToken, loadingToken }) {
  const [draftToken, setDraftToken] = useState(token || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraftToken(token || "");
  }, [token]);

  const handleSave = () => {
    saveToken(draftToken);
    onTokenSaved(draftToken);
  };

  const handleCopyToken = async () => {
    if (!draftToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(draftToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="auth-control">
      <div className="token-input-wrap">
        <input
          type="password"
          value={draftToken}
          placeholder="Paste GCP access token"
          onChange={(event) => setDraftToken(event.target.value)}
        />
        <button
          className="token-copy-btn"
          type="button"
          onClick={handleCopyToken}
          title={copied ? "Copied" : "Copy auth token to clipboard"}
          aria-label="Copy auth token to clipboard"
          disabled={!draftToken}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 3h9a2 2 0 0 1 2 2v11h-2V5H9V3zm-4 4h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm0 2v11h9V9H5z" />
          </svg>
        </button>
      </div>
      <button className="btn" onClick={handleSave}>Auth: Save Token</button>
      <button className="btn" onClick={onFetchToken} disabled={loadingToken}>
        {loadingToken ? "Getting token..." : "Get Token (gcloud)"}
      </button>
    </div>
  );
}

export default AuthTokenControl;
