"""Generate and verify the ten Markdown views of the fusion naming records."""

import argparse
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit


ATLAS = Path(__file__).resolve().parent
REPO = ATLAS.parents[1]
PAIRING_CHART = ATLAS.parent / "designs/aldervale-fusion-pairing-chart.md"
ELEMENTS = ("Fire", "Water", "Lightning", "Frost", "Wind", "Earth", "Light", "Dark", "Metal", "Plant")
STATUSES = {"Locked", "Favorite", "Candidate", "Exploratory", "Parked", "Reference", "Rejected"}
HEADER = "| Name | Concept | Status | Parents /3 | Identity /3 | Name /2 | Gameplay /2 | Total /10 | Rationale and origin |"
LIMITS = (3, 3, 2, 2)


@dataclass(frozen=True)
class Name:
    label: str
    concept: str
    status: str
    scores: tuple[int, int, int, int]
    total: int


def pair_id(first, second):
    return f"{first.lower()}-{second.lower()}"


def parse_names(path, pair):
    text = path.read_text(encoding="utf-8")
    title = f"# {pair[0]} + {pair[1]}"
    if text.splitlines()[0] != title:
        raise ValueError(f"{path}: expected heading {title!r}")
    before, separator, table = text.partition(HEADER + "\n")
    if not separator or HEADER in table or "## Rated names" not in before:
        raise ValueError(f"{path}: expected one rated names table")
    lines = table.split("\n")
    if not re.fullmatch(r"\|(?: --- \|){9}", lines[0]):
        raise ValueError(f"{path}: invalid table separator")

    names = []
    seen = set()
    for line in lines[1:]:
        if not line.strip():
            break
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if not line.startswith("| ") or not line.endswith(" |") or len(cells) != 9:
            raise ValueError(f"{path}: malformed name row {line!r}")
        label, concept, status, *columns = cells
        score_cells = columns[:5]
        if not label or not concept or status not in STATUSES or not columns[-1]:
            raise ValueError(f"{path}: missing name, concept, status, or rationale for {label!r}")
        if not all(cell.isascii() and cell.isdecimal() for cell in score_cells):
            raise ValueError(f"{path}: expected whole-number scores for {label!r}")
        scores = tuple(map(int, score_cells[:4]))
        total = int(score_cells[4])
        if any(score > limit for score, limit in zip(scores, LIMITS, strict=True)) or sum(scores) != total:
            raise ValueError(f"{path}: invalid scores for {label!r}")
        if label.casefold() in seen:
            raise ValueError(f"{path}: duplicate name {label!r}")
        seen.add(label.casefold())
        names.append(Name(label, concept, status, scores, total))

    if not names:
        raise ValueError(f"{path}: every pair needs reviewed names")
    return sorted(names, key=lambda name: (-name.total, name.label.casefold()))


def load_pairs():
    pairs = list(combinations(ELEMENTS, 2))
    expected = {f"{pair_id(*pair)}.md" for pair in pairs}
    actual = {path.name for path in (ATLAS / "pairs").iterdir()}
    if actual != expected:
        raise ValueError(f"Pair files missing: {sorted(expected - actual)}; extra: {sorted(actual - expected)}")

    catalog = {
        pair: parse_names(ATLAS / "pairs" / f"{pair_id(*pair)}.md", pair)
        for pair in pairs
    }
    chart = PAIRING_CHART.read_text(encoding="utf-8")
    axes = next(line for line in chart.splitlines() if line.startswith("| Element |"))
    if tuple(cell.strip() for cell in axes.split("|")[2:-1]) != ELEMENTS:
        raise ValueError("Element HQ roster and Fusion Name Atlas differ")
    historical = {}
    for line in chart.split("## Options for all 45 pairs", 1)[1].splitlines():
        result = re.match(r"\| ([A-Za-z]+) \+ ([A-Za-z]+) \| (.+) \|", line)
        if not result:
            continue
        first, second, ideas = result.groups()
        pair = (first, second)
        if pair in historical:
            raise ValueError(f"Duplicate pair in Element HQ chart: {pair!r}")
        historical[pair] = set(re.findall(r"\*\*([^*]+)\*\*", ideas))

    if set(historical) != set(catalog):
        raise ValueError("Element HQ chart and Atlas pair coverage differ")
    for pair, names in catalog.items():
        missing = historical[pair] - {name.label for name in names}
        if missing:
            raise ValueError(f"Historical names missing from {pair!r}: {sorted(missing)}")
    locked = [(pair, name.label) for pair, names in catalog.items() for name in names if name.status == "Locked"]
    live_decisions = (REPO / "README.md").read_text(encoding="utf-8")
    if locked != [(("Fire", "Earth"), "Magma")] or "**Fire + Earth → Magma** is locked" not in live_decisions:
        raise ValueError("Locked Fire + Earth → Magma decision differs from Element HQ")
    return catalog


