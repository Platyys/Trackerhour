const { getStore } = require('@netlify/blobs');
const { parseCookies, verify } = require('./lib/session');

exports.handler = async (event) => {
  const cookies = parseCookies(event.headers.cookie);
  const session = verify(cookies.session, process.env.SESSION_SECRET);

  if (!session || !session.steamid) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'not_authenticated' }),
    };
  }

  const steamid = session.steamid;
  const store = getStore('manual-entries');
  const key = `${steamid}.json`;

  if (event.httpMethod === 'GET') {
    const existing = (await store.get(key, { type: 'json' })) || { entries: [] };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing),
    };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
    }
    const { platform, game, hours } = body;
    if (!platform || !game || typeof hours !== 'number' || isNaN(hours) || hours < 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid_input' }) };
    }
    const existing = (await store.get(key, { type: 'json' })) || { entries: [] };
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      platform: String(platform).slice(0, 60),
      game: String(game).slice(0, 120),
      hours: Math.round(hours * 10) / 10,
    };
    existing.entries.push(entry);
    await store.setJSON(key, existing);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing),
    };
  }

  if (event.httpMethod === 'DELETE') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
    }
    const existing = (await store.get(key, { type: 'json' })) || { entries: [] };
    existing.entries = existing.entries.filter((e) => e.id !== body.id);
    await store.setJSON(key, existing);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing),
    };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
