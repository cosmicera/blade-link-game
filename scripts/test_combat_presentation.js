/* Exercise presentation ordering without real-time animation delays. */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../main.js'), 'utf8');
function functionSource(name, next) {
  return source.slice(source.indexOf(`  async function ${name}(`), source.indexOf(`  ${next}`, source.indexOf(`  async function ${name}(`) + 1));
}
const calls = [];
const element = { classList: { add() {}, remove() {} }, querySelector: () => ({ textContent: '카드' }) };
let open = false;
const context = {
  boardElement: () => element, leaderElement: () => element,
  wait: async () => {},
  showCombatStage: () => {
    assert.equal(open, false);
    open = true; calls.push('open');
    return { stage: element, pair: element, title: {}, subtitle: {}, versus: {}, sourceCard: element, targetCard: element,
      setSourceCard() {}, setTargetCard() {} };
  },
  hideCombatStage: () => { open = false; calls.push('close'); },
  animateCombatTableEffect: async (event, options) => {
    assert.equal(open, false, 'combat stats must change on the visible table');
    if (event.timing === 'defense') assert.equal(options.statsOnly, true, 'do not restore pre-counterattack health');
    calls.push(event.timing);
  },
  animateEffectEvent: () => assert.fail('combat trigger must not mutate an enlarged card'),
  animateGlobalEffectEvent: () => assert.fail('combat trigger must not replace the duel'),
  applyFxClass: async () => {}, showSlash: async () => {}, showDamage() {},
  updateCombatHealth: () => { calls.push('health'); }, animateDeath: async () => {},
};
vm.createContext(context);
vm.runInContext(functionSource('animateBattleStep', 'function aiCardScore'), context);
(async () => {
  await context.animateBattleStep({ type: 'attack', side: 'player', attackerId: 'a', targetId: 'b', damage: 1, retaliationDamage: 2,
    visuals: [{ type: 'effect', timing: 'attack' }, { type: 'effect', timing: 'defense' }] });
  assert.ok(calls.indexOf('attack') < calls.indexOf('open'));
  assert.ok(calls.indexOf('defense') > calls.indexOf('close'));
  assert.equal(calls.filter(call => call === 'open').length, 1, 'attack and counterattack share one continuous duel');
  context.showGlobalEffectStage = () => assert.fail('turn expiry must not open a focus card');
  context.animateRoundExpiry = async states => assert.equal(states.length, 2);
  vm.runInContext(functionSource('animateGlobalEffectEvent', 'async function animateEffectEvent'), context);
  await context.animateGlobalEffectEvent({ timing: 'roundEnd', targetStates: [{}, {}] });
  console.log('PASS: combat stats update before/after one continuous duel; round expiry stays on the table.');
})().catch(error => { console.error(error); process.exitCode = 1; });
