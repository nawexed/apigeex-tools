"""Export GCP load balancer URL-map routing rules for a project.

One JSON file is written per region. Each file contains every routing rule
found on the URL maps in that region.

Usage:
    python backend/services/gcp_routing_rules.py PROJECT_NAME
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_ROOT = PROJECT_ROOT / "data" / "orgs"
GCLOUD_TIMEOUT_SECONDS = 120


def _run_gcloud(args: list[str]) -> Any:
    command = ["gcloud", *args, "--format=json"]
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
            timeout=GCLOUD_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as exc:
        raise SystemExit("gcloud CLI is not installed or not in PATH.") from exc
    except subprocess.TimeoutExpired as exc:
        raise SystemExit(f"Timed out running: {' '.join(command)}") from exc

    if completed.returncode != 0:
        details = completed.stderr.strip() or completed.stdout.strip() or "Unknown gcloud error"
        raise SystemExit(f"gcloud failed: {details}")

    payload = completed.stdout.strip()
    if not payload:
        return []
    return json.loads(payload)


def _resource_name(resource_url: str | None) -> str | None:
    if not resource_url:
        return None
    return resource_url.rstrip("/").rsplit("/", 1)[-1]


def _region_name(url_map: dict[str, Any]) -> str:
    region = _resource_name(url_map.get("region"))
    if region:
        return region

    self_link = url_map.get("selfLink") or ""
    if "/regions/" in self_link:
        marker = "/regions/"
        return self_link.split(marker, 1)[1].split("/", 1)[0]
    return "global"


def _scope_args(region: str) -> list[str]:
    if region == "global":
        return ["--global"]
    return [f"--region={region}"]


def list_url_maps(project: str) -> list[dict[str, Any]]:
    payload = _run_gcloud(["compute", "url-maps", "list", f"--project={project}"])
    if isinstance(payload, dict):
        return [payload]
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def describe_url_map(project: str, name: str, region: str) -> dict[str, Any]:
    payload = _run_gcloud(
        [
            "compute",
            "url-maps",
            "describe",
            name,
            f"--project={project}",
            *_scope_args(region),
        ]
    )
    if not isinstance(payload, dict):
        raise SystemExit(f"Unexpected describe payload for URL map {name} in {region}.")
    return payload


def extract_routing_rules(url_map: dict[str, Any]) -> list[dict[str, Any]]:
    """Return one record per path-matcher route rule with its configured hosts."""
    hosts_by_matcher: dict[str, list[str]] = {}
    for host_rule in url_map.get("hostRules") or []:
        if not isinstance(host_rule, dict):
            continue
        matcher_name = host_rule.get("pathMatcher")
        hosts = host_rule.get("hosts") or []
        if not matcher_name or not isinstance(hosts, list):
            continue
        matcher_hosts = hosts_by_matcher.setdefault(matcher_name, [])
        for host in hosts:
            if isinstance(host, str) and host not in matcher_hosts:
                matcher_hosts.append(host)

    rules: list[dict[str, Any]] = []
    for matcher in url_map.get("pathMatchers") or []:
        if not isinstance(matcher, dict):
            continue

        matcher_name = matcher.get("name")
        if not isinstance(matcher_name, str):
            continue
        matcher_hosts = hosts_by_matcher.get(matcher_name, [])
        default_service = _resource_name(matcher.get("defaultService"))

        for route_rule in matcher.get("routeRules") or []:
            if not isinstance(route_rule, dict):
                continue

            match_rules = route_rule.get("matchRules") or [{}]
            if not isinstance(match_rules, list) or not match_rules:
                match_rules = [{}]

            rewrite = (route_rule.get("routeAction") or {}).get("urlRewrite") or {}
            service = _resource_name(route_rule.get("service")) or default_service

            for match_rule in match_rules:
                if not isinstance(match_rule, dict):
                    match_rule = {}
                rules.append(
                    {
                        "name": matcher_name,
                        "hosts": matcher_hosts,
                        "pathPrefixMatch": match_rule.get("prefixMatch"),
                        "pathPrefixRewrite": rewrite.get("pathPrefixRewrite"),
                        "service": service,
                    }
                )
    return rules


def routing_rules_for_region(project: str, region: str, url_maps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    for url_map in url_maps:
        name = url_map.get("name")
        if not name:
            continue
        described = describe_url_map(project, name, region)
        rules.extend(extract_routing_rules(described))
    rules.sort(
        key=lambda rule: (
            rule.get("name") or "",
            rule.get("pathPrefixMatch") or "",
            tuple(rule.get("hosts") or []),
        )
    )
    return rules


def load_balancer_payload_for_region_rules(region: str, rules: list[dict[str, Any]]) -> dict[str, Any]:
    normalized_rules: list[dict[str, Any]] = []
    for rule in rules:
        hosts = rule.get("hosts")
        normalized_rules.append(
            {
                "name": rule.get("name"),
                "hosts": [host for host in hosts if isinstance(host, str)] if isinstance(hosts, list) else [],
                "pathPrefixMatch": rule.get("pathPrefixMatch"),
                "pathPrefixRewrite": rule.get("pathPrefixRewrite"),
                "service": rule.get("service"),
            }
        )
    return {
        "region": region,
        "routing_rules": normalized_rules,
    }


def export_project_routing_rules(project: str, output_root: Path = DEFAULT_OUTPUT_ROOT) -> list[Path]:
    project_name = project.strip()
    if not project_name:
        raise SystemExit("Project name is required.")

    url_maps = list_url_maps(project_name)
    if not url_maps:
        raise SystemExit(f"No URL maps found in project {project_name}.")

    by_region: dict[str, list[dict[str, Any]]] = {}
    for url_map in url_maps:
        by_region.setdefault(_region_name(url_map), []).append(url_map)

    load_balancer: list[dict[str, Any]] = []
    for region in sorted(by_region):
        rules = routing_rules_for_region(project_name, region, by_region[region])
        load_balancer.append(load_balancer_payload_for_region_rules(region, rules))

    payload = {"load_balancer": load_balancer}
    output_dir = output_root / project_name
    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / f"{project_name}_routing_rules.json"
    target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return [target]


def export_org_routing_rules(config_path: Path | None = None, output_root: Path = PROJECT_ROOT / "data" / "orgs") -> list[Path]:
    resolved_path = config_path or PROJECT_ROOT / "data" / "config.json"
    if not resolved_path.exists():
        return []

    try:
        config = json.loads(resolved_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        raise SystemExit(f"Invalid JSON in config file: {resolved_path}")

    org_names = config.get("organizations", [])
    if not isinstance(org_names, list):
        raise SystemExit(f"Config file must contain an 'organizations' list: {resolved_path}")

    written: list[Path] = []
    for org_name in org_names:
        org_dir = output_root / str(org_name)
        org_dir.mkdir(parents=True, exist_ok=True)

        target = org_dir / f"{org_name}_routing_rules.json"
        if not target.exists():
            target.write_text(json.dumps({"load_balancer": []}, indent=2) + "\n", encoding="utf-8")
        written.append(target)

    return written


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export GCP load balancer routing rules for every region in a project."
    )
    parser.add_argument("project", help="GCP project name, for example apigeex-shared-dev")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help=f"Directory for <project>/<region>.json files (default: {DEFAULT_OUTPUT_ROOT})",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=PROJECT_ROOT / "data" / "config.json",
        help="Optional config file listing organizations to export to data/orgs/<org>/<org>_routing_rules.json.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    written = export_project_routing_rules(args.project, args.output_dir)
    for path in written:
        print(path)

    org_written = export_org_routing_rules(args.config, PROJECT_ROOT / "data" / "orgs")
    for path in org_written:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
