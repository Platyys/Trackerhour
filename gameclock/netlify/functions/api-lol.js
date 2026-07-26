const { getBlobStore } = require('./lib/blobs');
const { parseCookies, verify } = require('./lib/session');
const { fetchRiotStats } = require('./lib/riot');

const CACHE_MINUTES = 15;

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
  const linksStore = getBlobStore('linked-accounts');
  const links = (await linksStore.get(`${steamid}.json`, { type: 'json' })) || {};

  if (!links.riotGameName || !links.riotTagLine || !links.riotRegion) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linked: false }),
    };
  }

  const cacheStore = getBlobStore('lol-cache');
  const cacheKey = `${steamid}.json`;
  const forceRefresh = event.queryStringParameters && event.queryStringParameters.force === '1';

  const cached = await cacheStore.get(cacheKey, { type: 'json' });
  const cacheAgeMs = cached ? Date.now() - cached.fetchedAt : Infinity;

  if (cached && !forceRefresh && cacheAgeMs < CACHE_MINUTES * 60 * 1000) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linked: true, stats: cached.stats, cached: true }),
    };
  }

  try {
    const stats = await fetchRiotStats(links.riotGameName, links.riotTagLine, links.riotRegion, process.env.RIOT_API_KEY);
    await cacheStore.setJSON(cacheKey, { stats, fetchedAt: Date.now() });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linked: true, stats, cached: false }),
    };
  } catch (e) {
    if (cached) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linked: true, stats: cached.stats, cached: true, fetchError: e.message }),
      };
    }
    return {
      statusCode: e.code === 'not_found' ? 404 : 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linked: true, error: e.code || 'fetch_failed', detail: e.message }),
    };
  }
};
