const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

function buildLoginUrl(returnTo, realm) {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

// Re-post the callback params back to Steam with mode=check_authentication
// to make sure the response wasn't spoofed. Returns the verified steamid64, or null.
async function verifyCallback(queryParams) {
  if (!queryParams || queryParams['openid.mode'] !== 'id_res') return null;

  const verifyParams = new URLSearchParams();
  for (const [k, v] of Object.entries(queryParams)) {
    if (k.startsWith('openid.')) verifyParams.set(k, v);
  }
  verifyParams.set('openid.mode', 'check_authentication');

  const resp = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  });
  const text = await resp.text();
  if (!/is_valid\s*:\s*true/.test(text)) return null;

  const claimedId = queryParams['openid.claimed_id'] || '';
  const match = claimedId.match(/(\d{17})\/?$/);
  return match ? match[1] : null;
}

async function fetchSteamData(steamid, apiKey) {
  const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamid}&include_appinfo=1&include_played_free_games=1&format=json`;
  const playerUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamid}`;

  const [gamesRes, playerRes] = await Promise.all([fetch(gamesUrl), fetch(playerUrl)]);

  if (!gamesRes.ok) throw new Error(`Steam GetOwnedGames failed: ${gamesRes.status}`);
  if (!playerRes.ok) throw new Error(`Steam GetPlayerSummaries failed: ${playerRes.status}`);

  const gamesJson = await gamesRes.json();
  const playerJson = await playerRes.json();

  return {
    games: (gamesJson.response && gamesJson.response.games) || [],
    game_count: (gamesJson.response && gamesJson.response.game_count) || 0,
    player: (playerJson.response && playerJson.response.players && playerJson.response.players[0]) || null,
  };
}

module.exports = { buildLoginUrl, verifyCallback, fetchSteamData };
