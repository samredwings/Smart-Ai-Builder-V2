export interface ScrapedWebPage {
  url: string;
  title: string;
  textContent: string;
  fetchedAt: string;
}

export const fetchAndParseWebLink = async (targetUrl: string): Promise<ScrapedWebPage> => {
  const formattedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

  const response = await fetch(formattedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Mobile; SmartAiBuilderV2) AppEngine/2.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch web link: HTTP ${response.status}`);
  }

  const rawHtml = await response.text();

  const titleMatch = rawHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Scraped Web Document';

  let cleanedText = rawHtml
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<svg\b[^<]*>([\s\S]*?)<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanedText.length > 12000) {
    cleanedText = cleanedText.substring(0, 12000) + '... [Truncated Content]';
  }

  return {
    url: formattedUrl,
    title,
    textContent: cleanedText,
    fetchedAt: new Date().toISOString(),
  };
};
