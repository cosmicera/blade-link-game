/* Deck size, one-copy title units, and representative support card checks. */
global.window = global;
require('../data.js');
require('../follower-expansion.js');
const assert = require('node:assert/strict');
const rules = require('../engine.js');
const data = window.GAME_DATA;

for (const factionId of Object.keys(data.factions)) {
  const deck = rules.makeDeck(factionId);
  assert.equal(deck.length, 30, `${factionId} deck should contain 30 cards`);
  const counts = new Map();
  deck.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
  const unitCount = deck.reduce((sum, id) => sum + (rules.cardById[id].type === 'unit' ? 1 : 0), 0);
  const spellCount = deck.reduce((sum, id) => sum + (rules.cardById[id].type === 'spell' ? 1 : 0), 0);
  assert.equal(unitCount, 20, `${factionId} deck should contain 20 followers`);
  assert.equal(spellCount, 10, `${factionId} deck should contain 10 spells`);
  deck.forEach(id => {
    const limit = rules.cardById[id].deckLimit;
    if (limit) assert.ok(counts.get(id) <= limit, `${id} exceeds its deck copy limit`);
  });
  data.cards
    .filter(card => card.faction === factionId && ['기업 총수', '기업 대표', '협동조합 대표'].includes(card.position))
    .forEach(card => assert.equal(counts.get(card.id), 1, `${card.id} should appear once in the default deck`));
}

assert.equal(rules.limits.deck, 30);
assert.equal(rules.limits.deckUnits, 20);
assert.equal(rules.limits.deckSpells, 10);
assert.equal(rules.cardById.verda.deckLimit, 1);
assert.equal(rules.cardById.lea.deckLimit, 1);
assert.equal(rules.cardById.seolha.position, '기업 총수');
assert.equal(rules.cardById.seolha.department, null);
assert.equal(rules.cardById.seolha.deckLimit, 1);
assert.equal(rules.cardById.matilda.position, '기업 총수');
assert.equal(rules.cardById.matilda.deckLimit, 1);
assert.deepEqual([rules.cardById.matilda.cost, rules.cardById.matilda.attack, rules.cardById.matilda.defense, rules.cardById.matilda.health], [5, 5, 2, 6]);
assert.equal(rules.cardById.matilda.attackEffect.amount, 1);
assert.equal(rules.limits.copies, 3, 'ordinary cards should have a three-copy deck limit');
assert.ok(data.cards.every(card => card.name.length <= 9), 'display names should stay concise on small card frames');
assert.ok(Object.values(data.leaders).every(leader => leader.name.length <= 9), 'leader names should also fit small card frames');
assert.ok(data.cards.filter(card => card.expansion).every(card => !/\s/.test(card.name) && card.person && card.name !== card.person), 'expansion cards should use compact display names while preserving full names');
assert.ok(Object.values(data.leaders).every(leader => leader.name.length <= 4), 'representative cards should use concise names');
assert.equal(rules.cardById.verda.name, '베르다');
assert.equal(rules.cardById.yeoul.name, '에블린');
assert.equal(rules.cardById.yeoul.person, '에블린 하트');
assert.equal(rules.cardById.rook.name, '로크');
assert.equal(data.leaders.noa.name, '노아');
assert.equal(data.factions.nanguk.short, 'NAMGUK');
assert.equal(data.factions.nanguk.badge, 'NAM');
assert.equal(rules.cardById.verda.effect.type, 'heal_wounded', 'Outpraware chairperson healing should focus on one ally');
assert.equal(rules.cardById.outpr_spring.effect, 'heal_focus', 'Outpraware healing spell should focus on one ally');
assert.equal(rules.cardById.seolha.effect.type, 'defense_weakest', 'Seolha should protect one vulnerable ally rather than the whole field');
assert.equal(rules.cardById.seohwi.effect, null, 'Seohwi relies on base defense and counterattack');
assert.equal(rules.cardById.nanguk_echo_defense.effect, 'draw_reserve');
assert.equal(rules.cardById.nanguk_mist.effect, 'defense_weakest');
assert.equal(rules.cardById.eunju.defense, 2);
assert.equal(rules.cardById.yuran.defenseEffect, undefined);
assert.equal(rules.cardById.soun.effect.type, 'temp_buff_self');
assert.match(data.leaders.ria.abilityText, /라이프를 1/);
assert.match(data.leaders.cheongyeon.abilityText, /방어력을 1 높입니다/);

