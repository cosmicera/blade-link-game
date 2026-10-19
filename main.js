(() => {
  const DATA = window.GAME_DATA;
  const RULES = window.GameRules;
  const FIELD_SLOTS = RULES.limits.field;
  const $ = selector => document.querySelector(selector);
  const homeScreen = $('#home-screen');
  const battleScreen = $('#battle-screen');
  const modalRoot = $('#modal-root');
  const toast = $('#toast');
  let selectedFaction = 'outpr';
  try { selectedFaction = localStorage.getItem('blade-link-faction') || 'outpr'; } catch (_) { /* file:// storage can be disabled */ }
  let match = null;
  let selectedHandId = null;
  let inspectedBoardCard = null;
  let inspectedLeaderSide = null;
  let aiThinking = false;
  let handResetAnimating = false;
  let toastTimer = null;
  let deploymentTimer = null;
  let deploymentDeadline = null;
  let lastHandCardClick = { id: null, at: 0 };
  let lastBoardCardClick = { key: null, at: 0 };
  const deckCache = Object.create(null);
  let deckDraft = null;
  let deckDraftFaction = null;
  let deckBuilderFilter = 'all';
  const DEPLOYMENT_LIMIT_MS = 30_000;

  const factionKeys = Object.keys(DATA.factions);
  const leaderOf = factionId => DATA.leaders[DATA.factions[factionId].leader];
  const titlePositions = new Set(['기업 총수', '기업 대표', '협동조합 대표']);
  const isTitleFollower = card => card?.type === 'unit' && titlePositions.has(card.position);
  const isHumanTurn = () => match && match.phase === 'deploy' && !match.gameOver && !aiThinking;
  const factionColor = factionId => DATA.factions[factionId]?.color || '#b8b2c0';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const collectionCards = () => [
    ...Object.values(DATA.leaders).map(leader => ({ ...leader, type: 'leader', role: '대표 캐릭터', cost: 0, text: leader.abilityText, symbol: '✦' })),
    ...DATA.cards
  ];

  function codexBackCopy(card) {
    if (card.quote) return { label: card.type === 'leader' ? '대표의 대화' : '추종자의 대화', text: `“${card.quote}”` };
    if (card.flavorText) return { label: '장면 기록', text: card.flavorText };
    if (card.story) {
      const firstSentence = card.story.trim().split(/(?<=[.!?。])\s+/u)[0];
      return { label: '장면 기록', text: firstSentence || card.story };
    }

    const rawEffect = card.effect?.type || card.effect || card.attackEffect?.type || card.defenseEffect?.type || '';
    const effect = rawEffect === 'department_synergy' ? card.effect?.effect?.type : rawEffect;
    const scenes = {
      heal_leader: '그녀는 전열보다 먼저 시민들의 안부를 확인하고, 거점의 생명 유지망을 다시 잇는다.',
      heal_all: '회복 신호가 아군 전열을 타고 번지며, 모두가 다시 숨을 고른다.',
      heal_wounded: '흔들린 동료를 발견한 그녀가 치료 물자를 들고 전선 안쪽으로 달려간다.',
      heal_self: '잠깐의 틈을 찾아 상처를 정리한 뒤, 다시 동료들 곁으로 돌아선다.',
      defense_self: '상대의 움직임을 읽고 자세를 낮춘다. 다음 충격을 흘려낼 준비가 끝났다.',
      defense_all: '짧은 손짓에 맞춰 동료들이 간격을 좁힌다. 하나의 방어선이 만들어진다.',
      size_limit: '거점의 장비망과 운송 경로를 재배치해 동료들이 움직일 여유를 만든다.',
      recover: '끊겼던 신호가 다시 이어진다. 전장을 떠났던 동료에게 돌아올 길이 열린다.',
      temp_buff_self: '상대의 빈틈을 읽은 순간, 한 박자 빠른 움직임으로 검을 올린다.',
      ping_enemy: '전열에서 가장 흔들리는 지점을 포착해 짧고 정확한 신호를 보낸다.',
      support_chairperson: '정돈된 보고가 대표의 결단을 뒷받침한다. 이번 전투의 호흡이 한층 단단해진다.',
      damage_weakest: '검식의 신호가 상대 전열의 빈틈을 찾아들어간다.',
      damage_all: '길게 이어진 검의 잔향이 상대 전열을 훑고 지나간다.',
      buff_all: '공명 신호가 아군의 장비와 호흡을 한 박자로 묶는다.',
      repair: '긴급 정비가 끝나자 망설이던 장비가 다시 움직이기 시작한다.',
      defense_draw: '고른 호흡으로 전열을 다지고, 다음 대응을 위한 신호를 받아든다.',
      return_weakest: '우회 검식이 상대의 발을 묶고, 전열의 빈자리를 드러낸다.',
      stun_weakest: '짧은 봉인 신호가 상대의 움직임을 끊는다.',
      draw_two: '저장된 기록을 펼쳐 다음 수를 준비한다. 아직 쓸 수 있는 선택지가 남아 있다.',
      overclock: '셀파스의 동력망과 현장 장비가 맞물리며 아군의 움직임이 빨라진다.',
      size_burst: '예비 공명 에너지가 축적된다. 다음 전개를 위한 여유가 생겼다.',
      buff_weakest: '가장 지친 동료에게 힘을 모아 주고, 다시 설 수 있도록 손을 내민다.',
      buff_defense_weakest: '흔들린 동료를 엄폐물 가까이 이끌어 안전하게 다음 수를 준비한다.'
    };
    if (scenes[effect]) return { label: card.type === 'spell' ? '검식 장면' : '장면 기록', text: scenes[effect] };
    const faction = DATA.factions[card.faction];
    return { label: '장면 기록', text: `${faction.district}의 전장에서 ${card.role || '동료'}로서 맡은 자리를 지키며, 다음 움직임을 살핀다.` };
  }

  function codexDetailMarkup(card) {
    const faction = DATA.factions[card.faction];
    const back = codexBackCopy(card);
    const cardTitle = escapeHTML(card.name);
    const image = card.image
      ? `<img src="${escapeHTML(card.image)}" alt="${cardTitle}" />`
      : `<div class="codex-detail-symbol" style="--faction-color:${factionColor(card.faction)}"><span>${escapeHTML(faction.logo || '◇')}</span><small>${escapeHTML(faction.name)} · 검식</small></div>`;
    const category = card.type === 'leader' ? '대표 캐릭터' : card.type === 'unit' ? (card.position || card.department || '추종자') : '검식';
    const role = card.type === 'unit' ? card.role : card.type === 'leader' ? card.epithet : '검식 카드';
    const stats = card.type === 'unit'
      ? `<span>사이즈 ${card.cost}</span><span>공격 ${card.attack}</span><span>방어 ${card.defense || 0}</span><span>체력 ${card.health}</span>${isTitleFollower(card) || card.deckLimit === 1 ? '<span>덱당 1장</span>' : ''}`
      : card.type === 'spell' ? `<span>사이즈 ${card.cost}</span><span>검식 카드</span>` : '<span>라이프 30</span><span>대표 능력</span>';
    const effectText = card.text || card.abilityText || '';
    return `<div class="codex-detail-overlay" data-codex-detail-overlay>
      <button class="codex-detail-dismiss" data-codex-detail-dismiss aria-label="카드 상세 닫기">×</button>
      <section class="codex-detail-dialog" role="dialog" aria-modal="true" aria-label="${cardTitle} 카드 상세">
        <div class="codex-detail-flip-wrap">
          <div class="codex-detail-flip">
            <article class="codex-detail-face codex-detail-front" style="--faction-color:${factionColor(card.faction)}">
              <div class="codex-detail-art">${image}</div>
            </article>
            <article class="codex-detail-face codex-detail-back" style="--faction-color:${factionColor(card.faction)}">
              <span class="codex-back-faction-mark" role="img" aria-label="${escapeHTML(faction.name)} 로고">${escapeHTML(faction.logo || '◇')}</span>
              <small>${escapeHTML(faction.name)} · ${escapeHTML(category)}</small><h3>${cardTitle}</h3>
              <div class="codex-back-role">${escapeHTML(role)}</div><div class="codex-detail-stats">${stats}</div>
              <p class="codex-back-effect">${escapeHTML(effectText)}</p><div class="codex-back-rule"></div>
              <small class="codex-back-label">${escapeHTML(back.label)}</small><blockquote>${escapeHTML(back.text)}</blockquote>
            </article>
          </div>
        </div>
        <button class="codex-flip-button" data-codex-flip aria-pressed="false">뒷면 보기 <b>↻</b></button>
      </section>
    </div>`;
  }

  function factionMarkup(id) {
    const faction = DATA.factions[id];
    const leader = leaderOf(id);
    return `<button class="faction-choice ${id === selectedFaction ? 'selected' : ''}" data-faction="${id}" style="--faction-color:${faction.color};--faction-accent:${faction.accent}">
      <span class="faction-symbol">${escapeHTML(faction.logo || '◇')}</span>
      <span class="faction-info"><small>${faction.short} <i>·</i> ${faction.district}</small><strong>${faction.name}</strong><em>${faction.style}</em></span>
      <span class="faction-check">${id === selectedFaction ? '✓' : '↗'}</span>
      <span class="faction-leader-name">${leader.name}</span>
    </button>`;
  }

  function updateHome() {
    const faction = DATA.factions[selectedFaction];
    const leader = leaderOf(selectedFaction);
    $('#home-leader-art').src = leader.image;
    $('#home-leader-art').alt = leader.name;
    $('#home-leader-faction').textContent = `${faction.short} / ${faction.district}`;
    $('#home-leader-title').textContent = leader.name;
    $('#home-leader-epithet').textContent = leader.epithet;
    $('#home-quote').textContent = `“${leader.quote}”`;
    $('#faction-picker').innerHTML = factionKeys.map(factionMarkup).join('');
    const deck = loadConfiguredDeck(selectedFaction);
    const deckValidation = RULES.validateDeck(deck, selectedFaction);
    $('#deck-summary').textContent = `${faction.name} 덱 · ${deckValidation.total}/30장 · 추종자 ${deckValidation.units} · 검식 ${deckValidation.spells}`;
    $('.nav-count').textContent = collectionCards().length;
    document.body.dataset.faction = selectedFaction;
  }

  function chooseFaction(id) {
    if (!DATA.factions[id]) return;
    selectedFaction = id;
    try { localStorage.setItem('blade-link-faction', id); } catch (_) { /* selection still works for this session */ }
    updateHome();
  }

  function deckStorageKey(factionId) {
    return `blade-link-deck-v1-${factionId}`;
  }

  function saveConfiguredDeck(factionId, deck) {
    deckCache[factionId] = [...deck];
    try { localStorage.setItem(deckStorageKey(factionId), JSON.stringify(deck)); } catch (_) { /* keep this session's deck in memory */ }
  }

  function loadConfiguredDeck(factionId) {
    if (deckCache[factionId]) return [...deckCache[factionId]];
    try {
      const saved = JSON.parse(localStorage.getItem(deckStorageKey(factionId)) || 'null');
      if (RULES.validateDeck(saved, factionId).ok) {
        deckCache[factionId] = [...saved];
        return [...saved];
      }
    } catch (_) { /* initialize a valid deck if storage is unavailable or malformed */ }
    const starterDeck = RULES.makeDeck(factionId);
    saveConfiguredDeck(factionId, starterDeck);
    return [...starterDeck];
  }

  function openDeckBuilder() {
    if (match && !match.gameOver) {
      notify('대전이 끝난 뒤 로비에서 덱을 편성할 수 있습니다.');
      return;
    }
    deckDraftFaction = selectedFaction;
    deckDraft = loadConfiguredDeck(deckDraftFaction);
    deckBuilderFilter = 'all';
    openModal('deck');
  }

  function deckBuilderMarkup() {
    const faction = DATA.factions[deckDraftFaction];
    const pool = RULES.makeCollection(deckDraftFaction);
    const copyCounts = new Map();
    deckDraft.forEach(id => copyCounts.set(id, (copyCounts.get(id) || 0) + 1));
    const unitCount = deckDraft.reduce((n, id) => n + (RULES.cardById[id]?.type === 'unit' ? 1 : 0), 0);
    const spellCount = deckDraft.reduce((n, id) => n + (RULES.cardById[id]?.type === 'spell' ? 1 : 0), 0);
    const validation = RULES.validateDeck(deckDraft, deckDraftFaction);
    const filteredPool = pool.filter(({ card }) => deckBuilderFilter === 'all' || card.type === deckBuilderFilter);
    const cardRows = filteredPool.map(({ card, copies }) => {
      const count = copyCounts.get(card.id) || 0;
      const typeCount = card.type === 'unit' ? unitCount : spellCount;
      const typeLimit = card.type === 'unit' ? RULES.limits.deckUnits : RULES.limits.deckSpells;
      const addDisabled = deckDraft.length >= RULES.limits.deck || count >= copies || typeCount >= typeLimit;
      const image = card.type === 'unit'
        ? `<img src="${escapeHTML(card.image)}" alt="" loading="lazy">`
        : `<span class="deck-card-symbol">${escapeHTML(card.symbol || '◇')}</span>`;
      const category = card.type === 'unit' ? '추종자' : '검식';
      const stats = card.type === 'unit'
        ? `공 ${card.attack} · 방 ${card.defense || 0} · 체 ${card.health}`
        : `사이즈 ${card.cost}`;
      return `<article class="deck-pool-card" style="--faction-color:${faction.color}">
        <button class="deck-pool-art" type="button" data-deck-action="inspect" data-card-id="${escapeHTML(card.id)}" aria-label="${escapeHTML(card.name)} 상세 보기">${image}<b>${String(card.cost).padStart(2, '0')}</b></button>
        <div class="deck-pool-copy"><small>${category}${card.department ? ` · ${escapeHTML(card.department)}` : card.position ? ` · ${escapeHTML(card.position)}` : ''}</small><button type="button" class="deck-card-name" data-deck-action="inspect" data-card-id="${escapeHTML(card.id)}">${escapeHTML(card.name)}</button><p>${escapeHTML(card.text || '')}</p><em>${stats}</em><small class="deck-owned-count">보유 ${copies}장 · 덱 ${count}장${copies === 1 ? ' · 덱당 1장' : ''}</small></div>
        <button class="deck-add-button" type="button" data-deck-action="add" data-card-id="${escapeHTML(card.id)}" aria-label="${escapeHTML(card.name)} 추가" ${addDisabled ? 'disabled' : ''}>＋</button>
      </article>`;
    }).join('');
    const selectedRows = pool.flatMap(({ card }) => {
      const count = copyCounts.get(card.id) || 0;
      if (!count) return [];
      return [`<div class="deck-selected-card"><span class="deck-selected-count">${count}</span><div><strong>${escapeHTML(card.name)}</strong><small>${card.type === 'unit' ? '추종자' : '검식'} · 사이즈 ${card.cost}</small></div><button type="button" data-deck-action="remove" data-card-id="${escapeHTML(card.id)}" aria-label="${escapeHTML(card.name)} 한 장 빼기">−</button></div>`];
    }).join('');
    return `<div class="deck-builder" style="--faction-color:${faction.color};--faction-accent:${faction.accent}">
      <div class="deck-builder-intro"><div><small>${faction.short} · ${faction.district}</small><h3>${faction.name} 보유 카드풀</h3><p>이 진영 카드 중 추종자 20장과 검식 10장, 총 30장을 골라 덱을 만듭니다. 같은 일반 카드는 최대 3장, 총수·기업 대표·협동조합 대표 추종자는 1장까지 넣을 수 있습니다.</p></div><div class="deck-builder-actions"><button type="button" class="deck-reset-button deck-clear-button" data-deck-action="clear" ${deckDraft.length ? '' : 'disabled'}>덱 비우기</button><button type="button" class="deck-reset-button" data-deck-action="reset">기본 덱 불러오기</button></div></div>
      <div class="deck-builder-columns">
        <section class="deck-pool-panel"><div class="deck-section-heading"><div><small>OWNED CARDS</small><strong>카드 목록 <i>${pool.length}종</i></strong></div><div class="deck-type-tabs"><button type="button" data-deck-filter="all" class="${deckBuilderFilter === 'all' ? 'active' : ''}">전체</button><button type="button" data-deck-filter="unit" class="${deckBuilderFilter === 'unit' ? 'active' : ''}">추종자</button><button type="button" data-deck-filter="spell" class="${deckBuilderFilter === 'spell' ? 'active' : ''}">검식</button></div></div><div class="deck-pool-list">${cardRows}</div></section>
        <aside class="deck-current-panel"><div class="deck-current-heading"><div><small>MY DECK</small><strong>현재 덱</strong></div><b class="deck-total-count ${deckDraft.length === RULES.limits.deck ? 'complete' : ''}">${deckDraft.length}<i>/30</i></b></div>
          <div class="deck-progress-pair"><div><span>추종자 <b>${unitCount}/20</b></span><i><b style="width:${Math.min(100, unitCount / RULES.limits.deckUnits * 100)}%"></b></i></div><div><span>검식 <b>${spellCount}/10</b></span><i><b style="width:${Math.min(100, spellCount / RULES.limits.deckSpells * 100)}%"></b></i></div></div>
          <div class="deck-selected-list">${selectedRows || '<p class="deck-empty">왼쪽 카드 목록에서 카드를 추가하세요.</p>'}</div>
          <div class="deck-save-area"><p class="${validation.ok ? 'deck-valid' : ''}">${validation.ok ? '덱 구성이 완료되었습니다.' : escapeHTML(validation.error)}</p><button type="button" class="button button-primary deck-save-button" data-deck-action="save" ${validation.ok ? '' : 'disabled'}>덱 저장 <b>✓</b></button></div>
        </aside>
      </div>
    </div>`;
  }

  function hideResult() {
    const result = $('#game-result');
    result.classList.add('hidden');
    result.innerHTML = '';
  }

  function hideCombatStage() {
    const stage = $('#combat-stage');
    if (!stage) return;
    stage.classList.add('hidden');
    stage.classList.remove('counterattack');
    stage.classList.remove('global-effect-stage');
    stage.innerHTML = '';
  }

  function stopDeploymentTimer() {
    if (deploymentTimer) clearInterval(deploymentTimer);
    deploymentTimer = null;
    deploymentDeadline = null;
    const clock = $('#deploy-clock');
    if (clock) {
      clock.classList.add('hidden');
      clock.classList.remove('urgent');
      clock.textContent = '30초';
    }
  }

  function updateDeploymentClock() {
    const clock = $('#deploy-clock');
    if (!clock) return;
    if (!isHumanTurn()) {
      clock.classList.add('hidden');
      clock.classList.remove('urgent');
      return;
    }
    const remaining = deploymentDeadline
      ? Math.max(0, Math.ceil((deploymentDeadline - Date.now()) / 1000))
      : DEPLOYMENT_LIMIT_MS / 1000;
    clock.textContent = `${remaining}초`;
    clock.classList.remove('hidden');
    clock.classList.toggle('urgent', remaining <= 10);
    clock.setAttribute('aria-label', `남은 배치 시간 ${remaining}초`);
  }

  function startDeploymentTimer() {
    stopDeploymentTimer();
    if (!isHumanTurn()) return;
    deploymentDeadline = Date.now() + DEPLOYMENT_LIMIT_MS;
    updateDeploymentClock();
    deploymentTimer = setInterval(() => {
      if (!isHumanTurn()) {
        stopDeploymentTimer();
        return;
      }
      if (Date.now() >= deploymentDeadline) {
        if (handResetAnimating) return;
        stopDeploymentTimer();
        void beginClassicBattle();
        return;
      }
      updateDeploymentClock();
    }, 200);
  }

  function showHome() {
    stopDeploymentTimer();
    hideCombatStage();
    hideResult();
    match = null;
    selectedHandId = null;
    inspectedBoardCard = null;
    inspectedLeaderSide = null;
    aiThinking = false;
    handResetAnimating = false;
    battleScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    $('#nav-lobby').classList.add('active');
    updateHome();
  }

  function showBattle() {
    homeScreen.classList.add('hidden');
    battleScreen.classList.remove('hidden');
    $('#nav-lobby').classList.remove('active');
  }

  function showVersusIntro() {
    const stage = $('#combat-stage');
    if (!stage) return;
    const scene = document.createElement('div');
    scene.className = 'combat-stage-scene versus-intro-scene';
    const heading = document.createElement('div');
    heading.className = 'combat-stage-heading';
    const title = document.createElement('strong');
    title.textContent = '대전 시작';
    const subtitle = document.createElement('small');
    subtitle.textContent = '대표 캐릭터 대면';
    heading.append(title, subtitle);

    const pair = document.createElement('div');
    pair.className = 'combat-stage-pair';
    for (const [side, label] of [['player', '내 대표 캐릭터'], ['opponent', '상대 대표 캐릭터']]) {
      const column = document.createElement('div');
      column.className = 'combat-focus-side leader-side';
      const sideLabel = document.createElement('small');
      sideLabel.className = 'combat-focus-label';
      sideLabel.textContent = label;
      const leader = leaderElement(side);
      if (!leader) continue;
      column.append(sideLabel, cloneCombatCard(leader));
      if (side === 'player') {
        pair.append(column);
        const versus = document.createElement('div');
        versus.className = 'combat-stage-versus';
        versus.textContent = 'VS';
        pair.append(versus);
      } else pair.append(column);
    }
    scene.append(heading, pair);
    stage.replaceChildren(scene);
    stage.classList.remove('counterattack', 'global-effect-stage', 'hidden');
  }

  async function showInitiativeCoinFlip(coinFace) {
    const stage = $('#combat-stage');
    if (!stage) return;
    const initiativeSide = coinFace === 'front' ? 'player' : 'opponent';
    const scene = document.createElement('div');
    scene.className = 'combat-stage-scene coin-flip-scene';
    const heading = document.createElement('div');
    heading.className = 'combat-stage-heading';
    const title = document.createElement('strong');
    title.textContent = '선공 결정';
    const subtitle = document.createElement('small');
    subtitle.textContent = '앞면: 플레이어 선공 · 뒷면: 상대 선공';
    heading.append(title, subtitle);

    const perspective = document.createElement('div');
    perspective.className = 'coin-perspective';
    const coin = document.createElement('div');
    coin.className = 'initiative-coin';
    const playerFace = document.createElement('div');
    playerFace.className = 'coin-face coin-face-player';
    playerFace.innerHTML = '<svg class="coin-sword-mark" viewBox="0 0 100 100" aria-hidden="true"><path class="coin-sword-blade" d="M50 9 62 33 57 64 50 74 43 64 38 33Z"/><path class="coin-sword-edge" d="M50 15v55"/><path class="coin-sword-guard" d="M29 62q21 11 42 0l-3 8q-18 8-36 0Z"/><path class="coin-sword-grip" d="M46 69h8v18h-8z"/><path class="coin-sword-pommel" d="M42 87h16v6H42z"/></svg>';
    const opponentFace = document.createElement('div');
    opponentFace.className = 'coin-face coin-face-opponent';
    opponentFace.innerHTML = '<span class="coin-wordmark"><span>Blade</span><span>Link</span></span>';
    coin.append(playerFace, opponentFace);
    perspective.append(coin);

    const result = document.createElement('strong');
    result.className = 'coin-flip-result';
    result.setAttribute('aria-live', 'polite');
    scene.append(heading, perspective, result);
    stage.replaceChildren(scene);
    stage.classList.remove('counterattack', 'global-effect-stage', 'hidden');

    const finalRotation = coinFace === 'front' ? 1800 : 1980;
    const animation = coin.animate?.([
      { transform: 'translateY(0) rotateY(0deg) rotateZ(0deg)' },
      { transform: 'translateY(-76px) rotateY(630deg) rotateZ(140deg)', offset: .3 },
      { transform: 'translateY(-36px) rotateY(1320deg) rotateZ(300deg)', offset: .72 },
      { transform: `translateY(0) rotateY(${finalRotation}deg) rotateZ(360deg)` }
    ], { duration: paced(1250), easing: 'cubic-bezier(.18,.72,.22,1)', fill: 'forwards' });
    if (animation) await animation.finished.catch(() => {});
    else {
      await wait(1250);
      coin.style.transform = `rotateY(${finalRotation}deg)`;
    }
    result.dataset.side = initiativeSide;
    result.textContent = coinFace === 'front' ? '앞면 · 플레이어 선공' : '뒷면 · 상대 선공';
    result.classList.add('revealed');
    await wait(620);
  }

  async function startMatch() {
    stopDeploymentTimer();
    hideCombatStage();
    hideResult();
    const opponents = factionKeys.filter(id => id !== selectedFaction);
    const opponentFaction = opponents[Math.floor(Math.random() * opponents.length)];
    const playerDeck = loadConfiguredDeck(selectedFaction);
    const validation = RULES.validateDeck(playerDeck, selectedFaction);
    if (!validation.ok) {
      notify('저장된 덱이 규칙과 맞지 않습니다. 덱을 다시 편성해 주세요.');
      openDeckBuilder();
      return;
    }
    match = RULES.createMatch(selectedFaction, opponentFaction, { deferStart: true, playerDeck });
    selectedHandId = null;
    inspectedBoardCard = null;
    inspectedLeaderSide = null;
    aiThinking = true;
    handResetAnimating = false;
    showBattle();
    renderBattle();
    showVersusIntro();
    await wait(1050);
    hideCombatStage();
    const coinFace = Math.random() < 0.5 ? 'front' : 'back';
    const initiativeSide = coinFace === 'front' ? 'player' : 'opponent';
    await showInitiativeCoinFlip(coinFace);
    hideCombatStage();
    RULES.startFirstRound(match, initiativeSide);
    const openingVisuals = RULES.takeVisualEvents(match);
    aiThinking = openingVisuals.some(event => event.type === 'draw' && event.side === 'player');
    renderBattle();
    if (aiThinking) {
      $('#player-hand').classList.add('opening-deal');
      playVisualEvents(openingVisuals).catch(() => {}).finally(() => {
        $('#player-hand').classList.remove('opening-deal');
        aiThinking = false;
        renderBattle();
        startDeploymentTimer();
      });
    } else startDeploymentTimer();
  }

  function cardMarkup(card, options = {}) {
    const { handId = '', selected = false, disabled = false, unit = null, compact = false } = options;
    const spell = card.type === 'spell';
    const typeName = spell ? '검식' : '추종자';
    const departmentLabel = card.department?.replace(/팀$/, '') || card.position || '';
    const faction = DATA.factions[card.faction];
    const health = unit ? card.health + unit.healthBonus - unit.damage : card.health;
    const attack = card.attack + (unit?.attackBonus || 0) + (unit?.tempAttack || 0);
    const defense = unit ? RULES.unitDefense(unit) : (card.defense || 0);
    const classes = ['game-card', spell ? 'spell-card' : 'unit-card', selected ? 'selected' : '', disabled ? 'disabled' : '', compact ? 'compact-card' : '', unit && !unit.ready ? 'exhausted' : ''].filter(Boolean).join(' ');
    const art = spell
      ? `<div class="spell-art" style="--faction-color:${faction.color};--faction-accent:${faction.accent}"><span class="spell-glyph">${card.symbol}</span><i></i><b>${faction.short}</b></div>`
      : `<div class="card-art"><img src="${card.image}" alt="${card.name}" loading="lazy"><span class="art-shade"></span><span class="art-faction">${faction.short}</span></div>`;
    return `<button class="${classes}" ${handId ? `data-hand-id="${handId}"` : ''} ${unit ? `data-unit-id="${unit.iid}"` : ''} style="--faction-color:${faction.color};--faction-accent:${faction.accent}" aria-label="${card.name}, 코스트 ${card.cost}${card.type === 'unit' ? `, 공격 ${attack}, 방어 ${defense}, 체력 ${health}` : ''}">
      <span class="card-cost">${card.cost}</span>
      <span class="card-topline"><small>${typeName}${!spell && departmentLabel ? ` · ${departmentLabel}` : ''}</small><b>${faction.short}</b></span>
      ${art}
      <span class="card-copy"><strong>${card.name}</strong><small>${card.text}</small></span>
      ${spell ? `<span class="card-spell-label">검식 카드 <i>·</i> 전투에서 발동</span>` : `<span class="card-stats"><b>⚔ ${attack}</b><b>⛨ ${defense}</b><b>♥ ${health}</b></span>`}
    </button>`;
  }

  function boardSlotMarkup(item, owner, index) {
    if (!item) return `<div class="unit-slot empty-slot"><span>${String(index + 1).padStart(2, '0')}</span><i>전장 대기</i></div>`;
    const card = RULES.cardById[item.cardId];
    const faction = DATA.factions[card.faction];
    if (item.kind === 'spell') {
      const classes = ['unit-slot', 'occupied-slot', 'spell-slot', 'unit-ready', owner === 'opponent' ? 'enemy-unit' : ''].join(' ');
      return `<div class="${classes}" data-board-card data-side="${owner}" data-kind="spell" data-card-id="${item.iid}" data-card-template="${card.id}" role="button" tabindex="0" style="--faction-color:${faction.color};--faction-accent:${faction.accent}" aria-label="${card.name}, 검식, 코스트 ${card.cost}, 전투 중 발동">
        <div class="spell-slot-art"><span>${card.symbol}</span><b>${faction.short}</b></div>
        <div class="unit-nameplate"><strong>${card.name}</strong><small>검식 · 전투에서 발동</small></div>
        <div class="spell-slot-cost">◇ ${card.cost} 사이즈</div>
      </div>`;
    }
    const health = RULES.unitHealth(item);
    const attackBase = card.attack + item.attackBonus;
    const attackTemp = item.tempAttack;
    const attack = attackBase + attackTemp;
    const defenseBase = (card.defense || 0) + (item.defenseBonus || 0);
    const defenseTemp = item.tempDefense;
    const defense = defenseBase + defenseTemp;
    const ready = item.ready && item.stunnedRound !== match.round;
    const actionState = ready ? 'unit-ready' : 'unit-exhausted';
    const classes = ['unit-slot', 'occupied-slot', actionState, owner === 'opponent' ? 'enemy-unit' : ''].join(' ');
    return `<div class="${classes}" data-board-card data-side="${owner}" data-kind="unit" data-card-id="${item.iid}" data-card-template="${card.id}" data-inspect-attack="${attack}" data-inspect-attack-base="${attackBase}" data-inspect-attack-temp="${attackTemp}" data-inspect-defense="${defense}" data-inspect-defense-base="${defenseBase}" data-inspect-defense-temp="${defenseTemp}" data-inspect-health="${health}" data-inspect-max-health="${card.health + item.healthBonus}" role="button" tabindex="0" style="--faction-color:${faction.color};--faction-accent:${faction.accent}" aria-label="${card.name}, 사이즈 ${card.cost}, 공격 ${attack}, 방어 ${defense}, 체력 ${health}">
      <div class="unit-portrait"><img src="${card.image}" alt="" loading="lazy"><span class="unit-portrait-shade"></span><b class="unit-cost-label">◇ ${card.cost}</b></div>
      <div class="unit-nameplate"><strong>${card.name}</strong><small>${card.department || card.position || card.role}</small></div>
      <div class="unit-numbers">${formatUnitStat('⚔', attack, attackBase, attackTemp)}${formatUnitStat('⛨', defense, defenseBase, defenseTemp)}<span>♥ ${health}</span></div>
    </div>`;
  }

  function formatStatBreakdown(total, base, temporary) {
    const safeTotal = Number.isFinite(total) ? total : 0;
    const safeBase = Number.isFinite(base) ? base : safeTotal;
    const safeTemporary = Number.isFinite(temporary) ? temporary : 0;
    if (!safeTemporary) return String(safeTotal);
    return `${safeTotal} (${safeBase}${safeTemporary > 0 ? '+' : ''}${safeTemporary})`;
  }

  function formatUnitStat(icon, total, base, temporary) {
    const breakdown = formatStatBreakdown(total, base, temporary);
    const split = breakdown.indexOf(' (');
    const number = split < 0 ? breakdown : breakdown.slice(0, split);
    const detail = split < 0 ? '' : ` <i>${breakdown.slice(split + 1).trim()}</i>`;
    return `<span>${icon} ${number}${detail}</span>`;
  }

  function bannerMarkup(side) {
    const p = match.players[side];
    const leader = DATA.leaders[p.leaderId];
    const faction = DATA.factions[p.factionId];
    const enemy = side === 'opponent';
    const healthPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
    return `<div class="leader-banner ${enemy ? 'rival-leader' : 'your-leader'} inspectable-leader" data-leader-side="${side}" role="button" tabindex="0" aria-label="${leader.name} 대표 캐릭터 정보" style="--faction-color:${faction.color};--faction-accent:${faction.accent}">
      <div class="leader-avatar"><img src="${leader.image}" alt="${leader.name}" loading="lazy"><span class="avatar-ring"></span></div>
      <div class="leader-name-block"><small>${enemy ? 'LEAGUE CHALLENGER' : 'YOUR REPRESENTATIVE'} <i>·</i> ${faction.short}</small><strong>${leader.name}</strong><em>${leader.epithet}</em></div>
      <div class="leader-health"><div class="health-label"><span>대표 라이프</span><b>${Math.max(0, p.hp)} <i>/ ${p.maxHp}</i></b></div><div class="health-track"><span style="width:${healthPct}%"></span></div></div>
      ${enemy ? `<div class="leader-piles"><span data-hand-pile="opponent">손패 <b>${p.hand.length}</b></span><span>덱 <b>${p.deck.length}</b></span><span class="opponent-discard-pile" data-discard-pile="opponent">버림 <b>${p.discard.length}</b></span></div>` : `<div class="leader-piles"><span>덱 <b>${p.deck.length}</b></span><span class="player-discard-count">버림 <b>${p.discard.length}</b></span></div>`}
    </div>`;
  }

  function inspectorMarkup() {
    if (selectedHandId) {
      const instance = match.players.player.hand.find(item => item.iid === selectedHandId);
      if (instance) return inspectorCardMarkup(RULES.cardById[instance.cardId]);
    }
    if (inspectedLeaderSide) {
      const player = match.players[inspectedLeaderSide];
      const leader = DATA.leaders[player.leaderId];
      const faction = DATA.factions[player.factionId];
      return `<div class="inspect-card-image"><img src="${leader.image}" alt="${leader.name}"></div>
        <div class="inspect-title"><small>${faction.name} · 대표 캐릭터</small><strong>${leader.name}</strong></div>
        <p class="inspect-description">${leader.abilityText}</p>
        <div class="inspect-stats"><span>대표 라이프 <b>${Math.max(0, player.hp)} / ${player.maxHp}</b></span><span>능력 발동 <b>라운드 시작</b></span></div>
        <div class="inspect-cost"><span>호칭</span><b>${leader.epithet}</b></div>`;
    }
    if (inspectedBoardCard) {
      const owner = match.players[inspectedBoardCard.side];
      const collection = inspectedBoardCard.kind === 'spell' ? owner?.spellQueue : owner?.field;
      const item = collection?.find(entry => entry.iid === inspectedBoardCard.iid);
      const card = RULES.cardById[item?.cardId || inspectedBoardCard.cardId];
      if (card) {
        if (inspectedBoardCard.kind === 'spell') {
          return `<div class="inspect-card-image inspect-spell-image"><span>${card.symbol}</span></div>
            <div class="inspect-title"><small>${DATA.factions[card.faction].name} · 검식</small><strong>${card.name}</strong></div>
            <p class="inspect-description">${card.text}</p>
            <div class="inspect-stats"><span>유형 <b>검식</b></span><span>발동 <b>추종자보다 먼저</b></span></div>
            <div class="inspect-cost"><span>전장 사이즈</span><b>${card.cost}</b></div>`;
        }
        const stats = item ? {
          attack: card.attack + item.attackBonus + item.tempAttack,
          attackBase: card.attack + item.attackBonus,
          attackTemp: item.tempAttack,
          defense: RULES.unitDefense(item),
          defenseBase: (card.defense || 0) + (item.defenseBonus || 0),
          defenseTemp: item.tempDefense,
          health: RULES.unitHealth(item),
          maxHealth: card.health + item.healthBonus
        } : inspectedBoardCard.stats || {
          attack: card.attack, attackBase: card.attack, attackTemp: 0,
          defense: card.defense || 0, defenseBase: card.defense || 0, defenseTemp: 0,
          health: card.health, maxHealth: card.health
        };
        return `<div class="inspect-card-image"><img src="${card.image}" alt="${card.name}"></div>
          <div class="inspect-title"><small>${DATA.factions[card.faction].name} · ${card.department || card.position || card.role}${card.role && (card.department || card.position) ? ` · ${card.role}` : ''}</small><strong>${card.name}</strong></div>
          <p class="inspect-description">${card.text}</p>
          <div class="inspect-stats"><span>공격 <b>${formatStatBreakdown(stats.attack, stats.attackBase, stats.attackTemp)}</b></span><span>방어 <b>${formatStatBreakdown(stats.defense, stats.defenseBase, stats.defenseTemp)}</b></span><span>체력 <b>${stats.health} / ${stats.maxHealth}</b></span></div>
          <div class="inspect-cost"><span>사이즈</span><b>${card.cost}</b></div>`;
      }
    }
    return `<div class="inspect-empty"><span>◇</span><p>손패나 전장의 카드를<br>선택하면 정보가 표시됩니다.</p></div>`;
  }

  function inspectorCardMarkup(card) {
    const faction = DATA.factions[card.faction];
    return `<div class="inspect-card-image ${card.type === 'spell' ? 'inspect-spell-image' : ''}">${card.type === 'unit' ? `<img src="${card.image}" alt="${card.name}">` : `<span>${card.symbol}</span>`}</div>
      <div class="inspect-title"><small>${faction.name} · ${card.type === 'unit' ? `추종자${card.department ? ` · ${card.department}` : card.position ? ` · ${card.position}` : ''}` : '검식'}</small><strong>${card.name}</strong></div>
      <p class="inspect-description">${card.text}</p>
      <div class="inspect-stats">${card.type === 'unit' ? `<span>공격 <b>${card.attack}</b></span><span>방어 <b>${card.defense || 0}</b></span><span>체력 <b>${card.health}</b></span>` : `<span>유형 <b>검식 배치</b></span>`}</div>
      <div class="inspect-cost"><span>사이즈</span><b>${card.cost}</b></div>`;
  }

  function renderInspector() {
    if (match) $('#inspector-content').innerHTML = inspectorMarkup();
  }

  function renderBattle() {
    if (!match) return;
    const player = match.players.player;
    const opponent = match.players.opponent;
    const myTurn = isHumanTurn();
    updateDeploymentClock();
    $('.table-area').style.setProperty('--faction-color', DATA.factions[player.factionId].color);
    const priorityName = match.initiativeSide === 'player' ? '내 선공' : '상대 선공';
    const phaseName = match.phase === 'intro' ? '대전 준비' : match.phase === 'deploy' ? '배치' : match.phase === 'resolving' ? '전투' : match.phase === 'roundEnd' ? '종료' : '종료';
    $('#round-label').textContent = match.phase === 'intro' ? '대전 준비 · VS' : `라운드 ${match.round} · ${priorityName} · ${phaseName}`;
    $('#opponent-banner').innerHTML = bannerMarkup('opponent');
    $('#player-banner').innerHTML = bannerMarkup('player');
    const opponentCards = RULES.boardCards(opponent);
    const playerCards = RULES.boardCards(player);
    $('#opponent-field').innerHTML = Array.from({ length: FIELD_SLOTS }, (_, i) => boardSlotMarkup(opponentCards[i], 'opponent', i)).join('');
    $('#player-field').innerHTML = Array.from({ length: FIELD_SLOTS }, (_, i) => boardSlotMarkup(playerCards[i], 'player', i)).join('');
    const usedSize = player.sizeUsedThisTurn;
    const fieldSize = RULES.currentFieldSize(player);
    const availableSize = Math.max(0, player.sizeLimit - usedSize);
    $('#size-display').innerHTML = `<span class="size-label">전장 ${fieldSize} · 라운드 배치 ${player.cardsPlayedThisTurn}/${RULES.limits.playsPerTurn}</span><strong>${usedSize}<i> / ${player.sizeLimit}</i></strong><span class="size-remaining">남음 ${availableSize}</span><span class="size-gem">◇</span>`;
    $('#player-hand').innerHTML = player.hand.map(instance => {
      const card = RULES.cardById[instance.cardId];
      return cardMarkup(card, { handId: instance.iid, selected: selectedHandId === instance.iid, disabled: !RULES.canPlayCard(player, card) });
    }).join('') || `<div class="empty-hand">손패가 비었습니다.</div>`;
    $('#hand-count').textContent = `${player.hand.length} / ${RULES.limits.hand}`;
    $('#player-deck-count').textContent = player.deck.length;
    $('#player-discard-count').textContent = player.discard.length;
    renderInspector();
    $('#battle-log').innerHTML = match.log.map((entry, index) => `<li class="${index === 0 ? 'latest-log' : ''}"><span>${String(match.log.length - index).padStart(2, '0')}</span>${entry}</li>`).join('');
    const selected = player.hand.find(instance => instance.iid === selectedHandId);
    const selectedCard = selected && RULES.cardById[selected.cardId];
    const playCheck = selectedCard ? RULES.checkPlay(player, selectedCard) : { ok: false };
    const canAct = myTurn && !handResetAnimating;
    const playOkay = canAct && selectedCard && playCheck.ok;
    $('#play-card').disabled = !playOkay;
    $('#play-card').innerHTML = `${selectedCard ? '필드에 배치' : '카드 배치'} <span>↗</span>`;
    $('#reset-hand').disabled = !canAct || player.handResetsLeft <= 0 || player.hand.length === 0;
    $('#hand-reset-count').textContent = `${player.handResetsLeft}회 남음`;
    $('#leader-skill').disabled = true;
    $('#leader-skill').innerHTML = `<span class="skill-sigil">✧</span><span><small>라운드 시작</small><strong>${leaderOf(player.factionId).ability} 자동 발동</strong></span>`;
    $('#end-turn').disabled = !canAct;
    $('#turn-instruction').textContent = myTurn
      ? (selectedCard ? `${selectedCard.name} · 사이즈 ${selectedCard.cost} · ${playCheck.ok ? '배치 가능' : playCheck.error}` : '추종자와 검식을 필드에 배치하세요. 전투 시작 후 검식이 먼저 발동합니다.')
      : match.phase === 'intro' ? '대표 캐릭터를 확인하고 있습니다…' : match.phase === 'resolving' ? '검식 발동 후 추종자들이 번갈아 전투합니다…' : match.phase === 'roundEnd' ? '다음 라운드를 준비하고 있습니다…' : '상대가 카드를 배치하고 있습니다…';
    $('#player-discard-count').textContent = player.discard.length;
    $('#player-deck-count').textContent = player.deck.length;
    if (match.gameOver) showResult();
  }

  function showResult() {
    stopDeploymentTimer();
    hideCombatStage();
    const result = $('#game-result');
    const won = match.gameOver.winnerId === 'player';
    const draw = match.gameOver.winnerId === 'draw';
    result.innerHTML = `<div class="result-card ${draw ? 'draw' : won ? 'victory' : 'defeat'}"><span class="result-emblem">${draw ? '◇' : won ? '✦' : '◇'}</span><small>TRAINING MATCH COMPLETE</small><h2>${draw ? '무승부' : won ? '승리' : '패배'}</h2><p>${match.gameOver.reason}</p><div class="result-actions"><button class="button button-primary" data-result="replay">다시 대전 <b>↻</b></button><button class="button button-quiet" data-result="home">로비로</button></div></div>`;
    result.classList.remove('hidden');
  }

  function renderCardCollection(filter = 'all') {
    const allCards = collectionCards();
    const cards = allCards.filter(card => filter === 'all' || card.faction === filter);
    return `<div class="codex-filter-row"><button class="codex-filter ${filter === 'all' ? 'active' : ''}" data-codex-filter="all">전체 <b>${allCards.length}</b></button>${factionKeys.map(id => `<button class="codex-filter ${filter === id ? 'active' : ''}" data-codex-filter="${id}">${DATA.factions[id].name} <b>${allCards.filter(card => card.faction === id).length}</b></button>`).join('')}</div>
      <div class="codex-grid">${cards.map(card => `<button class="codex-entry" type="button" data-codex-card="${escapeHTML(card.id)}" aria-label="${escapeHTML(card.name)} 카드 상세 보기" style="--faction-color:${factionColor(card.faction)}">
        <div class="codex-art">${card.type === 'spell' ? `<span>${escapeHTML(card.symbol || '◇')}</span>` : `<img src="${escapeHTML(card.image)}" alt="${escapeHTML(card.name)}" loading="lazy">`}</div>
        <div class="codex-copy"><small>${escapeHTML(DATA.factions[card.faction].name)} · ${escapeHTML(card.type === 'leader' ? '대표 캐릭터' : card.type === 'unit' ? (card.position || card.department || '추종자') : '검식')}</small><strong>${escapeHTML(card.name)}</strong></div>
      </button>`).join('')}</div>`;
  }

  function openModal(kind, filter = 'all') {
    if (kind === 'deck') {
      modalRoot.innerHTML = `<div class="modal-backdrop deck-modal-backdrop" data-close-modal><section class="modal-panel deck-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><small>COLLECTION / DECK BUILDING</small><h2 id="modal-title">덱 편성 <i>30장</i></h2></div><button class="modal-close" data-close-modal aria-label="닫기">×</button></header><div id="deck-builder-body">${deckBuilderMarkup()}</div></section></div>`;
    } else if (kind === 'codex') {
      modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal><section class="modal-panel codex-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><small>COLLECTION / 01</small><h2 id="modal-title">카드 도감 <i>${collectionCards().length}</i></h2></div><button class="modal-close" data-close-modal aria-label="닫기">×</button></header><div id="codex-body">${renderCardCollection(filter)}</div></section></div>`;
    } else {
      modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal><section class="modal-panel rules-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><small>PLAYTEST RULES / 01</small><h2 id="modal-title">시범 규칙 <i>초안</i></h2></div><button class="modal-close" data-close-modal aria-label="닫기">×</button></header><div class="rules-content">
        <p class="rules-lead">소드걸스의 캐릭터·추종자·검식 카드 흐름과 전장 중심 화면 구성을 참고한 1인 훈련전입니다. 아래 수치는 세계관의 최종 규칙이 아니라 첫 플레이 테스트용 기본값입니다.</p>
        <div class="rules-step"><b>01</b><div><strong>대전 준비</strong><p>대표 캐릭터 1명과 같은 기업의 30장 덱으로 시작합니다. 로비의 덱 편성에서 보유 카드풀을 열어 추종자 20장과 검식 10장을 직접 선택합니다. 일반 카드는 덱당 최대 3장, 기업 총수·기업 대표·협동조합 대표 추종자는 1장만 넣을 수 있습니다. 덱 편성에서 현재 목록을 비운 뒤 보유 카드풀에서 새 구성을 만들 수도 있습니다. 시작 손패는 5장, 대표 캐릭터의 라이프는 30입니다.</p></div></div>
        <div class="rules-step"><b>02</b><div><strong>손패와 사이즈</strong><p>라운드 시작에 손패를 5장까지 채우고 코인 토스로 선공을 정합니다. 각 플레이어는 대전마다 손패 리셋권 2회를 받으며, 배치 단계에 현재 손패를 덱에 섞고 같은 장수만큼 다시 뽑을 수 있습니다. 추종자와 검식은 모두 최대 5칸의 전장에 배치하며, 전체 사이즈 한도는 기본 10입니다. 전장에 남은 추종자의 사이즈는 다음 라운드에도 계속 점유하고, 검식도 이번 라운드 배치 사이즈를 사용합니다. 배치 단계에는 내 카드를 더블클릭해 손패로 회수할 수 있습니다. 배치 시간은 30초이며 시간이 끝나면 전투가 자동으로 시작됩니다.</p></div></div>
        <div class="rules-step"><b>03</b><div><strong>검식과 전투</strong><p>라운드 시작에 대표 능력과 추종자 카드에 적힌 라운드 시작 능력이 차례로 발동합니다. 전투를 시작하면 양쪽 검식이 추종자보다 먼저 발동하고 버림 더미로 이동합니다. 그 뒤 양측 추종자가 번갈아 무작위 순서로 공격하며, 대상도 무작위로 정합니다. 대상 추종자는 살아남으면 방어전 능력을 발동하고 반격합니다. 방어력은 받는 전투 피해를 줄입니다(최소 1). 모든 추종자는 배치한 라운드의 전투에 참여합니다.</p></div></div>
        <div class="rules-step"><b>04</b><div><strong>기업 특성과 카드 연계 능력</strong><p>아웃프라웨어는 회복과 생장, 셀파스는 정비와 가속, 남극성은 방어와 반격, 언벡은 회수와 우회에 강합니다. 부서명은 인물의 소속을 나타내는 태그이며, 같은 부서 카드가 모였다고 자동 보너스가 생기지는 않습니다. 일부 카드에만 ‘연계 능력’이 적혀 있고, 해당 카드가 전장에 있을 때 같은 부서 동료가 함께 있으면 그 카드의 능력이 발동합니다. 대표 지원 효과를 가진 추종자는 총수·기업 대표·협동조합 대표 추종자가 전장에 있을 때 해당 카드를 직접 지원합니다. 능력의 조건과 효과는 카드 설명을 확인하세요.</p></div></div>
        <div class="rules-step"><b>05</b><div><strong>비용과 승리</strong><p>사이즈 4 추종자는 높은 공방체와 광역·반복 능력을 갖지만, 파괴될 때 대표 라이프도 4 감소합니다. 사이즈가 낮은 추종자는 빠른 전개와 부서 조합에 유리합니다. 추종자가 파괴되면 소유자의 라이프가 그 카드의 사이즈만큼 감소하고, 상대 전장에 추종자가 없으면 공격 추종자가 사이즈만큼 상대 대표에게 직접 피해를 줍니다. 대표 라이프가 0이 되거나 덱이 비면 패배합니다. 버림 더미는 이야기 속 사망을 뜻하지 않습니다.</p></div></div>
        <div class="rules-foot"><span>기본값</span> 직접 편성 30장(추종자 20 · 검식 10) · 카드당 최대 3장 · 대표 추종자 1장 · 손패 5장 · 리셋권 2회 · 라이프 30 · 전장 5칸 · 사이즈 한도 10 · 라운드당 최대 5장 배치</div>
      </div></section></div>`;
    }
  }

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2100);
  }

  function useSelectedCard() {
    if (!selectedHandId || !isHumanTurn() || handResetAnimating) return;
    const result = RULES.playCard(match, 'player', selectedHandId);
    if (!result.ok) return notify(result.error);
    selectedHandId = null;
    inspectedBoardCard = null;
    inspectedLeaderSide = null;
    renderBattle();
  }

  async function useHandReset() {
    if (!isHumanTurn() || handResetAnimating) return;
    const resetMatch = match;
    const result = RULES.resetHand(resetMatch, 'player');
    if (!result.ok) return notify(result.error);
    handResetAnimating = true;
    selectedHandId = null;
    inspectedBoardCard = null;
    inspectedLeaderSide = null;
    renderBattle();
    try {
      await playVisualEvents(RULES.takeVisualEvents(resetMatch));
    } finally {
      handResetAnimating = false;
      if (match === resetMatch) renderBattle();
    }
    if (match !== resetMatch) return;
    notify(`손패를 다시 뽑았습니다. 리셋권 ${result.remaining}회 남음`);
  }

  const BATTLE_PACE = 1.5;
  const paced = ms => Math.round(ms * BATTLE_PACE);
  const wait = ms => new Promise(resolve => setTimeout(resolve, paced(ms)));

  function boardElement(side, iid) {
    return [...battleScreen.querySelectorAll('[data-board-card]')].find(element => element.dataset.side === side && element.dataset.cardId === iid) || null;
  }

  function leaderElement(side) {
    return battleScreen.querySelector(`[data-leader-side="${side}"]`);
  }

  function applyFxClass(element, className, duration = 560) {
    if (!element) return Promise.resolve();
    element.classList.add(className);
    return wait(duration).then(() => element.classList.remove(className));
  }

  function showSlash(element, defense = false) {
    if (!element) return Promise.resolve();
    const rect = element.getBoundingClientRect();
    const slash = document.createElement('i');
    slash.className = `combat-slash${defense ? ' defense-slash' : ''}`;
    slash.style.left = `${rect.left + rect.width * .18}px`;
    slash.style.top = `${rect.top + rect.height * .48}px`;
    document.body.append(slash);
    return wait(380).then(() => slash.remove());
  }

  function showDamage(element, amount, label = null) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const number = document.createElement('span');
    number.className = `combat-damage${label === '회복' ? ' heal' : ''}`;
    number.textContent = label || `−${amount}`;
    number.style.left = `${rect.left + rect.width / 2}px`;
    number.style.top = `${rect.top + rect.height * .38}px`;
    document.body.append(number);
    wait(750).then(() => number.remove());
  }

  function pulseCombatHealth(element) {
    if (!element) return;
    element.classList.remove('combat-life-updated');
    void element.offsetWidth;
    element.classList.add('combat-life-updated');
    setTimeout(() => element.classList.remove('combat-life-updated'), paced(620));
  }

  function updateCombatHealth(element, current, maximum) {
    if (!element || !Number.isFinite(current)) return;
    const health = Math.max(0, current);
    const unitHealth = element.querySelector('.unit-numbers span:last-child');
    const leaderHealth = element.querySelector('.health-label b');
    if (unitHealth) {
      unitHealth.textContent = `♥ ${health}`;
      pulseCombatHealth(unitHealth);
    }
    if (leaderHealth) {
      leaderHealth.innerHTML = `${health} <i>/ ${maximum}</i>`;
      pulseCombatHealth(leaderHealth);
      const healthBar = element.querySelector('.health-track span');
      if (healthBar && Number.isFinite(maximum) && maximum > 0) {
        healthBar.style.width = `${Math.max(0, Math.min(100, health / maximum * 100))}%`;
      }
    }
  }

  function updateCombatUnitStats(element, state, { pulse = true } = {}) {
    if (!element || !state) return;
    const values = element.querySelectorAll('.unit-numbers span');
    const nextValues = [
      { total: state.attack, base: state.attackBase, temporary: state.attackTemp, icon: '⚔' },
      { total: state.defense, base: state.defenseBase, temporary: state.defenseTemp, icon: '⛨' },
      { total: state.health, base: state.health, temporary: 0, icon: '♥' }
    ];
    nextValues.forEach(({ total, base, temporary, icon }, index) => {
      const value = total;
      if (!Number.isFinite(value) || !values[index]) return;
      const safeValue = index === 2 ? Math.max(0, value) : value;
      const nextMarkup = formatUnitStat(icon, safeValue, base, temporary);
      if (values[index].innerHTML === nextMarkup) return;
      values[index].innerHTML = nextMarkup;
      if (pulse) pulseCombatHealth(values[index]);
    });
    const inspectFields = {
      attack: state.attack,
      attackBase: state.attackBase,
      attackTemp: state.attackTemp,
      defense: state.defense,
      defenseBase: state.defenseBase,
      defenseTemp: state.defenseTemp,
      health: state.health,
      maxHealth: state.maxHealth
    };
    Object.entries(inspectFields).forEach(([key, value]) => {
      if (!Number.isFinite(value)) return;
      const field = key[0].toUpperCase() + key.slice(1);
      element.dataset[`inspect${field}`] = String(value);
    });
    const name = element.querySelector('.unit-nameplate strong')?.textContent;
    if (name) element.setAttribute('aria-label', `${name}, 공격 ${state.attack}, 방어 ${state.defense}, 체력 ${state.health} / ${state.maxHealth}`);
  }

  function showEffectStatChanges(element, state, beforeState = null) {
    if (!element) return;
    const values = [...element.querySelectorAll('.unit-numbers span')];
    const before = beforeState
      ? [beforeState.attack, beforeState.defense, beforeState.health]
      : values.map(value => Number.parseInt(value.textContent.match(/-?\d+/)?.[0], 10));
    const after = [state.attack, state.defense, state.health];
    const icons = ['⚔', '⛨', '♥'];
    const changes = after.flatMap((value, index) => {
      const previous = before[index];
      if (!Number.isFinite(value) || !Number.isFinite(previous) || value === previous) return [];
      const delta = value - previous;
      return [`${icons[index]} ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`];
    });
    if (!changes.length) return;
    const rect = element.getBoundingClientRect();
    const note = document.createElement('span');
    note.className = 'effect-stat-change';
    if (changes.every(change => change.includes('−'))) note.classList.add('effect-stat-decrease');
    note.textContent = changes.join('　');
    note.style.left = `${rect.left + rect.width / 2}px`;
    note.style.top = `${rect.top + rect.height * .34}px`;
    document.body.append(note);
    wait(1050).then(() => note.remove());
  }

  function destinationForHand(side) {
    if (side === 'player') return $('#player-hand');
    return battleScreen.querySelector(`[data-hand-pile="${side}"]`);
  }

  function destinationForDiscard(side) {
    return battleScreen.querySelector(`[data-discard-pile="${side}"]`);
  }

  async function flyCard(source, destination, { fade = true } = {}) {
    if (!source || !destination) return;
    const from = source.getBoundingClientRect();
    const to = destination.getBoundingClientRect();
    const clone = source.cloneNode(true);
    clone.classList.add('grave-fly');
    clone.classList.remove('death-cut', 'combat-target', 'combat-attacker', 'effect-source', 'effect-target');
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    clone.style.left = `${from.left}px`;
    clone.style.top = `${from.top}px`;
    clone.style.width = `${Math.max(36, from.width)}px`;
    clone.style.height = `${Math.max(48, from.height)}px`;
    document.body.append(clone);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    if (typeof clone.animate === 'function') {
      const animation = clone.animate([
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(18deg) scale(.18)`, opacity: fade ? 0 : 1 }
      ], { duration: paced(440), easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'forwards' });
      await animation.finished.catch(() => {});
    } else await wait(440);
    clone.remove();
  }

  async function flyDrawCard(event) {
    if (event.side === 'opponent' && event.from === 'deck') return;
    const fromNode = event.from === 'discard'
      ? battleScreen.querySelector(`[data-discard-pile="${event.side}"]`)
      : (event.side === 'player' ? $('.deck-pile') : null);
    const toNode = destinationForHand(event.side);
    if (!fromNode || !toNode) return;
    const from = fromNode.getBoundingClientRect();
    const to = toNode.getBoundingClientRect();
    const card = RULES.cardById[event.cardId];
    const flight = document.createElement('div');
    flight.className = 'draw-flight';
    const face = card.type === 'unit'
      ? `<img src="${card.image}" alt=""><b>${card.name}</b>`
      : `<strong>${card.symbol}</strong><b>${card.name}</b>`;
    flight.innerHTML = `<div class="draw-flight-inner"><div class="draw-flight-face draw-flight-back">◇</div><div class="draw-flight-face draw-flight-front">${face}</div></div>`;
    flight.style.left = `${from.left + (from.width - 64) / 2}px`;
    flight.style.top = `${from.top + (from.height - 92) / 2}px`;
    document.body.append(flight);
    const destinationX = to.left + Math.min(to.width - 34, Math.max(32, to.width * .58));
    const destinationY = to.top + to.height * .48;
    const dx = destinationX - (from.left + from.width / 2);
    const dy = destinationY - (from.top + from.height / 2);
    const inner = flight.querySelector('.draw-flight-inner');
    const fromDiscard = event.from === 'discard';
    if (fromDiscard) inner.style.transform = 'rotateY(180deg)';
    const motion = flight.animate?.([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(.58)`, opacity: 1 }
      ], { duration: paced(470), easing: 'cubic-bezier(.2,.72,.28,1)', fill: 'forwards' });
    const flip = fromDiscard ? null : inner?.animate?.([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], { duration: paced(470), easing: 'ease-in-out', fill: 'forwards' });
    if (motion) await motion.finished.catch(() => {});
    else await wait(470);
    if (flip) await flip.finished.catch(() => {});
    flight.remove();
    if (event.side === 'player' && event.handId) {
      const dealtCard = [...$('#player-hand').querySelectorAll('[data-hand-id]')].find(element => element.dataset.handId === event.handId);
      dealtCard?.classList.add('dealt-in');
    }
  }

  function showCombatStage(event) {
    if (!['attack', 'spell', 'effect'].includes(event.type)) return null;
    const stage = $('#combat-stage');
    if (!stage) return null;
    const sourceId = event.type === 'spell' ? event.spellId : (event.sourceId || event.attackerId);
    const sourceSide = event.side;
    const sourceElement = event.sourceType === 'leader'
      ? leaderElement(sourceSide)
      : boardElement(sourceSide, sourceId);
    const firstTarget = event.type === 'attack'
      ? (event.targetId ? { side: sourceSide === 'player' ? 'opponent' : 'player', iid: event.targetId } : null)
      : ((event.targetStates || event.targets || [])[0] || null);
    const singleCardEffect = event.type === 'effect'
      && event.sourceType === 'unit'
      && firstTarget?.side === sourceSide
      && firstTarget?.iid === sourceId;
    const targetElement = firstTarget
      ? boardElement(firstTarget.side, firstTarget.iid)
      : (event.type === 'attack' && event.directHit ? leaderElement(sourceSide === 'player' ? 'opponent' : 'player') : null);

    const scene = document.createElement('div');
    scene.className = 'combat-stage-scene';
    const heading = document.createElement('div');
    heading.className = 'combat-stage-heading';
    const title = document.createElement('strong');
    title.textContent = event.type === 'spell' ? '검식 발동' : event.type === 'attack' ? '공격 선언' : singleCardEffect ? '자기 강화' : '효과 적용';
    const subtitle = document.createElement('small');
    subtitle.textContent = event.type === 'spell'
      ? (RULES.cardById[event.cardId]?.name || '검식')
      : event.type === 'effect'
        ? (event.label || '능력 효과')
        : (sourceElement?.querySelector('.unit-nameplate strong')?.textContent || '추종자');
    heading.append(title, subtitle);

    const pair = document.createElement('div');
    pair.className = 'combat-stage-pair';
    const makeSide = (element, label, placeholderText, leader = false) => {
      const side = document.createElement('div');
      side.className = `combat-focus-side${leader ? ' leader-side' : ''}`;
      const sideLabel = document.createElement('small');
      sideLabel.className = 'combat-focus-label';
      sideLabel.textContent = label;
      const cloneCard = source => {
        if (!source) {
          const placeholder = document.createElement('div');
          placeholder.className = 'combat-focus-placeholder';
          const symbol = document.createElement('span');
          symbol.textContent = '◇';
          const text = document.createElement('b');
          text.textContent = placeholderText;
          placeholder.append(symbol, text);
          return placeholder;
        }
        return cloneCombatCard(source);
      };
      let card = cloneCard(element);
      side.append(sideLabel, card);
      return {
        side,
        sideLabel,
        get card() { return card; },
        setCard(source, nextLabel = null) {
          const nextCard = cloneCard(source);
          card.replaceWith(nextCard);
          card = nextCard;
          if (nextLabel) sideLabel.textContent = nextLabel;
          side.classList.remove('focus-card-refresh');
          void side.offsetWidth;
          side.classList.add('focus-card-refresh');
        }
      };
    };
    const sourceLabel = singleCardEffect ? '자기 강화' : event.type === 'spell' || event.sourceType === 'spell' ? '검식' : event.sourceType === 'leader' ? '대표 능력' : event.type === 'effect' ? '능력 보유자' : '공격자';
    const source = makeSide(sourceElement, sourceLabel, '발동 효과');
    const targetLabel = event.directHit ? '직접 공격 대상' : event.type === 'effect' ? '효과 대상' : '공격 대상';
    const target = singleCardEffect ? null : makeSide(targetElement, targetLabel, '대상 없음', Boolean(event.directHit));
    const versus = document.createElement('div');
    versus.className = 'combat-stage-versus';
    versus.textContent = event.type === 'spell' || event.type === 'effect' ? '✦' : 'VS';
    pair.append(source.side, versus);
    if (target) pair.append(target.side);

    scene.append(heading, pair);
    stage.replaceChildren(scene);
    stage.classList.remove('counterattack');
    stage.classList.remove('hidden');
    return {
      stage,
      scene,
      pair,
      title,
      subtitle,
      sourceLabel: source.sideLabel,
      targetLabel: target?.sideLabel || null,
      versus,
      get sourceCard() { return source.card; },
      sourceName: subtitle.textContent,
      sourceId,
      sourceSide,
      get targetCard() { return target?.card || null; },
      targetName: targetElement?.querySelector('.unit-nameplate strong, .leader-name-block strong')?.textContent || '방어자',
      targetId: firstTarget?.iid || null,
      targetSide: firstTarget?.side || null,
      setSourceCard(element, label) {
        const nextId = element?.dataset.cardId || null;
        const nextSide = element?.dataset.side || null;
        if (this.sourceId === nextId && this.sourceSide === nextSide) {
          if (label) source.sideLabel.textContent = label;
          return;
        }
        source.setCard(element, label);
        this.sourceId = nextId;
        this.sourceSide = nextSide;
      },
      setTargetCard(element, label) {
        if (!target) return;
        const nextId = element?.dataset.cardId || null;
        const nextSide = element?.dataset.side || null;
        this.targetName = element?.querySelector('.unit-nameplate strong, .leader-name-block strong')?.textContent || '효과 대상';
        if (this.targetId === nextId && this.targetSide === nextSide) {
          if (label) target.sideLabel.textContent = label;
          return;
        }
        target.setCard(element, label);
        this.targetId = nextId;
        this.targetSide = nextSide;
      }
    };
  }

  function cloneCombatCard(source) {
    const clone = source.cloneNode(true);
    clone.classList.add('combat-focus-card');
    clone.classList.remove('combat-attacker', 'combat-target', 'effect-source', 'effect-target', 'effect-impact', 'death-cut');
    if (source.dataset.boardCard !== undefined) {
      clone.dataset.inspectSide = source.dataset.side;
      clone.dataset.inspectKind = source.dataset.kind;
      clone.dataset.inspectIid = source.dataset.cardId;
      clone.dataset.inspectCardId = source.dataset.cardTemplate;
      ['attack', 'attackBase', 'attackTemp', 'defense', 'defenseBase', 'defenseTemp', 'health', 'maxHealth'].forEach(stat => {
        if (source.dataset[`inspect${stat[0].toUpperCase()}${stat.slice(1)}`] !== undefined) {
          clone.dataset[`inspect${stat[0].toUpperCase()}${stat.slice(1)}`] = source.dataset[`inspect${stat[0].toUpperCase()}${stat.slice(1)}`];
        }
      });
      clone.setAttribute('role', 'button');
      clone.setAttribute('tabindex', '0');
      clone.setAttribute('aria-label', `${source.getAttribute('aria-label') || '카드'} 정보 보기`);
    } else if (source.dataset.leaderSide) {
      clone.dataset.inspectLeaderSide = source.dataset.leaderSide;
      clone.setAttribute('role', 'button');
      clone.setAttribute('tabindex', '0');
      clone.setAttribute('aria-label', `${source.querySelector('.leader-name-block strong')?.textContent || '대표 캐릭터'} 정보 보기`);
    }
    clone.removeAttribute('id');
    clone.removeAttribute('data-board-card');
    clone.removeAttribute('data-card-id');
    clone.removeAttribute('data-side');
    clone.removeAttribute('data-kind');
    clone.removeAttribute('data-leader-side');
    clone.removeAttribute('data-card-template');
    clone.removeAttribute('data-inspect-attack');
    clone.removeAttribute('data-inspect-defense');
    clone.removeAttribute('data-inspect-health');
    clone.removeAttribute('data-inspect-max-health');
    clone.removeAttribute('aria-hidden');
    return clone;
  }

  function showGlobalEffectStage(event) {
    const stage = $('#combat-stage');
    if (!stage) return null;
    const roundExpiry = event.timing === 'roundEnd';
    const source = event.sourceType === 'leader'
      ? leaderElement(event.side)
      : event.sourceType === 'system' ? null : boardElement(event.side, event.sourceId);
    const scene = document.createElement('div');
    scene.className = `combat-stage-scene global-effect-scene${roundExpiry ? ' round-expiry-scene' : ''}`;
    const heading = document.createElement('div');
    heading.className = 'combat-stage-heading';
    const title = document.createElement('strong');
    title.textContent = roundExpiry ? '라운드 종료' : event.beneficial ? '강화 적용' : '전체 효과 발동';
    const subtitle = document.createElement('small');
    subtitle.textContent = event.label || (event.beneficial ? '아군 강화' : '전체 효과');
    heading.append(title, subtitle);
    const frame = document.createElement('div');
    frame.className = 'global-effect-focus-frame';
    const card = source
      ? cloneCombatCard(source)
      : document.createElement('div');
    if (!source) {
      card.className = 'combat-focus-placeholder global-effect-source-card';
      card.innerHTML = roundExpiry ? '<span>⌛</span><b>한정 강화 종료</b>' : '<span>✦</span><b>전체 효과</b>';
    } else {
      card.classList.add('global-effect-source-card');
    }
    frame.append(card);
    scene.append(heading, frame);
    stage.replaceChildren(scene);
    stage.classList.remove('counterattack', 'hidden');
    stage.classList.add('global-effect-stage');
    return { stage, card };
  }

  function launchEffectMeteor(target, index, variant = 'positive') {
    if (!target) return null;
    const targetRect = target.getBoundingClientRect();
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height * .34;
    const drift = targetRect.width * .3 * (index % 2 ? -1 : 1);
    const startX = Math.max(18, Math.min(window.innerWidth - 18, endX + drift));
    const startY = Math.max(16, targetRect.top - Math.min(150, Math.max(90, targetRect.height * .72)));
    const dx = endX - startX;
    const dy = endY - startY;
    const meteor = document.createElement('i');
    meteor.className = `effect-meteor${variant === 'expiry' ? ' effect-expiry-mote' : variant === 'positive' ? ' effect-positive-mote' : ''}`;
    meteor.style.left = `${startX - 8}px`;
    meteor.style.top = `${startY - 8}px`;
    meteor.style.setProperty('--meteor-angle', `${Math.atan2(dy, dx) * 180 / Math.PI}deg`);
    document.body.append(meteor);
    const animation = meteor.animate?.([
      { transform: 'translate(0, 0) scale(.2) rotate(0deg)', opacity: 0 },
      { transform: `translate(${dx * .18}px, ${dy * .18}px) scale(.75) rotate(65deg)`, opacity: 1, offset: .22 },
      { transform: `translate(${dx}px, ${dy}px) scale(1.1) rotate(240deg)`, opacity: 1, offset: .88 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(300deg)`, opacity: 0 }
    ], { duration: paced(580), easing: 'cubic-bezier(.2,.72,.25,1)', fill: 'forwards' });
    const finished = animation ? animation.finished.catch(() => {}) : wait(580);
    return { meteor, finished };
  }

  async function animateMeteorToTarget(target, state, index, beforeState = null) {
    const flight = launchEffectMeteor(target, index, 'impact');
    if (!flight) return;
    await flight.finished;
    flight.meteor.remove();
    target.classList.remove('effect-impact');
    void target.offsetWidth;
    target.classList.add('effect-impact');
    showEffectStatChanges(target, state, beforeState);
    updateCombatUnitStats(target, state);
    await wait(410);
    target.classList.remove('effect-impact');
  }

  async function animateBeneficialTargets(states) {
    const targets = states.map((state, index) => ({ state, index, element: boardElement(state.side, state.iid) }))
      .filter(item => item.element);
    if (!targets.length) return;
    const flights = targets.map(item => launchEffectMeteor(item.element, item.index, 'positive')).filter(Boolean);
    await Promise.all(flights.map(flight => flight.finished));
    flights.forEach(flight => flight.meteor.remove());
    targets.forEach(({ state, element }) => {
      element.classList.remove('effect-impact', 'effect-positive-impact');
      void element.offsetWidth;
      element.classList.add('effect-positive-impact');
      updateCombatUnitStats(element, state, { pulse: false });
    });
    await wait(430);
    targets.forEach(({ element }) => element.classList.remove('effect-positive-impact'));
  }

  async function animateRoundExpiry(states) {
    const table = $('.table-area');
    if (!table) return;
    const sweep = document.createElement('i');
    sweep.className = 'round-expiry-wave';
    table.append(sweep);
    const animation = sweep.animate?.([
      { transform: 'translateX(-120%)', opacity: 0 },
      { transform: 'translateX(-15%)', opacity: .9, offset: .18 },
      { transform: 'translateX(180%)', opacity: 0 }
    ], { duration: paced(820), easing: 'cubic-bezier(.2,.72,.22,1)', fill: 'forwards' });
    if (animation) await animation.finished.catch(() => {});
    else {
      sweep.classList.add('round-expiry-wave-fallback');
      await wait(820);
    }
    sweep.remove();
    states.forEach(state => {
      const element = boardElement(state.side, state.iid);
      if (element) updateCombatUnitStats(element, state, { pulse: false });
    });
  }

  async function animateGlobalEffectEvent(event) {
    const focus = showGlobalEffectStage(event);
    if (!focus) return;
    const roundExpiry = event.timing === 'roundEnd';
    await wait(roundExpiry ? 560 : event.beneficial ? 500 : 680);
    hideCombatStage();
    await wait(90);
    const states = event.targetStates || [];
    if (roundExpiry) {
      await animateRoundExpiry(states);
      return;
    }
    if (event.beneficial) {
      await animateBeneficialTargets(states);
      return;
    }
    for (let index = 0; index < states.length; index += 1) {
      const state = states[index];
      const target = boardElement(state.side, state.iid);
      if (!target) continue;
      const beforeState = event.beforeStates?.find(item => item.side === state.side && item.iid === state.iid) || null;
      await animateMeteorToTarget(target, state, index, beforeState);
      await wait(95);
    }
  }

  async function animateEffectEvent(event, focus = null) {
    if (event.scope === 'all' || event.beneficial) return animateGlobalEffectEvent(event);
    const source = event.sourceType === 'leader' ? leaderElement(event.side) : boardElement(event.side, event.sourceId);
    const targetStates = event.targetStates?.length
      ? event.targetStates
      : (event.targets || []).map(target => ({ ...target }));
    const isSelfEffect = event.sourceType === 'unit'
      && targetStates.length === 1
      && targetStates[0].side === event.side
      && targetStates[0].iid === event.sourceId;
    if (focus) {
      focus.title.textContent = isSelfEffect ? '자기 강화' : event.timing === 'attack' ? '공격 능력 발동' : event.timing === 'defense' ? '방어 능력 발동' : '효과 적용';
      focus.subtitle.textContent = event.label || '능력 효과';
      focus.versus.textContent = '✦';
      focus.stage.classList.remove('counterattack');
      focus.pair.classList.remove('counterattack');
      if (focus.sourceId !== event.sourceId || focus.sourceSide !== event.side) {
        focus.setSourceCard(source, event.sourceType === 'spell' ? '검식' : event.sourceType === 'leader' ? '대표 능력' : '능력 보유자');
      }
    }

    if (!targetStates.length) {
      await applyFxClass(source, 'effect-source', 560);
      return;
    }

    for (let index = 0; index < targetStates.length; index += 1) {
      const state = targetStates[index];
      const target = boardElement(state.side, state.iid);
      const label = targetStates.length > 1 ? `효과 대상 ${index + 1} / ${targetStates.length}` : '효과 대상';
      if (focus && (focus.targetId !== state.iid || focus.targetSide !== state.side)) focus.setTargetCard(target, label);
      const targetFocus = focus?.targetCard;
      if (isSelfEffect) {
        const effects = [applyFxClass(source, 'effect-source', 560)];
        if (focus?.sourceCard) effects.push(applyFxClass(focus.sourceCard, 'effect-source', 560));
        await Promise.all(effects);
        if (Number.isFinite(state.attack) || Number.isFinite(state.defense) || Number.isFinite(state.health)) {
          const beforeState = event.beforeStates?.find(item => item.side === state.side && item.iid === state.iid) || null;
          showEffectStatChanges(focus?.sourceCard || target, state, beforeState);
          updateCombatUnitStats(target, state);
          updateCombatUnitStats(focus?.sourceCard, state);
        }
        continue;
      }
      const effects = [
        applyFxClass(source, 'effect-source', 560),
        applyFxClass(target, 'effect-target', 600)
      ];
      if (focus?.sourceCard) effects.push(applyFxClass(focus.sourceCard, 'effect-source', 560));
      if (targetFocus) effects.push(applyFxClass(targetFocus, 'effect-target', 600));
      await Promise.all(effects);
      if (Number.isFinite(state.attack) || Number.isFinite(state.defense) || Number.isFinite(state.health)) {
        const beforeState = event.beforeStates?.find(item => item.side === state.side && item.iid === state.iid) || null;
        showEffectStatChanges(targetFocus || target, state, beforeState);
        updateCombatUnitStats(target, state);
        updateCombatUnitStats(targetFocus, state);
      }
      if (index < targetStates.length - 1) await wait(110);
    }
  }

  async function playVisualEvents(events = []) {
    if (!events.length) return;
    const effects = events.filter(event => event.type === 'effect');
    const movements = events.filter(event => ['return', 'discard'].includes(event.type));
    const draws = events.filter(event => event.type === 'draw' && event.side === 'player');
    for (const event of effects) {
      const hasTargets = (event.targetStates?.length || event.targets?.length || 0) > 0;
      if (!hasTargets) continue;
      if (event.scope === 'all' || event.beneficial) {
        await animateGlobalEffectEvent(event);
        continue;
      }
      const focus = showCombatStage({ ...event, type: 'effect' });
      if (focus) await wait(260);
      try {
        await animateEffectEvent(event, focus);
        if (focus) await wait(220);
      } finally {
        if (focus) hideCombatStage();
      }
    }
    for (const event of movements) {
      const source = boardElement(event.side, event.sourceId);
      const destination = event.type === 'return' ? destinationForHand(event.side) : destinationForDiscard(event.side);
      await flyCard(source, destination);
    }
    await Promise.all(draws.map((event, index) => wait(index * 75).then(() => flyDrawCard(event))));
  }

  async function animateDeath(unit) {
    const element = boardElement(unit.side, unit.iid);
    if (!element) return;
    element.classList.add('death-cut');
    const slash = showSlash(element);
    await wait(240);
    await flyCard(element, destinationForDiscard(unit.side));
    await slash;
  }

  async function animateBattleStep(event) {
    const effects = (event.visuals || []).filter(item => item.type === 'effect');
    const movements = (event.visuals || []).filter(item => ['return', 'discard'].includes(item.type));
    const draws = (event.visuals || []).filter(item => item.type === 'draw' && item.side === 'player');
    let focus = null;
    let attacker = null;
    let target = null;
    const ensureFocus = async () => {
      if (!focus) {
        focus = showCombatStage(event);
        if (focus) await wait(430);
      }
      return focus;
    };
    const animateStepEffect = async effect => {
      if (effect.scope === 'all' || effect.beneficial) {
        if (focus) {
          hideCombatStage();
          focus = null;
        }
        await animateGlobalEffectEvent(effect);
      } else {
        const targets = effect.targetStates?.length ? effect.targetStates : (effect.targets || []);
        const isSelfEffect = effect.sourceType === 'unit'
          && targets.length === 1
          && targets[0].side === effect.side
          && targets[0].iid === effect.sourceId;
        if (isSelfEffect) {
          if (focus) hideCombatStage();
          focus = showCombatStage({ ...effect, type: 'effect' });
          if (focus) await wait(430);
          await animateEffectEvent(effect, focus);
          if (focus) {
            await wait(260);
            hideCombatStage();
            focus = null;
          }
          return;
        }
        await ensureFocus();
        await animateEffectEvent(effect, focus);
      }
    };

    try {
      if (event.type === 'attack') {
        const attackEffects = effects.filter(effect => effect.timing !== 'defense');
        const defenseEffects = effects.filter(effect => effect.timing === 'defense');
        for (const effect of attackEffects) await animateStepEffect(effect);
        await ensureFocus();

        const targetSide = event.side === 'player' ? 'opponent' : 'player';
        const boardAttacker = boardElement(event.side, event.attackerId);
        const boardTarget = event.directHit
          ? leaderElement(targetSide)
          : (event.targetId ? boardElement(targetSide, event.targetId) : null);
        if (focus) {
          focus.stage.classList.remove('counterattack');
          focus.pair.classList.remove('counterattack');
          focus.title.textContent = '공격 선언';
          focus.subtitle.textContent = boardAttacker?.querySelector('.unit-nameplate strong')?.textContent || focus.sourceName;
          focus.versus.textContent = 'VS';
          focus.setSourceCard(boardAttacker, '공격자');
          focus.setTargetCard(boardTarget, event.directHit ? '직접 공격 대상' : '공격 대상');
        }
        attacker = focus?.sourceCard || boardAttacker;
        target = focus?.targetCard || boardTarget;
        const actions = [];
        if (attacker) actions.push(applyFxClass(attacker, 'combat-attacker', 650));
        if (target) {
          actions.push(wait(180).then(() => applyFxClass(target, 'combat-target', 700)));
          actions.push(wait(180).then(() => showSlash(target)));
          if (event.damage) actions.push(wait(180).then(() => showDamage(target, event.damage)));
        } else if (event.directHit) {
          const leader = target;
          if (leader) {
            actions.push(wait(180).then(() => applyFxClass(leader, 'combat-target', 700)));
            actions.push(wait(180).then(() => showSlash(leader)));
            actions.push(wait(180).then(() => showDamage(leader, event.directDamage || 1)));
          }
        }
        await Promise.all(actions);

        if (event.directHit) {
          updateCombatHealth(target, event.targetLeaderLifeAfterAttack, event.targetLeaderMaxLife);
          if (boardTarget !== target) updateCombatHealth(boardTarget, event.targetLeaderLifeAfterAttack, event.targetLeaderMaxLife);
        } else {
          const hitHealth = Number.isFinite(event.targetHealthAfterHit) ? event.targetHealthAfterHit : event.targetHealthAfterAttack;
          const hitMaxHealth = Number.isFinite(event.targetMaxHealthAfterHit) ? event.targetMaxHealthAfterHit : event.targetMaxHealth;
          updateCombatHealth(target, hitHealth, hitMaxHealth);
          if (boardTarget !== target) updateCombatHealth(boardTarget, hitHealth, hitMaxHealth);
          if (event.destroyedUnits?.some(unit => unit.side === targetSide)) {
            const hitLeaderLife = Number.isFinite(event.targetOwnerLeaderLifeAfterHit) ? event.targetOwnerLeaderLifeAfterHit : event.targetOwnerLeaderLifeAfterAttack;
            const hitLeaderMax = Number.isFinite(event.targetOwnerLeaderMaxLifeAfterHit) ? event.targetOwnerLeaderMaxLifeAfterHit : event.targetOwnerLeaderMaxLife;
            updateCombatHealth(leaderElement(targetSide), hitLeaderLife, hitLeaderMax);
          }
        }

        for (const effect of defenseEffects) await animateStepEffect(effect);
        if (!event.directHit) {
          await ensureFocus();
          if (focus) {
            focus.setSourceCard(boardAttacker, '공격자');
            focus.setTargetCard(boardTarget, '공격 대상');
          }
          updateCombatHealth(focus?.targetCard || target, event.targetHealthAfterAttack, event.targetMaxHealth);
          if (boardTarget !== (focus?.targetCard || target)) updateCombatHealth(boardTarget, event.targetHealthAfterAttack, event.targetMaxHealth);
          if (event.destroyedUnits?.some(unit => unit.side === targetSide)) {
            updateCombatHealth(leaderElement(targetSide), event.targetOwnerLeaderLifeAfterAttack, event.targetOwnerLeaderMaxLife);
          }
        }
      }
      else {
        for (const effect of effects) await animateStepEffect(effect);
      }

      if (event.retaliationDamage) {
        await ensureFocus();
        await wait(260);
        if (focus) {
          const targetSide = event.side === 'player' ? 'opponent' : 'player';
          focus.setSourceCard(boardElement(event.side, event.attackerId), '반격 대상');
          focus.setTargetCard(boardElement(targetSide, event.targetId), '반격자');
          focus.stage.classList.add('counterattack');
          focus.pair.classList.add('counterattack');
          focus.title.textContent = '반격';
          focus.subtitle.textContent = `${focus.targetName}의 반격`;
          focus.versus.textContent = '↶';
          await wait(240);
        }
        const counterattacker = focus?.targetCard || target;
        const counterTarget = focus?.sourceCard || attacker;
        const counterActions = [];
        if (counterattacker) counterActions.push(applyFxClass(counterattacker, 'combat-attacker', 650));
        if (counterTarget) {
          counterActions.push(wait(160).then(() => applyFxClass(counterTarget, 'combat-target', 700)));
          counterActions.push(wait(160).then(() => showSlash(counterTarget, true)));
          counterActions.push(wait(160).then(() => showDamage(counterTarget, event.retaliationDamage)));
        }
        await Promise.all(counterActions);
        updateCombatHealth(counterTarget, event.attackerHealthAfterRetaliation, event.attackerMaxHealth);
        const boardCounterTarget = boardElement(event.side, event.attackerId);
        if (boardCounterTarget !== counterTarget) updateCombatHealth(boardCounterTarget, event.attackerHealthAfterRetaliation, event.attackerMaxHealth);
        if (event.destroyedUnits?.some(unit => unit.side === event.side)) {
          updateCombatHealth(leaderElement(event.side), event.attackerOwnerLeaderLifeAfterRetaliation, event.attackerOwnerLeaderMaxLife);
        }
      }
      if (focus) await wait(300);
    } finally {
      if (focus) hideCombatStage();
    }

    await Promise.all((event.destroyedUnits || []).map((unit, index) => wait(index * 120).then(() => animateDeath(unit))));
    if (event.type === 'spell') {
      await flyCard(boardElement(event.side, event.spellId), destinationForDiscard(event.side));
    }
    for (const movement of movements) {
      await flyCard(boardElement(movement.side, movement.sourceId), movement.type === 'return' ? destinationForHand(movement.side) : destinationForDiscard(movement.side));
    }
    await Promise.all(draws.map((draw, index) => wait(index * 75).then(() => flyDrawCard(draw))));
  }

  function aiCardScore(card, ai, human) {
    if (card.type === 'unit') {
      const hasDepartmentSynergy = [card.effect, card.attackEffect, card.defenseEffect]
        .some(effect => effect?.type === 'department_synergy');
      const matchingDepartment = hasDepartmentSynergy && card.department
        ? ai.field.filter(unit => RULES.cardById[unit.cardId]?.department === card.department).length
        : 0;
      const hasChairperson = ai.field.some(unit => titlePositions.has(RULES.cardById[unit.cardId]?.position));
      const chairpersonSupport = card.effect?.type === 'support_chairperson' ? (hasChairperson ? 4 : -4) : 0;
      const abilityValue = card.attackEffect || card.defenseEffect ? 1.5 : card.effect ? 1 : 0;
      return (RULES.canPlayCard(ai, card) ? 10 : -10)
        + card.attack * 0.7 + card.defense * 0.2 + card.health * 0.25 - card.cost * 0.2
        + abilityValue + (matchingDepartment ? 2.5 : 0) + chairpersonSupport;
    }
    const effect = card.effect;
    if (effect === 'heal_all') return ai.hp < 19 || ai.field.some(unit => unit.damage > 0) ? 7 : -2;
    if (effect === 'buff_all' || effect === 'defense_all' || effect === 'repair') return ai.field.length ? 7 : -3;
    if (effect === 'damage_weakest' || effect === 'damage_all') return human.field.length ? 8 : (effect === 'damage_weakest' ? 6 : -2);
    if (effect === 'recover') return ai.discard.some(id => RULES.cardById[id]?.type === 'unit') ? 6 : 1;
    if (effect === 'draw_two') return 6;
    if (effect === 'buff_weakest' || effect === 'buff_defense_weakest') return ai.field.length ? 7 : 2;
    if (effect === 'overclock') return ai.field.length ? 8 : -2;
    if (effect === 'size_burst') {
      const occupied = ai.sizeUsedThisTurn;
      const followUp = ai.hand.some(instance => instance.cardId !== card.id && occupied + card.cost + RULES.cardById[instance.cardId].cost <= ai.sizeLimit + 2);
      return ai.sizeLimit < 12 && followUp ? 7 : -3;
    }
    if (effect === 'stun_weakest') return human.field.length ? 8 : 4;
    if (effect === 'defense_draw') return ai.field.length ? 7 : 5;
    if (effect === 'return_weakest') return human.field.length ? 8 : 4;
    return 0;
  }

  function handleBoardCardClick(side, kind, iid, cardId = null, stats = null) {
    const key = [side, kind, iid].join(':');
    const now = Date.now();
    const isDoubleClick = lastBoardCardClick.key === key && now - lastBoardCardClick.at <= 380;
    lastBoardCardClick = { key: isDoubleClick ? null : key, at: isDoubleClick ? 0 : now };
    selectedHandId = null;
    inspectedLeaderSide = null;
    if (isDoubleClick && side === 'player' && isHumanTurn() && !handResetAnimating) {
      const result = RULES.recallCard(match, side, kind, iid);
      if (!result.ok) notify(result.error);
      else notify('카드를 손패로 회수했습니다.');
      inspectedBoardCard = null;
      renderBattle();
      return;
    }
    inspectedBoardCard = { side, kind, iid, cardId, stats };
    if (isHumanTurn() && !handResetAnimating) renderBattle();
    else renderInspector();
  }

  async function runOpponentDeployment() {
    const ai = match.players.opponent;
    const human = match.players.player;
    let moveCount = 0;
    while (!match.gameOver && moveCount < RULES.limits.playsPerTurn && ai.field.length + ai.spellQueue.length < RULES.limits.field) {
      const candidates = ai.hand
        .map(instance => ({ instance, card: RULES.cardById[instance.cardId] }))
        .filter(({ card }) => RULES.canPlayCard(ai, card))
        .sort((a, b) => aiCardScore(b.card, ai, human) - aiCardScore(a.card, ai, human));
      if (!candidates.length || aiCardScore(candidates[0].card, ai, human) <= 0) break;
      const result = RULES.playCard(match, 'opponent', candidates[0].instance.iid);
      if (!result.ok) break;
      moveCount += 1;
      renderBattle();
      await wait(240);
    }
  }

  async function beginClassicBattle() {
    if (!isHumanTurn() || handResetAnimating) return;
    stopDeploymentTimer();
    selectedHandId = null;
    inspectedBoardCard = null;
    inspectedLeaderSide = null;
    aiThinking = true;
    renderBattle();
    await runOpponentDeployment();
    if (!match.gameOver) {
      await RULES.resolveRound(match, async event => {
        await animateBattleStep(event);
        renderBattle();
        await wait(300);
      });
    }
    aiThinking = false;
    renderBattle();
    if (!match.gameOver) {
      await wait(900);
      aiThinking = true;
      RULES.startNextRound(match);
      inspectedBoardCard = null;
      inspectedLeaderSide = null;
      await playVisualEvents(RULES.takeVisualEvents(match));
      aiThinking = false;
      renderBattle();
      startDeploymentTimer();
    }
  }

  $('#faction-picker').addEventListener('click', event => {
    const button = event.target.closest('[data-faction]');
    if (button) chooseFaction(button.dataset.faction);
  });
  $('#start-match').addEventListener('click', startMatch);
  $('#open-deck').addEventListener('click', openDeckBuilder);
  $('#nav-deckbuilder').addEventListener('click', openDeckBuilder);
  $('#nav-codex').addEventListener('click', () => openModal('codex'));
  $('#nav-rules').addEventListener('click', () => openModal('rules'));
  $('#nav-home').addEventListener('click', showHome);
  $('#nav-lobby').addEventListener('click', showHome);
  $('#leave-match').addEventListener('click', showHome);
  $('#play-card').addEventListener('click', useSelectedCard);
  $('#reset-hand').addEventListener('click', useHandReset);
  $('#end-turn').addEventListener('click', beginClassicBattle);
  $('#toggle-log').addEventListener('click', event => {
    const panel = $('.battle-log-panel');
    const expanded = panel.classList.toggle('expanded');
    event.currentTarget.setAttribute('aria-expanded', String(expanded));
    event.currentTarget.textContent = expanded ? '접기' : '펼치기';
  });

  battleScreen.addEventListener('click', event => {
    const resultAction = event.target.closest('[data-result]')?.dataset.result;
    if (resultAction === 'replay') { startMatch(); return; }
    if (resultAction === 'home') { showHome(); return; }
    const focusCard = event.target.closest('[data-inspect-side], [data-inspect-leader-side]');
    if (focusCard) {
      if (focusCard.dataset.inspectLeaderSide) {
        selectedHandId = null;
        inspectedBoardCard = null;
        inspectedLeaderSide = focusCard.dataset.inspectLeaderSide;
        renderInspector();
      } else {
        const stats = {
          attack: Number(focusCard.dataset.inspectAttack),
          attackBase: Number(focusCard.dataset.inspectAttackBase),
          attackTemp: Number(focusCard.dataset.inspectAttackTemp),
          defense: Number(focusCard.dataset.inspectDefense),
          defenseBase: Number(focusCard.dataset.inspectDefenseBase),
          defenseTemp: Number(focusCard.dataset.inspectDefenseTemp),
          health: Number(focusCard.dataset.inspectHealth),
          maxHealth: Number(focusCard.dataset.inspectMaxHealth)
        };
        handleBoardCardClick(focusCard.dataset.inspectSide, focusCard.dataset.inspectKind, focusCard.dataset.inspectIid, focusCard.dataset.inspectCardId, stats);
      }
      return;
    }
    const leaderBanner = event.target.closest('[data-leader-side]');
    if (leaderBanner) {
      selectedHandId = null;
      inspectedBoardCard = null;
      inspectedLeaderSide = leaderBanner.dataset.leaderSide;
      if (isHumanTurn() && !handResetAnimating) renderBattle();
      else renderInspector();
      return;
    }
    const handCard = event.target.closest('[data-hand-id]');
    if (handCard && match) {
      const handId = handCard.dataset.handId;
      if (!isHumanTurn() || handResetAnimating) {
        selectedHandId = handId;
        inspectedBoardCard = null;
        inspectedLeaderSide = null;
        renderInspector();
        return;
      }
      const now = Date.now();
      const isDoubleClick = lastHandCardClick.id === handId && now - lastHandCardClick.at <= 380;
      lastHandCardClick = { id: isDoubleClick ? null : handId, at: isDoubleClick ? 0 : now };
      if (isDoubleClick) {
        selectedHandId = handId;
        inspectedBoardCard = null;
        inspectedLeaderSide = null;
        useSelectedCard();
        return;
      }
      selectedHandId = selectedHandId === handId ? null : handId;
      inspectedBoardCard = null;
      inspectedLeaderSide = null;
      renderBattle();
      return;
    }
    const boardCard = event.target.closest('[data-board-card]');
    if (boardCard && match) {
      const stats = {
        attack: Number(boardCard.dataset.inspectAttack),
        attackBase: Number(boardCard.dataset.inspectAttackBase),
        attackTemp: Number(boardCard.dataset.inspectAttackTemp),
        defense: Number(boardCard.dataset.inspectDefense),
        defenseBase: Number(boardCard.dataset.inspectDefenseBase),
        defenseTemp: Number(boardCard.dataset.inspectDefenseTemp),
        health: Number(boardCard.dataset.inspectHealth),
        maxHealth: Number(boardCard.dataset.inspectMaxHealth)
      };
      handleBoardCardClick(boardCard.dataset.side, boardCard.dataset.kind, boardCard.dataset.cardId, boardCard.dataset.cardTemplate, stats);
    }
  });

  battleScreen.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-board-card], [data-leader-side], [data-inspect-side], [data-inspect-leader-side]')) {
      event.preventDefault();
      event.target.click();
    }
  });

  modalRoot.addEventListener('click', event => {
    if (event.target.matches('[data-close-modal]')) { modalRoot.innerHTML = ''; return; }
    const deckAction = event.target.closest('[data-deck-action]');
    if (deckAction) {
      const action = deckAction.dataset.deckAction;
      const cardId = deckAction.dataset.cardId;
      if (action === 'inspect') {
        const card = DATA.cards.find(item => item.id === cardId);
        if (card) modalRoot.insertAdjacentHTML('beforeend', codexDetailMarkup(card));
        return;
      }
      if (action === 'add') {
        const card = RULES.cardById[cardId];
        const current = deckDraft.filter(id => id === cardId).length;
        const cap = RULES.makeCollection(deckDraftFaction).find(item => item.card.id === cardId)?.copies || 0;
        const typeCount = deckDraft.reduce((count, id) => count + (RULES.cardById[id]?.type === card?.type ? 1 : 0), 0);
        const typeLimit = card?.type === 'unit' ? RULES.limits.deckUnits : RULES.limits.deckSpells;
        if (card && deckDraft.length < RULES.limits.deck && current < cap && typeCount < typeLimit) deckDraft.push(cardId);
      } else if (action === 'remove') {
        const index = deckDraft.lastIndexOf(cardId);
        if (index >= 0) deckDraft.splice(index, 1);
      } else if (action === 'clear') {
        deckDraft = [];
      } else if (action === 'reset') {
        deckDraft = RULES.makeDeck(deckDraftFaction);
      } else if (action === 'save') {
        const validation = RULES.validateDeck(deckDraft, deckDraftFaction);
        if (!validation.ok) { notify(validation.error); return; }
        saveConfiguredDeck(deckDraftFaction, deckDraft);
        modalRoot.innerHTML = '';
        updateHome();
        notify('덱을 저장했습니다. 다음 대전부터 적용됩니다.');
        return;
      }
      $('#deck-builder-body').innerHTML = deckBuilderMarkup();
      return;
    }
    const detailDismiss = event.target.closest('[data-codex-detail-dismiss]');
    if (detailDismiss || event.target.matches('[data-codex-detail-overlay]')) {
      modalRoot.querySelector('[data-codex-detail-overlay]')?.remove();
      return;
    }
    const flipButton = event.target.closest('[data-codex-flip]');
    if (flipButton) {
      const flip = modalRoot.querySelector('.codex-detail-flip');
      const isBack = flip.classList.toggle('is-back');
      flipButton.setAttribute('aria-pressed', String(isBack));
      flipButton.innerHTML = isBack ? '앞면 보기 <b>↻</b>' : '뒷면 보기 <b>↻</b>';
      return;
    }
    const selectedCard = event.target.closest('[data-codex-card]');
    if (selectedCard) {
      const card = collectionCards().find(item => item.id === selectedCard.dataset.codexCard);
      if (card) {
        modalRoot.querySelector('[data-codex-detail-overlay]')?.remove();
        modalRoot.insertAdjacentHTML('beforeend', codexDetailMarkup(card));
      }
      return;
    }
    const filter = event.target.closest('[data-codex-filter]');
    if (filter) $('#codex-body').innerHTML = renderCardCollection(filter.dataset.codexFilter);
    const deckFilter = event.target.closest('[data-deck-filter]');
    if (deckFilter) {
      deckBuilderFilter = deckFilter.dataset.deckFilter;
      $('#deck-builder-body').innerHTML = deckBuilderMarkup();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (modalRoot.querySelector('[data-codex-detail-overlay]')) modalRoot.querySelector('[data-codex-detail-overlay]').remove();
      else modalRoot.innerHTML = '';
    }
    if (event.key === ' ' && isHumanTurn() && !handResetAnimating && !['BUTTON', 'INPUT'].includes(document.activeElement.tagName) && !document.activeElement.matches('[data-board-card], [data-leader-side]')) {
      event.preventDefault();
      beginClassicBattle();
    }
  });

  updateHome();
})();
