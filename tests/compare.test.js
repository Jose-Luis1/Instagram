import test from 'node:test';
import assert from 'node:assert/strict';
import { compare } from '../compare.js';
test('compares stable IDs even when a username changes and sorts results', () => {
  assert.deepEqual(compare([{pk: 1, username:'old'}], [{pk:'1',username:'new'},{pk:2,username:'zoe'},{pk:3,username:'ana'}]), [{pk:3,username:'ana'},{pk:2,username:'zoe'}]);
});
test('handles an empty list of followers or following', () => {
  assert.deepEqual(compare([], [{pk:1,username:'ana'}]), [{pk:1,username:'ana'}]);
  assert.deepEqual(compare([{pk:1,username:'ana'}], []), []);
});
