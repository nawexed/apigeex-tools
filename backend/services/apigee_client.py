import requests


class ApigeeClient:
    """Simple Apigee API client that forwards bearer auth."""

    BASE_URL = "https://apigee.googleapis.com/v1"

    def __init__(self, access_token: str):
        self.access_token = access_token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
        }

    def list_organizations(self) -> requests.Response:
        url = f"{self.BASE_URL}/organizations"
        return requests.get(url, headers=self._headers(), timeout=30)

    def get_organization(self, org_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}"
        return requests.get(url, headers=self._headers(), timeout=30)

    def list_instances(self, org_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}/instances"
        return requests.get(url, headers=self._headers(), timeout=30)

    def list_apis(self, org_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}/apis"
        return requests.get(url, headers=self._headers(), timeout=30)

    def list_spaces(self, org_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}/spaces"
        return requests.get(url, headers=self._headers(), timeout=30)

    def get_space(self, org_name: str, space_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}/spaces/{space_name}"
        return requests.get(url, headers=self._headers(), timeout=30)

    def list_environments(self, org_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}/environments"
        return requests.get(url, headers=self._headers(), timeout=30)

    def list_developers(self, org_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}/developers"
        return requests.get(url, headers=self._headers(), timeout=30)

    def list_apps(self, org_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}/apps"
        return requests.get(url, headers=self._headers(), timeout=30)

    def list_sharedflows(self, org_name: str) -> requests.Response:
        url = f"{self.BASE_URL}/organizations/{org_name}/sharedflows"
        return requests.get(url, headers=self._headers(), timeout=30)
