const { buildLoginUrl } = require('./lib/steam');

exports.handler = async (event) => {
  const siteUrl = process.env.SITE_URL || `https://${event.headers.host}`;
  const returnTo = `${siteUrl}/.netlify/functions/auth-steam-callback`;
  const loginUrl = buildLoginUrl(returnTo, siteUrl);

  return {
    statusCode: 302,
    headers: { Location: loginUrl },
  };
};
