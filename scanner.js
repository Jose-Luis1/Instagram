(async () => {
  // Runs in the Instagram tab's isolated world. Cookies stay in the browser.
  const cookie = name => {
    const entry = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
    return entry ? entry.slice(name.length + 1) : '';
  };
  const request = async (path, stage) => {
    const response = await fetch(path, { credentials: 'include', headers: { 'X-IG-App-ID': '936619743392459', 'X-Requested-With': 'XMLHttpRequest', ...(cookie('csrftoken') ? { 'X-CSRFToken': cookie('csrftoken') } : {}) } });
    if (response.status === 429) throw new Error('Instagram limitó las solicitudes. Espera y vuelve a intentarlo más tarde.');
    if (!response.ok) throw new Error(`Instagram rechazó la consulta de ${stage} (HTTP ${response.status}). No se muestran resultados parciales.`);
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(`La consulta de ${stage} recibió una página web en lugar de datos (HTTP ${response.status}${response.redirected ? ', con redirección' : ''}). Instagram puede haber bloqueado esta consulta o cambiado su API. No se muestran resultados parciales.`);
    const data = await response.json();
    if (data.status && data.status !== 'ok') throw new Error('Instagram no permitió consultar las listas.');
    return data;
  };
  try {
    // ds_user_id identifies the signed-in account without relying on the mobile current_user endpoint.
    // Read it only inside Instagram; do not send cookies to the extension or store them.
    const sessionId = cookie('ds_user_id');
    let user;
    if (/^\d+$/.test(sessionId)) {
      user = { pk: sessionId };
    } else {
      const identity = await request('/api/v1/accounts/current_user/?edit=true', 'la cuenta activa');
      user = identity.user;
    }
    if (!user?.pk) throw new Error('No se pudo identificar la cuenta activa. Inicia sesión en Instagram.');
    const readList = async kind => {
      const users = new Map();
      const cursors = new Set();
      let cursor = '';
      for (let page = 0; page < 500; page++) {
        const params = new URLSearchParams({ count: '50' });
        if (cursor) params.set('max_id', cursor);
        const data = await request(`/api/v1/friendships/${encodeURIComponent(user.pk)}/${kind}/?${params}`, kind === 'followers' ? 'seguidores' : 'seguidos');
        if (!Array.isArray(data.users) || data.users.some(item => !item.pk || !item.username)) throw new Error('Instagram cambió el formato de las listas. No se puede realizar una comparación confiable.');
        for (const item of data.users) users.set(String(item.pk), { pk: String(item.pk), username: item.username });
        if (data.has_more === true && !data.next_max_id) throw new Error('Instagram entregó una lista incompleta. Vuelve a intentarlo más tarde.');
        if (!data.next_max_id) return [...users.values()];
        cursor = String(data.next_max_id);
        if (cursors.has(cursor)) throw new Error('Instagram repitió una página. Se canceló la comparación para evitar resultados incompletos.');
        cursors.add(cursor);
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      throw new Error('La cuenta supera el límite de páginas de esta versión. No se muestran resultados parciales.');
    };
    const followers = await readList('followers');
    const following = await readList('following');
    return { username: user.username || null, followers, following };
  } catch (error) {
    return { error: error.message || 'No se pudo consultar Instagram.' };
  }
})();
