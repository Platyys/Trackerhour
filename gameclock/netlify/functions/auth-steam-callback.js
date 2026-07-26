const { verifyCallback } = require('./lib/steam');
const { sign, DEFAULT_MAX_AGE_SECONDS } = require('./lib/session');

exports.handler = async (event) => {
  const siteUrl = process.env.SITE_URL || `https://${event.headers.host}`;
  const params = event.queryStringParameters || {};

  let steamid = null;
  try {
    steamid = await verifyCallback(params);
  } catch (e) {
    steamid = null;
  }

  if (!steamid) {
    return { statusCode: 302, headers: { Location: `${siteUrl}/index.html?error=auth_failed` } };
  }

  if (!process.env.SESSION_SECRET) {
    return {
      statusCode: 500,
      body: 'SESSION_SECRET manquant dans les variables d\'environnement Netlify.',
    };
  }

  const token = sign({ steamid }, process.env.SESSION_SECRET);
  const cookie = `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${DEFAULT_MAX_AGE_SECONDS}`;

  return {
    statusCode: 302,
    headers: {
      Location: `${siteUrl}/app.html`,
      'Set-Cookie': cookie,
    },
  };
};
