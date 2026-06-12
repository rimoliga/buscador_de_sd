"""
Actualiza versiones de forma atómica en los archivos que las contienen:
  - data/version.json          (app_version + dataset_version)
  - modules/config.js          (APP_VERSION + DATA_VERSION)
  - service-worker.js          (APP_VERSION)

Uso:
  python -m data.bump_version 2025.12.3
  python -m data.bump_version 2025.12.3 --dataset-version 2025.12.20
  python -m data.bump_version --dataset-version 2025.12.20   # solo dataset
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
    parser = argparse.ArgumentParser(description="Bump versiones en todos los archivos.")
    parser.add_argument(
        "app_version",
        nargs="?",
        help="Nueva versión de la app (ej: 2025.12.3). Si se omite, conserva la actual.",
    )
    parser.add_argument(
        "--dataset-version",
        help="Nueva versión del dataset (ej: 2025.12.20). Si se omite, conserva la actual.",
    )
    args = parser.parse_args()
    if not args.app_version and not args.dataset_version:
        parser.error("Debés indicar al menos app_version o --dataset-version.")
    return args


def bump_version_json(app_version: str | None, dataset_version: str | None) -> tuple[str, str]:
    data = json.loads(VERSION_JSON.read_text(encoding="utf-8"))
    old_app = data["app_version"]
    old_data = data.get("dataset_version", "")
    if app_version:
        data["app_version"] = app_version
    if dataset_version:
        data["dataset_version"] = dataset_version
    VERSION_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return old_app, old_data


def bump_const_in_file(path: Path, const_name: str, old_value: str, new_value: str, quote: str) -> bool:
    pattern = rf'(const {re.escape(const_name)}\s*=\s*){re.escape(quote)}{re.escape(old_value)}{re.escape(quote)}'
    replacement = rf'\g<1>{quote}{new_value}{quote}'
    original = path.read_text(encoding="utf-8")
    updated = re.sub(pattern, replacement, original, count=1)
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main():
    args = parse_args()

    old_app, old_data = bump_version_json(args.app_version, args.dataset_version)
    new_app = args.app_version or old_app
    new_data = args.dataset_version or old_data

    changed_files = [str(VERSION_JSON.relative_to(ROOT))]

    if args.app_version:
        if bump_const_in_file(CONFIG_JS, "APP_VERSION", old_app, new_app, "'"):
            changed_files.append(str(CONFIG_JS.relative_to(ROOT)))
        else:
            print(f"WARN: no se encontró APP_VERSION='{old_app}' en {CONFIG_JS.name}", file=sys.stderr)

        if bump_const_in_file(SERVICE_WORKER_JS, "APP_VERSION", old_app, new_app, '"'):
            changed_files.append(str(SERVICE_WORKER_JS.relative_to(ROOT)))
        else:
            print(f"WARN: no se encontró APP_VERSION=\"{old_app}\" en {SERVICE_WORKER_JS.name}", file=sys.stderr)

    if args.dataset_version:
        if bump_const_in_file(CONFIG_JS, "DATA_VERSION", old_data, new_data, "'"):
            if str(CONFIG_JS.relative_to(ROOT)) not in changed_files:
                changed_files.append(str(CONFIG_JS.relative_to(ROOT)))
        else:
            print(f"WARN: no se encontró DATA_VERSION='{old_data}' en {CONFIG_JS.name}", file=sys.stderr)

    parts = []
    if args.app_version:
        parts.append(f"app_version: {old_app} -> {new_app}")
    if args.dataset_version:
        parts.append(f"dataset_version: {old_data} -> {new_data}")
    print("Versiones actualizadas — " + ", ".join(parts))
    for f in changed_files:
        print(f"  {f}")


if __name__ == "__main__":
    main()
