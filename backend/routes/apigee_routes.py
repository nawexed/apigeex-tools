import json
import subprocess
from pathlib import Path

from flask import Blueprint, jsonify, request

from services.apigee_client import ApigeeClient

apigee_bp = Blueprint("apigee", __name__, url_prefix="/api")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
TOKEN_PATH = DATA_DIR / "access_token.txt"
CONFIG_PATH = DATA_DIR / "config.json"
DEFAULT_ORGS = ["apigeex-shared-dev"]


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _get_saved_token() -> str | None:
    if not TOKEN_PATH.exists():
        return None

    token = TOKEN_PATH.read_text(encoding="utf-8").strip()
    return token or None


def _save_token(token: str) -> None:
    _ensure_data_dir()
    TOKEN_PATH.write_text(token.strip(), encoding="utf-8")


def _load_orgs_from_config() -> list[str]:
    _ensure_data_dir()

    if not CONFIG_PATH.exists():
        CONFIG_PATH.write_text(
            json.dumps({"organizations": DEFAULT_ORGS}, indent=2),
            encoding="utf-8",
        )
        return DEFAULT_ORGS

    try:
        payload = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return DEFAULT_ORGS

    organizations = payload.get("organizations")
    if not isinstance(organizations, list):
        return DEFAULT_ORGS

    return [org for org in organizations if isinstance(org, str) and org.strip()]


def _extract_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return _get_saved_token()

    token = auth_header.removeprefix("Bearer ").strip()
    return token or _get_saved_token()


@apigee_bp.post("/token/refresh")
def refresh_token_from_gcloud():
    try:
        completed = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            check=False,
            timeout=30,
        )
    except FileNotFoundError:
        return jsonify({"error": "gcloud CLI is not installed or not in PATH."}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timed out while requesting access token from gcloud."}), 504

    if completed.returncode != 0:
        details = completed.stderr.strip() or completed.stdout.strip() or "Unknown gcloud error"
        return jsonify({"error": "Failed to get token from gcloud.", "details": details}), 500

    access_token = completed.stdout.strip()
    if not access_token:
        return jsonify({"error": "gcloud returned an empty access token."}), 500

    _save_token(access_token)
    return jsonify({"accessToken": access_token, "savedTo": "data/access_token.txt"})


@apigee_bp.get("/token")
def get_saved_token():
    token = _get_saved_token()
    if not token:
        return jsonify({"error": "No saved token found in data/access_token.txt."}), 404
    return jsonify({"accessToken": token})


@apigee_bp.get("/config/orgs")
def get_orgs_from_config():
    organizations = _load_orgs_from_config()
    return jsonify({"organizations": organizations})


@apigee_bp.get("/orgs")
def list_orgs():
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.list_organizations()

    if not response.ok:
        return jsonify({
            "error": "Failed to list organizations",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>")
def get_org(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_organization(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/project-mapping")
def get_org_project_mapping(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_project_mapping(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get project mapping for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/instances")
def get_org_instances(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.list_instances(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get instances for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/instances/<instance_name>")
def get_org_instance_details(org_name: str, instance_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_instance(org_name, instance_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get instance '{instance_name}' for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/apis")
def get_org_apis(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.list_apis(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get apis for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/apis/<api_name>")
def get_org_api_details(org_name: str, api_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_api(org_name, api_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get api '{api_name}' for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/spaces")
def get_org_spaces(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.list_spaces(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get spaces for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/spaces/<space_name>")
def get_org_space_details(org_name: str, space_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_space(org_name, space_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get space '{space_name}' for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/environments")
def get_org_environments(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.list_environments(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get environments for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/environments/<env_name>")
def get_org_environment_details(org_name: str, env_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_environment(org_name, env_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get environment '{env_name}' for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/developers")
def get_org_developers(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.list_developers(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get developers for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/developers/<developer_id>")
def get_org_developer_details(org_name: str, developer_id: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_developer(org_name, developer_id)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get developer '{developer_id}' for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/apps")
def get_org_apps(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.list_apps(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get apps for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/apps/<app_name>")
def get_org_app_details(org_name: str, app_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_app(org_name, app_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get app '{app_name}' for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/sharedflows")
def get_org_sharedflows(org_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.list_sharedflows(org_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get sharedflows for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)


@apigee_bp.get("/orgs/<org_name>/sharedflows/<sharedflow_name>")
def get_org_sharedflow_details(org_name: str, sharedflow_name: str):
    token = _extract_token()
    if not token:
        return jsonify({"error": "Missing bearer token"}), 401

    client = ApigeeClient(token)
    response = client.get_sharedflow(org_name, sharedflow_name)

    if not response.ok:
        return jsonify({
            "error": f"Failed to get sharedflow '{sharedflow_name}' for organization '{org_name}'",
            "status": response.status_code,
            "details": response.text,
        }), response.status_code

    try:
        payload = response.json()
    except ValueError:
        return jsonify({"error": "Invalid JSON response from Apigee"}), 502

    return jsonify(payload)
