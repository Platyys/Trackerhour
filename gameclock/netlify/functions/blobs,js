const { getStore } = require('@netlify/blobs');

function getBlobStore(name) {
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) {
    return getStore({
      name,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN,
    });
  }
  return getStore(name);
}

module.exports = { getBlobStore };
