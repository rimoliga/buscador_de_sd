"""
Actualiza APP_VERSION de forma atómica en los tres archivos que la contienen:
  - data/version.json
  - modules/config.js
  - service-worker.js

Uso:
  python -m data.bump_version 2025.12.3
  python -m data.bump_version 2025.12.3 --dataset-version 2025.12.20
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
VERSION_JSON = ROOT / "data" / "version.json"
CONFIG_JS = ROOT / "modules" / "config.js"
SERVICE_WORKER_JS = ROOT / "service-worker.js"


def parse_args():
    parser = argparse.ArgumentParser(description="Bump app version en todos los archivos.")
    parser.add_argument("app_version", help="Nueva versión de la app (ej: 2025.12.3)")
    parser.add_argument(
        "--dataset-version",
        help="Nueva versión del dataset (ej: 2025.12.20). Si se omite, conserva la actual.",
    )
    return parser.parse_args()


def bump_version_json(app_version: str, dataset_version: str | None) -> str:
    data = json.loads(VERSION_JSON.read_text(encoding="utf-8"))
    old_app = data["app_version"]
    data["app_version"] = app_version
    if dataset_version:
        data["dataset_version"] = dataset_version
    VERSION_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return old_app


def bump_js_file(path: Path, old_version: str, new_version: str, quote: str) -> bool:
    pattern = rf'(const APP_VERSION\s*=\s*){re.escape(quote)}{re.escape(old_version)}{re.escape(quote)}'
    replacement = rf'\g<1>{quote}{new_version}{quote}'
    original = path.read_text(encoding="utf-8")
    updated = re.sub(pattern, replacement, original, count=1)
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main():
    args = parse_args()
    new_app = args.app_version

    old_app = bump_version_json(new_app, args.dataset_version)

    changed_config = bump_js_file(CONFIG_JS, old_app, new_app, "'")
    changed_sw = bump_js_file(SERVICE_WORKER_JS, old_app, new_app, '"')

    if not changed_config:
        print(f"WARN: no se encontró APP_VERSION='{old_app}' en {CONFIG_JS.name}", file=sys.stderr)
    if not changed_sw:
        print(f"WARN: no se encontró APP_VERSION=\"{old_app}\" en {SERVICE_WORKER_JS.name}", file=sys.stderr)

    dataset_line = f", dataset_version={args.dataset_version}" if args.dataset_version else ""
    print(f"Version actualizada: {old_app} -> {new_app}{dataset_line}")
    print(f"  {VERSION_JSON.relative_to(ROOT)}")
    print(f"  {CONFIG_JS.relative_to(ROOT)}")
    print(f"  {SERVICE_WORKER_JS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
