import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../scanner.js', import.meta.url), 'utf8');
async function run(responses) {
  const paths = [];
  const result = await vm.runInNewContext(source, {
    URLSearchParams,
    setTimeout: callback => callback(),
    fetch: async path => {
      paths.push(path);
      const item = responses.shift();
      assert.ok(item, 'unexpected request');
      return {ok: !item.http || item.http === 200, status:item.http || 200, headers:{get:()=> 'application/json'}, json:async()=> item};
    }
  });
  return {result, paths};
}
test('reads all pages and deduplicates IDs before returning complete lists', async () => {
  const {result,paths} = await run([
    {user:{pk:10,username:'me'}},
    {users:[{pk:1,username:'ana'}],next_max_id:'abc'},
    {users:[{pk:1,username:'ana'},{pk:2,username:'bob'}]},
    {users:[{pk:3,username:'cat'}]}
  ]);
  assert.equal(result.followers.length,2);
  assert.equal(result.following.length,1);
  assert.match(paths[2], /max_id=abc/);
});
test('rate limiting returns an error without partial lists', async () => {
  const {result} = await run([{user:{pk:10,username:'me'}},{http:429}]);
  assert.match(result.error,/limitó/);
  assert.equal(result.followers,undefined);
});
test('repeated cursors stop pagination', async () => {
  const {result} = await run([{user:{pk:10,username:'me'}},{users:[],next_max_id:'abc'},{users:[],next_max_id:'abc'}]);
  assert.match(result.error,/repitió/);
});
test('an explicitly incomplete response is rejected', async () => {
  const {result} = await run([{user:{pk:10,username:'me'}},{users:[],has_more:true}]);
  assert.match(result.error,/incompleta/);
});