def render_element(element, catalog):
    other_elements = [other for other in ELEMENTS if other != element]
    lines = [
        f"# {element} fusion names",
        "",
        "[Fusion Name Atlas](../README.md) · [Rating guide](../README.md#rating-guide)",
        "",
        "Generated from the pair pages. Open a pair page to edit its names, scores, or rationale.",
        "Breakdown order is parents, identity, name, and gameplay.",
        "",
        "## Partners",
        "",
        *[f"- [{other}](#{other.lower()})" for other in other_elements],
    ]
    for other in other_elements:
        pair = (element, other) if ELEMENTS.index(element) < ELEMENTS.index(other) else (other, element)
        lines.extend([
            "",
            f"## {other}",
            "",
            f"[{pair[0]} + {pair[1]} pair page](../pairs/{pair_id(*pair)}.md)",
            "",
            "| Name | Concept | Breakdown | Total /10 | Status |",
            "| --- | --- | ---: | ---: | --- |",
            *[f"| {name.label} | {name.concept} | {' / '.join(map(str, name.scores))} | "
              f"{name.total} | {name.status} |" for name in catalog[pair]],
        ])
    return "\n".join(lines) + "\n"


def check_links(path):
    for destination in re.findall(r"\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
        link = urlsplit(destination)
        if link.scheme or link.netloc:
            continue
        target = path.parent / unquote(link.path) if link.path else path
        if not target.is_file():
            raise ValueError(f"{path}: missing Markdown link target {destination!r}")
        if link.fragment:
            headings = re.findall(r"^#{1,6} (.+)$", target.read_text(encoding="utf-8"), re.MULTILINE)
            anchors = {re.sub(r"[^\w -]", "", heading.lower()).replace(" ", "-") for heading in headings}
            if unquote(link.fragment) not in anchors:
                raise ValueError(f"{path}: missing Markdown anchor {destination!r}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify the committed charts and their links")
    args = parser.parse_args()
    catalog = load_pairs()
    chart_dir = ATLAS / "elements"
    expected_paths = {chart_dir / f"{element.lower()}.md" for element in ELEMENTS}
    if args.check and set(chart_dir.iterdir()) != expected_paths:
        raise ValueError("Expected exactly ten generated element charts")
    if not args.check:
        chart_dir.mkdir(exist_ok=True)
    for element in ELEMENTS:
        path = chart_dir / f"{element.lower()}.md"
        content = render_element(element, catalog)
        if args.check:
            if path.read_text(encoding="utf-8") != content:
                raise ValueError(f"{path}: differs from the pair pages. Run {Path(__file__).name} to regenerate.")
        else:
            path.write_text(content, encoding="utf-8")

    if args.check:
        for path in [ATLAS / "README.md", REPO / "README.md", PAIRING_CHART, *sorted(ATLAS.glob("*/*.md"))]:
            check_links(path)
    names = sum(map(len, catalog.values()))
    print(f"{'Verified' if args.check else 'Generated'}: {len(catalog)} unique pairs, {names} rated names, "
          f"{len(ELEMENTS)} element charts, {len(catalog) * 2} pair views")


if __name__ == "__main__":
    main()
