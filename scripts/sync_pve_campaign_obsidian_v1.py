#!/usr/bin/env python3
"""Write the PvE campaign cards and ComfyUI seeds to the local Obsidian vault."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SET_DIR = ROOT / "pve-cave-test-v1"
VAULT = Path("/mnt/d/설정&스토리&프롬프트/블레이드 링크/07 PvE")
ASSET_DIR_NAME = "심층 탐사 캠페인 카드 첨부"
NOTE = VAULT / "스타룬데르 심층 탐사 - 몬스터·효과 카드 원화와 seed.md"


def sync_boss_note(path: Path, cards: list[dict], heading_for, image_for) -> None:
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    for card in cards:
        heading = heading_for(card)
        start = text.find(heading)
        if start < 0:
            continue
        next_heading = text.find("\n### ", start + len(heading))
        end = next_heading if next_heading >= 0 else len(text)
        block = text[start:end]
        markup = image_for(card)
        image_pattern = re.compile(r"!\[\[.*?\]\]|!\[\]\(.*?\)")
        if image_pattern.search(block):
            block = image_pattern.sub(markup, block, count=1)
        else:
            block = block.replace(heading, heading + "\n\n" + markup, 1)
        habitat_line = f"- 서식지: {card.get('habitat', '기록 필요')}"
        if re.search(r"(?m)^- 서식지:.*$", block):
            block = re.sub(r"(?m)^- 서식지:.*$", habitat_line, block, count=1)
        else:
            image_match = image_pattern.search(block)
            if image_match:
                block = block[:image_match.end()] + "\n\n" + habitat_line + block[image_match.end():]
        if card.get("artSeed") is not None:
            seed_line = f"- seed: `{card['artSeed']}`"
            block = re.sub(r"(?m)^- seed:.*(?:\n|$)", "", block, count=1)
            block = block.replace(habitat_line, habitat_line + "\n" + seed_line, 1)
        text = text[:start] + block + text[end:]
    path.write_text(text, encoding="utf-8")


def card_section(card: dict, manifest: dict, label: str) -> list[str]:
    image = manifest.get("images", {}).get(card["id"], {})
    seed = image.get("seed", "생성 대기")
    lines = [
        f"### {card['name']} · {card.get('englishName', '')}",
        "",
        f"![[{ASSET_DIR_NAME}/{card['id']}.png]]",
        "",
        f"- 분류: {label}",
        f"- 카드 ID: `{card['id']}`",
        f"- 서식지: {card.get('habitat', '기록 필요')}",
        f"- 능력치: 코스트 {card['cost']} / 공 {card.get('attack', '—')} / 방 {card.get('defense', '—')} / 체 {card.get('health', '—')}",
        f"- 효과: {card.get('text', card.get('abilityText', ''))}",
        f"- 시각 설정: {card.get('visualConcept', card.get('story', ''))}",
        f"- 원본: `D:\\work\\blade-link-game\\pve-cave-test-v1\\{image.get('project_path', '')}`",
        "",
        f"<details><summary>ComfyUI 생성 정보 · seed {seed}</summary>",
        "",
        f"- 체크포인트: `{manifest.get('model', 'animaPencilXL_v500.safetensors')}`",
        f"- 해상도: {manifest.get('resolution', [832, 1216])[0]} × {manifest.get('resolution', [832, 1216])[1]}",
        f"- 샘플러: `{manifest.get('sampler', 'euler_ancestral')}` / `{manifest.get('scheduler', 'normal')}` · {manifest.get('steps', 30)} steps · CFG {manifest.get('cfg', 5.0)}",
        "",
        "**Positive prompt**",
        "",
        "```text",
        image.get("positive_prompt", "생성 전"),
        "```",
        "",
        "**Negative prompt**",
        "",
        "```text",
        image.get("negative_prompt", "생성 전"),
        "```",
        "",
        "</details>",
        "",
    ]
    return lines


def main() -> None:
    campaign = json.loads((SET_DIR / "campaign-v1.json").read_text(encoding="utf-8"))
    manifest_path = SET_DIR / "campaign-art-manifest-v1.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"images": {}}
    VAULT.mkdir(parents=True, exist_ok=True)
    lines = [
        "---",
        "상태: 게임 연결 / 원화 생성 완료",
        "세계관: 블레이드 링크",
        "분류: PvE · 시즌 1",
        "---",
        "",
        "# 스타룬데르 심층 탐사 — 몬스터·효과 카드 원화와 seed",
        "",
        "총 10층 캠페인이다. 모든 층은 독립 대전이며, 전투가 시작될 때마다 플레이어 라이프 30, 새 덱·손패·전장으로 시작한다. 층 사이에는 전투 상태를 이월하지 않고 탐사 서사만 연결한다.",
        "",
        "## 게임 내 적용",
        "",
        "- 상단 `PvE 탐사` 또는 로비의 `심층 탐사`에서 1~10층을 직접 선택한다. 각 전투는 독립적으로 시작하고, 플레이어 라이프는 매번 30으로 초기화한다.",
        "- 층 대표 캐릭터 10장, 몬스터 추종자 28장, 탐사 효과 14장으로 도감에 총 52장이 연결되어 있다. `몬스터` 필터 안에서 세 종류를 구분해 나열하고, `탐사 효과` 필터로 효과만 따로 볼 수도 있다.",
        "- 카드 도감은 앞면에서 일러스트 전체를 보여주고, 뒤집으면 능력치·효과·서식지를 표시한다. 52장 모두 서식지 메타데이터와 게임 이미지가 확인되었다.",
        "- PvE 카드는 PvP 진영 덱 편성 풀에 포함하지 않는다. 배포 데이터는 `pve-cave-test-v1/campaign-v1.json`에서 생성한다.",
        "",
        "- 10층 대표 생물 원화는 기존 `심층 탐사 생물 카드 10종 첨부`에 보관한다.",
        "- 층 대표 보스 라이프: 1~4층 20 / 5~9층 25 / 10층 30.",
        "- 적 덱은 층마다 30장: 추종자 20장 + 탐사 효과 10장, 동일 카드 최대 3장.",
        "- 일반 몬스터 추종자 28종과 탐사 효과 14종 원본은 게임 폴더 및 이 노트의 첨부 폴더에 보관한다.",
        "- 일러스트 규격은 832 × 1216. 원화 PNG에는 ComfyUI prompt/workflow metadata와 seed가 포함되어 있다.",
        "- ComfyUI 워크플로: `[[AnimaPencilXL_v500_PVE_Cave_Follower_Card.json]]`, `[[AnimaPencilXL_v500_PVE_Expedition_Effect_Card.json]]`.",
        "",
        "## 원화 검수 및 보정 기록",
        "",
        "- 2026-10-20: 사람 실루엣이 섞인 탐사 효과 3종(자갈 파쇄, 균열 공명, 잔향 유인)을 지면·암석 근접 구도로 다시 생성했다.",
        "- 2026-10-20: 뿌리도약개구리를 넓적한 머리·돌출된 눈·접힌 뒷다리가 보이는 개구리형으로 재생성했다.",
        "- 2026-10-20: 추종자 여우 4종은 지구의 붉은·흰 털 여우와 구별되도록 행성 고유의 청록·남보라·자주색 털과 발광 무늬로 재설계했다. 맥동빛달림짐승은 여우형에서 벗어난 독립 토착 포유류로 정리했다.",
        "- 2026-10-20: 7층 대표 메아리여우도 발광 공명무늬와 광물성 피부 특징을 가진 단일 토착 개체로 다시 만들었다.",
        "- 보정 원화의 최신 seed와 positive/negative prompt는 아래 각 카드 항목의 ComfyUI 생성 정보에 기록했다.",
        "",
        "## 몬스터 추종자",
        "",
    ]
    for card in campaign["cards"]["followers"]:
        lines.extend(card_section(card, manifest, "공통 생태권" if card.get("pool") == "common" else "층별 생태권"))
    lines.extend(["## 탐사 효과 카드", ""])
    for card in campaign["cards"]["effects"]:
        lines.extend(card_section(card, manifest, "공통 효과" if card.get("pool") == "common" else "층 전용 효과"))
    leaders_manifest_path = SET_DIR / "manifest.json"
    leaders_manifest = json.loads(leaders_manifest_path.read_text(encoding="utf-8")) if leaders_manifest_path.is_file() else {"images": {}}
    leader = next((card for card in campaign["cards"]["leaders"] if card["id"] == "boss_07_echofox"), None)
    if leader:
        image = leaders_manifest.get("images", {}).get("07_echofox", {})
        filename = image.get("project_filename", "07_메아리여우_v5.png")
        lines.extend([
            "## 층 대표 생물 추가 보정",
            "",
            f"### 7층 — {leader['name']}",
            "",
            f"![[심층 탐사 생물 카드 10종 첨부/{filename}]]",
            "",
            f"- 카드 ID: `{leader['id']}`",
            f"- 서식지: {leader.get('habitat', '기록 필요')}",
            f"- 콘셉트: {leader.get('role', '')} · {leader.get('story', '')}",
            f"- 원본: `D:\\work\\blade-link-game\\pve-cave-test-v1\\{leader.get('image', '')}`",
            f"- seed: `{image.get('seed', '생성 대기')}` · 832 × 1216 · AnimaPencil XL v5.0",
            "",
            "<details><summary>대표 여우 원화 prompt</summary>",
            "",
            "**Positive prompt**",
            "",
            "```text",
            image.get("positive_prompt", "생성 대기"),
            "```",
            "",
            "**Negative prompt**",
            "",
            "```text",
            image.get("negative_prompt", "생성 대기"),
            "```",
            "",
            "</details>",
            "",
        ])
    lines.extend([
        "## 원본 파일",
        "",
        "- 카드·층별 덱 정의: `pve-cave-test-v1/campaign-v1.json`",
        "- seed/prompt manifest: `pve-cave-test-v1/campaign-art-manifest-v1.json`",
        "- 카드 원화 비교 HTML: `pve-cave-test-v1/스타룬데르 심층 탐사 - 캠페인 카드 원화 비교.html`",
        "- API/Comfy 워크플로 및 생성 스크립트: `pve-cave-test-v1/workflows/campaign_api`, `scripts/generate_pve_campaign_cards_v1.py`",
        "",
    ])
    NOTE.write_text("\n".join(lines), encoding="utf-8")
    design_note = VAULT / "스타룬데르 심층 탐사 - 10층 캠페인 덱 설계.md"
    if design_note.is_file():
        text = design_note.read_text(encoding="utf-8")
        text = text.replace("상태: 카드·덱 설계 및 게임 연결", "상태: 카드·덱·원화 및 게임 연결 완료")
        text = text.replace(
            "- 28종 추종자와 14종 효과 카드는 텍스트·능력치·시각 콘셉트까지 작성했다. 각 카드 원화와 seed 메타데이터는 ComfyUI 제작 후 이 문서에 첨부한다.",
            "- 28종 추종자와 14종 효과 카드 원화를 ComfyUI AnimaPencil XL로 제작했다. 832×1216 이미지, seed, positive/negative prompt는 [[스타룬데르 심층 탐사 - 몬스터·효과 카드 원화와 seed]]에 정리했다.",
        )
        text = text.replace(
            "- 게임의 탐사 캠페인 화면에서 10개 층을 선택해 독립 대전을 시작한다. 각 전투는 플레이어 라이프 30과 층별 보스 라이프에서 시작한다.",
            "- 상단 ‘PvE 탐사’ 메뉴와 로비의 ‘심층 탐사’ 버튼에서 10개 층 중 하나를 골라 독립 대전을 시작한다. 각 전투는 플레이어 라이프 30과 층별 보스 라이프에서 시작하고, 층 사이에 전투 상태를 이월하지 않는다.",
        )
        text = text.replace(
            "- 카드 도감의 ‘몬스터’ 탭에서 층 대표 생물과 추종자를, ‘탐사 효과’ 탭에서 PvE 효과 카드를 확인한다.",
            "- 카드 도감의 ‘몬스터’ 필터에 층 대표 캐릭터 10장·추종자 28장·효과 14장을 함께 나열한다. ‘탐사 효과’ 필터는 효과 카드만 보는 보조 필터다.",
        )
        if "52장 모두 서식지" not in text:
            text = text.replace(
                "## 구현 상태와 파일",
                "## 구현 상태와 파일\n\n"
                "- 카드 도감은 앞면에서 전체 일러스트를 보여주고 뒷면에 능력치·효과·서식지를 표시한다. 10층 대표·28종 추종자·14종 효과 총 52장 모두 서식지가 기록되어 있다.\n"
                "- PvE 카드풀은 PvP 덱 편성과 분리되어 있다. `pve-cave-test-v1/campaign-v1.json`이 카드·서식지·층별 덱의 기준 데이터이며 `scripts/sync_pve_campaign_runtime.py`가 브라우저 런타임 데이터를 생성한다.\n",
                1,
            )
        design_note.write_text(text, encoding="utf-8")

    leaders = campaign["cards"]["leaders"]
    design_note = VAULT / "스타룬데르 심층 탐사 - 10층 캠페인 덱 설계.md"
    sync_boss_note(
        design_note,
        leaders,
        lambda card: f"### {card['floor']}층 — {card['name']} · 라이프 {card['health']}",
        lambda card: f"![[심층 탐사 생물 카드 10종 첨부/{Path(card['image']).name}]]",
    )
    pilot_note = VAULT / "스타룬데르 심층 탐사 - 생물 카드 10종 시범.md"
    sync_boss_note(
        pilot_note,
        leaders,
        lambda card: f"### {card['floor']}층 — {card['name']}",
        lambda card: f"![](./심층 탐사 생물 카드 10종 첨부/{Path(card['image']).name})",
    )
    print(f"Wrote {NOTE}")


if __name__ == "__main__":
    main()
