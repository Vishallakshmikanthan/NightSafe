"""
NightSafe — Government Investment Recommendation Module

Identifies the most critical streets for safety-related government investment
by aggregating danger frequency, average safety score, and population proxy
(footfall) from the Chennai night-safety dataset.

Output:
  - Top-10 most critical streets ranked by composite investment priority
  - JSON report  (data/investment_report.json)
  - Text report  (data/investment_report.txt)
  - PDF summary  (data/investment_report.pdf)   [bonus]

Usage:
    python -m ml.investment_model              # print + write all reports
    python -m ml.investment_model --top 5      # override number of streets
    python -m ml.investment_model --no-pdf     # skip PDF generation
"""

from __future__ import annotations

import csv
import json
import math
from datetime import datetime
from pathlib import Path
from typing import List

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
INPUT_CSV = DATA_DIR / "chennai_scored.csv"

# ---------------------------------------------------------------------------
# Composite scoring weights
# ---------------------------------------------------------------------------
W_DANGER_FREQ = 0.40   # how often the street enters DANGER zone
W_SAFETY_AVG  = 0.35   # lower average safety → higher priority
W_FOOTFALL    = 0.25   # more people exposed → higher urgency


def _load_rows() -> list[dict]:
    """Read the scored CSV and return a list of row dicts."""
    rows: list[dict] = []
    with open(INPUT_CSV, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            rows.append({
                "street_id": r["street_id"],
                "street_name": r["street_name"],
                "hour": int(r["hour"]),
                "footfall": int(r["footfall"]),
                "lighting_status": int(r["lighting_status"]),
                "crime_score": float(r["crime_score"]),
                "safety_score": float(r["safety_score"]),
                "zone": r["zone"],
            })
    return rows


def aggregate_streets(rows: list[dict]) -> list[dict]:
    """
    Per-street aggregation:
      - danger_hours   : count of hourly readings classified as DANGER
      - caution_hours  : count of CAUTION readings
      - avg_safety     : mean safety score across all hours
      - min_safety     : worst (lowest) safety score
      - total_footfall : sum of footfall across hours (population exposure proxy)
      - avg_crime      : mean crime score
      - lighting_fails : count of hours with failed lighting
    """
    bucket: dict[str, dict] = {}

    for r in rows:
        sid = r["street_id"]
        if sid not in bucket:
            bucket[sid] = {
                "street_id": sid,
                "street_name": r["street_name"],
                "scores": [],
                "footfalls": [],
                "crime_scores": [],
                "danger_hours": 0,
                "caution_hours": 0,
                "lighting_fails": 0,
                "readings": 0,
            }
        b = bucket[sid]
        b["scores"].append(r["safety_score"])
        b["footfalls"].append(r["footfall"])
        b["crime_scores"].append(r["crime_score"])
        b["readings"] += 1
        if r["zone"] == "DANGER":
            b["danger_hours"] += 1
        elif r["zone"] == "CAUTION":
            b["caution_hours"] += 1
        if r["lighting_status"] == 1:
            b["lighting_fails"] += 1

    result: list[dict] = []
    for b in bucket.values():
        result.append({
            "street_id": b["street_id"],
            "street_name": b["street_name"],
            "danger_hours": b["danger_hours"],
            "caution_hours": b["caution_hours"],
            "avg_safety": round(sum(b["scores"]) / len(b["scores"]), 1),
            "min_safety": round(min(b["scores"]), 1),
            "total_footfall": sum(b["footfalls"]),
            "avg_crime": round(sum(b["crime_scores"]) / len(b["crime_scores"]), 3),
            "lighting_fails": b["lighting_fails"],
            "readings": b["readings"],
        })
    return result


def compute_priority(streets: list[dict]) -> list[dict]:
    """
    Compute a composite **investment priority score** (0-100) for each street.

    Higher score = more urgent need for government investment.

    Components (normalised 0-1 before weighting):
      - danger_freq  : danger_hours / total readings
      - safety_inv   : (100 - avg_safety) / 100
      - footfall_norm: total_footfall / max_footfall  (sqrt-scaled)
    """
    max_footfall = max(s["total_footfall"] for s in streets) or 1

    for s in streets:
        danger_freq = s["danger_hours"] / s["readings"] if s["readings"] else 0
        safety_inv = (100 - s["avg_safety"]) / 100
        footfall_norm = math.sqrt(min(s["total_footfall"] / max_footfall, 1.0))

        priority = (
            W_DANGER_FREQ * danger_freq
            + W_SAFETY_AVG * safety_inv
            + W_FOOTFALL * footfall_norm
        ) * 100

        s["investment_priority"] = round(priority, 1)
        s["danger_freq_pct"] = round(danger_freq * 100, 1)

    return streets


def rank_streets(streets: list[dict], top_n: int = 10) -> list[dict]:
    """Return the top-N streets sorted by investment priority (descending)."""
    ranked = sorted(streets, key=lambda s: s["investment_priority"], reverse=True)
    for i, s in enumerate(ranked, 1):
        s["rank"] = i
    return ranked[:top_n]


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def _report_metadata(top_n: int) -> dict:
    return {
        "report_title": "NightSafe Government Investment Recommendation",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "methodology": (
            f"Streets ranked by composite Investment Priority Score (0-100) "
            f"combining danger frequency ({int(W_DANGER_FREQ*100)}%), "
            f"inverse avg safety ({int(W_SAFETY_AVG*100)}%), "
            f"and population exposure ({int(W_FOOTFALL*100)}%)."
        ),
        "data_source": str(INPUT_CSV.name),
        "top_n": top_n,
    }


def generate_json(ranked: list[dict], path: Path | None = None) -> dict:
    """Build and optionally write a JSON investment report."""
    report = {
        "metadata": _report_metadata(len(ranked)),
        "recommendations": [
            {
                "rank": s["rank"],
                "street_id": s["street_id"],
                "street_name": s["street_name"],
                "investment_priority": s["investment_priority"],
                "danger_freq_pct": s["danger_freq_pct"],
                "avg_safety_score": s["avg_safety"],
                "min_safety_score": s["min_safety"],
                "total_footfall": s["total_footfall"],
                "avg_crime_score": s["avg_crime"],
                "lighting_failures": s["lighting_fails"],
            }
            for s in ranked
        ],
    }
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2)
    return report