const outprPool = rules.makeCollection('outpr');
assert.ok(outprPool.some(entry => entry.card.id === 'verda' && entry.copies === 1), 'Verda should appear in the pool as a single-copy card');
assert.ok(outprPool.some(entry => entry.card.id === 'serin' && entry.copies === 3), 'ordinary cards should expose three owned copies');
assert.ok(rules.makeCollection('nanguk').some(entry => entry.card.id === 'seolha' && entry.copies === 1), 'Seolha should appear as a single-copy title follower');

function deckWithTooManyCopies(factionId, cardId, invalidCount) {
  const deck = rules.makeDeck(factionId);
  const card = rules.cardById[cardId];
  let copies = deck.filter(id => id === cardId).length;
  while (copies < invalidCount) {
    const index = deck.findIndex(id => id !== cardId && rules.cardById[id].type === card.type);
    assert.notEqual(index, -1, `a ${card.type} should be available to replace in ${factionId}`);
    deck[index] = cardId;
    copies += 1;
  }
  return deck;
}
assert.equal(rules.validateDeck(deckWithTooManyCopies('outpr', 'serin', 4), 'outpr').ok, false, 'ordinary cards should reject a fourth copy');
assert.equal(rules.validateDeck(deckWithTooManyCopies('nanguk', 'seolha', 2), 'nanguk').ok, false, 'title followers should reject a second copy');
assert.equal(rules.validateDeck(deckWithTooManyCopies('selfas', 'matilda', 2), 'selfas').ok, false, 'Matilda should be limited to one copy');
const enterpriseRepresentative = { ...rules.cardById.nia, id: 'test-enterprise-representative', name: 'Test enterprise representative', position: '기업 대표' };
const ordinaryHighLimit = { ...rules.cardById.nia, id: 'test-high-copy-limit', name: 'Test ordinary follower', position: undefined, deckLimit: 9 };
data.cards.push(enterpriseRepresentative);
data.cards.push(ordinaryHighLimit);
rules.cardById[enterpriseRepresentative.id] = enterpriseRepresentative;
rules.cardById[ordinaryHighLimit.id] = ordinaryHighLimit;
assert.ok(rules.makeCollection('selfas').some(entry => entry.card.id === enterpriseRepresentative.id && entry.copies === 1), 'enterprise representatives should appear as single-copy cards');
assert.equal(rules.validateDeck(deckWithTooManyCopies('selfas', enterpriseRepresentative.id, 2), 'selfas').ok, false, 'enterprise representatives should reject a second copy');
assert.ok(rules.makeCollection('selfas').some(entry => entry.card.id === ordinaryHighLimit.id && entry.copies === 3), 'ordinary card limits should never exceed three copies');
assert.equal(rules.validateDeck(deckWithTooManyCopies('selfas', ordinaryHighLimit.id, 4), 'selfas').ok, false, 'even a higher per-card limit should reject a fourth copy');
data.cards.pop();
data.cards.pop();
delete rules.cardById[enterpriseRepresentative.id];
delete rules.cardById[ordinaryHighLimit.id];
const customDeck = rules.makeDeck('outpr');
const customCounts = new Map();
customDeck.forEach(id => customCounts.set(id, (customCounts.get(id) || 0) + 1));
const removeId = outprPool.find(({ card }) => card.type === 'unit' && !card.deckLimit && customCounts.get(card.id) > 1)?.card.id;
const addId = outprPool.find(({ card, copies }) => card.type === 'unit' && card.id !== removeId && (customCounts.get(card.id) || 0) < copies)?.card.id;
assert.ok(removeId && addId, 'the owned pool should permit a valid unit-card swap');
customDeck.splice(customDeck.lastIndexOf(removeId), 1);
customDeck.push(addId);
assert.equal(rules.validateDeck(customDeck, 'outpr').ok, true, 'a manually chosen deck should pass validation');
const customMatch = rules.createMatch('outpr', 'selfas', { deferStart: true, playerDeck: customDeck });
assert.deepEqual([...customMatch.players.player.deck].sort(), [...customDeck].sort(), 'the player match should use the saved custom deck');
assert.equal(rules.validateDeck(customDeck.slice(1), 'outpr').ok, false, 'a short deck should be rejected');
assert.throws(() => rules.createMatch('outpr', 'selfas', { playerDeck: [...customDeck.slice(1), 'selfas_repair'] }), /same company|기업/,
  'cross-faction cards should be rejected');

function unit(cardId, iid, slotOrder, damage = 0) {
  return {
    iid, cardId, placedRound: 0, slotOrder, damage,
    attackBonus: 0, tempAttack: 0, healthBonus: 0, defenseBonus: 0,
    tempDefense: 0, ready: true, attackedThisTurn: false, stunnedRound: null,
  };
}

