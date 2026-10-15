/* Local, editable card set for the Blade Link prototype. */
window.GAME_DATA = {
  factions: {
    outpr: {
      id: 'outpr', name: '아웃프라웨어', short: 'OUTPR', district: '녹관도시',
      color: '#9dce8a', accent: '#d8efb8', style: '회복 · 성장 · 지원',
      blurb: '도시의 생명망을 돌보며 서로의 회복을 돕습니다.', leader: 'ria'
    },
    selfas: {
      id: 'selfas', name: '셀파스', short: 'SELFAS', district: '기어시티',
      color: '#aab7c1', accent: '#e0e8ed', style: '정비 · 무장 · 행동 연계',
      blurb: '메카닉 기술과 정비 계획으로 전투의 흐름을 바꿉니다.', leader: 'arca'
    },
    nanguk: {
      id: 'nanguk', name: '남극성', short: 'NANGUK', district: '백좌구',
      color: '#87aedd', accent: '#d4e8fb', style: '방어 · 반격 · 순서 조절',
      blurb: '절제된 검식과 단단한 수비로 반격의 기회를 엽니다.', leader: 'cheongyeon'
    },
    unbek: {
      id: 'unbek', name: '언벡', short: 'UNBEK', district: '자치구 연합',
      color: '#a5a0aa', accent: '#ded8e1', style: '회수 · 기습 · 유연한 경로',
      blurb: '작은 공동체의 연결망과 재활용 장비로 빈틈을 찾습니다.', leader: 'noa'
    }
  },
  leaders: {
    ria: { id: 'ria', faction: 'outpr', name: '새순의 기사 리아', epithet: '이음시의 길잡이', image: 'assets/cards/ria.png', quote: '같이 가자. 네가 쉴 자리도 만들어 둘게.', ability: '새순의 손길', abilityText: '라운드 시작 시 내 대표 라이프를 2, 아군 추종자를 1 회복합니다.', seed: '1566391587789165' },
    arca: { id: 'arca', faction: 'selfas', name: '제1집행관 아르카', epithet: '도시 안전 AI', image: 'assets/cards/arca.png', quote: '경로를 수정합니다. 당신의 선택을 반영했습니다.', ability: '장비 재배치', abilityText: '라운드 시작 시 이번 라운드 사이즈 한도를 1 높입니다.', seed: '6424778036880785' },
    cheongyeon: { id: 'cheongyeon', faction: 'nanguk', name: '푸른 제비 청연', epithet: '남극성 대표 검사', image: 'assets/cards/cheongyeon.png', quote: '다음 길은 내가 먼저 볼게. 따라올 거지?', ability: '푸른 방어선', abilityText: '라운드 시작 시 아군 추종자의 이번 전투 방어력을 2 높입니다. 이 강화는 라운드 종료 시 사라집니다. 아군이 없으면 손패 여유가 있을 때 1장 뽑습니다.', seed: '8426524219450097' },
    noa: { id: 'noa', faction: 'unbek', name: '도시를 잇는 배달부 노아', epithet: '언벡 리그 대표', image: 'assets/cards/noa.png', quote: '어느 도시에 살든, 기다리는 편지는 있잖아.', ability: '골목길 지름', abilityText: '라운드 시작 시 버림 더미에서 추종자 1장을 손으로 가져옵니다. 가져올 수 없으면 손패 여유가 있을 때 1장 뽑습니다.', seed: '8899084558523978' }
  },
  cards: [
    { id: 'verda', type: 'unit', faction: 'outpr', name: '녹관의 총수 베르다', role: '지휘관', image: 'assets/cards/verda.png', seed: '6155868119575495', cost: 4, attack: 2, defense: 2, health: 6, effect: 'heal_leader', text: '라운드 시작 시 내 리더의 체력을 2 회복합니다.', symbol: '✦' },
    { id: 'serin', type: 'unit', faction: 'outpr', name: '정원의 의사 세린', role: '생체 장비 의사', image: 'assets/cards/serin.png', seed: '2120461513044252', cost: 3, attack: 2, defense: 1, health: 4, effect: 'heal_wounded', text: '라운드 시작 시 가장 약한 아군 추종자를 2 회복합니다.', symbol: '❋' },
    { id: 'mora', type: 'unit', faction: 'outpr', name: '경계정원의 순찰자 모라', role: '생태 순찰자', image: 'assets/cards/mora.png', seed: '1166536359809026', cost: 2, attack: 2, defense: 2, health: 3, effect: 'defense_self', text: '라운드 시작 시 이번 전투 동안 자신의 방어력이 2 높아집니다.', symbol: '⌁' },
    { id: 'eve', type: 'unit', faction: 'outpr', name: '새싹원의 방문자 이브', role: '감각 연구 참여자', image: 'assets/cards/eve.png', seed: '1505280436019269', cost: 2, attack: 1, defense: 0, health: 3, effect: 'draw', text: '라운드 시작 시 카드 1장을 뽑습니다.', symbol: '❀' },

    { id: 'vector', type: 'unit', faction: 'selfas', name: '최단거리의 검 벡터', role: '가속 장비 파일럿', image: 'assets/cards/vector.png', seed: '6169256393462217', cost: 4, attack: 4, defense: 1, health: 3, effect: 'buff_self', text: '라운드 시작 시 자신의 공격력을 1 높입니다.', symbol: '⌁' },
    { id: 'nia', type: 'unit', faction: 'selfas', name: '추억 보관사 니아', role: '기록 장비 전문관', image: 'assets/cards/nia.png', seed: '3830636596340106', cost: 3, attack: 2, defense: 2, health: 5, effect: 'draw', text: '라운드 시작 시 카드 1장을 뽑습니다.', symbol: '◈' },
    { id: 'sion', type: 'unit', faction: 'selfas', name: '유쾌한 설계자 시온', role: '리그 장비 개발자', image: 'assets/cards/sion.png', seed: '8636559757080557', cost: 2, attack: 2, defense: 1, health: 3, effect: 'defense_self', text: '라운드 시작 시 이번 전투 동안 자신의 방어력이 2 높아집니다.', symbol: '⚙' },

    { id: 'seolha', type: 'unit', faction: 'nanguk', name: '백좌의 대표 설하', role: '검술 리그 심판위원', image: 'assets/cards/seolha.png', seed: '5055147255926520', cost: 4, attack: 2, defense: 2, health: 6, effect: 'defense_all', text: '라운드 시작 시 모든 아군 추종자의 이번 전투 방어력이 1 높아집니다.', symbol: '雪' },
    { id: 'wolbaek', type: 'unit', faction: 'nanguk', name: '별빛 기록관 월백', role: '공공 기록 연구자', image: 'assets/cards/wolbaek.png', seed: '2062650613166138', cost: 2, attack: 1, defense: 1, health: 4, effect: 'draw', text: '라운드 시작 시 카드 1장을 뽑습니다.', symbol: '✧' },
    { id: 'yuran', type: 'unit', faction: 'nanguk', name: '자유검의 객원교사 유란', role: '객원 검술 교사', image: 'assets/cards/yuran.png', seed: '1120091834453628', cost: 3, attack: 3, defense: 1, health: 3, effect: 'buff_self', text: '라운드 시작 시 공격력이 1 증가합니다.', symbol: '☯' },
    { id: 'soun', type: 'unit', faction: 'nanguk', name: '별을 듣는 견습생 소운', role: '음향 관측 견습생', image: 'assets/cards/soun.png', seed: '7785836849691659', cost: 1, attack: 1, defense: 0, health: 2, effect: 'defense_self', text: '라운드 시작 시 이번 전투 동안 자신의 방어력이 2 높아집니다.', symbol: '♪' },

    { id: 'lea', type: 'unit', faction: 'unbek', name: '자치구의 대표 레아', role: '협동조합 대표', image: 'assets/cards/lea.png', seed: '6368332127497987', cost: 3, attack: 2, defense: 2, health: 5, effect: 'heal_leader', text: '라운드 시작 시 내 리더의 체력을 2 회복합니다.', symbol: '⌂' },
    { id: 'ash', type: 'unit', faction: 'unbek', name: '골목의 신호수 애쉬', role: '분산 AI 통신 관리자', image: 'assets/cards/ash.png', seed: '1737601682837601', cost: 2, attack: 1, defense: 1, health: 4, effect: 'draw', text: '라운드 시작 시 카드 1장을 뽑습니다.', symbol: '⌁' },
    { id: 'rook', type: 'unit', faction: 'unbek', name: '골목의 검장 로크', role: '공용 장비 수리공', image: 'assets/cards/rook.png', seed: '36688852601639', cost: 3, attack: 3, defense: 1, health: 4, effect: 'buff_self', text: '라운드 시작 시 공격력이 1 증가합니다.', symbol: '⚒' },
    { id: 'veil', type: 'unit', faction: 'unbek', name: '자유의 호위검 베일', role: '독립 호위 AI', image: 'assets/cards/veil.png', seed: '6356542998253242', cost: 4, attack: 4, defense: 1, health: 3, effect: 'defense_self', text: '라운드 시작 시 이번 전투 동안 자신의 방어력이 2 높아집니다.', symbol: '◇' },
    { id: 'ferrum', type: 'unit', faction: 'unbek', name: '거리의 수호벽 페룸', role: '공동체 구조 책임자', image: 'assets/cards/ferrum.png', seed: '7997616779099543', cost: 4, attack: 2, defense: 2, health: 7, effect: 'defense_all', text: '라운드 시작 시 모든 아군 추종자의 이번 전투 방어력이 1 높아집니다.', symbol: '▰' },

    { id: 'outpr_spring', type: 'spell', faction: 'outpr', name: '진료소의 온기', cost: 2, effect: 'heal_all', text: '내 리더를 4 회복하고 아군 추종자를 1 회복합니다.', symbol: '✿' },
    { id: 'outpr_vine', type: 'spell', faction: 'outpr', name: '덩굴 매듭', cost: 3, effect: 'buff_all', text: '모든 아군 추종자의 공격력을 1, 체력을 2 높입니다.', symbol: '❋' },
    { id: 'selfas_repair', type: 'spell', faction: 'selfas', name: '긴급 정비', cost: 2, effect: 'repair', text: '가장 약한 아군 추종자를 3 회복하고 공격력을 1 높입니다.', symbol: '⚙' },
    { id: 'selfas_orbit', type: 'spell', faction: 'selfas', name: '궤도 차단', cost: 3, effect: 'damage_weakest', text: '상대의 가장 약한 추종자에게 3 피해를 줍니다. 추종자가 없으면 리더에게 줍니다.', symbol: '⦿' },
    { id: 'nanguk_mist', type: 'spell', faction: 'nanguk', name: '청명한 결계', cost: 2, effect: 'defense_all', text: '모든 아군 추종자의 이번 전투 방어력이 2 높아집니다.', symbol: '❄' },
    { id: 'nanguk_echo', type: 'spell', faction: 'nanguk', name: '되돌림 검식', cost: 3, effect: 'damage_all', text: '상대 추종자 모두에게 2 피해를 줍니다.', symbol: '〰' },
    { id: 'unbek_recall', type: 'spell', faction: 'unbek', name: '골목의 회수 신호', cost: 2, effect: 'recover', text: '버림 더미에서 추종자를 손으로 가져옵니다. 없으면 카드 1장을 뽑습니다.', symbol: '↶' },
    { id: 'unbek_gap', type: 'spell', faction: 'unbek', name: '틈새 돌파', cost: 3, effect: 'damage_weakest', text: '상대의 가장 약한 추종자에게 3 피해를 줍니다. 추종자가 없으면 리더에게 줍니다.', symbol: '⟡' },

    { id: 'outpr_seedvault', type: 'spell', faction: 'outpr', name: '종자 저장고', cost: 3, effect: 'draw_two', text: '카드 2장을 뽑습니다.', symbol: '✺' },
    { id: 'outpr_bloomguard', type: 'spell', faction: 'outpr', name: '싹틔우기', cost: 2, effect: 'buff_weakest', text: '가장 약한 아군의 공격력 +2, 체력 +1. 아군이 없으면 카드 1장을 뽑습니다.', symbol: '❀' },
    { id: 'selfas_overclock', type: 'spell', faction: 'selfas', name: '과부하 가속', cost: 3, effect: 'overclock', text: '아군 전체가 이번 턴 공격력 +2를 얻습니다.', symbol: '⟲' },
    { id: 'selfas_reserve', type: 'spell', faction: 'selfas', name: '예비 공명 저장', cost: 3, effect: 'size_burst', text: '다음 라운드 사이즈 한도를 2 높입니다.', symbol: '⚡' },
    { id: 'nanguk_stillness', type: 'spell', faction: 'nanguk', name: '정적 봉인', cost: 3, effect: 'stun_weakest', text: '가장 약한 상대 추종자는 이번 전투에서 행동할 수 없습니다. 상대 추종자가 없으면 리더에게 2 피해.', symbol: '❄' },
    { id: 'nanguk_echo_defense', type: 'spell', faction: 'nanguk', name: '잔향의 호흡', cost: 2, effect: 'defense_draw', text: '모든 아군 추종자의 이번 전투 방어력이 1 높아지고 카드 1장을 뽑습니다.', symbol: '〰' },
    { id: 'unbek_detour', type: 'spell', faction: 'unbek', name: '우회 배송', cost: 3, effect: 'return_weakest', text: '가장 약한 상대 추종자를 손으로 돌려보냅니다. 상대 추종자가 없으면 리더에게 2 피해.', symbol: '↷' },
    { id: 'unbek_cover', type: 'spell', faction: 'unbek', name: '골목 엄폐', cost: 2, effect: 'buff_defense_weakest', text: '가장 약한 아군의 공격력과 이번 전투 방어력을 2씩 높입니다. 아군이 없으면 카드 1장을 뽑습니다.', symbol: '⌂' }
  ]
};
