#!/usr/bin/env python3
"""Validate the locked Hans SafeDoc v1.1 artifacts."""

from __future__ import annotations

import csv
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SPEC = DOCS / "HANS-SAFEDOC-V1.1-FORMAT-EXPANSION-SPEC.md"
ACCEPTANCE = DOCS / "HANS-SAFEDOC-V1.1-ACCEPTANCE-MATRIX.csv"
REQUIREMENTS = DOCS / "HANS-SAFEDOC-V1.1-REQUIREMENTS.csv"
OOXML = DOCS / "HANS-SAFEDOC-V1.1-OOXML-ALLOWLIST.csv"
COVERAGE = DOCS / "HANS-SAFEDOC-V1.1-CLAUSE-COVERAGE.csv"
OOXML_RELATIONSHIPS = DOCS / "HANS-SAFEDOC-V1.1-OOXML-RELATIONSHIPS.csv"
OOXML_SURFACES = DOCS / "HANS-SAFEDOC-V1.1-OOXML-SURFACES.csv"

NORMATIVE = re.compile(
    r"必須|不得|只有|一律|禁止|永遠|固定為|固定使用|維持|阻止|拒絕|不允許|不可"
)


def fail(message: str) -> None:
    raise AssertionError(message)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def discover_clauses(spec: str) -> list[tuple[str, int, str, str]]:
    result: list[tuple[str, int, str, str]] = []
    section: int | None = None
    in_fence = False
    counts: dict[int, int] = {}
    for line_number, line in enumerate(spec.splitlines(), 1):
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        heading = re.match(r"^## (\d+)\.", line)
        if heading:
            section = int(heading.group(1))
            continue
        text = line.strip()
        normative = bool(
            NORMATIVE.search(text)
            or text.startswith("- 不")
            or text.endswith("不做：")
        )
        if section is None or in_fence or not normative or text.startswith("| HSD-ACC-"):
            continue
        counts[section] = counts.get(section, 0) + 1
        clause_id = f"HSD-CLAUSE-S{section:02d}-{counts[section]:03d}"
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        result.append((clause_id, line_number, digest, text))
    return result


def section_ref_covers(section_ref: str, section: int) -> bool:
    for start, end in re.findall(r"§(\d+)(?:\.(?:\d+))?(?:[–-](\d+))?", section_ref):
        low = int(start)
        high = int(end) if end else low
        if low <= section <= high:
            return True
    return False


