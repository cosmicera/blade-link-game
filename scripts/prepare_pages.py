#!/usr/bin/env python3
"""Assemble the browser game and only its referenced card art for GitHub Pages."""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PVE_ROOT = ROOT / "pve-cave-test-v1"
STATIC_FILES = (
    "index.html",
    "styles.css",
    "main.js",
    "engine.js",
    "data.js",
    "follower-expansion.js",
    "pve-campaign-data.js",
)


def copy_file(source: Path, destination: Path) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"Required Pages file is missing: {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", nargs="?", default="_site", help="output directory (default: _site)")
    args = parser.parse_args()
    destination = Path(args.destination)
    if not destination.is_absolute():
        destination = ROOT / destination

    for relative in STATIC_FILES:
        copy_file(ROOT / relative, destination / relative)

    card_dir = ROOT / "assets" / "cards"
    for source in card_dir.glob("*.png"):
        copy_file(source, destination / "assets" / "cards" / source.name)
    expansion_dir = card_dir / "expansion"
    for source in expansion_dir.glob("*.png"):
        copy_file(source, destination / "assets" / "cards" / "expansion" / source.name)

    campaign = json.loads((PVE_ROOT / "campaign-v1.json").read_text(encoding="utf-8"))
    groups = campaign.get("cards", {})
    pve_cards = [card for group in ("leaders", "followers", "effects") for card in groups.get(group, [])]
    if len(pve_cards) != 52:
        raise ValueError(f"Expected 52 PvE cards (10 leaders, 28 followers, 14 effects); found {len(pve_cards)}")

    copied_images = set()
    for card in pve_cards:
        relative_image = Path(card["image"])
        source = (PVE_ROOT / relative_image).resolve()
        if not source.is_relative_to(PVE_ROOT.resolve()):
            raise ValueError(f"PvE image path escapes the campaign folder: {relative_image}")
        if not source.is_file():
            raise FileNotFoundError(f"Missing image for {card['id']}: {source}")
        relative_output = Path("pve-cave-test-v1") / relative_image
        if relative_output not in copied_images:
            copy_file(source, destination / relative_output)
            copied_images.add(relative_output)

    print(f"Prepared Pages site at {destination}")
    print(f"PvE cards: {len(pve_cards)}; referenced PvE images: {len(copied_images)}")


if __name__ == "__main__":
    main()
