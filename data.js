/* Local, editable card set for the Blade Link prototype. */
window.GAME_DATA = {
  factions: {
    outpr: {
      id: 'outpr', name: '아웃프라웨어', short: 'OUTPR', logo: '✿', district: '온실 거점',
      color: '#9dce8a', accent: '#d8efb8', style: '회복 · 생장 · 상호 보조',
      blurb: '생체 기술로 손실을 회복하고, 서로를 돌보며 전선을 오래 유지합니다.', leader: 'ria'
    },
    selfas: {
      id: 'selfas', name: '셀파스', short: 'SELFAS', logo: '⚙', district: '제작 기지',
      color: '#aab7c1', accent: '#e0e8ed', style: '정비 · 가속 · 연쇄 행동',
      blurb: '피지컬 AI와 개척 기반 시설을 연결해 공격과 배치의 속도를 높입니다.', leader: 'arca'
    },
    nanguk: {
      id: 'nanguk', name: '남극성', short: 'NAMGUK', badge: 'NAM', logo: '❄', district: '청람시',
      color: '#87aedd', accent: '#d4e8fb', style: '수비 · 반격 · 정교한 대응',
      blurb: '공명합금 검식과 차분한 방어로 상대의 공격을 반격의 기회로 바꿉니다.', leader: 'cheongyeon'
    },
    unbek: {
      id: 'unbek', name: '언벡', short: 'UNBEK', logo: '⌁', district: '공방 마을',
      color: '#c3a477', accent: '#e8d6b5', style: '회수 · 우회 · 끈질긴 재기',
      blurb: '부족한 장비를 되살리고 낮은 비용의 움직임으로 전장의 빈틈을 파고듭니다.', leader: 'noa'
    }
  },
  leaders: {
    ria: { id: 'ria', faction: 'outpr', name: '리아', epithet: '스타룬데르의 길잡이', image: 'assets/cards/ria.png', quote: '같이 가자. 이곳에 네가 쉴 자리도 만들게.', ability: '새순의 손길', abilityText: '라운드 시작 시 내 대표 라이프를 1, 가장 약한 아군 추종자의 체력을 1 회복합니다.', seed: '1566391587789165' },
    arca: { id: 'arca', faction: 'selfas', name: '아르카', epithet: '개척 현장 안전 AI', image: 'assets/cards/arca.png', quote: '경로를 다시 계산합니다. 현장의 선택을 반영했습니다.', ability: '장비 재배치', abilityText: '라운드 시작 시 이번 라운드 사이즈 한도를 1 높입니다.', seed: '6424778036880785' },
    cheongyeon: { id: 'cheongyeon', faction: 'nanguk', name: '청연', epithet: '남극성 대표 검사', image: 'assets/cards/cheongyeon.png', quote: '다음 안전 구역은 내가 먼저 확인할게. 함께 갈래?', ability: '푸른 방어선', abilityText: '라운드 시작 시 가장 약한 아군 추종자 1명의 이번 전투 방어력을 1 높입니다. 이 강화는 라운드 종료 시 사라집니다. 아군이 없으면 이번 라운드 사이즈 한도를 1 높입니다.', seed: '8426524219450097' },
    noa: { id: 'noa', faction: 'unbek', name: '노아', epithet: '거점 사이를 잇는 전령', image: 'assets/cards/noa.png', quote: '거점이 멀어도 필요한 물건은 꼭 도착해야지.', ability: '골목길 지름', abilityText: '라운드 시작 시 버림 더미에서 추종자 1장을 손으로 가져옵니다. 가져올 수 없으면 이번 라운드 사이즈 한도를 1 높입니다.', seed: '8899084558523978' }
  },
  cards: [
    { id: 'verda', type: 'unit', faction: 'outpr', name: '베르다', role: '아웃프라웨어 대표·공동 테라포밍위원', position: '기업 총수', department: null, deckLimit: 1, image: 'assets/cards/verda.png', seed: '6155868119575495', cost: 4, attack: 3, defense: 3, health: 8, effect: { type: 'heal_wounded', amount: 1 }, text: '라운드 시작: 가장 약한 아군 추종자의 체력을 1 회복합니다.', flavorText: '베르다가 내린 첫 현장 지시는 생태 시험 구역의 안전부터 살피라는 것이었다. 스타룬데르의 생체 필터가 다시 맥박치자 동료들의 숨도 고르게 돌아온다.', symbol: '✦' },
    { id: 'serin', type: 'unit', faction: 'outpr', name: '세린', role: '생체 장비 의사', department: '연구개발팀', image: 'assets/cards/serin.png', seed: '2120461513044252', cost: 3, attack: 2, defense: 2, health: 5, effect: { type: 'heal_wounded', amount: 2 }, text: '라운드 시작: 가장 약한 아군 추종자의 체력을 2 회복합니다.', symbol: '❋' },
    { id: 'mora', type: 'unit', faction: 'outpr', name: '모라', role: '생태 순찰자', department: '안전관리팀', image: 'assets/cards/mora.png', seed: '1166536359809026', cost: 2, attack: 2, defense: 2, health: 4, effect: { type: 'defense_self', amount: 1 }, defenseEffect: { type: 'heal_self', amount: 1 }, text: '라운드 시작: 이번 전투 동안 자신의 방어력 +1. 방어전: 자신의 체력 1 회복.', symbol: '⌁' },
    { id: 'eve', type: 'unit', faction: 'outpr', name: '이브', role: '감각 연구 참여자', department: '대외협력팀', image: 'assets/cards/eve.png', seed: '1505280436019269', cost: 2, attack: 1, defense: 1, health: 3, effect: { type: 'size_limit', amount: 1 }, text: '라운드 시작: 이번 라운드 사이즈 한도 +1.', symbol: '❀' },

    { id: 'vector', type: 'unit', faction: 'selfas', name: '벡터', role: '가속 장비 파일럿', department: '연구개발팀', image: 'assets/cards/vector.png', seed: '6169256393462217', cost: 4, attack: 4, defense: 1, health: 4, attackEffect: { type: 'temp_buff_self', amount: 1 }, text: '공격전: 이번 전투 동안 자신의 공격력 +1.', symbol: '⌁' },
    { id: 'nia', type: 'unit', faction: 'selfas', name: '니아', role: '기록 장비 전문관', department: '정착지운영팀', image: 'assets/cards/nia.png', seed: '3830636596340106', cost: 3, attack: 2, defense: 2, health: 5, effect: { type: 'size_limit', amount: 1 }, text: '라운드 시작: 이번 라운드 사이즈 한도 +1.', symbol: '◈' },
    { id: 'sion', type: 'unit', faction: 'selfas', name: '시온', role: '리그 장비 개발자', department: '연구개발팀', image: 'assets/cards/sion.png', seed: '8636559757080557', cost: 2, attack: 2, defense: 2, health: 3, defenseEffect: { type: 'temp_buff_self', amount: 1 }, text: '방어전: 이번 전투 동안 자신의 공격력 +1.', symbol: '⚙' },

    { id: 'seolha', type: 'unit', faction: 'nanguk', name: '설하', role: '남극성 기업 대표·백좌 운영위원장', position: '기업 총수', department: null, deckLimit: 1, image: 'assets/cards/seolha.png', seed: '5055147255926520', cost: 4, attack: 2, defense: 3, health: 6, effect: { type: 'defense_weakest', amount: 1 }, text: '라운드 시작: 가장 약한 아군 추종자의 이번 전투 방어력 +1.', flavorText: '백좌의 대표 설하는 검술 리그의 규칙과 시민의 안전을 함께 책임진다. 그녀가 먼저 방어선을 세우면 남극성의 검객들은 망설임 없이 그 뒤에 선다.', symbol: '雪' },
    { id: 'wolbaek', type: 'unit', faction: 'nanguk', name: '월백', role: '공공 기록 연구자', department: '연구개발팀', image: 'assets/cards/wolbaek.png', seed: '2062650613166138', cost: 2, attack: 1, defense: 2, health: 4, effect: { type: 'size_limit', amount: 1 }, text: '라운드 시작: 이번 라운드 사이즈 한도 +1.', symbol: '✧' },
    { id: 'yuran', type: 'unit', faction: 'nanguk', name: '유란', role: '객원 검술 교사', department: '대외협력팀', image: 'assets/cards/yuran.png', seed: '5497937762652395', cost: 3, attack: 3, defense: 2, health: 4, attackEffect: { type: 'temp_buff_self', amount: 1 }, text: '공격전: 이번 전투 동안 공격력 +1.', symbol: '☯' },
    { id: 'soun', type: 'unit', faction: 'nanguk', name: '소운', role: '음향 관측 견습생', department: '연구개발팀', image: 'assets/cards/soun.png', seed: '7785836849691659', cost: 1, attack: 1, defense: 1, health: 2, effect: { type: 'temp_buff_self', amount: 1 }, text: '라운드 시작: 이번 전투 동안 자신의 공격력 +1.', symbol: '♪' },

    { id: 'lea', type: 'unit', faction: 'unbek', name: '레아', role: '언벡 협동조합 대표·정착민 평의회 위원', position: '협동조합 대표', department: null, deckLimit: 1, image: 'assets/cards/lea.png', seed: '6368332127497987', cost: 3, attack: 3, defense: 4, health: 7, effect: { type: 'defense_all', amount: 1 }, text: '라운드 시작: 모든 아군 추종자의 이번 전투 방어력 +1.', flavorText: '돌아온 사람부터 챙기고 길을 묻는다. 레아가 전열에 서면 공방 마을 사람들은 누구도 혼자 버려지지 않는다는 걸 안다.', symbol: '⌂' },
    { id: 'ash', type: 'unit', faction: 'unbek', name: '애쉬', role: '분산 AI 통신 관리자', department: '정착지운영팀', image: 'assets/cards/ash.png', seed: '1737601682837601', cost: 2, attack: 1, defense: 2, health: 4, effect: { type: 'recover', amount: 1 }, text: '라운드 시작: 버림 더미에서 추종자 1장을 손으로 가져옵니다. 가져올 수 없으면 사이즈 한도 +1.', symbol: '⌁' },
    { id: 'rook', type: 'unit', faction: 'unbek', name: '로크', role: '공용 장비 수리공', department: '정착지운영팀', image: 'assets/cards/rook.png', seed: '36688852601639', cost: 3, attack: 3, defense: 2, health: 4, attackEffect: { type: 'temp_buff_self', amount: 1 }, text: '공격전: 이번 전투 동안 자신의 공격력 +1.', symbol: '⚒' },
    { id: 'veil', type: 'unit', faction: 'unbek', name: '베일', role: '독립 호위 AI', department: '안전관리팀', image: 'assets/cards/veil.png', seed: '6356542998253242', cost: 4, attack: 4, defense: 1, health: 5, attackEffect: { type: 'ping_enemy', amount: 2 }, text: '공격전: 가장 약한 상대 추종자에게 2 피해. 상대 추종자가 없으면 대표 캐릭터에게 2 피해.', symbol: '◇' },
    { id: 'ferrum', type: 'unit', faction: 'unbek', name: '페룸', role: '공동체 구조 책임자', department: '안전관리팀', image: 'assets/cards/ferrum.png', seed: '7997616779099543', cost: 4, attack: 2, defense: 4, health: 8, effect: { type: 'defense_self', amount: 1 }, text: '라운드 시작: 이번 전투 동안 자신의 방어력 +1.', symbol: '▰' },

    { id: 'outpr_spring', type: 'spell', faction: 'outpr', name: '진료소 온기', cost: 2, effect: 'heal_focus', text: '내 대표 캐릭터를 3 회복하고 가장 약한 아군 추종자를 1 회복합니다.', symbol: '✿' },
    { id: 'outpr_vine', type: 'spell', faction: 'outpr', name: '덩굴 매듭', cost: 3, effect: 'buff_all', text: '모든 아군 추종자의 공격력과 체력을 1 높입니다.', symbol: '❋' },
    { id: 'selfas_repair', type: 'spell', faction: 'selfas', name: '긴급 정비', cost: 2, effect: 'repair', text: '가장 약한 아군 추종자를 3 회복하고 공격력을 1 높입니다.', symbol: '⚙' },
    { id: 'selfas_orbit', type: 'spell', faction: 'selfas', name: '궤도 차단', cost: 3, effect: 'damage_weakest', text: '상대의 가장 약한 추종자에게 3 피해를 줍니다. 추종자가 없으면 리더에게 줍니다.', symbol: '⦿' },
    { id: 'nanguk_mist', type: 'spell', faction: 'nanguk', name: '청명한 결계', cost: 2, effect: 'defense_weakest', text: '가장 약한 아군 추종자 1명의 이번 전투 방어력이 2 높아집니다.', symbol: '❄' },
    { id: 'nanguk_echo', type: 'spell', faction: 'nanguk', name: '되돌림 검식', cost: 3, effect: 'damage_all', text: '상대 추종자 모두에게 2 피해를 줍니다.', symbol: '〰' },
    { id: 'unbek_recall', type: 'spell', faction: 'unbek', name: '회수 신호', cost: 2, effect: 'recover', text: '버림 더미에서 추종자를 손으로 가져옵니다. 가져올 수 없으면 다음 라운드 사이즈 한도 +1.', symbol: '↶' },
    { id: 'unbek_gap', type: 'spell', faction: 'unbek', name: '틈새 돌파', cost: 3, effect: 'damage_weakest', text: '상대의 가장 약한 추종자에게 3 피해를 줍니다. 추종자가 없으면 리더에게 줍니다.', symbol: '⟡' },

    { id: 'outpr_seedvault', type: 'spell', faction: 'outpr', name: '종자 저장고', cost: 3, effect: 'draw_two', text: '카드 2장을 뽑고 다음 라운드 사이즈 한도 +2를 얻습니다.', symbol: '✺' },
    { id: 'outpr_bloomguard', type: 'spell', faction: 'outpr', name: '싹틔우기', cost: 2, effect: 'buff_weakest', text: '가장 약한 아군의 공격력 +2, 체력 +1. 아군이 없으면 다음 라운드 사이즈 한도 +1.', symbol: '❀' },
    { id: 'selfas_overclock', type: 'spell', faction: 'selfas', name: '과부하 가속', cost: 3, effect: 'overclock', text: '아군 전체가 이번 턴 공격력 +2를 얻습니다.', symbol: '⟲' },
    { id: 'selfas_reserve', type: 'spell', faction: 'selfas', name: '공명 비축', cost: 3, effect: 'size_burst', text: '다음 라운드 사이즈 한도를 2 높입니다.', symbol: '⚡' },
    { id: 'nanguk_stillness', type: 'spell', faction: 'nanguk', name: '정적 봉인', cost: 3, effect: 'stun_weakest', text: '가장 약한 상대 추종자는 이번 전투에서 행동할 수 없습니다. 상대 추종자가 없으면 리더에게 2 피해.', symbol: '❄' },
    { id: 'nanguk_echo_defense', type: 'spell', faction: 'nanguk', name: '잔향의 호흡', cost: 2, effect: 'draw_reserve', text: '카드 1장을 뽑고 다음 라운드 사이즈 한도 +1을 얻습니다.', symbol: '〰' },
    { id: 'unbek_detour', type: 'spell', faction: 'unbek', name: '우회 배송', cost: 3, effect: 'return_weakest', text: '가장 약한 상대 추종자를 손으로 돌려보냅니다. 상대 추종자가 없으면 리더에게 2 피해.', symbol: '↷' },
    { id: 'unbek_cover', type: 'spell', faction: 'unbek', name: '골목 엄폐', cost: 2, effect: 'buff_defense_weakest', text: '가장 약한 아군의 공격력과 이번 전투 방어력을 2씩 높입니다. 아군이 없으면 다음 라운드 사이즈 한도 +1.', symbol: '⌂' }
  ]
};
