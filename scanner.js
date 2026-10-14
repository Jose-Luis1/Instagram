(async () => {
  // Runs in the Instagram tab's isolated world. Cookies stay in the browser.
  const request = async path => {
    const response = await fetch(path, { credentials: 'include', headers: { 'X-IG-App-ID': '936619743392459' } });
    if (response.status === 429) throw new Error('Instagram limitó las solicitudes. Espera y vuelve a intentarlo más tarde.');
    if (!response.ok) throw new Error(`Instagram rechazó la consulta (${response.status}). Revisa tu sesión; no se muestran resultados parciales.`);
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Instagram solicita iniciar sesión o cambió su respuesta. Abre Instagram y revisa tu sesión.');
    const data = await response.json();
    if (data.status && data.status !== 'ok') throw new Error('Instagram no permitió consultar las listas.');
    return data;
  };
  try {
    const identity = await request('/api/v1/accounts/current_user/?edit=true');
    const user = identity.user;
    if (!user?.pk || !user?.username) throw new Error('No se pudo identificar la cuenta activa. Inicia sesión en Instagram.');
    const readList = async kind => {
      const users = new Map();
      const cursors = new Set();
      let cursor = '';
      for (let page = 0; page < 500; page++) {
        const params = new URLSearchParams({ count: '50' });
        if (cursor) params.set('max_id', cursor);
        const data = await request(`/api/v1/friendships/${encodeURIComponent(user.pk)}/${kind}/?${params}`);
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
    return { username: user.username, followers, following };
  } catch (error) {
    return { error: error.message || 'No se pudo consultar Instagram.' };
  }
})();
