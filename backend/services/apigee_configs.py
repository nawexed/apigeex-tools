import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class ApigeeConfigs:
    """Persists downloaded Apigee organization configuration payloads."""

    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    ORGS_ROOT = PROJECT_ROOT / "data" / "orgs"

    @classmethod
    def _org_dir(cls, org_name: str) -> Path:
        normalized = org_name.strip()
        return cls.ORGS_ROOT / normalized

    @classmethod
    def org_config_path(cls, org_name: str) -> Path:
        normalized = org_name.strip()
        return cls._org_dir(normalized) / f"{normalized}.json"

    @classmethod
    def _load_existing_config(cls, org_name: str) -> dict[str, Any]:
        target_path = cls.org_config_path(org_name)
        if not target_path.exists():
            return {}

        try:
            payload = json.loads(target_path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            return {}

        if not isinstance(payload, dict):
            return {}

        return payload

    @classmethod
    def _base_document(cls, org_name: str) -> dict[str, Any]:
        existing = cls._load_existing_config(org_name)
        created_at = existing.get("createdAt") if isinstance(existing.get("createdAt"), str) else None

        return {
            "createdAt": created_at or datetime.now(timezone.utc).isoformat(),
            "organization": existing.get("organization", {}),
            "projectMapping": existing.get("projectMapping", {}),
            "instances": existing.get("instances", {}),
            "environments": existing.get("environments", {}),
            "apiProducts": existing.get("apiProducts", {}),
            "proxies": existing.get("proxies", {}),
            "spaces": existing.get("spaces", {}),
            "developers": existing.get("developers", {}),
            "apps": existing.get("apps", {}),
            "sharedFlows": existing.get("sharedFlows", {}),
        }

    @classmethod
    def save_organization_config(cls, org_name: str, payload: Any) -> Path:
        """Save organization payload to data/orgs/<org-name>/<org-name>.json."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        formatted_payload["organization"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_project_mapping_config(cls, org_name: str, payload: Any) -> Path:
        """Save project mapping payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        formatted_payload["projectMapping"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_instances_config(cls, org_name: str, payload: Any) -> Path:
        """Save instances payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        if isinstance(payload, dict) and isinstance(payload.get("instances"), list):
            formatted_payload["instances"] = payload["instances"]
        else:
            formatted_payload["instances"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_environments_config(cls, org_name: str, payload: Any) -> Path:
        """Save environments payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        if isinstance(payload, dict) and isinstance(payload.get("environments"), list):
            formatted_payload["environments"] = payload["environments"]
        else:
            formatted_payload["environments"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_environment_detail_config(cls, org_name: str, env_name: str, payload: Any) -> Path:
        """Update a single environment entry with full environment detail payload."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(env_name, str) or not env_name.strip():
            raise ValueError("Environment name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_environments = formatted_payload.get("environments")
        environments: list[Any]
        if isinstance(current_environments, list):
            environments = current_environments
        else:
            environments = []

        updated = False
        for index, environment in enumerate(environments):
            if isinstance(environment, str) and environment == env_name:
                environments[index] = payload
                updated = True
                break

            if isinstance(environment, dict):
                environment_identity = environment.get("name") or environment.get("environment")
                if environment_identity == env_name:
                    merged = dict(environment)
                    if isinstance(payload, dict):
                        merged.update(payload)
                    else:
                        merged["details"] = payload
                    environments[index] = merged
                    updated = True
                    break

        if not updated:
            environments.append(payload)

        formatted_payload["environments"] = environments
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_proxies_config(cls, org_name: str, payload: Any) -> Path:
        """Save proxies payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        if isinstance(payload, dict) and isinstance(payload.get("proxies"), list):
            formatted_payload["proxies"] = payload["proxies"]
        else:
            formatted_payload["proxies"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_proxy_detail_config(cls, org_name: str, api_name: str, payload: Any) -> Path:
        """Update a single proxy entry with full API detail payload."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(api_name, str) or not api_name.strip():
            raise ValueError("API name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_proxies = formatted_payload.get("proxies")
        proxies: list[Any]
        if isinstance(current_proxies, list):
            proxies = current_proxies
        else:
            proxies = []

        updated = False
        for index, proxy in enumerate(proxies):
            if isinstance(proxy, str) and proxy == api_name:
                proxies[index] = payload
                updated = True
                break

            if isinstance(proxy, dict) and proxy.get("name") == api_name:
                merged = dict(proxy)
                if isinstance(payload, dict):
                    merged.update(payload)
                else:
                    merged["details"] = payload
                proxies[index] = merged
                updated = True
                break

        if not updated:
            proxies.append(payload)

        formatted_payload["proxies"] = proxies
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_api_products_config(cls, org_name: str, payload: Any) -> Path:
        """Save API products payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        if isinstance(payload, dict) and isinstance(payload.get("apiProduct"), list):
            formatted_payload["apiProducts"] = payload["apiProduct"]
        elif isinstance(payload, dict) and isinstance(payload.get("apiProducts"), list):
            formatted_payload["apiProducts"] = payload["apiProducts"]
        else:
            formatted_payload["apiProducts"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_api_product_detail_config(cls, org_name: str, product_name: str, payload: Any) -> Path:
        """Update a single API product entry with full detail payload."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(product_name, str) or not product_name.strip():
            raise ValueError("API product name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_products = formatted_payload.get("apiProducts")
        products: list[Any]
        if isinstance(current_products, list):
            products = current_products
        else:
            products = []

        updated = False
        for index, product in enumerate(products):
            if isinstance(product, str) and product == product_name:
                products[index] = payload
                updated = True
                break

            if isinstance(product, dict):
                product_identity = product.get("name") or product.get("apiProduct")
                if product_identity == product_name:
                    merged = dict(product)
                    if isinstance(payload, dict):
                        merged.update(payload)
                    else:
                        merged["details"] = payload
                    products[index] = merged
                    updated = True
                    break

        if not updated:
            products.append(payload)

        formatted_payload["apiProducts"] = products
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_spaces_config(cls, org_name: str, payload: Any) -> Path:
        """Save spaces payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        if isinstance(payload, dict) and isinstance(payload.get("spaces"), list):
            formatted_payload["spaces"] = payload["spaces"]
        else:
            formatted_payload["spaces"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_space_detail_config(cls, org_name: str, space_name: str, payload: Any) -> Path:
        """Update a single space entry with full space detail payload."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(space_name, str) or not space_name.strip():
            raise ValueError("Space name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_spaces = formatted_payload.get("spaces")
        spaces: list[Any]
        if isinstance(current_spaces, list):
            spaces = current_spaces
        else:
            spaces = []

        updated = False
        for index, space in enumerate(spaces):
            if isinstance(space, str) and space == space_name:
                spaces[index] = payload
                updated = True
                break

            if isinstance(space, dict) and space.get("name") == space_name:
                merged = dict(space)
                if isinstance(payload, dict):
                    merged.update(payload)
                else:
                    merged["details"] = payload
                spaces[index] = merged
                updated = True
                break

        if not updated:
            spaces.append(payload)

        formatted_payload["spaces"] = spaces
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_developers_config(cls, org_name: str, payload: Any) -> Path:
        """Save developers payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        if isinstance(payload, dict) and isinstance(payload.get("developers"), list):
            formatted_payload["developers"] = payload["developers"]
        elif isinstance(payload, dict) and isinstance(payload.get("developer"), list):
            formatted_payload["developers"] = payload["developer"]
        else:
            formatted_payload["developers"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_developer_detail_config(cls, org_name: str, developer_id: str, payload: Any) -> Path:
        """Update a single developer entry with full developer detail payload."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(developer_id, str) or not developer_id.strip():
            raise ValueError("Developer id is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_developers = formatted_payload.get("developers")
        developers: list[Any]
        if isinstance(current_developers, list):
            developers = current_developers
        else:
            developers = []

        updated = False
        for index, developer in enumerate(developers):
            if isinstance(developer, str) and developer == developer_id:
                developers[index] = payload
                updated = True
                break

            if isinstance(developer, dict):
                developer_identity = (
                    developer.get("developerId")
                    or developer.get("developer_id")
                    or developer.get("email")
                    or developer.get("name")
                )
                if developer_identity == developer_id:
                    merged = dict(developer)
                    if isinstance(payload, dict):
                        merged.update(payload)
                    else:
                        merged["details"] = payload
                    developers[index] = merged
                    updated = True
                    break

        if not updated:
            developers.append(payload)

        formatted_payload["developers"] = developers
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_apps_config(cls, org_name: str, payload: Any) -> Path:
        """Save apps payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        if isinstance(payload, dict) and isinstance(payload.get("app"), list):
            formatted_payload["apps"] = payload["app"]
        elif isinstance(payload, dict) and isinstance(payload.get("apps"), list):
            formatted_payload["apps"] = payload["apps"]
        else:
            formatted_payload["apps"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_app_detail_config(cls, org_name: str, app_name: str, payload: Any) -> Path:
        """Update a single app entry with full app detail payload."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(app_name, str) or not app_name.strip():
            raise ValueError("App name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_apps = formatted_payload.get("apps")
        apps: list[Any]
        if isinstance(current_apps, list):
            apps = current_apps
        else:
            apps = []

        updated = False
        for index, app in enumerate(apps):
            if isinstance(app, str) and app == app_name:
                apps[index] = payload
                updated = True
                break

            if isinstance(app, dict):
                app_identity = app.get("name") or app.get("appId") or app.get("app_id")
                if app_identity == app_name:
                    merged = dict(app)
                    if isinstance(payload, dict):
                        merged.update(payload)
                    else:
                        merged["details"] = payload
                    apps[index] = merged
                    updated = True
                    break

        if not updated:
            apps.append(payload)

        formatted_payload["apps"] = apps
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_sharedflows_config(cls, org_name: str, payload: Any) -> Path:
        """Save shared flows payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        if isinstance(payload, dict) and isinstance(payload.get("sharedFlows"), list):
            formatted_payload["sharedFlows"] = payload["sharedFlows"]
        elif isinstance(payload, dict) and isinstance(payload.get("sharedflows"), list):
            formatted_payload["sharedFlows"] = payload["sharedflows"]
        else:
            formatted_payload["sharedFlows"] = payload

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_sharedflow_detail_config(cls, org_name: str, sharedflow_name: str, payload: Any) -> Path:
        """Update a single shared flow entry with full detail payload."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(sharedflow_name, str) or not sharedflow_name.strip():
            raise ValueError("Shared flow name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_sharedflows = formatted_payload.get("sharedFlows")
        sharedflows: list[Any]
        if isinstance(current_sharedflows, list):
            sharedflows = current_sharedflows
        else:
            sharedflows = []

        updated = False
        for index, sharedflow in enumerate(sharedflows):
            if isinstance(sharedflow, str) and sharedflow == sharedflow_name:
                sharedflows[index] = payload
                updated = True
                break

            if isinstance(sharedflow, dict):
                sharedflow_identity = sharedflow.get("name") or sharedflow.get("sharedFlowId")
                if sharedflow_identity == sharedflow_name:
                    merged = dict(sharedflow)
                    if isinstance(payload, dict):
                        merged.update(payload)
                    else:
                        merged["details"] = payload
                    sharedflows[index] = merged
                    updated = True
                    break

        if not updated:
            sharedflows.append(payload)

        formatted_payload["sharedFlows"] = sharedflows
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path
