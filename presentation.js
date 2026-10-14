export function avatarUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const domains = ['cdninstagram.com', 'fbcdn.net', 'instagram.com'];
    return domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ? url.href : null;
  } catch { return null; }
}
export function filterAccounts(users, query, sort = 'asc') {
  const term = query.trim().toLocaleLowerCase();
  const filtered = users.filter(user => `${user.username} ${user.full_name || ''}`.toLocaleLowerCase().includes(term));
  return filtered.sort((a, b) => (sort === 'desc' ? -1 : 1) * a.username.localeCompare(b.username));
}
export function toCsv(users) {
  const cell = value => {
    let text = String(value || '');
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + ['Usuario,Nombre,Perfil', ...users.map(user => [user.username, user.full_name, `https://www.instagram.com/${encodeURIComponent(user.username)}/`].map(cell).join(','))].join('\r\n');
}
