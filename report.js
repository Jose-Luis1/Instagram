import { compare } from './compare.js';
const account = document.querySelector('#account');
const scan = document.querySelector('#scan');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
const results = document.querySelector('#results');
let unmatched = [];
let busy = false;
async function refresh() {
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
  account.replaceChildren();
  for (const tab of tabs) {
    const option = document.createElement('option');
    option.value = String(tab.id);
    option.textContent = tab.title || 'Instagram';
    account.append(option);
  }
  scan.disabled = busy || !tabs.length;
  if (!tabs.length) status.textContent = 'Abre una pestaña de Instagram e inicia sesión; luego actualiza la lista de pestañas.';
}
function render() {
  results.replaceChildren();
  const query = search.value.trim().toLowerCase();
  for (const user of unmatched.filter(item => item.username.toLowerCase().includes(query))) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `https://www.instagram.com/${encodeURIComponent(user.username)}/`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `@${user.username}`;
    li.append(link);
    results.append(li);
  }
}
document.querySelector('#refresh').addEventListener('click', () => refresh().catch(error => { status.textContent = error.message; }));
search.addEventListener('input', render);
scan.addEventListener('click', async () => {
  busy = true;
  scan.disabled = true;
  account.disabled = true;
  unmatched = [];
  render();
  document.querySelector('#summary').textContent = '';
  status.textContent = 'Consultando ambas listas completas. Puede tardar varios minutos; mantén abiertas esta pestaña e Instagram.';
  try {
    const injected = await chrome.scripting.executeScript({ target: { tabId: Number(account.value) }, files: ['scanner.js'] });
    const data = injected[0]?.result;
    if (!data || data.error) throw new Error(data?.error || 'No se obtuvo respuesta de Instagram.');
    unmatched = compare(data.followers, data.following);
    document.querySelector('#summary').textContent = `${data.username ? '@' + data.username : 'Tu cuenta'}: ${data.followers.length} seguidores, ${data.following.length} seguidos. ${unmatched.length} cuentas no te siguen de vuelta.`;
    status.textContent = 'Comparación finalizada. Las listas pueden cambiar durante la consulta.';
    render();
  } catch (error) {
    status.textContent = error.message || 'Falló la consulta. Comprueba la pestaña de Instagram.';
  } finally {
    busy = false;
    account.disabled = false;
    scan.disabled = !account.options.length;
  }
});
refresh().catch(error => { status.textContent = error.message; });