def generate_text_report(ranked: list[dict], path: Path | None = None) -> str:
    """Build a human-readable text report."""
    meta = _report_metadata(len(ranked))
    lines: list[str] = [
        "=" * 72,
        meta["report_title"].upper(),
        "=" * 72,
        f"Generated : {meta['generated_at']}",
        f"Data      : {meta['data_source']}",
        f"Method    : {meta['methodology']}",
        "",
        f"Top {len(ranked)} Most Critical Streets for Investment",
        "-" * 72,
        f"{'Rank':<5} {'Street':<30} {'Priority':>8} {'Danger%':>8} "
        f"{'AvgSafe':>8} {'Footfall':>9}",
        "-" * 72,
    ]

    for s in ranked:
        lines.append(
            f"{s['rank']:<5} {s['street_name']:<30} {s['investment_priority']:>8.1f} "
            f"{s['danger_freq_pct']:>7.1f}% {s['avg_safety']:>8.1f} "
            f"{s['total_footfall']:>9}"
        )

    lines += [
        "-" * 72,
        "",
        "RECOMMENDATIONS:",
    ]
    for s in ranked[:3]:
        lines.append(
            f"  * {s['street_name']} (Priority {s['investment_priority']:.1f}) — "
            f"Danger in {s['danger_freq_pct']:.0f}% of night hours. "
            f"Avg safety {s['avg_safety']:.1f}/100. "
            f"{s['lighting_fails']} lighting failure(s). "
            f"Serves ~{s['total_footfall']} pedestrians/night."
        )

    lines += ["", "=" * 72]
    text = "\n".join(lines)

    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(text)
    return text


def generate_pdf(ranked: list[dict], path: Path | None = None) -> Path:
    """
    Export a styled PDF investment summary using ReportLab.

    Returns the path to the generated PDF.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    if path is None:
        path = DATA_DIR / "investment_report.pdf"
    path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(path), pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle", parent=styles["Title"], fontSize=18, spaceAfter=12,
    )
    subtitle_style = ParagraphStyle(
        "SubTitle", parent=styles["Normal"], fontSize=10,
        textColor=colors.grey, spaceAfter=20,
    )

    elements: list = []

    # Title
    elements.append(Paragraph(
        "NightSafe — Government Investment Recommendation", title_style,
    ))
    meta = _report_metadata(len(ranked))
    elements.append(Paragraph(
        f"Generated: {meta['generated_at']}  |  Source: {meta['data_source']}",
        subtitle_style,
    ))
    elements.append(Paragraph(meta["methodology"], styles["Normal"]))
    elements.append(Spacer(1, 10 * mm))

    # Table
    header = [
        "Rank", "Street", "Priority", "Danger %",
        "Avg Safety", "Footfall", "Light Fails",
    ]
    data = [header]
    for s in ranked:
        data.append([
            str(s["rank"]),
            s["street_name"],
            f"{s['investment_priority']:.1f}",
            f"{s['danger_freq_pct']:.1f}%",
            f"{s['avg_safety']:.1f}",
            str(s["total_footfall"]),
            str(s["lighting_fails"]),
        ])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (1, 1), (1, -1), "LEFT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8 * mm))

    # Key recommendations
    elements.append(Paragraph(
        "Key Recommendations", styles["Heading2"],
    ))
    for s in ranked[:3]:
        elements.append(Paragraph(
            f"<b>{s['rank']}. {s['street_name']}</b> — "
            f"Priority {s['investment_priority']:.1f}. "
            f"Classified DANGER in {s['danger_freq_pct']:.0f}% of night hours. "
            f"Average safety {s['avg_safety']:.1f}/100 with "
            f"{s['lighting_fails']} lighting failure(s). "
            f"Approximately {s['total_footfall']} pedestrians exposed per night.",
            styles["Normal"],
        ))
        elements.append(Spacer(1, 3 * mm))

    doc.build(elements)
    return path


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main(top_n: int = 10, write_pdf: bool = True) -> dict:
    """Run the full pipeline and return the JSON report dict."""
    rows = _load_rows()
    streets = aggregate_streets(rows)
    streets = compute_priority(streets)
    ranked = rank_streets(streets, top_n=top_n)

    # JSON
    json_path = DATA_DIR / "investment_report.json"
    report = generate_json(ranked, json_path)
    print(f"[✓] JSON report  → {json_path}")

    # Text
    txt_path = DATA_DIR / "investment_report.txt"
    text = generate_text_report(ranked, txt_path)
    print(f"[✓] Text report  → {txt_path}")
    print()
    print(text)

    # PDF
    if write_pdf:
        pdf_path = generate_pdf(ranked)
        print(f"\n[✓] PDF report   → {pdf_path}")

    return report


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="NightSafe Investment Recommendation Module",
    )
    parser.add_argument(
        "--top", type=int, default=10,
        help="Number of streets to recommend (default: 10)",
    )
    parser.add_argument(
        "--no-pdf", action="store_true",
        help="Skip PDF generation",
    )
    args = parser.parse_args()
    main(top_n=args.top, write_pdf=not args.no_pdf)
