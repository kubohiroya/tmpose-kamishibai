import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  loadKamishibaiVm,
  turbowarpVmCommit,
} from './helpers/turbowarp-vm.mjs';

const runtimeFixtureUrl = new URL(
  './fixtures/runtime/skip-mode.txt',
  import.meta.url,
);
const poseFixtureUrl = new URL(
  './fixtures/runtime/pose-skip-mode.txt',
  import.meta.url,
);

async function startFixture(harness, fixtureUrl = runtimeFixtureUrl) {
  const script = await readFile(fixtureUrl, 'utf8');
  startScript(harness, script);
}

function startScript(harness, script) {
  harness.greenFlag();
  harness.runUntil(() => harness.getRuntimeVariable('skipMode') === 'title');
  harness.setRuntimeVariable('script', script);
  harness.broadcast('startStory');
  harness.runUntil(() => harness.getBackdropName() === 'Stars');
}

function actorActionScript(action, {before = []} = {}) {
  return [
    'kamishibai=3.1',
    'asset=Title,backdrop',
    'asset=Stars,backdrop',
    'asset=Hero,costume:Hatchling:hatchling-c',
    'actor=Hero,Hero',
    'cover=Title,',
    '---',
    'sceneLabel=first',
    'action=stage:Stars',
    ...before.map((line) => `action=${line}`),
    `action=${action}`,
    'action=stage:Title',
    'action=wait:30',
    '---',
    'sceneLabel=second',
    'action=stage:Stars',
    'action=wait:30',
  ].join('\n');
}

test('pins and loads the generated SB3 in the TurboWarp VM', async (context) => {
  assert.equal(turbowarpVmCommit, 'c4823421cb7c17d8d8a89878851ce1668c26a21f');
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());

  assert.deepEqual(
    harness.vm.runtime.targets.map((target) => target.getName()),
    [
      'Stage',
      'Actor',
      'prompt',
      'openButton',
      'reloadButton',
      'showTitleButton',
      'Hatchling',
    ],
  );
});

test('accepts only Space while the title is active', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());

  harness.greenFlag();
  harness.runUntil(() => harness.getRuntimeVariable('skipMode') === 'title');

  harness.pressKey('ArrowRight');
  assert.equal(harness.getRuntimeVariable('skipMode'), 'title');
  harness.pressKey('ArrowDown');
  assert.equal(harness.getRuntimeVariable('skipMode'), 'title');

  harness.pressKey(' ');
  harness.runUntil(() => !harness.hasRuntimeVariable('skipMode'));
  assert.equal(harness.getBackdropName(), 'Stars');
});

test('ignores rehearsal keys while the project is stopped', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());

  harness.greenFlag();
  harness.runUntil(() => harness.getRuntimeVariable('skipMode') === 'title');
  harness.stopAll();

  for (const key of [' ', 'ArrowRight', 'ArrowDown']) {
    harness.pressKey(key);
    assert.equal(harness.hasRuntimeVariable('skipMode'), false, `${key} was not ignored.`);
  }
});

test('clears pending input at project, cover, stop, and final scene boundaries', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());

  harness.setRuntimeVariable('skipMode', 'scene');
  harness.setRuntimeVariable('skipContext', 'action');
  harness.greenFlag();
  harness.runUntil(() => harness.getRuntimeVariable('skipMode') === 'title');
  assert.equal(harness.hasRuntimeVariable('skipContext'), false);

  harness.setRuntimeVariable('skipMode', 'action');
  harness.setRuntimeVariable('skipContext', 'pose');
  harness.broadcast('showCover');
  harness.runUntil(() => !harness.hasRuntimeVariable('skipMode'));
  assert.equal(harness.hasRuntimeVariable('skipContext'), false);

  harness.setRuntimeVariable('skipMode', 'scene');
  harness.setRuntimeVariable('skipContext', 'action');
  harness.stopAll();
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
  assert.equal(harness.hasRuntimeVariable('skipContext'), false);

  startScript(harness, [
    'kamishibai=3.1',
    'asset=Title,backdrop',
    'asset=Stars,backdrop',
    'cover=Title,',
    '---',
    'sceneLabel=only',
    'action=stage:Stars',
    'action=wait:0.1',
  ].join('\n'));
  harness.runUntil(() => (
    harness.getBackdropName() === 'Title'
    && !harness.hasRuntimeVariable('skipContext')
  ));
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
});

