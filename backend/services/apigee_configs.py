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
    def operations_config_path(cls, org_name: str) -> Path:
        """Path for the separate operations log file: data/orgs/<org>/operations.json."""
        return cls._org_dir(org_name) / "operations.json"

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
    def _load_operations_document(cls, org_name: str) -> dict[str, Any]:
        target_path = cls.operations_config_path(org_name)
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
    def _base_operations_document(cls, org_name: str) -> dict[str, Any]:
        existing = cls._load_operations_document(org_name)
        created_at = existing.get("createdAt") if isinstance(existing.get("createdAt"), str) else None

        return {
            "createdAt": created_at or datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "operations": existing.get("operations", []),
        }

    @classmethod
    def _strip_operations_from_org_config(cls, org_name: str) -> None:
        """Remove legacy operations key from the main org JSON if present."""
        target_path = cls.org_config_path(org_name)
        if not target_path.exists():
            return

        existing = cls._load_existing_config(org_name)
        if "operations" not in existing:
            return

        existing.pop("operations", None)
        target_path.write_text(json.dumps(existing, indent=4), encoding="utf-8")

    @classmethod
    def _base_document(cls, org_name: str) -> dict[str, Any]:
        existing = cls._load_existing_config(org_name)
        created_at = existing.get("createdAt") if isinstance(existing.get("createdAt"), str) else None

        return {
            "createdAt": created_at or datetime.now(timezone.utc).isoformat(),
            "organization": existing.get("organization", {}),
            "projectMapping": existing.get("projectMapping", {}),
            "endpointAttachments": existing.get("endpointAttachments", {}),
            "keyValueMaps": existing.get("keyValueMaps", {}),
            "deployments": existing.get("deployments", {}),
            "dataCollectors": existing.get("dataCollectors", {}),
            "envGroups": existing.get("envGroups", {}),
            "appGroups": existing.get("appGroups", {}),
            "hostQueries": existing.get("hostQueries", {}),
            "hostSecurityReports": existing.get("hostSecurityReports", {}),
            "hostStats": existing.get("hostStats", {}),
            "instances": existing.get("instances", {}),
            "environments": existing.get("environments", {}),
            "apiProducts": existing.get("apiProducts", {}),
            "proxies": existing.get("proxies", {}),
            "spaces": existing.get("spaces", {}),
            "developers": existing.get("developers", {}),
            "apps": existing.get("apps", {}),
            "sharedFlows": existing.get("sharedFlows", {}),
        }

    @staticmethod
    def _normalize_identity(value: str) -> str:
        normalized = value.strip()
        if not normalized:
            return ""
        parts = normalized.split("/")
        return parts[-1]

    @classmethod
    def _item_identity(cls, item: Any, candidate_keys: list[str]) -> str | None:
        if isinstance(item, str):
            identity = cls._normalize_identity(item)
            return identity or None

        if isinstance(item, dict):
            for key in candidate_keys:
                raw_value = item.get(key)
                if isinstance(raw_value, str):
                    identity = cls._normalize_identity(raw_value)
                    if identity:
                        return identity

        return None

    @staticmethod
    def _extract_list_payload(payload: Any, payload_keys: list[str]) -> list[Any] | None:
        if isinstance(payload, list):
            return payload

        if isinstance(payload, dict):
            for key in payload_keys:
                value = payload.get(key)
                if isinstance(value, list):
                    return value

        return None

    @classmethod
    def _merge_list_items(
        cls,
        existing_items: list[Any],
        incoming_items: list[Any],
        candidate_keys: list[str],
    ) -> list[Any]:
        existing_by_identity: dict[str, Any] = {}
        for item in existing_items:
            identity = cls._item_identity(item, candidate_keys)
            if identity and identity not in existing_by_identity:
                existing_by_identity[identity] = item

        merged: list[Any] = []
        for item in incoming_items:
            identity = cls._item_identity(item, candidate_keys)
            if identity and identity in existing_by_identity:
                merged.append(existing_by_identity[identity])
            else:
                merged.append(item)

        return merged

    @classmethod
    def _save_collection_config(
        cls,
        org_name: str,
        field_name: str,
        payload: Any,
        payload_keys: list[str],
        identity_keys: list[str],
    ) -> Path:
        """Persist a list/collection resource into the org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(field_name, str) or not field_name.strip():
            raise ValueError("Field name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        incoming_items = cls._extract_list_payload(payload, payload_keys)
        if incoming_items is None:
            formatted_payload[field_name] = payload
        else:
            existing_items = (
                formatted_payload[field_name]
                if isinstance(formatted_payload.get(field_name), list)
                else []
            )
            formatted_payload[field_name] = cls._merge_list_items(
                existing_items,
                incoming_items,
                identity_keys,
            )

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def _save_item_detail_config(
        cls,
        org_name: str,
        field_name: str,
        item_name: str,
        payload: Any,
        identity_keys: list[str],
        item_label: str,
    ) -> Path:
        """Update a single item within a collection field using detail payload."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(item_name, str) or not item_name.strip():
            raise ValueError(f"{item_label} is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_items = formatted_payload.get(field_name)
        items: list[Any] = current_items if isinstance(current_items, list) else []

        updated = False
        for index, item in enumerate(items):
            if isinstance(item, str) and item == item_name:
                items[index] = payload
                updated = True
                break

            if isinstance(item, dict):
                item_identity = None
                for key in identity_keys:
                    raw_value = item.get(key)
                    if isinstance(raw_value, str) and raw_value.strip():
                        item_identity = cls._normalize_identity(raw_value)
                        break
                if item_identity == item_name:
                    merged = dict(item)
                    if isinstance(payload, dict):
                        merged.update(payload)
                    else:
                        merged["details"] = payload
                    items[index] = merged
                    updated = True
                    break

        if not updated:
            items.append(payload)

        formatted_payload[field_name] = items
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

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
    def save_endpoint_attachments_config(cls, org_name: str, payload: Any) -> Path:
        """Save endpoint attachments payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        incoming_items = cls._extract_list_payload(payload, ["endpointAttachments"])
        if incoming_items is None:
            formatted_payload["endpointAttachments"] = payload
        else:
            existing_items = (
                formatted_payload["endpointAttachments"]
                if isinstance(formatted_payload.get("endpointAttachments"), list)
                else []
            )
            formatted_payload["endpointAttachments"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "endpointAttachment", "id"],
            )

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_key_value_maps_config(cls, org_name: str, payload: Any) -> Path:
        """Save key value maps payload in existing org config JSON file."""
        return cls._save_collection_config(
            org_name,
            "keyValueMaps",
            payload,
            ["keyvaluemaps", "keyValueMaps", "keyValueMap"],
            ["name", "id"],
        )

    @classmethod
    def save_deployments_config(cls, org_name: str, payload: Any) -> Path:
        """Save org-level deployments payload in existing org config JSON file."""
        return cls._save_collection_config(
            org_name,
            "deployments",
            payload,
            ["deployments"],
            ["apiProxy", "name", "environment", "revision", "id"],
        )

    @classmethod
    def save_data_collectors_config(cls, org_name: str, payload: Any) -> Path:
        """Save data collectors payload in existing org config JSON file."""
        return cls._save_collection_config(
            org_name,
            "dataCollectors",
            payload,
            ["dataCollectors", "datacollectors"],
            ["name", "id"],
        )

    @classmethod
    def save_env_groups_config(cls, org_name: str, payload: Any) -> Path:
        """Save environment groups payload in existing org config JSON file."""
        return cls._save_collection_config(
            org_name,
            "envGroups",
            payload,
            ["environmentGroups", "envgroups", "envGroups"],
            ["name", "id"],
        )

    @classmethod
    def save_app_groups_config(cls, org_name: str, payload: Any) -> Path:
        """Save app groups payload in existing org config JSON file."""
        return cls._save_collection_config(
            org_name,
            "appGroups",
            payload,
            ["appGroups", "appgroups", "appGroup"],
            ["name", "id"],
        )

    @classmethod
    def save_host_queries_config(cls, org_name: str, payload: Any) -> Path:
        """Save host queries payload in existing org config JSON file."""
        return cls._save_collection_config(
            org_name,
            "hostQueries",
            payload,
            ["queries", "hostQueries"],
            ["name", "id", "report"],
        )

    @classmethod
    def save_host_security_reports_config(cls, org_name: str, payload: Any) -> Path:
        """Save host security reports payload in existing org config JSON file."""
        return cls._save_collection_config(
            org_name,
            "hostSecurityReports",
            payload,
            ["securityReports", "hostSecurityReports"],
            ["name", "id", "report"],
        )

    @classmethod
    def save_host_stats_config(cls, org_name: str, payload: Any) -> Path:
        """Save host stats payload in existing org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        formatted_payload["hostStats"] = payload
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        return target_path

    @classmethod
    def save_operations_config(cls, org_name: str, payload: Any) -> Path:
        """Save operations list payload to data/orgs/<org>/operations.json."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")

        target_path = cls.operations_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_operations_document(org_name)
        incoming_items = cls._extract_list_payload(payload, ["operations"])
        if incoming_items is None:
            formatted_payload["operations"] = payload if isinstance(payload, list) else [payload]
        else:
            existing_items = (
                formatted_payload["operations"]
                if isinstance(formatted_payload.get("operations"), list)
                else []
            )
            formatted_payload["operations"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "operation", "id"],
            )

        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        cls._strip_operations_from_org_config(org_name)
        return target_path

    @classmethod
    def save_operation_detail_config(cls, org_name: str, operation_name: str, payload: Any) -> Path:
        """Update a single operation entry in data/orgs/<org>/operations.json."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(operation_name, str) or not operation_name.strip():
            raise ValueError("Operation name is required")

        target_path = cls.operations_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_operations_document(org_name)
        current_operations = formatted_payload.get("operations")
        operations: list[Any] = current_operations if isinstance(current_operations, list) else []

        updated = False
        for index, operation in enumerate(operations):
            if isinstance(operation, str) and operation == operation_name:
                operations[index] = payload
                updated = True
                break

            if isinstance(operation, dict):
                operation_identity = (
                    operation.get("name") or operation.get("operation") or operation.get("id")
                )
                if isinstance(operation_identity, str):
                    operation_identity = cls._normalize_identity(operation_identity)
                if operation_identity == operation_name:
                    merged = dict(operation)
                    if isinstance(payload, dict):
                        merged.update(payload)
                    else:
                        merged["details"] = payload
                    operations[index] = merged
                    updated = True
                    break

        if not updated:
            operations.append(payload)

        formatted_payload["operations"] = operations
        target_path.write_text(json.dumps(formatted_payload, indent=4), encoding="utf-8")
        cls._strip_operations_from_org_config(org_name)
        return target_path

    @classmethod
    def save_instance_detail_config(cls, org_name: str, instance_name: str, payload: Any) -> Path:
        """Update a single instance entry with full detail payload."""
        return cls._save_item_detail_config(
            org_name,
            "instances",
            instance_name,
            payload,
            ["name", "instance", "instanceId", "id"],
            "Instance name",
        )

    @classmethod
    def save_proxy_deployments_config(cls, org_name: str, api_name: str, payload: Any) -> Path:
        """Attach deployments payload onto a proxy entry in the org config JSON file."""
        if not isinstance(org_name, str) or not org_name.strip():
            raise ValueError("Organization name is required")
        if not isinstance(api_name, str) or not api_name.strip():
            raise ValueError("API name is required")

        target_path = cls.org_config_path(org_name)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        formatted_payload = cls._base_document(org_name)
        current_proxies = formatted_payload.get("proxies")
        proxies: list[Any] = current_proxies if isinstance(current_proxies, list) else []

        updated = False
        for index, proxy in enumerate(proxies):
            if isinstance(proxy, str) and proxy == api_name:
                proxies[index] = {"name": api_name, "deployments": payload}
                updated = True
                break

            if isinstance(proxy, dict):
                proxy_identity = proxy.get("name") or proxy.get("apiProxy")
                if isinstance(proxy_identity, str):
                    proxy_identity = cls._normalize_identity(proxy_identity)
                if proxy_identity == api_name:
                    merged = dict(proxy)
                    merged["deployments"] = payload
                    proxies[index] = merged
                    updated = True
                    break

        if not updated:
            proxies.append({"name": api_name, "deployments": payload})

        formatted_payload["proxies"] = proxies
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
        incoming_items = cls._extract_list_payload(payload, ["instances"])
        if incoming_items is None:
            formatted_payload["instances"] = payload
        else:
            existing_items = (
                formatted_payload["instances"] if isinstance(formatted_payload.get("instances"), list) else []
            )
            formatted_payload["instances"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "instance", "instanceId", "id"],
            )

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
        incoming_items = cls._extract_list_payload(payload, ["environments"])
        if incoming_items is None:
            formatted_payload["environments"] = payload
        else:
            existing_items = (
                formatted_payload["environments"]
                if isinstance(formatted_payload.get("environments"), list)
                else []
            )
            formatted_payload["environments"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "environment", "id"],
            )

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
        incoming_items = cls._extract_list_payload(payload, ["proxies", "apis"])
        if incoming_items is None:
            formatted_payload["proxies"] = payload
        else:
            existing_items = (
                formatted_payload["proxies"] if isinstance(formatted_payload.get("proxies"), list) else []
            )
            formatted_payload["proxies"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "apiProxy", "id"],
            )

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
        incoming_items = cls._extract_list_payload(payload, ["apiProduct", "apiProducts"])
        if incoming_items is None:
            formatted_payload["apiProducts"] = payload
        else:
            existing_items = (
                formatted_payload["apiProducts"]
                if isinstance(formatted_payload.get("apiProducts"), list)
                else []
            )
            formatted_payload["apiProducts"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "apiProduct", "id"],
            )

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
        incoming_items = cls._extract_list_payload(payload, ["spaces", "spaceNames"])
        if incoming_items is None:
            formatted_payload["spaces"] = payload
        else:
            existing_items = (
                formatted_payload["spaces"] if isinstance(formatted_payload.get("spaces"), list) else []
            )
            formatted_payload["spaces"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "space", "id"],
            )

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
        incoming_items = cls._extract_list_payload(payload, ["developers", "developer"])
        if incoming_items is None:
            formatted_payload["developers"] = payload
        else:
            existing_items = (
                formatted_payload["developers"]
                if isinstance(formatted_payload.get("developers"), list)
                else []
            )
            formatted_payload["developers"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["developerId", "developer_id", "email", "name", "id"],
            )

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
        incoming_items = cls._extract_list_payload(payload, ["app", "apps"])
        if incoming_items is None:
            formatted_payload["apps"] = payload
        else:
            existing_items = (
                formatted_payload["apps"] if isinstance(formatted_payload.get("apps"), list) else []
            )
            formatted_payload["apps"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "appId", "app_id", "id"],
            )

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
        incoming_items = cls._extract_list_payload(payload, ["sharedFlows", "sharedflows"])
        if incoming_items is None:
            formatted_payload["sharedFlows"] = payload
        else:
            existing_items = (
                formatted_payload["sharedFlows"]
                if isinstance(formatted_payload.get("sharedFlows"), list)
                else []
            )
            formatted_payload["sharedFlows"] = cls._merge_list_items(
                existing_items,
                incoming_items,
                ["name", "sharedFlowId", "id"],
            )

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
