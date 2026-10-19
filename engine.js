(function (root) {
  const data = root.GAME_DATA;
  const cardById = Object.fromEntries(data.cards.map(card => [card.id, card]));
  const MAX_HAND_SIZE = 5;
  const MAX_FIELD_SIZE = 5;
  const MAX_ROUND_PLAYS = 5;
  const BASE_SIZE_LIMIT = 10;
  const HAND_RESETS_PER_MATCH = 2;
  const DECK_SIZE = 30;
  const UNIT_DECK_SIZE = 20;
  const MAX_CARD_COPIES = 3;
  let instanceSeq = 1;

  function cardCopyLimit(card) {
    return Number.isInteger(card.deckLimit) ? card.deckLimit : MAX_CARD_COPIES;
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeDeck(factionId) {
    const units = data.cards.filter(card => card.type === 'unit' && card.faction === factionId);
    const spells = data.cards.filter(card => card.type === 'spell' && card.faction === factionId);
    const deck = [];
    const addBalancedCopies = (cards, slots) => {
      const copies = new Map(cards.map(card => [card.id, 0]));
      let remaining = slots;
      while (remaining > 0) {
        let added = 0;
        cards.forEach(card => {
          if (remaining <= 0) return;
          const limit = cardCopyLimit(card);
          if (copies.get(card.id) >= limit) return;
          copies.set(card.id, copies.get(card.id) + 1);
          remaining -= 1;
          added += 1;
        });
        if (!added) throw new Error(factionId + ' 덱에 ' + slots + '장을 채울 수 없습니다. 카드별 덱 제한을 확인하세요.');
      }
      cards.forEach(card => {
        for (let i = 0; i < copies.get(card.id); i += 1) deck.push(card.id);
      });
    };
    addBalancedCopies(units, UNIT_DECK_SIZE);
    addBalancedCopies(spells, DECK_SIZE - UNIT_DECK_SIZE);
    return shuffle(deck);
  }

  function makeCollection(factionId) {
    return data.cards
      .filter(card => card.faction === factionId)
      .map(card => ({ card, copies: cardCopyLimit(card) }));
  }

  function validateDeck(deck, factionId) {
    const fail = error => ({ ok: false, error, units: 0, spells: 0, total: Array.isArray(deck) ? deck.length : 0 });
    if (!Array.isArray(deck)) return fail('덱 데이터가 없습니다.');
    if (deck.length !== DECK_SIZE) return fail(`덱은 ${DECK_SIZE}장이어야 합니다. 현재 ${deck.length}장입니다.`);
    const counts = new Map();
    let units = 0;
    let spells = 0;
    for (const id of deck) {
      const card = cardById[id];
      if (!card) return fail(`보유 카드풀에 없는 카드가 포함되어 있습니다: ${id}`);
      if (card.faction !== factionId) return fail('한 덱에는 같은 기업의 카드만 넣을 수 있습니다.');
      counts.set(id, (counts.get(id) || 0) + 1);
      if (counts.get(id) > cardCopyLimit(card)) return fail(`${card.name} 카드는 최대 ${cardCopyLimit(card)}장까지 넣을 수 있습니다.`);
      if (card.type === 'unit') units += 1;
      else if (card.type === 'spell') spells += 1;
      else return fail(`${card.name} 카드는 덱에 넣을 수 없습니다.`);
    }
    if (units !== UNIT_DECK_SIZE) return fail(`추종자는 ${UNIT_DECK_SIZE}장이어야 합니다. 현재 ${units}장입니다.`);
    if (spells !== DECK_SIZE - UNIT_DECK_SIZE) return fail(`검식은 ${DECK_SIZE - UNIT_DECK_SIZE}장이어야 합니다. 현재 ${spells}장입니다.`);
    return { ok: true, error: '', units, spells, total: deck.length };
  }

  function makePlayer(id, factionId, deckOverride = null) {
    return {
      id,
      factionId,
      leaderId: data.factions[factionId].leader,
      hp: 30,
      maxHp: 30,
      sizeLimit: BASE_SIZE_LIMIT,
      sizeUsedThisTurn: 0,
      sizeBonusNextRound: 0,
      cardsPlayedThisTurn: 0,
      turns: 0,
      skillUsed: false,
      slotSequence: 0,
      handOrderSequence: 0,
      handResetsLeft: HAND_RESETS_PER_MATCH,
      deck: shuffle(deckOverride || makeDeck(factionId)),
      hand: [],
      field: [],
      spellQueue: [],
      discard: []
    };
  }

  function log(match, text) {
    match.log.unshift(text);
    match.log = match.log.slice(0, 30);
  }

  function emitVisual(match, event) {
    if (!match.visualEvents) match.visualEvents = [];
    match.visualEvents.push(event);
  }

  function takeVisualEvents(match) {
    return (match.visualEvents || []).splice(0);
  }

  function effectTargets(match, side, effect, unit = null) {
    const type = effectType(effect);
    const player = match.players[side];
    const enemySide = side === 'player' ? 'opponent' : 'player';
    const enemy = match.players[enemySide];
    if (type === 'department_synergy') {
      if (!departmentSynergyActive(match, side, unit, effect)) return [];
      return effectTargets(match, side, effect.effect, unit);
    }
    if (['defense_self', 'buff_self', 'temp_buff_self', 'heal_self', 'quick_entry'].includes(type)) return unit ? [{ side, iid: unit.iid }] : [];
    if (['heal_all', 'buff_all', 'defense_all', 'overclock', 'temp_buff_all', 'defense_draw'].includes(type)) return player.field.map(item => ({ side, iid: item.iid }));
    if (type === 'damage_all') return enemy.field.map(item => ({ side: enemySide, iid: item.iid }));
    if (['heal_wounded', 'repair', 'buff_weakest', 'buff_defense_weakest'].includes(type)) {
      const target = weakestUnit(player);
      return target ? [{ side, iid: target.iid }] : [];
    }
    if (['ping_enemy', 'damage_weakest', 'stun_weakest', 'return_weakest'].includes(type)) {
      const target = weakestUnit(enemy);
      return target ? [{ side: enemySide, iid: target.iid }] : [];
    }
    if (type === 'support_chairperson') {
      return player.field
        .filter(item => ['기업 총수', '협동조합 대표'].includes(cardOf(item).position))
        .map(item => ({ side, iid: item.iid }));
    }
    return [];
  }

  function effectScope(effect) {
    if (effectType(effect) === 'department_synergy') return effectScope(effect.effect);
    return ['heal_all', 'buff_all', 'defense_all', 'overclock', 'temp_buff_all', 'damage_all', 'defense_draw'].includes(effectType(effect)) ? 'all' : 'single';
  }

  function departmentSynergyActive(match, side, unit, effect) {
    if (!unit || !effect) return false;
    const player = match.players[side];
    const department = effect.department || cardOf(unit).department;
    if (!department) return false;
    const required = Math.max(1, Number(effect.requiredAllies) || 1);
    const allies = player.field.filter(item => item.iid !== unit.iid && cardOf(item).department === department);
    return allies.length >= required;
  }

  function effectIsActive(match, side, effect, unit = null) {
    const type = effectType(effect);
    if (type === 'department_synergy') return departmentSynergyActive(match, side, unit, effect);
    if (type === 'support_chairperson') {
      return match.players[side].field.some(item => ['기업 총수', '협동조합 대표'].includes(cardOf(item).position));
    }
    return true;
  }

  function captureEffectTargets(match, targets = []) {
    return targets.map(target => {
      const unit = match.players[target.side]?.field.find(item => item.iid === target.iid);
      return unit ? { side: target.side, iid: target.iid, unit } : null;
    }).filter(Boolean);
  }

  function snapshotEffectTargets(captured = []) {
    return captured.map(({ side, iid, unit }) => {
      const card = cardOf(unit);
      return {
        side,
        iid,
        cardId: unit.cardId,
        attack: card.attack + unit.attackBonus + unit.tempAttack,
        defense: unitDefense(unit),
        health: Math.max(0, unitHealth(unit)),
        maxHealth: card.health + unit.healthBonus
      };
    });
  }

  function captureField(match) {
    return ['player', 'opponent'].flatMap(side => match.players[side].field.map(unit => ({ side, iid: unit.iid, cardId: unit.cardId })));
  }

  function removedFromField(before, match) {
    const current = new Set(captureField(match).map(item => item.side + ':' + item.iid));
    return before.filter(item => !current.has(item.side + ':' + item.iid));
  }

  function finish(match, winnerId, reason) {
    if (match.gameOver) return;
    match.gameOver = { winnerId, reason };
    match.phase = 'gameOver';
    log(match, reason);
  }

  function checkWinner(match) {
    const playerDown = match.players.player.hp <= 0;
    const opponentDown = match.players.opponent.hp <= 0;
    if (playerDown && opponentDown) finish(match, 'draw', '양쪽 대표 캐릭터가 동시에 쓰러져 무승부가 됐습니다.');
    else if (playerDown) finish(match, 'opponent', '내 대표 캐릭터의 라이프가 0이 됐습니다.');
    else if (opponentDown) finish(match, 'player', data.leaders[match.players.player.leaderId].name + '의 진영이 승리했습니다.');
  }

  function addToHand(match, side, cardId) {
    const player = match.players[side];
    if (player.hand.length >= MAX_HAND_SIZE) {
      player.discard.push(cardId);
      log(match, cardById[cardId].name + '가 손패 한도 초과로 버려졌습니다.');
      return null;
    }
    const instance = { iid: 'c' + instanceSeq++, cardId, handOrder: player.handOrderSequence++ };
    player.hand.push(instance);
    return instance;
  }

  function restoreToHand(player, fieldInstance) {
    const handOrder = Number.isFinite(fieldInstance.returnHandOrder)
      ? fieldInstance.returnHandOrder
      : player.handOrderSequence++;
    const instance = {
      iid: fieldInstance.returnHandId || 'c' + instanceSeq++,
      cardId: fieldInstance.cardId,
      handOrder
    };
    const index = player.hand.findIndex(card => card.handOrder > handOrder);
    if (index < 0) player.hand.push(instance);
    else player.hand.splice(index, 0, instance);
    player.handOrderSequence = Math.max(player.handOrderSequence, handOrder + 1);
    return instance;
  }

  function draw(match, side, amount = 1) {
    const player = match.players[side];
    let drawn = 0;
    for (let i = 0; i < amount; i += 1) {
      if (!player.deck.length) {
        player.hp = 0;
        checkWinner(match);
        if (!match.gameOver) finish(match, side === 'player' ? 'opponent' : 'player', (side === 'player' ? '내' : '상대') + ' 덱이 비어 패배했습니다.');
        break;
      }
      const cardId = player.deck.pop();
      const handCard = addToHand(match, side, cardId);
      if (handCard) emitVisual(match, { type: 'draw', side, cardId, from: 'deck', handId: handCard.iid });
      drawn += 1;
      if (match.gameOver) break;
    }
    return drawn;
  }

  function resetHand(match, side) {
    if (!match || match.gameOver) return { ok: false, error: '대전이 끝났습니다.' };
    if (match.phase !== 'deploy') return { ok: false, error: '배치 단계에서만 손패를 리셋할 수 있습니다.' };
    const player = match.players[side];
    if (!player) return { ok: false, error: '플레이어 정보를 찾을 수 없습니다.' };
    if (player.handResetsLeft <= 0) return { ok: false, error: '이번 대전의 손패 리셋권을 모두 사용했습니다.' };
    if (!player.hand.length) return { ok: false, error: '손패가 비어 있어 리셋할 수 없습니다.' };

    const redrawCount = player.hand.length;
    player.deck = shuffle([...player.deck, ...player.hand.map(card => card.cardId)]);
    player.hand = [];
    player.handResetsLeft -= 1;
    const drawn = draw(match, side, redrawCount);
    log(match, (side === 'player' ? '내' : '상대') + ' 손패 리셋 · 남은 리셋권 ' + player.handResetsLeft + '회');
    return { ok: true, drawn, remaining: player.handResetsLeft };
  }

  function cardOf(instance) { return cardById[instance.cardId]; }
  function unitHealth(unit) { return cardOf(unit).health + unit.healthBonus - unit.damage; }
  function unitDefense(unit) { return (cardOf(unit).defense || 0) + (unit.defenseBonus || 0) + (unit.tempDefense || 0); }

  function currentFieldSize(player) {
    const unitSize = player.field.reduce((total, unit) => total + (cardById[unit.cardId]?.cost || 0), 0);
    const spellSize = player.spellQueue.reduce((total, spell) => total + (cardById[spell.cardId]?.cost || 0), 0);
    return unitSize + spellSize;
  }

  function boardCards(player) {
    return [
      ...player.field.map(unit => ({ ...unit, kind: 'unit' })),
      ...player.spellQueue.map(spell => ({ ...spell, kind: 'spell' }))
    ].sort((a, b) => a.slotOrder - b.slotOrder);
  }

  function checkPlay(player, card) {
    if (player.cardsPlayedThisTurn >= MAX_ROUND_PLAYS) return { ok: false, error: '이번 라운드에는 최대 ' + MAX_ROUND_PLAYS + '장까지 배치할 수 있습니다.' };
    if (player.field.length + player.spellQueue.length >= MAX_FIELD_SIZE) return { ok: false, error: '전장 ' + MAX_FIELD_SIZE + '칸이 가득 찼습니다.' };
    const used = player.sizeUsedThisTurn;
    if (used + card.cost > player.sizeLimit) {
      return { ok: false, error: '전장 사이즈가 부족합니다. ' + card.cost + ' 필요 · ' + Math.max(0, player.sizeLimit - used) + ' 남음' };
    }
    return { ok: true, used, remaining: player.sizeLimit - used };
  }

  function healLeader(player, amount) {
    player.hp = Math.min(player.maxHp, player.hp + amount);
  }

  function healUnit(unit, amount) {
    unit.damage = Math.max(0, unit.damage - amount);
  }

  function weakestUnit(player) {
    return [...player.field].sort((a, b) => unitHealth(a) - unitHealth(b))[0] || null;
  }

  function addDamageToUnit(unit, amount) {
    unit.damage += amount;
  }

  function combatDamage(attackPower, target) {
    return Math.max(1, attackPower - unitDefense(target));
  }

  function applyDamageToLeader(match, side, amount, source) {
    const player = match.players[side];
    player.hp -= amount;
    log(match, source + ' · ' + amount + ' 라이프 피해');
    checkWinner(match);
  }

  function removeDefeated(match, side) {
    const player = match.players[side];
    const kept = [];
    player.field.forEach(unit => {
      if (unitHealth(unit) <= 0) {
        const card = cardOf(unit);
        player.discard.push(unit.cardId);
        log(match, card.name + ' 파괴 · 소유자의 라이프 ' + card.cost + ' 감소');
        player.hp -= card.cost;
      } else kept.push(unit);
    });
    player.field = kept;
    checkWinner(match);
  }

  function effectType(effect) {
    if (typeof effect === 'string') return effect;
    return effect?.type || effect?.effect || '';
  }

  function effectAmount(effect, fallback) {
    if (effect && typeof effect === 'object' && Number.isFinite(effect.amount)) return effect.amount;
    return fallback;
  }

  function applyUnitEffect(match, side, unit, effect) {
    const type = effectType(effect);
    if (type === 'department_synergy') {
      if (departmentSynergyActive(match, side, unit, effect)) applyUnitEffect(match, side, unit, effect.effect);
      return;
    }
    const player = match.players[side];
    const enemySide = side === 'player' ? 'opponent' : 'player';
    const enemy = match.players[enemySide];
    const amount = effectAmount(effect, 1);
    let target;
    switch (type) {
      case 'heal_leader': healLeader(player, effectAmount(effect, 2)); break;
      case 'heal_wounded':
        target = weakestUnit(player);
        if (target) healUnit(target, effectAmount(effect, 2));
        break;
      case 'defense_self': if (unit) unit.tempDefense += effectAmount(effect, 1); break;
      case 'buff_self': if (unit) unit.attackBonus += amount; break;
      case 'temp_buff_self': if (unit) unit.tempAttack += amount; break;
      case 'heal_self': if (unit) healUnit(unit, amount); break;
      case 'quick_entry': if (unit) unit.ready = true; break;
      case 'draw': draw(match, side, effectAmount(effect, 1)); break;
      case 'size_limit':
        if (match.phase === 'deploy') player.sizeLimit = Math.min(12, player.sizeLimit + amount);
        else player.sizeBonusNextRound = Math.min(2, player.sizeBonusNextRound + amount);
        break;
      case 'ping_enemy':
        target = weakestUnit(enemy);
        if (target) {
          addDamageToUnit(target, amount);
          removeDefeated(match, enemySide);
        } else applyDamageToLeader(match, enemySide, amount, unit ? cardOf(unit).name : '추종자 능력');
        break;
      case 'heal_all':
        healLeader(player, amount);
        player.field.forEach(ally => healUnit(ally, amount));
        break;
      case 'support_chairperson':
        player.field
          .filter(ally => ['기업 총수', '협동조합 대표'].includes(cardOf(ally).position))
          .forEach(ally => {
            ally.tempAttack += Number(effect.attack) || 0;
            ally.tempDefense += Number(effect.defense) || 0;
            if (Number(effect.heal) > 0) healUnit(ally, Number(effect.heal));
          });
        break;
      case 'buff_all':
        player.field.forEach(ally => { ally.attackBonus += amount; ally.healthBonus += 2; });
        break;
      case 'defense_all': player.field.forEach(ally => { ally.tempDefense += amount; }); break;
      case 'overclock': player.field.forEach(ally => { ally.tempAttack += amount; }); break;
      case 'temp_buff_all': player.field.forEach(ally => { ally.tempAttack += amount; }); break;
      case 'recover': {
        const index = player.hand.length < MAX_HAND_SIZE
          ? player.discard.findIndex(id => cardById[id]?.type === 'unit')
          : -1;
        if (index >= 0) {
          const cardId = player.discard.splice(index, 1)[0];
          const handCard = addToHand(match, side, cardId);
          if (handCard) emitVisual(match, { type: 'draw', side, cardId, from: 'discard', handId: handCard.iid });
        } else if (match.phase === 'deploy') player.sizeLimit = Math.min(12, player.sizeLimit + 1);
        else player.sizeBonusNextRound = Math.min(2, player.sizeBonusNextRound + 1);
        break;
      }
    }
  }

  function applySpell(match, side, card) {
    const player = match.players[side];
    const enemySide = side === 'player' ? 'opponent' : 'player';
    const enemy = match.players[enemySide];
    let target;
    switch (card.effect) {
      case 'heal_all':
        healLeader(player, 4);
        player.field.forEach(unit => healUnit(unit, 1));
        break;
      case 'buff_all':
        player.field.forEach(unit => { unit.attackBonus += 1; unit.healthBonus += 2; });
        break;
      case 'repair':
        target = weakestUnit(player);
        if (target) { healUnit(target, 3); target.attackBonus += 1; }
        else healLeader(player, 3);
        break;
      case 'damage_weakest':
        target = weakestUnit(enemy);
        if (target) {
          addDamageToUnit(target, 3);
          removeDefeated(match, enemySide);
        } else applyDamageToLeader(match, enemySide, 3, card.name);
        break;
      case 'defense_all':
        player.field.forEach(unit => { unit.tempDefense += 2; });
        break;
      case 'damage_all':
        enemy.field.forEach(unit => addDamageToUnit(unit, 2));
        removeDefeated(match, enemySide);
        break;
      case 'recover': {
        const index = player.hand.length < MAX_HAND_SIZE ? player.discard.findIndex(id => cardById[id]?.type === 'unit') : -1;
        if (index >= 0) {
          const cardId = player.discard.splice(index, 1)[0];
          const handCard = addToHand(match, side, cardId);
          if (handCard) emitVisual(match, { type: 'draw', side, cardId, from: 'discard', handId: handCard.iid });
        }
        else player.sizeBonusNextRound = Math.min(2, player.sizeBonusNextRound + 1);
        break;
      }
      case 'draw_two':
        draw(match, side, 2);
        player.sizeBonusNextRound = Math.min(2, player.sizeBonusNextRound + 2);
        break;
      case 'buff_weakest':
        target = weakestUnit(player);
        if (target) { target.attackBonus += 2; target.healthBonus += 1; }
        else player.sizeBonusNextRound = Math.min(2, player.sizeBonusNextRound + 1);
        break;
      case 'overclock':
        player.field.forEach(unit => { unit.tempAttack += 2; });
        break;
      case 'size_burst':
        player.sizeBonusNextRound = Math.min(2, player.sizeBonusNextRound + 2);
        break;
      case 'stun_weakest':
        target = weakestUnit(enemy);
        if (target) target.stunnedRound = match.round;
        else applyDamageToLeader(match, enemySide, 2, card.name);
        break;
      case 'defense_draw':
        player.field.forEach(unit => { unit.tempDefense += 1; });
        draw(match, side, 1);
        player.sizeBonusNextRound = Math.min(2, player.sizeBonusNextRound + 1);
        break;
      case 'return_weakest':
        target = weakestUnit(enemy);
        if (target) {
          enemy.field.splice(enemy.field.indexOf(target), 1);
          const returned = enemy.hand.length < MAX_HAND_SIZE;
          if (returned) {
            restoreToHand(enemy, target);
            emitVisual(match, { type: 'return', side: enemySide, sourceId: target.iid, cardId: target.cardId });
          } else {
            enemy.discard.push(target.cardId);
            emitVisual(match, { type: 'discard', side: enemySide, sourceType: 'field', sourceId: target.iid, cardId: target.cardId });
          }
          log(match, cardById[target.cardId].name + (returned ? '가 손패로 돌아갔습니다.' : '가 손패 한도 때문에 버림 더미로 이동했습니다.'));
        } else applyDamageToLeader(match, enemySide, 2, card.name);
        break;
      case 'buff_defense_weakest':
        target = weakestUnit(player);
        if (target) { target.attackBonus += 2; target.tempDefense += 2; }
        else player.sizeBonusNextRound = Math.min(2, player.sizeBonusNextRound + 1);
        break;
    }
    checkWinner(match);
  }

  function runLeaderAbility(match, side) {
    const player = match.players[side];
    const beforeFieldStates = snapshotEffectTargets(captureEffectTargets(match, player.field.map(unit => ({ side, iid: unit.iid }))));
    let targets = [];
    switch (player.leaderId) {
      case 'ria':
        healLeader(player, 2);
        player.field.forEach(unit => healUnit(unit, 1));
        targets = player.field.map(unit => ({ side, iid: unit.iid }));
        break;
      case 'arca':
        player.sizeLimit = Math.min(12, player.sizeLimit + 1);
        break;
      case 'cheongyeon':
        if (player.field.length) {
          player.field.forEach(unit => { unit.tempDefense += 2; });
          targets = player.field.map(unit => ({ side, iid: unit.iid }));
        }
        else player.sizeLimit = Math.min(12, player.sizeLimit + 1);
        break;
      case 'noa': {
        const index = player.hand.length < MAX_HAND_SIZE ? player.discard.findIndex(id => cardById[id]?.type === 'unit') : -1;
        if (index >= 0) {
          const cardId = player.discard.splice(index, 1)[0];
          const handCard = addToHand(match, side, cardId);
          if (handCard) emitVisual(match, { type: 'draw', side, cardId, from: 'discard', handId: handCard.iid });
        }
        else player.sizeLimit = Math.min(12, player.sizeLimit + 1);
        break;
      }
    }
    player.skillUsed = true;
    log(match, data.leaders[player.leaderId].ability + ' 발동');
    emitVisual(match, {
      type: 'effect', side, sourceType: 'leader', sourceId: player.leaderId, targets,
      targetStates: snapshotEffectTargets(captureEffectTargets(match, targets)),
      beforeStates: beforeFieldStates.filter(state => targets.some(target => target.side === state.side && target.iid === state.iid)),
      label: data.leaders[player.leaderId].ability, timing: 'leader',
      scope: targets.length && ['ria', 'cheongyeon'].includes(player.leaderId) ? 'all' : 'single'
    });
    checkWinner(match);
  }

  function turnStartEffectOf(card) {
    return card.onTurnStart || card.turnStartEffect || card.triggers?.turnStart || card.effect || null;
  }

  function runTurnStartEffects(match, side) {
    const player = match.players[side];
    [...player.field].sort((a, b) => a.slotOrder - b.slotOrder).forEach(unit => {
      if (match.gameOver) return;
      const effect = turnStartEffectOf(cardOf(unit));
      if (!effect || !effectIsActive(match, side, effect, unit)) return;
      const targets = effectTargets(match, side, effect, unit);
      const capturedTargets = captureEffectTargets(match, targets);
      const beforeStates = snapshotEffectTargets(capturedTargets);
      applyUnitEffect(match, side, unit, effect);
      log(match, cardOf(unit).name + ' · 라운드 시작 능력');
      emitVisual(match, {
        type: 'effect', side, sourceType: 'unit', sourceId: unit.iid, targets,
        targetStates: snapshotEffectTargets(capturedTargets), beforeStates, label: cardOf(unit).name, timing: 'turnStart', scope: effectScope(effect)
      });
      removeDefeated(match, side === 'player' ? 'opponent' : 'player');
      checkWinner(match);
    });
  }

  function startRound(match, selectedInitiative = null) {
    if (match.gameOver) return;
    match.round += 1;
    match.phase = 'deploy';
    match.initiativeSide = selectedInitiative === 'player' || selectedInitiative === 'opponent'
      ? selectedInitiative
      : (Math.random() < 0.5 ? 'player' : 'opponent');
    match.currentPlayer = match.initiativeSide;
    const order = [match.initiativeSide, match.initiativeSide === 'player' ? 'opponent' : 'player'];
    order.forEach(side => {
      const player = match.players[side];
      player.turns = match.round;
      player.sizeLimit = BASE_SIZE_LIMIT + player.sizeBonusNextRound;
      player.sizeBonusNextRound = 0;
      player.sizeUsedThisTurn = currentFieldSize(player);
      player.cardsPlayedThisTurn = 0;
      player.skillUsed = false;
      player.field.forEach(unit => {
        unit.ready = true;
        unit.attackedThisTurn = false;
        unit.stunnedRound = null;
        unit.tempDefense = 0;
        unit.tempAttack = 0;
      });
    });
    if (match.gameOver) return;
    log(match, '코인 토스 · ' + (match.initiativeSide === 'player' ? '내가' : '상대가') + ' 이번 라운드 선공');
    order.forEach(side => {
      if (!match.gameOver) runLeaderAbility(match, side);
    });
    order.forEach(side => {
      if (!match.gameOver) runTurnStartEffects(match, side);
    });
    order.forEach(side => {
      if (!match.gameOver) draw(match, side, Math.max(0, MAX_HAND_SIZE - match.players[side].hand.length));
    });
  }

  function expireRoundBonuses(match) {
    const targets = ['player', 'opponent'].flatMap(side => match.players[side].field
      .filter(unit => unit.tempAttack !== 0 || unit.tempDefense !== 0)
      .map(unit => ({ side, iid: unit.iid })));
    if (!targets.length) return false;
    const capturedTargets = captureEffectTargets(match, targets);
    const beforeStates = snapshotEffectTargets(capturedTargets);
    capturedTargets.forEach(({ unit }) => {
      unit.tempAttack = 0;
      unit.tempDefense = 0;
    });
    emitVisual(match, {
      type: 'effect', side: 'system', sourceType: 'system', sourceId: 'round-expiry', targets,
      beforeStates, targetStates: snapshotEffectTargets(capturedTargets),
      label: '이번 전투 한정 효과 종료', timing: 'roundEnd', scope: 'all'
    });
    return true;
  }

  function createMatch(playerFactionId, opponentFactionId, options = {}) {
    if (options.playerDeck) {
      const validation = validateDeck(options.playerDeck, playerFactionId);
      if (!validation.ok) throw new Error(validation.error);
    }
    instanceSeq = 1;
    const match = {
      players: {
        player: makePlayer('player', playerFactionId, options.playerDeck || null),
        opponent: makePlayer('opponent', opponentFactionId)
      },
      currentPlayer: 'player',
      initiativeSide: 'player',
      gameOver: null,
      log: [],
      round: 0,
      phase: options.deferStart ? 'intro' : 'deploy',
      visualEvents: []
    };
    if (!options.deferStart) startRound(match);
    log(match, '훈련 대전이 시작됐습니다.');
    return match;
  }

  function startFirstRound(match, initiativeSide = null) {
    if (match.gameOver || match.round !== 0 || match.phase !== 'intro') {
      return { ok: false, error: '첫 라운드를 시작할 수 없습니다.' };
    }
    startRound(match, initiativeSide);
    return { ok: !match.gameOver };
  }

  function makeUnit(cardId, round, slotOrder) {
    return {
      iid: 'u' + instanceSeq++,
      cardId,
      placedRound: round,
      slotOrder,
      damage: 0,
      attackBonus: 0,
      tempAttack: 0,
      healthBonus: 0,
      defenseBonus: 0,
      tempDefense: 0,
      ready: true,
      attackedThisTurn: false,
      stunnedRound: null
    };
  }

  function playCard(match, side, iid) {
    if (match.gameOver) return { ok: false, error: '대전이 끝났습니다.' };
    if (match.phase !== 'deploy') return { ok: false, error: '전투 중에는 카드를 배치할 수 없습니다.' };
    const player = match.players[side];
    const index = player.hand.findIndex(instance => instance.iid === iid);
    if (index < 0) return { ok: false, error: '손에 없는 카드입니다.' };
    const instance = player.hand[index];
    const card = cardOf(instance);
    const playCheck = checkPlay(player, card);
    if (!playCheck.ok) return playCheck;
    player.cardsPlayedThisTurn += 1;
    player.sizeUsedThisTurn += card.cost;
    player.hand.splice(index, 1);
    const slotOrder = player.slotSequence++;
    const returnHandId = instance.iid;
    const returnHandOrder = Number.isFinite(instance.handOrder) ? instance.handOrder : index;
    if (card.type === 'unit') {
      const unit = makeUnit(card.id, match.round, slotOrder);
      unit.returnHandId = returnHandId;
      unit.returnHandOrder = returnHandOrder;
      player.field.push(unit);
      log(match, card.name + ' 전장 배치');
    } else {
      player.spellQueue.push({ iid: 's' + instanceSeq++, cardId: card.id, placedRound: match.round, slotOrder, returnHandId, returnHandOrder });
      log(match, card.name + ' 검식 배치 · 전투 대기');
    }
    checkWinner(match);
    return { ok: true };
  }

  function recallCard(match, side, kind, iid) {
    if (match.gameOver || match.phase !== 'deploy') return { ok: false, error: '배치 단계에서만 카드를 회수할 수 있습니다.' };
    const player = match.players[side];
    if (player.hand.length >= MAX_HAND_SIZE) return { ok: false, error: '손패가 가득 차 카드를 회수할 수 없습니다.' };
    const collection = kind === 'spell' ? player.spellQueue : player.field;
    const index = collection.findIndex(item => item.iid === iid);
    if (index < 0) return { ok: false, error: '전장에 없는 카드입니다.' };
    const [instance] = collection.splice(index, 1);
    const card = cardOf(instance);
    player.sizeUsedThisTurn = Math.max(0, player.sizeUsedThisTurn - card.cost);
    if (instance.placedRound === match.round) player.cardsPlayedThisTurn = Math.max(0, player.cardsPlayedThisTurn - 1);
    restoreToHand(player, instance);
    log(match, card.name + ' 손패로 회수');
    return { ok: true };
  }

  function combatEffectOf(card, trigger) {
    const field = trigger === 'attack' ? ['attackEffect', 'onAttack'] : ['defenseEffect', 'onDefense'];
    for (const key of field) if (card[key]) return card[key];
    return card.triggers?.[trigger] || null;
  }

  function triggerCombatEffect(match, side, unit, trigger) {
    const card = cardOf(unit);
    const effect = combatEffectOf(card, trigger);
    if (!effect || !effectIsActive(match, side, effect, unit)) return;
    const targets = effectTargets(match, side, effect, unit);
    const capturedTargets = captureEffectTargets(match, targets);
    const beforeStates = snapshotEffectTargets(capturedTargets);
    applyUnitEffect(match, side, unit, effect);
    log(match, card.name + (trigger === 'attack' ? ' · 공격전 능력' : ' · 방어전 능력'));
    emitVisual(match, {
      type: 'effect', side, sourceType: 'unit', sourceId: unit.iid, targets,
      targetStates: snapshotEffectTargets(capturedTargets), beforeStates, label: card.name, timing: trigger, scope: effectScope(effect)
    });
    removeDefeated(match, side === 'player' ? 'opponent' : 'player');
    removeDefeated(match, side);
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  async function resolveRound(match, onStep = () => {}) {
    if (match.gameOver || match.phase !== 'deploy') return { ok: false, error: '전투를 시작할 수 없습니다.' };
    match.phase = 'resolving';
    log(match, '라운드 ' + match.round + ' 전투 시작');
    const otherSide = side => side === 'player' ? 'opponent' : 'player';
    let actingSide = match.initiativeSide;

    while (!match.gameOver && (match.players.player.spellQueue.length || match.players.opponent.spellQueue.length)) {
      let spells = match.players[actingSide].spellQueue;
      if (!spells.length) {
        actingSide = otherSide(actingSide);
        spells = match.players[actingSide].spellQueue;
      }
      if (!spells.length) break;
      const spell = randomItem(spells);
      spells.splice(spells.indexOf(spell), 1);
      const card = cardOf(spell);
      const beforeField = captureField(match);
      const targets = effectTargets(match, actingSide, card.effect);
      const capturedTargets = captureEffectTargets(match, targets);
      const beforeStates = snapshotEffectTargets(capturedTargets);
      match.currentPlayer = actingSide;
      applySpell(match, actingSide, card);
      match.players[actingSide].discard.push(card.id);
      log(match, card.name + ' 발동 · 검식 종료');
      emitVisual(match, {
        type: 'effect', side: actingSide, sourceType: 'spell', sourceId: spell.iid, targets,
        targetStates: snapshotEffectTargets(capturedTargets), beforeStates, label: card.name, timing: 'spell', scope: effectScope(card.effect)
      });
      const visuals = takeVisualEvents(match);
      const returnedIds = new Set(visuals.filter(item => ['return', 'discard'].includes(item.type)).map(item => item.sourceId));
      const destroyedUnits = removedFromField(beforeField, match).filter(item => !returnedIds.has(item.iid));
      await onStep({ type: 'spell', side: actingSide, cardId: card.id, spellId: spell.iid, targets, destroyedUnits, visuals });
      actingSide = otherSide(actingSide);
    }

    while (!match.gameOver) {
      let readyUnits = match.players[actingSide].field.filter(unit => unit.ready && unit.stunnedRound !== match.round);
      if (!readyUnits.length) {
        actingSide = otherSide(actingSide);
        readyUnits = match.players[actingSide].field.filter(unit => unit.ready && unit.stunnedRound !== match.round);
      }
      if (!readyUnits.length) break;
      const attacker = randomItem(readyUnits);
      const attackerCard = cardOf(attacker);
      const enemySide = otherSide(actingSide);
      const enemy = match.players[enemySide];
      const beforeField = captureField(match);
      let targetId = null;
      let damage = 0;
      let directDamage = 0;
      let retaliationDamage = 0;
      let directHit = false;
      let defender = null;
      let targetHealthAfterAttack = null;
      let targetMaxHealth = null;
      let targetHealthAfterHit = null;
      let targetMaxHealthAfterHit = null;
      let targetOwnerLeaderLifeAfterHit = null;
      let targetOwnerLeaderMaxLifeAfterHit = null;
      let targetLeaderLifeAfterAttack = null;
      let targetLeaderMaxLife = null;
      let targetOwnerLeaderLifeAfterAttack = null;
      let targetOwnerLeaderMaxLife = null;
      let attackerHealthAfterRetaliation = null;
      let attackerMaxHealth = null;
      let attackerOwnerLeaderLifeAfterRetaliation = null;
      let attackerOwnerLeaderMaxLife = null;
      match.currentPlayer = actingSide;
      attacker.ready = false;
      attacker.attackedThisTurn = true;
      triggerCombatEffect(match, actingSide, attacker, 'attack');
      if (!match.gameOver && match.players[actingSide].field.includes(attacker)) {
        const defenders = [...enemy.field];
        if (!defenders.length) {
          directHit = true;
          directDamage = attackerCard.cost;
          applyDamageToLeader(match, enemySide, directDamage, attackerCard.name);
          targetLeaderLifeAfterAttack = Math.max(0, enemy.hp);
          targetLeaderMaxLife = enemy.maxHp;
          log(match, attackerCard.name + ' 직접 공격 · 사이즈 ' + attackerCard.cost);
        } else {
          defender = randomItem(defenders);
          targetId = defender.iid;
          damage = combatDamage(attackerCard.attack + attacker.attackBonus + attacker.tempAttack, defender);
          addDamageToUnit(defender, damage);
          targetHealthAfterAttack = Math.max(0, unitHealth(defender));
          targetMaxHealth = cardOf(defender).health + defender.healthBonus;
          log(match, attackerCard.name + ' 공격 → ' + cardOf(defender).name);
          removeDefeated(match, enemySide);
          targetOwnerLeaderLifeAfterAttack = Math.max(0, enemy.hp);
          targetOwnerLeaderMaxLife = enemy.maxHp;
          targetHealthAfterHit = targetHealthAfterAttack;
          targetMaxHealthAfterHit = targetMaxHealth;
          targetOwnerLeaderLifeAfterHit = targetOwnerLeaderLifeAfterAttack;
          targetOwnerLeaderMaxLifeAfterHit = targetOwnerLeaderMaxLife;
          if (!match.gameOver && enemy.field.includes(defender)) {
            triggerCombatEffect(match, enemySide, defender, 'defense');
            targetHealthAfterAttack = Math.max(0, unitHealth(defender));
            targetMaxHealth = cardOf(defender).health + defender.healthBonus;
            targetOwnerLeaderLifeAfterAttack = Math.max(0, enemy.hp);
            if (!match.gameOver && enemy.field.includes(defender) && match.players[actingSide].field.includes(attacker)) {
              retaliationDamage = combatDamage(cardOf(defender).attack + defender.attackBonus + defender.tempAttack, attacker);
              addDamageToUnit(attacker, retaliationDamage);
              attackerHealthAfterRetaliation = Math.max(0, unitHealth(attacker));
              attackerMaxHealth = cardOf(attacker).health + attacker.healthBonus;
              log(match, cardOf(defender).name + ' 반격 → ' + attackerCard.name);
              removeDefeated(match, actingSide);
              attackerOwnerLeaderLifeAfterRetaliation = Math.max(0, match.players[actingSide].hp);
              attackerOwnerLeaderMaxLife = match.players[actingSide].maxHp;
            }
          }
        }
      }
      const visuals = takeVisualEvents(match);
      const returnedIds = new Set(visuals.filter(item => ['return', 'discard'].includes(item.type)).map(item => item.sourceId));
      const destroyedUnits = removedFromField(beforeField, match).filter(item => !returnedIds.has(item.iid));
      await onStep({
        type: 'attack', side: actingSide, attackerId: attacker.iid, targetId, damage, directDamage, retaliationDamage, directHit,
        targetHealthAfterAttack, targetMaxHealth, targetHealthAfterHit, targetMaxHealthAfterHit,
        targetOwnerLeaderLifeAfterHit, targetOwnerLeaderMaxLifeAfterHit, targetLeaderLifeAfterAttack, targetLeaderMaxLife,
        targetOwnerLeaderLifeAfterAttack, targetOwnerLeaderMaxLife,
        attackerHealthAfterRetaliation, attackerMaxHealth,
        attackerOwnerLeaderLifeAfterRetaliation, attackerOwnerLeaderMaxLife, destroyedUnits, visuals
      });
      if (match.gameOver) break;
      actingSide = otherSide(actingSide);
    }

    if (!match.gameOver) {
      Object.values(match.players).forEach(player => {
        player.field.forEach(unit => {
          if (unit.stunnedRound === match.round) {
            unit.ready = false;
            unit.attackedThisTurn = true;
          }
        });
      });
      match.phase = 'roundEnd';
      const expiredBonuses = expireRoundBonuses(match);
      log(match, '라운드 ' + match.round + ' 전투 종료');
      if (expiredBonuses) {
        await onStep({ type: 'roundEnd', visuals: takeVisualEvents(match) });
      }
    }
    return { ok: true };
  }

  function startNextRound(match) {
    if (match.gameOver || match.phase !== 'roundEnd') return { ok: false, error: '다음 라운드로 넘어갈 수 없습니다.' };
    startRound(match);
    return { ok: !match.gameOver };
  }

  const api = {
    cardById,
    limits: { hand: MAX_HAND_SIZE, field: MAX_FIELD_SIZE, playsPerTurn: MAX_ROUND_PLAYS, size: BASE_SIZE_LIMIT, handResetsPerMatch: HAND_RESETS_PER_MATCH, deck: DECK_SIZE, deckUnits: UNIT_DECK_SIZE, deckSpells: DECK_SIZE - UNIT_DECK_SIZE, copies: MAX_CARD_COPIES },
    makeDeck,
    makeCollection,
    validateDeck,
    createMatch,
    startFirstRound,
    playCard,
    recallCard,
    canPlayCard: (player, card) => checkPlay(player, card).ok,
    checkPlay,
    currentFieldSize,
    boardCards,
    unitDefense,
    resolveRound,
    startNextRound,
    takeVisualEvents,
    draw,
    resetHand,
    unitHealth,
    cardOf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
