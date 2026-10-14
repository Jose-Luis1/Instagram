import { compare } from './compare.js';
import { avatarUrl, filterAccounts, toCsv } from './presentation.js';
const $ = selector => document.querySelector(selector);
const account = $('#account');
const scan = $('#scan');
const refreshButton = $('#refresh');
const search = $('#search');
const sort = $('#sort');
const exportButton = $('#export');
let unmatched = [];
let busy = false;
let completed = false;
let shown = 60;
function setStatus(message, state = 'idle') {
  $('#status').textContent = message;
  $('#status-box').dataset.state = state;
  $('#status-symbol').textContent = state === 'error' ? '!' : state === 'success' ? '✓' : '✦';
}
async function refresh() {
  const previous = account.value;
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
  account.replaceChildren();
  for (const tab of tabs) {
    const option = document.createElement('option');
    option.value = String(tab.id);
    option.textContent = tab.title || 'Instagram';
    account.append(option);
  }
  if ([...account.options].some(option => option.value === previous)) account.value = previous;
  scan.disabled = busy || !tabs.length;
  if (!tabs.length) setStatus('Abre Instagram e inicia sesión; luego pulsa Actualizar.');
  else if (!completed) setStatus('Cuenta lista para consultar. Pulsa Comparar mis listas.');
}
function render() {
  const results = $('#results');
  results.replaceChildren();
  const filtered = filterAccounts(unmatched, search.value, sort.value);
  $('#result-badge').textContent = unmatched.length.toLocaleString();
  $('#visible-count').textContent = completed && filtered.length ? `Mostrando ${Math.min(shown, filtered.length)} de ${filtered.length} cuentas${search.value.trim() ? ' que coinciden con tu búsqueda' : ''}` : '';
  $('#empty').hidden = filtered.length > 0;
  $('#more').hidden = filtered.length <= shown;
  if (busy) {
    $('#empty-title').textContent = 'Estamos revisando tu círculo';
    $('#empty-description').textContent = 'Las cuentas grandes pueden tardar varios minutos. Mantén abierta la pestaña de Instagram.';
  } else if (completed) {
    $('#empty-title').textContent = unmatched.length ? 'No encontramos coincidencias' : '¡El seguimiento es mutuo!';
    $('#empty-description').textContent = unmatched.length ? 'Prueba con otro nombre o borra la búsqueda.' : 'Todas las cuentas que sigues aparecen en tu lista de seguidores.';
  } else {
    $('#empty-title').textContent = 'Tu círculo empieza aquí';
    $('#empty-description').textContent = 'Pulsa Comparar mis listas para ver los resultados. Solo consultamos información; no dejamos de seguir cuentas.';
  }
  for (const user of filtered.slice(0, shown)) {
    const li = document.createElement('li');
    li.className = 'account-card';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = user.username.slice(0, 2).toUpperCase();
    const photo = avatarUrl(user.profile_pic_url);
    if (photo) {
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.remove(), { once: true });
      img.src = photo;
      avatar.append(img);
    }
    const info = document.createElement('div');
    info.className = 'account-info';
    const link = document.createElement('a');
    link.className = 'profile-link';
    link.href = `https://www.instagram.com/${encodeURIComponent(user.username)}/`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `@${user.username}`;
    link.title = link.textContent;
    const name = document.createElement('span');
    name.className = 'full-name';
    name.textContent = user.full_name || 'Cuenta de Instagram';
    info.append(link, name);
    const arrow = document.createElement('a');
    arrow.className = 'profile-arrow';
    arrow.href = link.href;
    arrow.target = '_blank';
    arrow.rel = 'noopener noreferrer';
    arrow.setAttribute('aria-label', `Abrir el perfil de ${user.username}`);
    arrow.textContent = '↗';
    li.append(avatar, info, arrow);
    results.append(li);
  }
}
refreshButton.addEventListener('click', () => refresh().catch(error => setStatus(error.message, 'error')));
for (const control of [search, sort]) control.addEventListener(control === search ? 'input' : 'change', () => { shown = 60; render(); });
$('#more').addEventListener('click', () => { shown += 60; render(); });
exportButton.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([toCsv(filterAccounts(unmatched, search.value, sort.value))], {type: 'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `no-te-siguen-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
scan.addEventListener('click', async () => {
  busy = true;
  completed = false;
  for (const control of [scan, account, refreshButton, search, sort, exportButton]) control.disabled = true;
  $('#scan-label').textContent = 'Comparando…';
  unmatched = [];
  shown = 60;
  search.value = '';
  for (const id of ['followers-count', 'following-count', 'unmatched-count', 'mutual-count']) $(`#${id}`).textContent = '—';
  $('#summary').textContent = 'Consultando las listas completas de tu cuenta.';
  setStatus('Puede tardar varios minutos. Mantén abiertas esta pestaña e Instagram.', 'loading');
  render();
  try {
    const injected = await chrome.scripting.executeScript({ target: { tabId: Number(account.value) }, files: ['scanner.js'] });
    const data = injected[0]?.result;
    if (!data || data.error) throw new Error(data?.error || 'No se obtuvo respuesta de Instagram.');
    unmatched = compare(data.followers, data.following);
    completed = true;
    const numbers = [data.followers.length, data.following.length, unmatched.length, data.following.length - unmatched.length];
    ['followers-count', 'following-count', 'unmatched-count', 'mutual-count'].forEach((id, index) => { $(`#${id}`).textContent = numbers[index].toLocaleString(); });
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    $('#summary').textContent = `${data.username ? '@' + data.username : 'Tu cuenta'} · Última comparación a las ${time}.`;
    setStatus('Comparación finalizada. Las listas pueden cambiar durante la consulta.', 'success');
  } catch (error) {
    setStatus(error.message || 'Falló la consulta. Comprueba la pestaña de Instagram.', 'error');
    $('#summary').textContent = 'No se pudo completar la comparación. No se muestran resultados parciales.';
  } finally {
    busy = false;
    account.disabled = false;
    refreshButton.disabled = false;
    scan.disabled = !account.options.length;
    search.disabled = sort.disabled = !completed;
    exportButton.disabled = !completed || !unmatched.length;
    $('#scan-label').textContent = completed ? 'Volver a comparar' : 'Comparar mis listas';
    render();
  }
});
refresh().catch(error => setStatus(error.message, 'error'));
