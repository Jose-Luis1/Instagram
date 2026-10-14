import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../scanner.js', import.meta.url), 'utf8');
async function run(responses, cookies = '') {
  const paths = [];
  const result = await vm.runInNewContext(source, {
    URLSearchParams,
    document: { cookie: cookies },
    setTimeout: callback => callback(),
    fetch: async path => {
      paths.push(path);
      const item = responses.shift();
      assert.ok(item, 'unexpected request');
      return {ok: !item.http || item.http === 200, status:item.http || 200, redirected: Boolean(item.redirected), headers:{get:()=> item.contentType || 'application/json'}, json:async()=> item};
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

test('uses the session account ID without requesting the failing identity endpoint', async () => {
  const {result, paths} = await run([{users:[{pk:1,username:'ana'}]},{users:[]}], 'ds_user_id=10; csrftoken=local-test');
  assert.equal(result.error, undefined);
  assert.equal(paths.length, 2);
  assert.match(paths[0], /friendships\/10\/followers/);
  assert.equal(result.username, null);
});
test('HTML instead of JSON identifies the failed stage without leaking cookies', async () => {
  const {result} = await run([{contentType:'text/html',redirected:true}], 'ds_user_id=10; csrftoken=local-test');
  assert.match(result.error, /seguidores/);
  assert.match(result.error, /página web/);
  assert.match(result.error, /redirección/);
  assert.doesNotMatch(result.error, /local-test|ds_user_id|csrftoken/);
  assert.equal(result.followers, undefined);
});
