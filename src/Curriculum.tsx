import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, FileText, Play, RefreshCw, Search } from 'lucide-react';
import { api } from './api';
import type { CurriculumDetail, CurriculumDirectory, CurriculumMeta, CurriculumResource, LearningData, User } from './types';
import './Curriculum.css';

type Props = { me: User; search: string; onToast: (text: string, error?: boolean) => void };
const ResourceIcon = ({ format }: { format: CurriculumResource['format'] }) => format === 'video' ? <Play size={22} /> : format === 'pdf' ? <FileText size={22} /> : <BookOpen size={22} />;
const checkedAt = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

export default function Curriculum({ me, search, onToast }: Props) {
  const [meta, setMeta] = useState<CurriculumMeta | null>(null);
  const [board, setBoard] = useState('CBSE');
  const [grade, setGrade] = useState(10);
  const [medium, setMedium] = useState('English');
  const [kind, setKind] = useState<'textbooks' | 'lessons'>('textbooks');
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [directory, setDirectory] = useState<CurriculumDirectory | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [initReload, setInitReload] = useState(0);
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [detail, setDetail] = useState<CurriculumDetail | null>(null);
  const [detailError, setDetailError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api<CurriculumMeta>(`/curriculum?userId=${me.id}`, { signal: controller.signal }), api<LearningData>(`/learning?userId=${me.id}`, { signal: controller.signal })])
      .then(([next, learning]) => { setBoard(next.boards.some((b) => b.id === learning.preferences.board) ? learning.preferences.board : 'CBSE'); setGrade(learning.preferences.grade); setMeta(next); setError(''); })
      .catch((err: Error) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [me.id, initReload]);
  useEffect(() => {
    const next = search.trim().slice(0, 160);
    if (next === query) return;
    const timer = setTimeout(() => { setQuery(next); setOffset(0); setHistory([]); }, 300);
    return () => clearTimeout(timer);
  }, [search, query]);
  useEffect(() => {
    if (!meta) return;
    const controller = new AbortController();
    setLoading(true); setDirectory(null); setError('');
    const params = new URLSearchParams({ userId: me.id, board, grade: String(grade), medium, kind, subject, q: query, offset: String(offset) });
    api<CurriculumDirectory>(`/curriculum/directory?${params}`, { signal: controller.signal })
      .then((next) => { setDirectory(next); if (!subject) setSubjects(next.subjects); })
      .catch((err: Error) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [meta, me.id, board, grade, medium, kind, subject, query, offset, refresh]);
  const selected = history.at(-1);
  const rootId = history[0]?.id;
  useEffect(() => {
    if (!selected) { setDetail(null); setDetailError(''); return; }
    const controller = new AbortController();
    setDetail(null); setDetailError('');
    api<CurriculumDetail>(`/curriculum/resources/${selected.id}?userId=${me.id}&rootId=${rootId}&grade=${grade}`, { signal: controller.signal })
      .then(setDetail).catch((err: Error) => { if (!controller.signal.aborted) setDetailError(err.message); });
    return () => controller.abort();
  }, [selected?.id, rootId, me.id, grade, refresh]);
  const activeBoard = meta?.boards.find((b) => b.id === board);
  const isCollins = activeBoard?.source === 'Collins';
  const source = activeBoard?.source || 'DIKSHA';
  const availableSubjects = [...new Set([...(meta?.subjectGroups.map((s) => s.id) || []), ...subjects, ...(subject ? [subject] : [])])];
  const reset = () => { setOffset(0); setSubject(''); setSubjects([]); setHistory([]); };
  const open = (item: CurriculumResource) => setHistory((previous) => [...previous, { id: item.id, title: item.title }]);
  async function savePreferences() {
    setSaving(true);
    try { await api('/learning/preferences', { method: 'POST', body: JSON.stringify({ userId: me.id, board, grade }) }); onToast('Class and board saved for your learning path.'); }
    catch (err) { onToast((err as Error).message, true); }
    finally { setSaving(false); }
  }
  return <div className="curriculum-page">
    <section className="curriculum-intro"><span className="curriculum-mark"><BookOpen size={28} /></span><div><p className="eyebrow">FROM THE PUBLISHERS</p><h2>Your syllabus. Your next discovery.</h2><p>Explore Social Studies, Tamil, Computer Science and Value Education, alongside your other subjects.</p></div><span className="curriculum-source">{source} resources</span></section>
    {!meta ? <div className="analytics-card"><p role={error ? 'alert' : 'status'}>{error || 'Opening the curriculum directory…'}</p>{error && <button className="button secondary" onClick={() => setInitReload((x) => x + 1)}>Try again</button>}</div> : <>
      <div className="curriculum-filters">
        <label>Board / publisher<select aria-label="Curriculum board" value={board} onChange={(e) => { setBoard(e.target.value); setMedium('English'); if (e.target.value === 'Matriculation / Collins') setKind('textbooks'); reset(); }}>{meta.boards.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
        <label>Class<select aria-label="Curriculum class" value={grade} onChange={(e) => { setGrade(Number(e.target.value)); reset(); }}>{meta.grades.map((g) => <option key={g} value={g}>Class {g}</option>)}</select></label>
        <label>Medium<select aria-label="Curriculum medium" disabled={isCollins} value={medium} onChange={(e) => { setMedium(e.target.value); reset(); }}>{activeBoard?.mediums.map((m) => <option key={m} value={m}>{isCollins ? 'Publisher catalogue' : m}</option>)}</select></label>
        <label>Subject<select aria-label="Curriculum subject" value={subject} onChange={(e) => { setSubject(e.target.value); setOffset(0); setHistory([]); }}><option value="">All subjects</option>{availableSubjects.map((s) => <option key={s} value={s}>{s.replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}</select></label>
        <button className="button secondary" disabled={saving} onClick={() => void savePreferences()}>{saving ? 'Saving…' : 'Use for my learning path'}</button>
      </div>
      <section className="curriculum-subject-focus" aria-label="Browse featured subjects"><div>{meta.subjectGroups.filter((group) => group.id !== 'Tamil').map((group) => <button key={group.id} className={`button secondary ${subject === group.id ? 'active' : ''}`} aria-pressed={subject === group.id} onClick={() => { setSubject(group.id); setOffset(0); setHistory([]); }}>{group.label}</button>)}<button className={`button secondary ${subject === 'Tamil' && board === 'Tamil Nadu State Board' ? 'active' : ''}`} aria-pressed={subject === 'Tamil' && board === 'Tamil Nadu State Board'} onClick={() => { setBoard('Tamil Nadu State Board'); setMedium('Tamil'); setSubject('Tamil'); setSubjects([]); setOffset(0); setHistory([]); }}>Tamil syllabus (Tamil Nadu)</button></div><p>Social Studies includes History, Geography, Civics and Economics. Tamil syllabus opens the Tamil subject in Tamil medium. Resource availability varies by class and publisher.</p></section>
      {activeBoard && <section className="curriculum-official"><div><h3>Official syllabus & textbook directories</h3><p>{activeBoard.syllabusNote}</p></div><div><a href={activeBoard.syllabusUrl} target="_blank" rel="noopener noreferrer">{isCollins ? 'Collins school catalogue' : board === 'CBSE' ? 'CBSE syllabus 2026–27' : 'Tamil Nadu SCERT'}<ExternalLink size={14} /></a><a href={activeBoard.textbookUrl} target="_blank" rel="noopener noreferrer">{isCollins ? 'Collins book directory' : board === 'CBSE' ? 'NCERT textbooks' : 'Tamil Nadu textbooks & lessons'}<ExternalLink size={14} /></a>{activeBoard.extraLinks?.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={14} /></a>)}</div></section>}
      <div className="curriculum-toolbar"><div className="status-tabs" aria-label="Curriculum resource type">{(activeBoard?.kinds || ['textbooks', 'lessons']).map((k) => <button key={k} aria-pressed={kind === k} className={kind === k ? 'selected' : ''} onClick={() => { setKind(k); setOffset(0); setHistory([]); }}>{k === 'textbooks' ? isCollins ? 'Book series catalogue' : 'Textbook directory' : 'Lessons & videos'}</button>)}</div><button className="button secondary" onClick={() => setRefresh((x) => x + 1)} aria-label="Retry curriculum request"><RefreshCw size={14} />Reload</button></div>
      {selected ? <section className="curriculum-detail"><button className="lesson-back" onClick={() => setHistory((previous) => previous.slice(0, -1))}><ArrowLeft size={15} />{history.length > 1 ? 'Back to textbook section' : 'Back to directory'}</button><nav className="curriculum-breadcrumbs" aria-label="Textbook sections">{history.map((entry, i) => <button key={`${entry.id}-${i}`} onClick={() => setHistory(history.slice(0, i + 1))} aria-current={i === history.length - 1 ? 'page' : undefined}>{entry.title}</button>)}</nav>
        {!detail ? <p role={detailError ? 'alert' : 'status'}>{detailError || 'Opening this resource…'}</p> : <><div className="curriculum-detail-head"><span className="curriculum-resource-icon"><ResourceIcon format={detail.item.format} /></span><div><span className="curriculum-kicker">{detail.item.category}</span><h2>{detail.item.title}</h2><p>{[...detail.item.grades, ...detail.item.mediums, ...detail.item.subjects].join(' · ')}</p></div><a className="button secondary" href={detail.item.sourceUrl} target="_blank" rel="noopener noreferrer">Open on {detail.source}<ExternalLink size={14} /></a></div>
          {detail.stale && <p role="status" className="curriculum-notice">{detail.source} is unavailable. Showing the copy last checked on {checkedAt(detail.fetchedAt)}.</p>}
          {detail.note && <p className="curriculum-notice">{detail.note}</p>}
          {detail.item.description && <p className="curriculum-description">{detail.item.description}</p>}
          {detail.item.mediaUrl && detail.item.format === 'video' && <video key={detail.item.id} className="curriculum-video" src={detail.item.mediaUrl} controls playsInline preload="metadata" onError={() => setDetailError('The video could not play here. Use “Open on DIKSHA” to continue.')} />}
          {detail.item.mediaUrl && detail.item.format === 'pdf' && <><iframe className="curriculum-pdf" title={detail.item.title} src={detail.item.mediaUrl} /><a className="curriculum-download" href={detail.item.mediaUrl} target="_blank" rel="noopener noreferrer">Open textbook PDF<ExternalLink size={14} /></a></>}
          {detailError && <p role="alert">{detailError}</p>}
          {!!detail.children.length && <><h3>{detail.source === 'Collins' ? `Books for Class ${grade} in this series` : 'Chapters & learning resources'}</h3><div className="curriculum-chapters">{detail.children.map((child) => child.format === 'link' ? <a key={child.id} href={child.sourceUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={18} /><span>{child.title}</span><ExternalLink size={16} /></a> : <button key={child.id} onClick={() => open(child)}><BookOpen size={18} /><span>{child.title}</span><ArrowRight size={16} /></button>)}</div></>}
          {!detail.children.length && !detail.item.mediaUrl && <div className="curriculum-notice">{detail.source === 'Collins' ? 'No individual book for this class is listed here. Open the series on Collins to confirm its class range and available editions.' : 'This resource uses DIKSHA’s interactive player. Choose “Open on DIKSHA” to study it.'}</div>}
          <p className="curriculum-attribution">Source: {detail.source}{detail.item.creator && ` · ${detail.item.creator}`}{detail.item.license && ` · ${detail.item.license}`}<br />Publisher resources may include earlier editions. Use your school’s assigned book and current syllabus.</p>
        </>}{detailError && !detail && <button className="button secondary" onClick={() => setRefresh((x) => x + 1)}>Try again</button>}</section> : <>
        <div className="curriculum-summary"><p><strong>{activeBoard?.label} · Class {grade}{!isCollins && ` · ${medium}`}{subject && ` · ${subject}`}</strong>{query && ` · “${query}”`}</p><span>{directory ? `${directory.total.toLocaleString('en-IN')} ${isCollins ? 'book series' : 'resources'}` : loading ? `Searching ${source}…` : ''}</span></div>
        {error && <div className="curriculum-notice" role="alert"><p>{error}</p><button className="button secondary" onClick={() => setRefresh((x) => x + 1)}>Try again</button>{activeBoard && <a href={activeBoard.sourceUrl} target="_blank" rel="noopener noreferrer">Open official directory<ExternalLink size={14} /></a>}</div>}
        {loading && <div className="analytics-card" role="status">Finding {kind === 'textbooks' ? 'textbooks' : 'lessons'} for your class…</div>}
        {directory?.stale && <p className="curriculum-notice" role="status">{directory.source} is unavailable. Showing results last checked on {checkedAt(directory.fetchedAt)}.</p>}
        {directory?.note && <p className="curriculum-notice">{directory.note}</p>}
        {directory && !directory.items.length && <div className="empty-state"><Search size={28} /><h3>No resources match these filters.</h3><p>Try all subjects, another medium, or a shorter search. Publisher coverage varies by class.</p>{!isCollins && ['Social Studies', 'Computer Science', 'Value Education'].includes(subject) && <button className="button secondary" onClick={() => { setBoard('Matriculation / Collins'); setMedium('English'); setKind('textbooks'); setSubjects([]); setOffset(0); setHistory([]); }}>Browse Collins {subject} books<ArrowRight size={15} /></button>}</div>}
        <div className="curriculum-grid">{directory?.items.map((item) => <article className="curriculum-card" key={item.id}><div className="curriculum-card-top"><span className="curriculum-resource-icon"><ResourceIcon format={item.format} /></span><span className="curriculum-kicker">{isCollins ? item.category : item.format === 'collection' ? 'Textbook' : item.format === 'video' ? 'Video lesson' : item.format === 'pdf' ? 'PDF resource' : item.category}</span></div><h3>{item.title}</h3><p className="curriculum-subject">{item.subjects.join(' · ') || 'Publisher resource'}{isCollins && ` · ${item.grades.join(' · ')}`}</p><p className="curriculum-credit">{item.creator || source}{item.license && ` · ${item.license}`}</p><button className="button secondary" onClick={() => open(item)}>{isCollins ? 'Explore book series' : item.format === 'collection' ? 'Explore chapters' : 'Open lesson'}<ArrowRight size={15} /></button></article>)}</div>
        {directory && directory.total > directory.limit && <div className="curriculum-pagination"><button className="button secondary" disabled={offset === 0} onClick={() => setOffset((x) => Math.max(0, x - directory.limit))}><ArrowLeft size={14} />Previous</button><span>Page {Math.floor(offset / directory.limit) + 1} of {Math.ceil(directory.total / directory.limit)}</span><button className="button secondary" disabled={offset + directory.limit >= directory.total} onClick={() => setOffset((x) => x + directory.limit)}>Next<ArrowRight size={14} /></button></div>}
        {directory && <p className="curriculum-attribution">Source: {directory.source} · {directory.cached ? 'Cached results' : 'Live results'} · Checked {checkedAt(directory.fetchedAt)}. Publisher content is separate from Smart tutor’s original practice lessons.</p>}
      </>}
    </>}
  </div>;
}
