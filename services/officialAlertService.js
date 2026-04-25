const { parseStringPromise } = require('xml2js');

const BASE_RSS_URL = 'https://sachet.ndma.gov.in/cap_public_website/rss';

const stateFeedNames = {
  Maharashtra: 'maharashtra',
  Gujarat: 'gujarat',
  Karnataka: 'karnataka',
  Kerala: 'kerala',
  'Tamil Nadu': 'tamilnadu',
  Delhi: 'delhi',
  Rajasthan: 'rajasthan',
  'West Bengal': 'westbengal'
};

const getText = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) return getText(value[0]);
  if (typeof value === 'object') return value._ || '';
  return String(value);
};

const stripHtml = (value) => getText(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const getFeedUrl = (state) => {
  const feedName = stateFeedNames[state];
  return `${BASE_RSS_URL}/${feedName ? `rss_${feedName}.xml` : 'rss_india.xml'}`;
};

const normalizeText = (value) => stripHtml(value).toLowerCase();

const dedupeAlerts = (alerts) => {
  const seen = new Set();

  return alerts.filter((alert) => {
    const normalizedTitle = normalizeText(alert.title);
    const normalizedDescription = normalizeText(alert.description);
    const dedupeKey = normalizedTitle || normalizedDescription;

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
};

const fetchOfficialAlerts = async (state) => {
  const feedUrl = getFeedUrl(state);

  try {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new Error(`SACHET feed returned ${response.status}`);
    }

    const xml = await response.text();
    const data = await parseStringPromise(xml, {
      explicitArray: true,
      trim: true
    });

    const items = data?.rss?.channel?.[0]?.item || [];

    const alerts = items.map((item, index) => ({
      id: encodeURIComponent(getText(item.guid) || getText(item.link) || `${state}-${index}`),
      title: getText(item.title) || 'Official Disaster Alert',
      description: stripHtml(item.description),
      link: getText(item.link),
      publishedAt: getText(item.pubDate),
      source: 'SACHET NDMA',
      state,
      feedUrl
    }));

    return dedupeAlerts(alerts);
  } catch (error) {
    console.error('Official alert fetch failed:', error.message);
    return [];
  }
};

module.exports = {
  fetchOfficialAlerts,
  getFeedUrl
};
