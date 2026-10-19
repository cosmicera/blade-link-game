#!/usr/bin/env python3
"""Build the season-one follower cards from the current character and art manifests."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'follower-expansion-source-v6.json'
V5_ART = ROOT / 'follower-redesign-manifest-v5.json'
V6_ART = ROOT / 'follower-redesign-manifest-v6.json'
OUTPUT = ROOT / 'follower-expansion.js'

FACTION_NAMES = {
    'outpr': '아웃프라웨어',
    'selfas': '셀파스',
    'nanguk': '남극성',
    'unbek': '언벡',
}

# The values below use a compact stat budget: 1-cost cards are narrow specialists,
# 2-3-cost cards combine a role with a useful body, and 4-cost cards change the board.
TUNING = {
    'yeoul':    {'cost': 2, 'attack': 2, 'defense': 1, 'health': 4, 'effect': {'type': 'defense_self', 'amount': 1}, 'defenseEffect': {'type': 'heal_self', 'amount': 1}, 'text': '라운드 시작: 이번 전투 동안 자신의 방어력 +1. 방어전: 자신의 체력 1 회복.'},
    'lagyeong': {'cost': 3, 'attack': 2, 'defense': 2, 'health': 5, 'effect': {'type': 'support_chairperson', 'attack': 1, 'defense': 1}, 'text': '라운드 시작: 아군 전장에 기업 총수·기업 대표·협동조합 대표 추종자가 있으면 이번 전투 동안 공격력과 방어력 +1.', 'flavorText': '주민 동의 기록의 마지막 항목까지 확인한 뒤, 비비안은 공동 운영위원회에 검증 자료를 건넨다.'},
    'haeon':    {'cost': 3, 'attack': 3, 'defense': 1, 'health': 4, 'attackEffect': {'type': 'department_synergy', 'requiredAllies': 1, 'effect': {'type': 'temp_buff_self', 'amount': 2}}, 'text': '연계 능력 · 공격전: 다른 연구개발팀 추종자가 있으면 이번 전투 동안 자신의 공격력 +2.'},
    'chaeyun':  {'cost': 4, 'attack': 2, 'defense': 3, 'health': 7, 'effect': {'type': 'size_limit', 'amount': 1}, 'text': '라운드 시작: 이번 라운드 사이즈 한도 +1.'},
    'surim':    {'cost': 2, 'attack': 2, 'defense': 0, 'health': 3, 'attackEffect': {'type': 'temp_buff_self', 'amount': 1}, 'text': '공격전: 이번 전투 동안 자신의 공격력 +1.'},
    'minju':    {'cost': 3, 'attack': 2, 'defense': 3, 'health': 5, 'effect': {'type': 'defense_self', 'amount': 1}, 'defenseEffect': {'type': 'temp_buff_self', 'amount': 1}, 'text': '라운드 시작: 이번 전투 동안 방어력 +1. 방어전: 이번 전투 동안 공격력 +1.'},
    'chaerin':  {'cost': 3, 'attack': 3, 'defense': 1, 'health': 4, 'attackEffect': {'type': 'temp_buff_self', 'amount': 1}, 'text': '공격전: 이번 전투 동안 자신의 공격력 +1.'},
    'ara':      {'cost': 4, 'attack': 2, 'defense': 3, 'health': 7, 'effect': {'type': 'department_synergy', 'department': '안전관리팀', 'requiredAllies': 1, 'effect': {'type': 'overclock', 'amount': 1}}, 'text': '연계 능력 · 라운드 시작: 다른 안전관리팀 추종자가 있으면 모든 아군 추종자의 이번 전투 공격력 +1.'},
    'rion':     {'cost': 2, 'attack': 1, 'defense': 2, 'health': 4, 'defenseEffect': {'type': 'overclock', 'amount': 1}, 'text': '방어전: 모든 아군 추종자의 이번 전투 공격력 +1.'},
    'somin':    {'cost': 2, 'attack': 2, 'defense': 1, 'health': 4, 'effect': {'type': 'ping_enemy', 'amount': 1}, 'text': '라운드 시작: 가장 약한 상대 추종자에게 1 피해. 상대 추종자가 없으면 대표 캐릭터에게 1 피해.'},
    'eunju':    {'cost': 3, 'attack': 1, 'defense': 2, 'health': 6, 'effect': {'type': 'draw', 'amount': 1}, 'text': '라운드 시작: 카드 1장을 뽑습니다.'},
    'nagyeong': {'cost': 2, 'attack': 2, 'defense': 1, 'health': 4, 'effect': {'type': 'temp_buff_self', 'amount': 1}, 'defenseEffect': {'type': 'temp_buff_self', 'amount': 1}, 'text': '라운드 시작: 이번 전투 동안 공격력 +1. 방어전: 이번 전투 동안 공격력 +1.'},
    'boram':    {'cost': 3, 'attack': 2, 'defense': 3, 'health': 5, 'effect': {'type': 'department_synergy', 'requiredAllies': 1, 'effect': {'type': 'heal_wounded', 'amount': 2}}, 'text': '연계 능력 · 라운드 시작: 다른 연구개발팀 추종자가 있으면 가장 약한 아군 추종자의 체력을 2 회복합니다.'},
    'haeryeong':{'cost': 3, 'attack': 3, 'defense': 1, 'health': 4, 'effect': {'type': 'ping_enemy', 'amount': 1}, 'text': '라운드 시작: 가장 약한 상대 추종자에게 1 피해. 상대 추종자가 없으면 대표 캐릭터에게 1 피해.'},
    'seohwi':   {'cost': 4, 'attack': 2, 'defense': 4, 'health': 7, 'defenseEffect': {'type': 'temp_buff_self', 'amount': 1}, 'text': '방어전: 이번 전투 동안 공격력 +1.'},
    'jeongran': {'cost': 3, 'attack': 1, 'defense': 3, 'health': 7, 'effect': {'type': 'support_chairperson', 'defense': 1, 'heal': 1}, 'text': '라운드 시작: 아군 전장에 기업 총수·기업 대표·협동조합 대표 추종자가 있으면 이번 전투 방어력 +1, 체력 1 회복.', 'flavorText': '거점 사이 물자를 살핀 조라가 레아에게 필요한 보급을 올려보낸다. 대표의 판단은 공방 마을 주민들의 오늘과 맞닿아 있다.'},
    'sojeong':  {'cost': 2, 'attack': 2, 'defense': 0, 'health': 3, 'attackEffect': {'type': 'department_synergy', 'requiredAllies': 1, 'effect': {'type': 'temp_buff_self', 'amount': 2}}, 'text': '연계 능력 · 공격전: 다른 정착지운영팀 추종자가 있으면 이번 전투 동안 자신의 공격력 +2.'},
    'girim':    {'cost': 3, 'attack': 2, 'defense': 3, 'health': 6, 'effect': {'type': 'defense_self', 'amount': 1}, 'defenseEffect': {'type': 'temp_buff_self', 'amount': 1}, 'text': '라운드 시작: 이번 전투 동안 방어력 +1. 방어전: 이번 전투 동안 공격력 +1.'},
    'onjae':    {'cost': 2, 'attack': 1, 'defense': 2, 'health': 5, 'effect': {'type': 'heal_wounded', 'amount': 2}, 'text': '라운드 시작: 가장 약한 아군 추종자의 체력을 2 회복합니다.'},
    'mijeong':  {'cost': 3, 'attack': 2, 'defense': 2, 'health': 5, 'effect': {'type': 'recover', 'amount': 1}, 'text': '라운드 시작: 버림 더미에서 추종자 1장을 손으로 가져옵니다. 가져올 수 없으면 이번 라운드 사이즈 한도 +1.'},
}


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def candidate_profile(characters, person):
    for character in characters:
        if character.get('person') == person or character.get('name') == person:
            return character
    raise ValueError(f'Cannot find art candidates for {person}')


def variant_record(variant):
    return {
        'number': int(variant['number']),
        'label': variant.get('label', f"후보 {int(variant['number']):02d}"),
        'composition': variant.get('composition', variant.get('label', '')),
        'seed': str(variant['seed']),
        'faceSeed': str(variant.get('detailer_seed', variant.get('face_seed', variant.get('faceSeed', '')))),
        'image': variant['image'],
        'positive': variant.get('positive', ''),
        'negative': variant.get('negative', ''),
    }


def main():
    source = read_json(SOURCE)
    v5 = read_json(V5_ART)
    v6 = read_json(V6_ART)
    fixed = dict(source['fixed_selections'])
    fixed['장뤄안'] = 2
    fixed['천서휘'] = 4
    v5_characters = v5['characters']
    v6_by_id = {character['id']: character for character in v6['characters']}
    profiles = []

    for character in source['characters']:
        person = character['person']
        selected_number = int(fixed[person])
        if character['id'] in {'boram', 'seohwi'}:
            art_character = v6_by_id[character['id']]
            variants = [variant_record(variant) for variant in art_character['variants']]
        else:
            art_character = candidate_profile(v5_characters, person)
            variants = [variant_record(variant) for variant in art_character['variants']]
        selected = next((variant for variant in variants if variant['number'] == selected_number), None)
        if not selected:
            raise ValueError(f'Missing selected variant {person} #{selected_number}')
        for variant in variants:
            if not (ROOT / variant['image']).is_file():
                raise FileNotFoundError(variant['image'])

        tuning = TUNING[character['id']]
        stats = {key: tuning[key] for key in ('cost', 'attack', 'defense', 'health')}
        profile = {
            'id': character['id'],
            'name': character['name'],
            'cardName': character.get('card_name', character['person']),
            'person': person,
            'english': character.get('english', ''),
            'faction': character['faction'],
            'factionName': FACTION_NAMES[character['faction']],
            'role': character['role'],
            'department': character['department'],
            'age': character.get('age', art_character.get('age', 0)),
            'height': character.get('height_cm', art_character.get('height', 0)),
            'measurements': character.get('measurements_cm', art_character.get('measurements', {'bust': 0, 'waist': 0, 'hip': 0})),
            'story': character.get('story', ''),
            'personality': character.get('personality', ''),
            'visualPersonality': character.get('visual_personality_en', character.get('visualPersonality', '')),
            'exposureTargetPercent': character.get('exposure_target_percent', character.get('exposureTargetPercent', 0)),
            'stats': {**stats, 'text': tuning['text']},
            'defaultVariant': selected_number,
            'gameImage': {
                'image': f"assets/cards/expansion/{character['id']}.png",
                'seed': selected['seed'],
                'number': selected_number,
            },
            'variants': variants,
        }
        profiles.append(profile)

    # Department names are tags only; card effects carry any explicit synergy conditions.
    department_counts = {}
    for character in source['characters']:
        key = (character['faction'], character['department'])
        department_counts[key] = department_counts.get(key, 0) + 1
    output = f'''/* Generated by scripts/build_game_follower_pool.py. */
(() => {{
  const profiles = {json.dumps(profiles, ensure_ascii=False, separators=(',', ':'))};
  const storageKey = 'blade-link-follower-art-selections-20261019-season-one';
  let saved = {{}};
  try {{ saved = JSON.parse(localStorage.getItem(storageKey) || '{{}}'); }} catch (_) {{ saved = {{}}; }}
  const selections = Object.fromEntries(profiles.map(profile => [profile.id, profile.defaultVariant]));
  Object.assign(selections, saved);
  profiles.forEach(profile => {{
    const chosen = profile.variants.some(variant => variant.number === Number(selections[profile.id]));
    if (!chosen) selections[profile.id] = profile.defaultVariant;
  }});
  try {{ localStorage.setItem(storageKey, JSON.stringify(selections)); }} catch (_) {{ /* art is still fixed by the defaults */ }}
  window.FOLLOWER_ART_STORAGE_KEY = storageKey;
  window.FOLLOWER_EXPANSION = profiles;
  window.GAME_DATA.cards.push(...profiles.map(profile => {{
    const selectedNumber = Number(selections[profile.id] || profile.defaultVariant);
    const art = profile.variants.find(variant => variant.number === selectedNumber) || profile.variants.find(variant => variant.number === profile.defaultVariant);
    const gameArt = profile.gameImage || art;
    const tuning = TUNING[profile.id];
    return {{
      id: profile.id, type: 'unit', faction: profile.faction, name: profile.cardName,
      person: profile.person, role: profile.role, department: profile.department,
      image: gameArt.image, seed: gameArt.seed,
      cost: profile.stats.cost, attack: profile.stats.attack, defense: profile.stats.defense,
      health: profile.stats.health, effect: tuning.effect || null,
      attackEffect: tuning.attackEffect || null, defenseEffect: tuning.defenseEffect || null,
      text: profile.stats.text, symbol: ['❋', '⚙', '雪', '⌂'][['outpr','selfas','nanguk','unbek'].indexOf(profile.faction)],
      story: profile.story, personality: profile.personality, expansion: true,
      selectedArtVariant: gameArt.number, selectedArtSeed: gameArt.seed
    }};
  }}));
}})();
'''
    # Keep the data tuning object in the generated browser file so its origin is explicit.
    injected = f"const TUNING = {json.dumps(TUNING, ensure_ascii=False, separators=(',', ':'))};\n  const storageKey ="
    output = output.replace("const storageKey =", injected, 1)
    OUTPUT.write_text(output, encoding='utf-8')
    print(f'Wrote {OUTPUT.name}: {len(profiles)} followers; {len(fixed)} fixed illustrations.')
    print('Faction/department pairs with at least two new followers:', ', '.join(f'{faction}:{department}' for (faction, department), count in department_counts.items() if count >= 2))


if __name__ == '__main__':
    main()
