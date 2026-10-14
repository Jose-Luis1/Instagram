import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarUrl, filterAccounts, toCsv } from '../presentation.js';
test('allows only HTTPS Instagram photo hosts, rejecting lookalike hosts and credentials', () => {
  assert.equal(avatarUrl('https://scontent.cdninstagram.com/photo.jpg'), 'https://scontent.cdninstagram.com/photo.jpg');
  for (const url of ['javascript:alert(1)', 'http://cdninstagram.com/a', 'https://cdninstagram.com.evil.test/a', 'https://evilcdninstagram.com/a', 'https://user:pass@cdninstagram.com/a', undefined]) assert.equal(avatarUrl(url), null);
});
test('searches full names and usernames and sorts without mutating the source list', () => {
  const users = [{username:'zoe',full_name:'María'},{username:'ana',full_name:'Ana'}];
  assert.equal(filterAccounts(users,'MARÍA')[0].username,'zoe');
  assert.equal(filterAccounts(users,'','asc')[0].username,'ana');
  assert.equal(filterAccounts(users,'','desc')[0].username,'zoe');
  assert.equal(users[0].username,'zoe');
});
test('CSV quotes commas, line breaks and quotes, and neutralizes spreadsheet formulas', () => {
  const csv = toCsv([{username:'ana',full_name:'="formula"'},{username:'bob',full_name:'B, "C"\nD'}]);
  assert.ok(csv.startsWith('\uFEFFUsuario,Nombre,Perfil\r\n'));
  assert.ok(csv.includes('"\'=\"\"formula\"\""'));
  assert.ok(csv.includes('"B, ""C""\nD"'));
});
