import logging
import requests
from flask import has_request_context, request


logger = logging.getLogger(__name__)


class ApigeeClient:
    """Simple Apigee API client that forwards bearer auth."""

    GLOBAL_BASE_URL = "https://apigee.googleapis.com/v1"

    @staticmethod
    def _resolve_base_url(endpoint_mode: str, region: str) -> str:
        if endpoint_mode == "regional" and region:
            return f"https://{region}-apigee.googleapis.com/v1"
        return ApigeeClient.GLOBAL_BASE_URL

    def __init__(
        self,
        access_token: str,
        endpoint_mode: str | None = None,
        region: str | None = None,
    ):
        self.access_token = access_token
        resolved_mode = (endpoint_mode or "").strip().lower()
        resolved_region = (region or "").strip()

        if not resolved_mode and has_request_context():
            resolved_mode = request.headers.get("X-Apigee-Endpoint-Mode", "global").strip().lower()
        if not resolved_region and has_request_context():
            resolved_region = request.headers.get("X-Apigee-Region", "").strip()

        if resolved_mode not in {"global", "regional"}:
            resolved_mode = "global"

        self.base_url = self._resolve_base_url(resolved_mode, resolved_region)

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
        }

    def _get(self, method_name: str, url: str) -> requests.Response:
        logger.info("Apigee request URL [%s]: %s", method_name, url)
        return requests.get(url, headers=self._headers(), timeout=30)

    def list_organizations(self) -> requests.Response:
        url = f"{self.base_url}/organizations"
        return self._get("list_organizations", url)

    def get_organization(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}"
        return self._get("get_organization", url)

    def get_project_mapping(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}:getProjectMapping"
        return self._get("get_project_mapping", url)

    def list_instances(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/instances"
        return self._get("list_instances", url)

    def get_instance(self, org_name: str, instance_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/instances/{instance_name}"
        return self._get("get_instance", url)

    def list_apis(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/apis"
        return self._get("list_apis", url)

    def get_api(self, org_name: str, api_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/apis/{api_name}"
        return self._get("get_api", url)

    def list_api_deployments(self, org_name: str, api_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/apis/{api_name}/deployments"
        return self._get("list_api_deployments", url)

    def list_api_products(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/apiproducts"
        return self._get("list_api_products", url)

    def get_api_product(self, org_name: str, product_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/apiproducts/{product_name}"
        return self._get("get_api_product", url)

    def list_spaces(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/spaces"
        return self._get("list_spaces", url)

    def get_space(self, org_name: str, space_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/spaces/{space_name}"
        return self._get("get_space", url)

    def list_environments(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/environments"
        return self._get("list_environments", url)

    def get_environment(self, org_name: str, env_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/environments/{env_name}"
        return self._get("get_environment", url)

    def list_developers(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/developers"
        return self._get("list_developers", url)

    def get_developer(self, org_name: str, developer_id: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/developers/{developer_id}"
        return self._get("get_developer", url)

    def list_apps(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/apps"
        return self._get("list_apps", url)

    def get_app(self, org_name: str, app_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/apps/{app_name}"
        return self._get("get_app", url)

    def list_sharedflows(self, org_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/sharedflows"
        return self._get("list_sharedflows", url)

    def get_sharedflow(self, org_name: str, sharedflow_name: str) -> requests.Response:
        url = f"{self.base_url}/organizations/{org_name}/sharedflows/{sharedflow_name}"
        return self._get("get_sharedflow", url)
