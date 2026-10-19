/* Smoke tests for explicit card-only department synergies. Run with node scripts/test_department_synergies.js */
global.window = global;
require('../data.js');
require('../follower-expansion.js');
const assert = require('node:assert/strict');
const rules = require('../engine.js');

function unit(cardId, iid, damage = 0) {
  return {
    iid, cardId, placedRound: 0, slotOrder: Number(iid.replace(/\D/g, '')) || 0,
    damage, attackBonus: 0, tempAttack: 0, healthBonus: 0, defenseBonus: 0,
    tempDefense: 0, ready: true, attackedThisTurn: false, stunnedRound: null,
  };
}
function matchWith(playerFaction, units, hp = 30) {
  const match = rules.createMatch(playerFaction, playerFaction, { deferStart: true });
  match.players.player.field = units;
  match.players.player.hp = hp;
  rules.startFirstRound(match, 'player');
  rules.beginCombat(match);
  return match;
}

const explicit = window.GAME_DATA.cards.filter(card =>
  [card.effect, card.attackEffect, card.defenseEffect].some(effect => effect?.type === 'department_synergy')
);
assert.deepEqual(new Set(explicit.map(card => card.id)), new Set(['haeon', 'ara', 'boram', 'sojeong']));
assert.equal(window.GAME_DATA.cards.some(card => 'departmentEffect' in card), false);
const verda = window.GAME_DATA.cards.find(card => card.id === 'verda');
const lea = window.GAME_DATA.cards.find(card => card.id === 'lea');
assert.equal(verda.position, '기업 총수');
assert.equal(verda.department, null);
assert.equal(lea.position, '협동조합 대표');
assert.equal(lea.department, null);

// A matching department alone grants no stats: Vector and Elodie are both R&D.
let match = matchWith('selfas', [unit('vector', 'u1'), unit('chaerin', 'u2')]);
assert.equal(match.players.player.field[0].tempAttack, 0);
assert.equal(match.players.player.field[1].tempAttack, 0);
assert.equal(match.players.player.field[0].tempDefense, 0);

// Danica's named card ability fires only when another Safety Management ally is present.
match = matchWith('selfas', [unit('ara', 'u1'), unit('veil', 'u2')]);
assert.equal(match.players.player.field[0].tempAttack, 1);
assert.equal(match.players.player.field[1].tempAttack, 1);
assert.equal(match.players.player.field[0].tempDefense, 0);
match = matchWith('selfas', [unit('ara', 'u1')]);
assert.equal(match.players.player.field[0].tempAttack, 0);

// Ru-an's healing requires a separate R&D ally; Haewon's public-outreach tag does not qualify.
match = matchWith('nanguk', [unit('boram', 'u1'), unit('eunju', 'u2', 2)]);
assert.equal(match.players.player.field[1].damage, 2);
match = matchWith('nanguk', [unit('boram', 'u1'), unit('soun', 'u2', 2)]);
assert.equal(match.players.player.field[1].damage, 0);

console.log('PASS: department tags have no automatic bonus; four named card effects carry explicit ally conditions.');