function matchWith(faction, units) {
  const match = rules.createMatch(faction, faction, { deferStart: true });
  match.players.player.field = units;
  rules.startFirstRound(match, 'player');
  rules.beginCombat(match);
  return match;
}

let balanceMatch = rules.createMatch('outpr', 'selfas', { deferStart: true });
const riaTarget = unit('lagyeong', 'ria-target', 0, 3);
const riaOther = unit('chaeyun', 'ria-other', 1, 1);
balanceMatch.players.player.field = [riaTarget, riaOther];
balanceMatch.players.player.hp = 25;
rules.startFirstRound(balanceMatch, 'player');
rules.beginCombat(balanceMatch);
assert.equal(balanceMatch.players.player.hp, 26, 'Ria should restore one leader life');
assert.equal(rules.unitHealth(riaTarget), 3, 'Ria should heal one point on the weakest ally');
assert.equal(rules.unitHealth(riaOther), 6, 'Ria should not heal every follower at once');
const riaVisual = balanceMatch.visualEvents.find(event => event.sourceId === 'ria' && event.timing === 'leader');
assert.deepEqual(riaVisual.targets.map(target => target.iid), ['ria-target']);

balanceMatch = matchWith('nanguk', [unit('wolbaek', 'cheongyeon-target', 0)]);
assert.equal(balanceMatch.players.player.field[0].tempDefense, 1, 'Cheongyeon should distribute only one temporary defense');

balanceMatch = matchWith('nanguk', [unit('seolha', 'seolha', 0), unit('wolbaek', 'seolha-target', 1, 2)]);
assert.equal(balanceMatch.players.player.field.find(item => item.iid === 'seolha').tempDefense, 0, 'Seolha should not add a field-wide defense bonus');
assert.equal(balanceMatch.players.player.field.find(item => item.iid === 'seolha-target').tempDefense, 2, 'Seolha should add one point to the weakest ally alongside Cheongyeon’s one-point field bonus');

let match = matchWith('outpr', [unit('verda', 'u1', 0), unit('lagyeong', 'u2', 1)]);
const verda = match.players.player.field.find(item => item.cardId === 'verda');
assert.equal(verda.tempAttack, 1, 'Vivian should support the Outpraware chairperson with attack');
assert.equal(verda.tempDefense, 1, 'Vivian should support the Outpraware chairperson with defense');
assert.ok(match.visualEvents.some(event => event.type === 'effect' && event.sourceId === 'u2' && event.targets.some(target => target.iid === 'u1')));
const supportVisual = match.visualEvents.find(event => event.type === 'effect' && event.sourceId === 'u2' && event.targets.some(target => target.iid === 'u1'));
assert.equal(supportVisual.beneficial, true, 'positive stat changes should be tagged for the shared starfall animation');
const supportedSnapshot = supportVisual.targetStates.find(state => state.iid === 'u1');
assert.deepEqual([supportedSnapshot.attack, supportedSnapshot.attackBase, supportedSnapshot.attackTemp], [4, 3, 1]);
assert.deepEqual([supportedSnapshot.defense, supportedSnapshot.defenseBase, supportedSnapshot.defenseTemp], [4, 3, 1]);

match = matchWith('unbek', [unit('jeongran', 'u1', 0), unit('lea', 'u2', 1, 1)]);
const lea = match.players.player.field.find(item => item.cardId === 'lea');
assert.equal(lea.tempDefense, 2, 'Lea receives one defense from her own skill and one from Zora');
assert.equal(rules.unitHealth(lea), rules.cardById.lea.health, 'Zora restores one health to Lea at round start');

match = matchWith('outpr', [unit('lagyeong', 'u1', 0)]);
assert.equal(match.players.player.field[0].tempAttack, 0, 'Representative support should wait for a title unit');
assert.equal(match.visualEvents.some(event => event.type === 'effect' && event.sourceId === 'u1'), false, 'Inactive representative support should not produce an empty effect animation');

match = matchWith('nanguk', [unit('seolha', 'u1', 0)]);
const seolhaDefenseWithoutSupport = match.players.player.field[0].tempDefense;
match = matchWith('nanguk', [unit('seolha', 'u1', 0), unit('lagyeong', 'u2', 1)]);
const supportedSeolha = match.players.player.field.find(item => item.cardId === 'seolha');
assert.equal(supportedSeolha.tempAttack, 1, 'title support effects should recognize the South Pole corporate head');
assert.equal(supportedSeolha.tempDefense, 1, 'only explicit support reaches Seolha when another ally is weaker');