def validate() -> None:
    spec = SPEC.read_text(encoding="utf-8")
    acceptance = read_csv(ACCEPTANCE)
    requirements = read_csv(REQUIREMENTS)
    coverage = read_csv(COVERAGE)
    allowlist = read_csv(OOXML)
    relationships = read_csv(OOXML_RELATIONSHIPS)
    surfaces = read_csv(OOXML_SURFACES)

    acceptance_ids = [row["acceptance_id"] for row in acceptance]
    requirement_ids = [row["requirement_id"] for row in acceptance]
    summary_ids = re.findall(r"^\| (HSD-ACC-[A-Z]+-\d{3}) \|", spec, re.MULTILINE)

    if len(acceptance) != 66:
        fail(f"expected 66 acceptance rows, got {len(acceptance)}")
    if len(set(acceptance_ids)) != len(acceptance_ids):
        fail("duplicate acceptance ID")
    if len(set(requirement_ids)) != len(requirement_ids):
        fail("duplicate requirement ID")
    if set(summary_ids) != set(acceptance_ids):
        fail("spec summary and acceptance CSV differ")

    required_acceptance_fields = {
        "acceptance_id",
        "requirement_id",
        "section_ref",
        "applies_to",
        "evidence_type",
        "test_path",
        "fixture",
        "scenario",
        "expected_assertion",
        "release_blocker",
    }
    all_evidence_paths: set[str] = set()
    for row in acceptance:
        if set(row) != required_acceptance_fields:
            fail(f"bad acceptance columns for {row.get('acceptance_id')}")
        if any(not row[field] for field in required_acceptance_fields):
            fail(f"empty acceptance field for {row['acceptance_id']}")
        if row["evidence_type"] not in {"automated", "manual", "hybrid"}:
            fail(f"bad evidence type for {row['acceptance_id']}")
        if row["release_blocker"] != "true":
            fail(f"non-blocking acceptance row {row['acceptance_id']}")
        expected_requirement = row["acceptance_id"].replace("HSD-ACC-", "HSD-REQ-")
        if row["requirement_id"] != expected_requirement:
            fail(f"requirement derivation mismatch for {row['acceptance_id']}")
        paths = row["test_path"].split(";")
        automated = [path for path in paths if path.endswith(".test.ts")]
        manual = [path for path in paths if path.endswith(".md")]
        if row["evidence_type"] == "automated" and not (len(paths) == 1 and len(automated) == 1):
            fail(f"automated evidence path mismatch for {row['acceptance_id']}")
        if row["evidence_type"] == "manual" and not (len(paths) == 1 and len(manual) == 1):
            fail(f"manual evidence path mismatch for {row['acceptance_id']}")
        if row["evidence_type"] == "hybrid" and not (
            len(paths) == 2 and len(automated) == 1 and len(manual) == 1
        ):
            fail(f"hybrid evidence path mismatch for {row['acceptance_id']}")
        if any(path in all_evidence_paths for path in paths):
            fail(f"duplicate evidence path for {row['acceptance_id']}")
        all_evidence_paths.update(paths)
        group = row["acceptance_id"].split("-")[2]
        if group not in {"UX", "REL"} and row["fixture"] == "N/A":
            fail(f"missing fixture for {row['acceptance_id']}")

    for format_name, format_group in {
        "txt": "TXT",
        "csv": "CSV",
        "docx": "DOCX",
        "xlsx": "XLSX",
    }.items():
        applicable = [row for row in acceptance if format_name in row["applies_to"].split("|")]
        groups = {row["acceptance_id"].split("-")[2] for row in applicable}
        required_groups = {"FND", "UX", "PERF", "REL", format_group}
        if not required_groups <= groups:
            fail(f"incomplete gate closure for {format_name}: {sorted(required_groups - groups)}")

    discovered = discover_clauses(spec)
    registered = [
        (
            row["clause_id"],
            int(row["source_line"]),
            row["clause_sha256"],
            row["clause_text"],
        )
        for row in requirements
    ]
    if discovered != registered:
        fail("Clause Register differs from normative spec lines")
    if len({row["clause_id"] for row in requirements}) != len(requirements):
        fail("duplicate Clause ID")
    if {int(row["section"].removeprefix("§")) for row in requirements} != set(range(1, 28)):
        fail("not all normative sections are represented")

    known_requirements = set(requirement_ids)
    for row in requirements:
        refs = set(row["requirement_ids"].split("|"))
        unknown = refs - known_requirements
        if unknown:
            fail(f"unknown requirement in {row['clause_id']}: {sorted(unknown)}")

    coverage_fields = {
        "clause_id", "section", "requirement_id", "acceptance_id",
        "assertion_sha256", "supplemental_assertion",
    }
    coverage_by_clause: dict[str, list[dict[str, str]]] = {}
    coverage_pairs: set[tuple[str, str]] = set()
    for link in coverage:
        if set(link) != coverage_fields or any(not value for value in link.values()):
            fail("bad Clause Coverage row")
        pair = (link["clause_id"], link["requirement_id"])
        if pair in coverage_pairs:
            fail(f"duplicate Clause Coverage pair: {pair}")
        coverage_pairs.add(pair)
        coverage_by_clause.setdefault(link["clause_id"], []).append(link)
    acceptance_by_id = {row["acceptance_id"]: row for row in acceptance}
    requirement_by_clause = {row["clause_id"]: row for row in requirements}
    referenced_requirements: set[str] = set()
    for clause_id, requirement in requirement_by_clause.items():
        if clause_id not in coverage_by_clause:
            fail(f"missing coverage for {clause_id}")
        linked_requirement_ids: set[str] = set()
        section = int(requirement["section"].removeprefix("§"))
        required_format = {6: "pdf-agent", 11: "txt", 12: "csv", 13: "docx", 14: "xlsx"}.get(section)
        for link in coverage_by_clause[clause_id]:
            if link["section"] != requirement["section"]:
                fail(f"section mismatch for {clause_id}")
            if link["supplemental_assertion"] != requirement["clause_text"]:
                fail(f"assertion mismatch for {clause_id}")
            digest = hashlib.sha256(link["supplemental_assertion"].encode("utf-8")).hexdigest()
            if link["assertion_sha256"] != digest:
                fail(f"assertion hash mismatch for {clause_id}")
            expected_acceptance = link["requirement_id"].replace("HSD-REQ-", "HSD-ACC-")
            if link["acceptance_id"] != expected_acceptance or expected_acceptance not in acceptance_by_id:
                fail(f"acceptance link mismatch for {clause_id}")
            acceptance_row = acceptance_by_id[expected_acceptance]
            if not section_ref_covers(acceptance_row["section_ref"], section):
                fail(f"acceptance section mismatch for {clause_id}")
            if required_format and required_format not in acceptance_row["applies_to"].split("|"):
                fail(f"acceptance format mismatch for {clause_id}")
            linked_requirement_ids.add(link["requirement_id"])
            referenced_requirements.add(link["requirement_id"])
        if linked_requirement_ids != set(requirement["requirement_ids"].split("|")):
            fail(f"Clause Register coverage set mismatch for {clause_id}")
    unknown_clause_links = set(coverage_by_clause) - set(requirement_by_clause)
    if unknown_clause_links:
        fail(f"coverage references unknown clauses: {sorted(unknown_clause_links)}")
    orphan_requirements = known_requirements - referenced_requirements
    if orphan_requirements:
        fail(f"orphan requirements: {sorted(orphan_requirements)}")

    required_allowlist_fields = {
        "package",
        "part_pattern",
        "content_type",
        "cardinality",
        "policy",
    }
    keys: set[tuple[str, str]] = set()
    for row in allowlist:
        if set(row) != required_allowlist_fields:
            fail("bad OOXML allowlist columns")
        key = (row["package"], row["part_pattern"])
        if key in keys:
            fail(f"duplicate OOXML part pattern: {key}")
        keys.add(key)
    for mandatory in {
        ("docx", "[Content_Types].xml"),
        ("docx", "word/document.xml"),
        ("xlsx", "[Content_Types].xml"),
        ("xlsx", "xl/workbook.xml"),
    }:
        if mandatory not in keys:
            fail(f"missing mandatory OOXML row: {mandatory}")

    relationship_fields = {
        "package", "source_part_pattern", "target_part_pattern", "type_uri",
        "target_mode", "cardinality", "policy", "locator_kind",
    }
    relationship_keys: set[tuple[str, str, str, str, str]] = set()
    for row in relationships:
        if set(row) != relationship_fields or any(not value for value in row.values()):
            fail("bad OOXML relationship row")
        key = (
            row["package"], row["source_part_pattern"], row["target_part_pattern"],
            row["type_uri"], row["target_mode"],
        )
        if key in relationship_keys:
            fail(f"duplicate OOXML relationship edge: {key}")
        relationship_keys.add(key)
        if not row["type_uri"].startswith("http://"):
            fail(f"non-canonical relationship Type URI: {key}")
        if row["target_mode"] not in {"Internal", "External"}:
            fail(f"bad TargetMode: {key}")
        if row["locator_kind"] != "relationship-target":
            fail(f"relationship edge lacks locator: {key}")

    surface_fields = {
        "package", "part_pattern", "namespace_uri", "element_local_name",
        "attribute_namespace_uri", "attribute_local_name", "node_kind",
        "context_predicate", "surface_class", "locator_kind",
    }
    surface_keys: set[tuple[str, ...]] = set()
    for row in surfaces:
        if set(row) != surface_fields or any(not value for value in row.values()):
            fail("bad OOXML surface row")
        key = tuple(row[field] for field in sorted(surface_fields - {"surface_class", "locator_kind"}))
        if key in surface_keys:
            fail(f"duplicate OOXML surface rule: {key}")
        surface_keys.add(key)
        if row["surface_class"] not in {"SCAN_REWRITE", "SCAN_BLOCK", "PRESERVE_VALIDATED", "REJECT"}:
            fail(f"bad surface class: {key}")
    if any("webSettings" in value for row in allowlist + relationships + surfaces for value in row.values()):
        fail("webSettings must not appear in v1.1 allowlists")
    if any("calcChain" in value for row in allowlist + relationships for value in row.values()):
        fail("calcChain must be rejected, not allowlisted")
    if not any(row["package"] == "xlsx" and row["element_local_name"] == "f" and row["surface_class"] == "REJECT" for row in surfaces):
        fail("XLSX formula surface is not fail-closed")
    locator_kinds = {row["locator_kind"] for row in surfaces} | {row["locator_kind"] for row in relationships}
    for required_locator in {
        "relationship-target", "xlsx-display-value", "xlsx-formula",
        "xlsx-cached-result", "xlsx-raw-value", "docx-text",
        "ooxml-element-text", "ooxml-attribute-value",
    }:
        if required_locator not in locator_kinds:
            fail(f"missing machine locator policy: {required_locator}")
    for required_part in {
        ("docx", "word/styles.xml"),
        ("docx", "word/settings.xml"),
        ("docx", "word/fontTable.xml"),
        ("docx", "word/numbering.xml"),
        ("xlsx", "xl/styles.xml"),
    }:
        if not any((row["package"], row["part_pattern"]) == required_part for row in surfaces):
            fail(f"allowlisted structure part lacks QName policy: {required_part}")
    formula_attributes = {
        row["attribute_local_name"] for row in surfaces
        if row["package"] == "xlsx" and row["element_local_name"] == "f"
        and row["node_kind"] == "ATTRIBUTE" and row["surface_class"] == "REJECT"
    }
    if not {"t", "si", "ref"} <= formula_attributes:
        fail("formula attributes t/si/ref are not fail-closed")
    if not any(
        row["package"] == "xlsx" and row["element_local_name"] == "v"
        and row["context_predicate"] == "PARENT_C_WITH_SIBLING_F"
        and row["locator_kind"] == "xlsx-cached-result" and row["surface_class"] == "REJECT"
        for row in surfaces
    ):
        fail("formula cached result context is not fail-closed")
    for package, part, source in {
        ("docx", "word/theme/theme1.xml", "word/document.xml"),
        ("xlsx", "xl/theme/theme1.xml", "xl/workbook.xml"),
    }:
        if (package, part) not in keys:
            fail(f"missing common theme part: {(package, part)}")
        if not any(
            row["package"] == package
            and row["source_part_pattern"] == source
            and row["target_part_pattern"] == part
            and row["type_uri"]
            == "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"
            and row["target_mode"] == "Internal"
            for row in relationships
        ):
            fail(f"missing common theme relationship: {(package, source, part)}")
        if not any(
            row["package"] == package
            and row["part_pattern"] == part
            and row["namespace_uri"]
            == "http://schemas.openxmlformats.org/drawingml/2006/main"
            and row["element_local_name"] == "theme"
            and row["surface_class"] == "PRESERVE_VALIDATED"
            for row in surfaces
        ):
            fail(f"common theme lacks QName policy: {(package, part)}")

    stale_phrases = {
        "readonly id: 'md'",
        "用 Word 開啟安全副本",
        "用 Excel 開啟安全副本",
        "依契約逐項確認或阻擋，不默默略過",
        "restoreTokens(",
        "dependency=0",
        "公式保持，UI 顯示受影響數量，原生重算驗證",
        "公式存在但全 workbook replacement count=0",
    }
    found_stale = sorted(phrase for phrase in stale_phrases if phrase in spec)
    if found_stale:
        fail(f"stale contract phrases: {found_stale}")

    if spec.count("```") % 2:
        fail("unbalanced Markdown fences")

    print(
        "HANS SAFEDOC V1.1 SPEC VALID: "
        f"{len(requirements)} clauses, {len(acceptance)} acceptance rows, "
        f"{len(allowlist)} parts, {len(relationships)} relationships, "
        f"{len(surfaces)} surfaces"
    )


if __name__ == "__main__":
    try:
        validate()
    except AssertionError as error:
        print(f"HANS SAFEDOC V1.1 SPEC INVALID: {error}", file=sys.stderr)
        raise SystemExit(1)