test('keeps a wait active without input and accepts Right during the action', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());
  await startFixture(harness);

  harness.step({milliseconds: 100, count: 20});
  assert.equal(harness.getBackdropName(), 'Stars');
  assert.equal(harness.getRuntimeVariable('sceneIndex'), '1');

  harness.pressKey('ArrowRight');
  harness.runUntil(() => harness.getBackdropName() !== 'Stars');
  assert.equal(harness.getBackdropName(), 'Title');
  assert.equal(harness.getRuntimeVariable('sceneIndex'), '1');
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
});

test('accepts keys only in their specified runtime contexts', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());

  harness.greenFlag();
  harness.runUntil(() => harness.getRuntimeVariable('skipMode') === 'title');
  harness.stopAll();

  const assertInput = (runtimeContext, key, expected) => {
    harness.deleteRuntimeVariable('skipMode');
    harness.setRuntimeVariable('skipContext', runtimeContext);
    harness.pressKey(key);
    assert.equal(harness.getRuntimeVariable('skipMode'), expected);
  };

  assertInput('pose', ' ', 'pose');
  assertInput('pose', 'ArrowRight', 'action');
  assertInput('pose', 'ArrowDown', 'scene');
  assertInput('action', ' ', undefined);
  assertInput('action', 'ArrowRight', 'action');
  assertInput('action', 'ArrowDown', 'scene');
  assertInput('betweenActions', ' ', undefined);
  assertInput('betweenActions', 'ArrowRight', undefined);
  assertInput('betweenActions', 'ArrowDown', 'scene');
  assertInput('scene', ' ', undefined);
  assertInput('scene', 'ArrowRight', undefined);
  assertInput('scene', 'ArrowDown', 'scene');
});

test('keeps the first accepted input until its owner consumes it', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());

  harness.greenFlag();
  harness.runUntil(() => harness.getRuntimeVariable('skipMode') === 'title');
  harness.stopAll();
  harness.setRuntimeVariable('skipContext', 'pose');

  harness.pressKey(' ');
  harness.pressKey('ArrowRight');
  harness.pressKey('ArrowDown');
  assert.equal(harness.getRuntimeVariable('skipMode'), 'pose');
});

test('accepts Down during an action and advances to the next scene', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());
  await startFixture(harness);

  harness.pressKey('ArrowDown');
  harness.runUntil(() => harness.getRuntimeVariable('sceneIndex') === 2);

  assert.equal(harness.getRuntimeVariable('sceneIndex'), 2);
  assert.equal(harness.getBackdropName(), 'Stars');
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
});

test('consumes Space inside a pose action and continues with its next pose', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());
  await startFixture(harness, poseFixtureUrl);
  harness.runUntil(() => harness.getRuntimeVariable('skipContext') === 'pose');

  harness.pressKey(' ');
  harness.runUntil(() => harness.getStageVariable('poseIndex') === 2);

  assert.equal(harness.getRuntimeVariable('skipContext'), 'pose');
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
  assert.equal(harness.getBackdropName(), 'Stars');
});

test('propagates Right from a pose to the action boundary', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());
  await startFixture(harness, poseFixtureUrl);
  harness.runUntil(() => harness.getRuntimeVariable('skipContext') === 'pose');

  harness.pressKey('ArrowRight');
  harness.runUntil(() => harness.getBackdropName() === 'Title');

  assert.equal(harness.getRuntimeVariable('sceneIndex'), '1');
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
});

test('propagates Down from a pose to the scene boundary', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());
  await startFixture(harness, poseFixtureUrl);
  harness.runUntil(() => harness.getRuntimeVariable('skipContext') === 'pose');

  harness.pressKey('ArrowDown');
  harness.runUntil(() => harness.getRuntimeVariable('sceneIndex') === 2);

  assert.equal(harness.getBackdropName(), 'Stars');
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
});

for (const command of ['say', 'think']) {
  test(`clears a ${command} bubble when Right finishes the action`, async (context) => {
    const harness = await loadKamishibaiVm();
    context.after(() => harness.quit());
    startScript(harness, actorActionScript(`Hero:${command}:message:30`));
    harness.runUntil(() => harness.getBubbleText('Hero') === 'message');

    harness.pressKey('ArrowRight');
    harness.runUntil(() => harness.getBackdropName() === 'Title', {maxSteps: 50});

    assert.equal(harness.getBubbleText('Hero'), '');
    assert.equal(harness.hasRuntimeVariable('skipMode'), false);
  });
}

