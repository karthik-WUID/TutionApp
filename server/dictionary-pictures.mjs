import { dictionaryWord, readDictionaryJson, safeDictionaryUrl } from './oxford-dictionary.mjs';
const plain = (value) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim() : '';
// Related article pictures are separate from Oxford definitions and are not sense matches.
export function createDictionaryPictureProvider({ fetchImpl = fetch } = {}) {
  async function request(host, parameters) {
    const response = await fetchImpl(`https://${host}/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...parameters })}`, { headers: { 'User-Agent': 'SmartTutor/0.1 (local classroom dictionary pictures)', Accept: 'application/json' }, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) { await response.body?.cancel(); throw new Error('Pictures unavailable'); }
    const data = await readDictionaryJson(response);
    if (data.error || !Array.isArray(data.query?.pages)) throw new Error('Invalid picture result');
    return data.query.pages[0];
  }
  return { async lookup(input) {
    const word = dictionaryWord(input);
    const none = { picture: null, source: 'Wikimedia Commons', note: 'No freely licensed related picture is available for this word.' };
    const page = await request('en.wikipedia.org', { titles: word[0].toUpperCase() + word.slice(1), redirects: '1', prop: 'pageimages|pageprops', piprop: 'thumbnail|name', pithumbsize: '600', pilicense: 'free', ppprop: 'disambiguation' });
    const imageUrl = safeDictionaryUrl(page?.thumbnail?.source, ['upload.wikimedia.org', 'thumb.wikimedia.org']);
    if (!imageUrl || !page.pageimage || Object.hasOwn(page.pageprops || {}, 'disambiguation')) return none;
    const file = await request('commons.wikimedia.org', { titles: `File:${page.pageimage}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiextmetadatalanguage: 'en' });
    const info = file?.imageinfo?.[0], meta = info?.extmetadata || {};
    const sourceUrl = safeDictionaryUrl(info?.descriptionurl, ['commons.wikimedia.org']);
    const license = plain(meta.LicenseShortName?.value), artist = plain(meta.Artist?.value);
    if (!sourceUrl || !license || !artist) return none;
    const licenseUrl = safeDictionaryUrl(typeof meta.LicenseUrl?.value === 'string' ? meta.LicenseUrl.value.replace(/^http:/, 'https:').replace(/^\/\//, 'https://') : '', ['creativecommons.org', 'commons.wikimedia.org', 'www.gnu.org']);
    return { picture: { imageUrl, title: plain(page.title), description: plain(meta.ImageDescription?.value), artist, license, licenseUrl, sourceUrl, articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}` }, source: 'Wikimedia Commons', note: 'A related article picture; it may illustrate only one meaning. Pictures are separate from Oxford content.' };
  } };
}
