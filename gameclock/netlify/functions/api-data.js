const { getBlobStore } = require('./lib/blobs');const { parseCookies, verify } = require('./lib/session');
const { fetchSteamData } = require('./lib/steam');

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
const store = getBlobStore('snapshots');  const key = `${steamid}.json`;

  let history = [];
  try {
    const existing = await store.get(key, { type: 'json' });
    if (existing && Array.isArray(existing.snapshots)) {
      history = existing.snapshots;
    }
  } catch (e) {
    history = [];
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const last = history[history.length - 1];
  let didRefresh = false;
  let fetchError = null;

  // Only hit the Steam API (and write a new snapshot) once per day per user,
  // unless force=1 is passed in the query string.
  const forceRefresh = event.queryStringParameters && event.queryStringParameters.force === '1';

  if (!last || last.date !== todayStr || forceRefresh) {
    try {
      const fresh = await fetchSteamData(steamid, process.env.STEAM_API_KEY);
      const snapshot = {
        date: todayStr,
        game_count: fresh.game_count,
        total_minutes: fresh.games.reduce((s, g) => s + (g.playtime_forever || 0), 0),
        games: fresh.games.map((g) => ({
          appid: g.appid,
          name: g.name,
          playtime_forever: g.playtime_forever || 0,
          playtime_2weeks: g.playtime_2weeks || 0,
          rtime_last_played: g.rtime_last_played || 0,
        })),
        player: fresh.player,
      };
      if (last && last.date === todayStr) {
        history[history.length - 1] = snapshot;
      } else {
        history.push(snapshot);
      }
      await store.setJSON(key, { snapshots: history });
      didRefresh = true;
    } catch (e) {
      fetchError = e.message;
      // fall through and serve whatever cached history we already have
    }
  }

  if (history.length === 0) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'steam_fetch_failed', detail: fetchError }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steamid, history, didRefresh, fetchError }),
  };
};
