/* Deck size, one-copy title units, and secretary support card smoke tests. */
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
}

assert.equal(rules.limits.deck, 30);
assert.equal(rules.limits.deckUnits, 20);
assert.equal(rules.limits.deckSpells, 10);
assert.equal(rules.cardById.verda.deckLimit, 1);
assert.equal(rules.cardById.lea.deckLimit, 1);
assert.equal(rules.limits.copies, 3, 'ordinary cards should have a three-copy deck limit');

const outprPool = rules.makeCollection('outpr');
assert.ok(outprPool.some(entry => entry.card.id === 'verda' && entry.copies === 1), 'Verda should appear in the pool as a single-copy card');
assert.ok(outprPool.some(entry => entry.card.id === 'serin' && entry.copies === 3), 'ordinary cards should expose three owned copies');
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
  return match;
}

let match = matchWith('outpr', [unit('verda', 'u1', 0), unit('lagyeong', 'u2', 1)]);
const verda = match.players.player.field.find(item => item.cardId === 'verda');
assert.equal(verda.tempAttack, 1, 'Vivian should support the Outpraware chairperson with attack');
assert.equal(verda.tempDefense, 1, 'Vivian should support the Outpraware chairperson with defense');
assert.ok(match.visualEvents.some(event => event.type === 'effect' && event.sourceId === 'u2' && event.targets.some(target => target.iid === 'u1')));

match = matchWith('unbek', [unit('jeongran', 'u1', 0), unit('lea', 'u2', 1, 1)]);
const lea = match.players.player.field.find(item => item.cardId === 'lea');
assert.equal(lea.tempDefense, 2, 'Lea receives one defense from her own skill and one from Zora');
assert.equal(rules.unitHealth(lea), rules.cardById.lea.health, 'Zora restores one health to Lea at round start');

match = matchWith('outpr', [unit('lagyeong', 'u1', 0)]);
assert.equal(match.players.player.field[0].tempAttack, 0, 'Secretary effect should wait for the title unit');
assert.equal(match.visualEvents.some(event => event.type === 'effect' && event.sourceId === 'u1'), false, 'Inactive support should not produce an empty effect animation');

console.log('PASS: all factions build 30-card decks; title units are single-copy; named secretary cards support title units.');
