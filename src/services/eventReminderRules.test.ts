import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectFollowTargets, uniqueFollowIds } from './eventReminderRules.ts';

describe('collectFollowTargets', () => {
  it('réunit artistes et organisations sans doublon', () => {
    const targets = collectFollowTargets(['a1', '', 'a2'], ['org1', 'a2']);
    assert.deepEqual([...targets].sort(), ['a1', 'a2', 'org1']);
  });

  it('reste vide si personne n’est suivi', () => {
    assert.equal(collectFollowTargets([], ['']).size, 0);
  });
});

describe('uniqueFollowIds', () => {
  it('borne la liste envoyée au filtre catalogue', () => {
    const ids = uniqueFollowIds(['a', 'a', '', 'b', 'c'], 2);
    assert.deepEqual(ids, ['a', 'b']);
  });
});
