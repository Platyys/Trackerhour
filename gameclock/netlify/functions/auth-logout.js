exports.handler = async (event) => {
  const siteUrl = process.env.SITE_URL || `https://${event.headers.host}`;
  return {
    statusCode: 302,
    headers: {
      Location: `${siteUrl}/index.html`,
      'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  };
};