test('moves an actor to the destination when Right finishes a glide', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());
  startScript(harness, actorActionScript('Hero:moveTo:100,50,30', {
    before: ['Hero:show:Hero:0,0,30'],
  }));
  harness.runUntil(() => (
    harness.getRuntimeVariable('actionCommand') === 'moveTo'
    && harness.getRuntimeVariable('skipContext') === 'action'
  ));

  harness.pressKey('ArrowRight');
  harness.runUntil(() => harness.getBackdropName() === 'Title', {maxSteps: 50});

  assert.equal(harness.getActor('Hero').x, 100);
  assert.equal(harness.getActor('Hero').y, 50);
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
});

test('stops an asset sound when Right finishes sound-until-done', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());
  startScript(harness, [
    'kamishibai=3.1',
    'asset=Title,backdrop',
    'asset=Stars,backdrop',
    'asset=Effect,sound:Hatchling:Chirp',
    'cover=Title,',
    '---',
    'sceneLabel=first',
    'action=stage:Stars',
    'action=sound:Effect',
    'action=stage:Title',
    'action=wait:30',
    '---',
    'sceneLabel=second',
    'action=stage:Stars',
    'action=wait:30',
  ].join('\n'));
  harness.runUntil(() => harness.isSoundPlaying('Effect'));

  harness.pressKey('ArrowRight');
  harness.runUntil(() => harness.getBackdropName() === 'Title', {maxSteps: 50});

  assert.equal(harness.isSoundPlaying('Effect'), false);
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
});

for (const transition of [
  {name: 'fadeOut', before: [], finalBrightness: -100},
  {name: 'fadeUp', before: ['action=transition:fadeOut'], finalBrightness: 0},
]) {
  test(`applies the final brightness when Right finishes ${transition.name}`, async (context) => {
    const harness = await loadKamishibaiVm();
    context.after(() => harness.quit());
    startScript(harness, [
      'kamishibai=3.1',
      'asset=Title,backdrop',
      'asset=Stars,backdrop',
      'cover=Title,',
      '---',
      'sceneLabel=first',
      'action=stage:Stars',
      ...transition.before,
      `action=transition:${transition.name}`,
      'action=stage:Title',
      'action=wait:30',
      '---',
      'sceneLabel=second',
      'action=stage:Stars',
      'action=wait:30',
    ].join('\n'));
    harness.runUntil(() => (
      harness.getRuntimeVariable('actionParam') === transition.name
      && harness.getStageEffect('brightness') > -100
      && harness.getStageEffect('brightness') < 0
    ));

    harness.pressKey('ArrowRight');
    harness.runUntil(() => harness.getBackdropName() === 'Title', {maxSteps: 50});

    assert.equal(harness.getStageEffect('brightness'), transition.finalBrightness);
    assert.equal(harness.hasRuntimeVariable('skipMode'), false);
  });
}

test('applies the final image when a later Right input finishes a sequence', async (context) => {
  const harness = await loadKamishibaiVm();
  context.after(() => harness.quit());
  startScript(harness, [
    'kamishibai=3.1',
    'asset=Title,backdrop',
    'asset=Stars,backdrop',
    'asset=Hero,costume:Hatchling:hatchling-c',
    'asset=Hero2,costume:Hatchling:hatchling-c',
    'actor=Hero,Hero',
    'cover=Title,',
    '---',
    'sceneLabel=first',
    'action=stage:Stars',
    'action=Hero:sequence:Hero,Hero2:30',
    'action=wait:30',
    'action=stage:Title',
    'action=wait:30',
    '---',
    'sceneLabel=second',
    'action=stage:Stars',
    'action=wait:30',
  ].join('\n'));
  harness.runUntil(() => (
    harness.getActorSkin('Hero') === 'Hero'
    && harness.getRuntimeVariable('actionCommand') === 'wait'
  ));

  harness.pressKey('ArrowRight');
  harness.runUntil(() => harness.getBackdropName() === 'Title', {maxSteps: 50});

  assert.equal(harness.getActorSkin('Hero'), 'Hero2');
  assert.equal(harness.hasRuntimeVariable('skipMode'), false);
});
