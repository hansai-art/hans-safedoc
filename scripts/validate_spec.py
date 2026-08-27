#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

from jsonschema.validators import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "schemas"
EXAMPLES = ROOT / "examples"
MATRIX = ROOT / "docs" / "ACCEPTANCE-MATRIX.csv"

def main() -> int:
    schema_files = sorted(SCHEMAS.glob("*.schema.json"))
    if len(schema_files) != 18:
        raise AssertionError(f"Expected 18 schemas, found {len(schema_files)}")

    schemas: dict[str, dict] = {}
    registry = Registry()
    for path in schema_files:
        schema = json.loads(path.read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        schemas[path.name] = schema
        registry = registry.with_resource(schema["$id"], Resource.from_contents(schema))

    example_files = sorted(EXAMPLES.glob("*.example.json"))
    schema_examples = [
        p for p in example_files
        if p.name.replace(".example.json", ".schema.json") in schemas
    ]
    if len(schema_examples) != 18:
        raise AssertionError(f"Expected 18 root schema examples, found {len(schema_examples)}")

    for path in schema_examples:
        schema_name = path.name.replace(".example.json", ".schema.json")
        value = json.loads(path.read_text(encoding="utf-8"))
        Draft202012Validator(schemas[schema_name], registry=registry).validate(value)

    backup = json.loads((EXAMPLES / "job-backup-manifest.example.json").read_text(encoding="utf-8"))
    Draft202012Validator(
        schemas["job-key-envelope.schema.json"]["$defs"]["backupManifest"]
    ).validate(backup)

    with MATRIX.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if len(rows) != 105:
        raise AssertionError(f"Expected 105 acceptance items, found {len(rows)}")
    ids = [r["Acceptance ID"] for r in rows]
    if len(ids) != len(set(ids)):
        raise AssertionError("Duplicate acceptance IDs")
    if any(r["Release Blocker"] != "YES" for r in rows):
        raise AssertionError("All v1.0 acceptance rows must be release blockers")

    crypto = json.loads((EXAMPLES / "crypto-test-vectors.json").read_text(encoding="utf-8"))
    if crypto["parameters"]["scrypt"] != {
        "N": 131072, "r": 8, "p": 1, "dkLen": 32, "maxmem": 268435456
    }:
        raise AssertionError("Crypto parameters drifted")

    master = (ROOT / "docs" / "MASTER-SPEC.md").read_text(encoding="utf-8")
    required_markers = [
        "Open Product Decisions：0",
        "Product Scope：FROZEN",
        "Security Model：FROZEN",
        "Data Contracts：FROZEN",
        "STOP-01",
        "PB/v1/job-wrap",
    ]
    for marker in required_markers:
        if marker not in master:
            raise AssertionError(f"Missing locked marker: {marker}")

    print("Privacy Bridge specification validation passed")
    print(f"Schemas: {len(schema_files)}")
    print(f"Schema examples: {len(schema_examples)}")
    print(f"Acceptance items: {len(rows)}")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"VALIDATION FAILED: {exc}", file=sys.stderr)
        raise
