import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookText, Image, Search } from 'lucide-react';
import { api } from './api';
import './OxfordDictionary.css';

type Sense = { id: string; depth: number; definitions: string[]; examples: string[]; synonyms: string[]; antonyms: string[]; labels: string[] };
type Entry = { word: string; partOfSpeech: string; pronunciations: { spelling: string; notation: string; dialects: string[]; audioUrl: string | null }[]; senses: Sense[] };
type Result = { query: string; word: string; language: string; entries: Entry[]; thesaurus: Entry[]; synonymNote: string; attribution: string };
type Status = { configured: boolean; mode: string; note: string; languages: { id: string; label: string }[] };
type Picture = { imageUrl: string; title: string; description: string; artist: string; license: string; licenseUrl: string | null; sourceUrl: string; articleUrl: string };
type PictureResult = { picture: Picture | null; note: string };

export default function OxfordDictionary({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState('');
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [word, setWord] = useState('');
  const [language, setLanguage] = useState('en-gb');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [picture, setPicture] = useState<PictureResult | null>(null);
  const [pictureError, setPictureError] = useState('');
  const [pictureBusy, setPictureBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const lookupRequest = useRef<AbortController | null>(null);
  const pictureRequest = useRef<AbortController | null>(null);
  const profile = encodeURIComponent(userId);
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null); setStatusError('');
    api<Status>(`/dictionary/oxford/status?userId=${profile}`, { signal: controller.signal }).then(setStatus).catch((err: Error) => { if (!controller.signal.aborted) setStatusError(err.message); });
    return () => controller.abort();
  }, [profile, statusAttempt]);
  useEffect(() => () => { lookupRequest.current?.abort(); pictureRequest.current?.abort(); }, []);
  function reset() {
    lookupRequest.current?.abort(); pictureRequest.current?.abort();
    setBusy(false); setPictureBusy(false); setResult(null); setPicture(null); setError(''); setPictureError('');
  }
  async function findPicture(value: string) {
    if (!value.trim()) return;
    pictureRequest.current?.abort();
    const controller = new AbortController(); pictureRequest.current = controller;
    setPictureBusy(true); setPicture(null); setPictureError(''); setImageFailed(false);
    try { const next = await api<PictureResult>(`/dictionary/picture?${new URLSearchParams({ userId, word: value })}`, { signal: controller.signal }); if (!controller.signal.aborted) setPicture(next); }
    catch (err) { if (!controller.signal.aborted) setPictureError((err as Error).message); }
    finally { if (!controller.signal.aborted) setPictureBusy(false); }
  }
  async function lookup(event: FormEvent) {
    event.preventDefault();
    if (!status?.configured || !word.trim() || busy) return;
    reset();
    const controller = new AbortController(); lookupRequest.current = controller;
    setBusy(true);
    try {
      const next = await api<Result>(`/dictionary/oxford?${new URLSearchParams({ userId, word, language })}`, { signal: controller.signal });
      if (!controller.signal.aborted) { setResult(next); void findPicture(next.word); }
    } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="oxford-dictionary" aria-labelledby="oxford-heading">
    <div className="oxford-heading"><span className="oxford-icon"><BookText size={25} /></span><div><span className="oxford-eyebrow">WORDS TO EXPLORE</span><h2 id="oxford-heading">Oxford English dictionary</h2><p>Meanings, synonyms, examples and pronunciation — with related pictures.</p></div></div>
    {statusError && <div className="oxford-notice" role="alert">{statusError}<button className="button secondary" onClick={() => setStatusAttempt((n) => n + 1)}>Retry dictionary connection</button></div>}
    {!status && !statusError && <p className="oxford-notice" role="status">Checking Oxford access…</p>}
    {status && !status.configured && <p className="oxford-notice" role="status">Oxford access is waiting for activation. Ask your tutor to enable the dictionary. You can explore related pictures and topic meanings below.</p>}
    {status?.mode === 'sandbox' && <p className="oxford-notice">{status.note}</p>}
    <form className="oxford-form" onSubmit={lookup}>
      <label className="oxford-word">English word or phrase<div><Search size={18} /><input aria-label="Oxford English word" value={word} maxLength={80} onChange={(e) => { reset(); setWord(e.target.value); }} placeholder="Try apple, curious or running…" autoComplete="off" /></div></label>
      <label>Dictionary<select aria-label="Oxford English variant" value={language} onChange={(e) => { reset(); setLanguage(e.target.value); }}><option value="en-gb">British English</option><option value="en-us">American English</option></select></label>
      <button className="button primary" disabled={!status?.configured || !word.trim() || busy} type="submit">{busy ? 'Looking up…' : 'Look up word'}</button>
      <button className="button secondary" disabled={!word.trim() || pictureBusy || busy} type="button" onClick={() => void findPicture(word)}><Image size={15} />Find a picture</button>
    </form>
    {error && <p className="oxford-notice" role="alert">{error}</p>}
    {busy && <p className="oxford-notice" role="status">Opening the Oxford entry…</p>}
    {(result || picture || pictureBusy || pictureError) && <div className={`oxford-result-layout ${!result ? 'picture-only' : ''}`}>
      <div className="oxford-definitions">
        {result && <><div className="oxford-result-title"><h3>{result.word}</h3><span>{result.language === 'en-gb' ? 'British English' : 'American English'}</span></div><h4>Meanings & examples</h4>
          {result.entries.map((entry, i) => <article className="oxford-entry" key={i}><h4>{entry.word} <span>{entry.partOfSpeech}</span></h4>
            {entry.pronunciations.map((p, j) => <div className="oxford-pronunciation" key={j}>{p.spelling && <span>{p.notation} /{p.spelling}/ {p.dialects.join(', ')}</span>}{p.audioUrl && <audio aria-label={`Pronunciation of ${entry.word} ${j + 1}`} controls preload="none" src={p.audioUrl} />}</div>)}
            <ol>{entry.senses.map((sense, j) => <li className={sense.depth ? 'oxford-subsense' : ''} key={j}>{sense.labels.length > 0 && <small>{sense.labels.join(' · ')}</small>}{sense.definitions.map((definition, k) => <p key={k}>{definition}</p>)}{sense.examples.map((example, k) => <blockquote key={k}>{example}</blockquote>)}<RelatedWords title="Synonyms" words={sense.synonyms} /><RelatedWords title="Antonyms" words={sense.antonyms} /></li>)}</ol>
          </article>)}
          <section className="oxford-thesaurus" aria-label="Oxford synonyms and antonyms"><h4>Synonyms & antonyms</h4>{result.synonymNote && <p>{result.synonymNote}</p>}{result.thesaurus.map((entry, i) => <article key={i}><h4>{entry.word} <span>{entry.partOfSpeech}</span></h4>{entry.senses.map((sense, j) => <div className="oxford-synonym-sense" key={j}>{sense.definitions.map((definition, k) => <p key={k}>{definition}</p>)}{sense.examples.map((example, k) => <blockquote key={k}>{example}</blockquote>)}<RelatedWords title="Synonyms" words={sense.synonyms} /><RelatedWords title="Antonyms" words={sense.antonyms} /></div>)}</article>)}{!result.thesaurus.length && !result.synonymNote && <p>No additional synonyms returned for this word.</p>}</section>
          <p className="oxford-attribution">{result.attribution} <a href="https://developer.oxforddictionaries.com/" target="_blank" rel="noreferrer">Oxford Dictionaries</a></p>
        </>}
      </div>
      <aside className="oxford-picture" aria-label="Related word picture"><h4><Image size={17} />Related picture</h4>{pictureBusy && <p role="status">Finding a freely licensed picture…</p>}{pictureError && <p role="alert">{pictureError}</p>}{picture && <><p>{picture.note}</p>{picture.picture && <figure>{!imageFailed ? <img src={picture.picture.imageUrl} alt={picture.picture.description || `Related article picture: ${picture.picture.title}`} onError={() => setImageFailed(true)} loading="lazy" referrerPolicy="no-referrer" /> : <p>Picture could not load. Open its source below.</p>}<figcaption><strong>{picture.picture.title}</strong><details><summary>Picture credit &amp; license</summary><p>{picture.picture.artist}</p><p>{picture.picture.licenseUrl ? <a href={picture.picture.licenseUrl} target="_blank" rel="noreferrer">{picture.picture.license}</a> : picture.picture.license}</p></details><a href={picture.picture.sourceUrl} target="_blank" rel="noreferrer">Picture source · Wikimedia Commons</a><a href={picture.picture.articleUrl} target="_blank" rel="noreferrer">Related Wikipedia article</a></figcaption></figure>}</>}{!pictureBusy && !picture && !pictureError && <p>No picture loaded.</p>}</aside>
    </div>}
  </section>;
}
function RelatedWords({ title, words }: { title: string; words: string[] }) {
  return words.length ? <div className="oxford-related"><strong>{title}</strong><div>{[...new Set(words)].map((word) => <span key={word}>{word}</span>)}</div></div> : null;
}
