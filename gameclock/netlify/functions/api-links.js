const { getBlobStore } = require('./lib/blobs');
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
  const store = getBlobStore('linked-accounts');
  const key = `${steamid}.json`;

  if (event.httpMethod === 'GET') {
    const existing = (await store.get(key, { type: 'json' })) || {};
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
    const existing = (await store.get(key, { type: 'json' })) || {};

    if (body.fortniteName !== undefined) {
      existing.fortniteName = body.fortniteName ? String(body.fortniteName).slice(0, 60) : null;
    }
    if (body.riotGameName !== undefined || body.riotTagLine !== undefined || body.riotRegion !== undefined) {
      existing.riotGameName = body.riotGameName ? String(body.riotGameName).slice(0, 40) : null;
      existing.riotTagLine = body.riotTagLine ? String(body.riotTagLine).slice(0, 10) : null;
      existing.riotRegion = body.riotRegion ? String(body.riotRegion).slice(0, 10) : null;
    }

    await store.setJSON(key, existing);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing),
    };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
