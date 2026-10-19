global.window = global;
require('../data.js');
require('../follower-expansion.js');
const assert = require('node:assert/strict');
const rules = require('../engine.js');
function deploy(match, side, id) {
  match.players[side].hand = [{ iid: side + '-hand', cardId: id, handOrder: 0 }];
  assert.equal(rules.playCard(match, side, side + '-hand').ok, true);
  return match.players[side].field[0];
}
(async () => {
  const match = rules.createMatch('nanguk', 'selfas', { deferStart: true });
  rules.startFirstRound(match, 'player');
  assert.equal(match.players.player.hand.length, 5);
  assert.equal(match.players.opponent.hand.length, 5);
  assert.equal(match.visualEvents.some(event => event.type === 'effect'), false, 'draw and deployment must precede start buffs');
  rules.takeVisualEvents(match);
  const ally = deploy(match, 'player', 'wolbaek');
  const enemy = deploy(match, 'opponent', 'vector');
  ally.healthBonus = enemy.healthBonus = 100;
  const steps = [];
  await rules.resolveRound(match, step => {
    steps.push(step);
    if (step.type === 'roundStart') {
      assert.ok(ally.tempDefense > 0, 'newly deployed ally receives the leader start buff');
      assert.ok(step.visuals.some(event => event.sourceId === 'cheongyeon'));
    }
    if (step.type === 'attack') assert.ok(ally.tempDefense > 0, 'temporary defense survives every duel');
  });
  assert.equal(steps[0].type, 'roundStart');
  assert.equal(steps.at(-1).type, 'roundEnd');
  assert.equal(ally.tempDefense, 0);
  assert.equal(steps.filter(step => step.type === 'roundEnd').length, 1);
  const lethal = rules.createMatch('selfas', 'selfas', { deferStart: true });
  rules.startFirstRound(lethal, 'player');
  rules.takeVisualEvents(lethal);
  const attacker = deploy(lethal, 'player', 'vector');
  const defender = deploy(lethal, 'opponent', 'vector');
  attacker.attackBonus = 100;
  const lethalSteps = [];
  await rules.resolveRound(lethal, step => lethalSteps.push(step));
  const death = lethalSteps.flatMap(step => step.visuals || []).find(event => event.type === 'death');
  assert.equal(death.sourceId, defender.iid);
  assert.equal(death.leaderLife, 30 - rules.cardById.vector.cost);
  assert.ok(lethalSteps.find(step => step.destroyedUnits?.some(unit => unit.iid === defender.iid)));
  console.log('PASS: deployment precedes buffs, buffs survive combat, and deaths carry exact owner life snapshots.');
})().catch(error => { console.error(error); process.exitCode = 1; });