(async () => {
  const defenseMatch = rules.createMatch('nanguk', 'selfas', { deferStart: true });
  defenseMatch.players.player.field = [unit('wolbaek', 'weak-ally', 0), unit('seohwi', 'strong-ally', 1)];
  rules.startFirstRound(defenseMatch, 'player');
  defenseMatch.players.player.hand = [{ iid: 'mist', cardId: 'nanguk_mist', handOrder: 0 }];
  rules.playCard(defenseMatch, 'player', 'mist');
  defenseMatch.players.player.field.forEach(item => { item.ready = false; });
  await rules.resolveRound(defenseMatch, step => {
    if (step.type === 'roundStart') {
      assert.deepEqual(defenseMatch.players.player.field.map(item => item.tempDefense), [1, 0]);
    }
    if (step.type === 'spell') {
      const mist = step.visuals.find(event => event.sourceType === 'spell');
      assert.equal(mist.targets.length, 1);
      assert.equal(mist.targetStates[0].defenseTemp - mist.beforeStates[0].defenseTemp, 2);
      assert.deepEqual(defenseMatch.players.player.field.map(item => item.tempDefense), [3, 0]);
    }
  });
  const focusedHealMatch = rules.createMatch('outpr', 'selfas', { deferStart: true });
  focusedHealMatch.players.player.leaderId = 'arca';
  const focusedTarget = unit('lagyeong', 'focused-heal-target', 0, 3);
  const untouchedAlly = unit('chaeyun', 'focused-heal-untouched', 1, 1);
  focusedHealMatch.players.player.field = [focusedTarget, untouchedAlly];
  rules.startFirstRound(focusedHealMatch, 'player');
  focusedHealMatch.players.player.hp = 20;
  focusedTarget.damage = 3;
  untouchedAlly.damage = 1;
  focusedHealMatch.players.player.field.forEach(item => { item.ready = false; item.attackedThisTurn = true; });
  focusedHealMatch.players.player.hand = [{ iid: 'focused-heal-spell', cardId: 'outpr_spring', handOrder: 0 }];
  assert.equal(rules.playCard(focusedHealMatch, 'player', 'focused-heal-spell').ok, true);
  const spellSteps = [];
  await rules.resolveRound(focusedHealMatch, async step => spellSteps.push(step));
  assert.equal(focusedHealMatch.players.player.hp, 23, 'the healing spell should restore three leader life');
  assert.equal(rules.unitHealth(focusedTarget), 3, 'the healing spell should restore one point to the weakest ally');
  assert.equal(rules.unitHealth(untouchedAlly), 6, 'the healing spell should leave other allies unchanged');
  const healEvent = spellSteps.flatMap(step => step.visuals || []).find(event => event.sourceType === 'spell' && event.timing === 'spell');
  assert.deepEqual(healEvent.targets.map(target => target.iid), ['focused-heal-target']);
  assert.equal(healEvent.beneficial, true);

  const expiryMatch = rules.createMatch('selfas', 'selfas', { deferStart: true });
  expiryMatch.phase = 'deploy';
  expiryMatch.round = 1;
  expiryMatch.initiativeSide = 'player';
  const expiringAttack = unit('nia', 'expiry-attack', 0);
  expiringAttack.tempAttack = 2;
  expiringAttack.stunnedRound = 1;
  const expiringDefense = unit('vector', 'expiry-defense', 0);
  expiringDefense.tempDefense = 1;
  expiringDefense.stunnedRound = 1;
  expiryMatch.players.player.field = [expiringAttack];
  expiryMatch.players.opponent.field = [expiringDefense];
  const steps = [];
  await rules.resolveRound(expiryMatch, async step => steps.push(step));
  const expiry = steps.flatMap(step => step.visuals || []).find(event => event.timing === 'roundEnd');
  assert.ok(expiry, 'round-end expiry should be one shared visual event');
  assert.equal(expiry.targetStates.length, 2, 'one expiry event should cover every temporary buff recipient');
  assert.ok(expiry.targetStates.every(state => state.attackTemp === 0 && state.defenseTemp === 0));
  assert.ok(expiry.beforeStates.some(state => state.attackTemp === 2));
  assert.ok(expiry.beforeStates.some(state => state.defenseTemp === 1));
  console.log('PASS: concise card labels, visible temporary-stat breakdowns, beneficial effect tags, and one grouped expiry event.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
