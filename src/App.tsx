import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown, ArrowLeft, ArrowRight, Bell, BookOpen, BookText, Bookmark, CalendarDays, ChartNoAxesCombined, ClipboardList, Heart,
  Check, CheckCheck, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3,
  FlaskConical, GraduationCap, Home, Leaf, Lightbulb, Menu, MessageCircle,
  MessageSquare, Plus, Search, Send, Sparkles, Users, X, Zap, Languages, Pencil,
} from 'lucide-react';
import { api } from './api';
import type { Classroom, Doubt, RoomMessage, Session, Subject, User } from './types';
const Learning = lazy(() => import('./Learning'));
const Productivity = lazy(() => import('./Productivity'));
const Curriculum = lazy(() => import('./Curriculum'));

type Page = 'dashboard' | 'doubts' | 'community' | 'sessions' | 'saved' | 'lessons' | 'homework' | 'dictionary' | 'progress' | 'mood' | 'planner' | 'languages' | 'skills' | 'curriculum';
type Dialog = { type: 'ask' } | { type: 'doubt' | 'session'; id: string } | null;
type Status = 'all' | 'open' | 'resolved';
const navigation: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Overview', icon: Home },
  { id: 'lessons', label: 'Learning path', icon: BookOpen },
  { id: 'curriculum', label: 'Syllabus & lessons', icon: BookText },
  { id: 'homework', label: 'My homework', icon: ClipboardList },
  { id: 'planner', label: 'Study planner', icon: CalendarDays },
  { id: 'languages', label: 'Language lab', icon: Languages },
  { id: 'skills', label: 'Skills & research', icon: Pencil },
  { id: 'doubts', label: 'My doubts', icon: CircleHelp },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'sessions', label: 'Study sessions', icon: CalendarDays },
  { id: 'dictionary', label: 'Topic dictionary', icon: BookText },
  { id: 'progress', label: 'My progress', icon: ChartNoAxesCombined },
  { id: 'mood', label: 'Mood & skills', icon: Heart },
  { id: 'saved', label: 'Saved for later', icon: Bookmark },
];
const subjectClass = (subject: string) => subject.toLowerCase();
const subjectIcon = (subject: string) => subject === 'Mathematics' ? BookOpen : subject === 'Physics' ? Zap : subject === 'Chemistry' ? FlaskConical : GraduationCap;
const shortSubject = (subject: string) => subject === 'Mathematics' ? 'Maths' : subject;
const when = (value: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).format(new Date(value));
function relative(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
function Avatar({ user, small = false }: { user: User; small?: boolean }) {
  return <span className={`avatar ${user.color} ${small ? 'small' : ''}`} aria-label={user.name}>{user.initials}</span>;
}
function SubjectBadge({ subject }: { subject: Subject }) {
  const Icon = subjectIcon(subject);
  return <span className={`subject-badge ${subjectClass(subject)}`}><Icon size={13} />{shortSubject(subject)}</span>;
}
function StatusBadge({ status }: { status: Doubt['status'] }) {
  return <span className={`status-badge ${status}`}>{status === 'resolved' ? <CheckCircle2 size={12} /> : <span className="status-dot" />}{status === 'resolved' ? 'Resolved' : 'Open doubt'}</span>;
}

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem('smart-tutor-profile') || 'aanya');
  const [data, setData] = useState<Classroom | null>(null);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState<Page>('dashboard');
  const [lessonTarget, setLessonTarget] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject | 'All subjects'>('All subjects');
  const [status, setStatus] = useState<Status>('all');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [update, setUpdate] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const next = await api<Classroom>(`/bootstrap?userId=${encodeURIComponent(userId)}`);
      if (currentUser.current === userId && id === requestId.current) {
        setData(next); setLoadError(''); setUpdate((n) => n + 1);
      }
    } catch (error) {
      if (currentUser.current === userId) setLoadError((error as Error).message);
    }
  }, [userId]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const events = new EventSource('/api/events');
    events.onmessage = () => { void refresh(); };
    return () => events.close();
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === 'Escape') { setDialog(null); setProfileOpen(false); setNotificationsOpen(false); setSidebarOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const navigate = (next: Page) => {
    setPage(next); setLessonTarget(null); setSearch(''); setSubject('All subjects'); setStatus('all'); setSidebarOpen(false); setNotificationsOpen(false);
  };
  const notify = (text: string, error = false) => setToast({ text, error });
  async function mutate(path: string, body: object, success?: string, method = 'POST') {
    if (busy) return false;
    setBusy(path);
    try {
      await api(path, { method, body: JSON.stringify({ ...body, userId }) });
      await refresh();
      if (success) notify(success);
      return true;
    } catch (error) { notify((error as Error).message, true); return false; }
    finally { setBusy(null); }
  }
  const changeProfile = (id: string) => {
    setUserId(id); localStorage.setItem('smart-tutor-profile', id); setData(null); setLoadError('');
    setProfileOpen(false); setDialog(null); setNotificationsOpen(false); setBusy(null);
    setPage('dashboard'); setLessonTarget(null); setSearch(''); setSubject('All subjects'); setStatus('all');
  };

  if (!data) return <div className="loading-screen"><div className="brand-icon"><Sparkles size={26} /></div><h1>Smart tutor<span>.</span></h1>{loadError ? <><p role="alert">{loadError}</p><button className="button primary" onClick={() => { localStorage.removeItem('smart-tutor-profile'); setUserId('aanya'); void refresh(); }}>Try again</button></> : <><div className="loading-dots"><i /><i /><i /></div><p>Opening your learning space…</p></>}</div>;
  const me = data.me;
  const myDoubts = data.doubts.filter((d) => d.author.id === me.id);
  const booked = data.sessions.filter((s) => s.booked || s.tutor.id === me.id);
  const saved = data.doubts.filter((d) => d.saved);
  const baseDoubts = page === 'doubts' ? myDoubts : page === 'saved' ? saved : data.doubts;
  const filteredDoubts = baseDoubts.filter((d) =>
    (subject === 'All subjects' || d.subject === subject) &&
    (status === 'all' || d.status === status) &&
    `${d.title} ${d.body} ${d.subject} ${d.author.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredSessions = data.sessions.filter((s) => (subject === 'All subjects' || s.subject === subject) && `${s.title} ${s.subject} ${s.tutor.name}`.toLowerCase().includes(search.toLowerCase()));
  const recentReplies = data.doubts.flatMap((d) => d.replies.filter((r) => r.author.id !== me.id && (d.author.id === me.id || d.saved)).map((r) => ({ ...r, doubt: d }))).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const activeDoubt = dialog?.type === 'doubt' ? data.doubts.find((d) => d.id === dialog.id) : undefined;
  const activeSession = dialog?.type === 'session' ? data.sessions.find((s) => s.id === dialog.id) : undefined;
  const learningPage = ['lessons', 'homework', 'dictionary', 'progress', 'mood', 'planner', 'languages', 'skills', 'curriculum'].includes(page);
  const learningTitles: Record<string, string> = { curriculum: 'Your syllabus, ready to explore.', lessons: 'One lesson. A new little possibility.', homework: 'Make it stick, in your own words.', dictionary: 'Big words. Simple meanings.', progress: 'Look how far you’re growing.', mood: 'Your feelings belong here, too.', planner: 'Make a little room for learning.', languages: 'Hello to a world of possibilities.', skills: 'Your ideas. Your growing skills.' };
  const learningDescriptions: Record<string, string> = { curriculum: 'CBSE and Tamil Nadu subjects from DIKSHA, plus Collins school book catalogues.', lessons: 'Read, explore in 3D, write, and put your understanding to the test.', homework: 'Written practice, one-word answers, and end-of-lesson questions.', dictionary: 'Explore Oxford English meanings, synonyms and related pictures, plus classroom vocabulary.', progress: 'A clear view of your lessons, homework, tests, and next steps.', mood: 'Check in with yourself. Find a learning pace that feels right today.', planner: 'A subject plan, homework deadlines, and a timetable that fits your day.', languages: 'English, Hindi, Tamil, Malayalam, French, Spanish, Japanese, and Mandarin Chinese.', skills: 'Write, read, communicate, make projects, and investigate topics that interest you.' };
  const title = learningPage ? learningTitles[page] : page === 'dashboard' ? 'Your learning space' : page === 'doubts' ? 'A question is a great beginning.' : page === 'community' ? 'Better questions. Better together.' : page === 'sessions' ? 'Make time for your next discovery.' : 'Good ideas, kept close.';
  const description = learningPage ? learningDescriptions[page] : page === 'doubts' ? 'Follow your questions, find your answers, and keep moving forward.' : page === 'community' ? 'Share what you know. Learn something you didn’t.' : page === 'sessions' ? 'Small groups, thoughtful tutors, and plenty of room for questions.' : 'Pick up a question whenever curiosity calls.';

  return <div className="app-shell">
    {sidebarOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }}><span className="brand-icon"><Sparkles size={22} strokeWidth={1.8} /></span><span>Smart tutor<span className="brand-period">.</span></span></a>
      <div className="workspace-label">YOUR CLASSROOM <span className="tiny-dot" /></div>
      <nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={19} strokeWidth={1.8} /><span>{label}</span>{id === 'doubts' && myDoubts.length > 0 && <span className="nav-count">{myDoubts.length}</span>}</button>)}</nav>
      <div className="sidebar-note"><span className="note-icon"><Lightbulb size={24} strokeWidth={1.5} /></span><h3>No doubt is too small.</h3><p>Someone else might be wondering the very same thing.</p><button onClick={() => setDialog({ type: 'ask' })}>Let’s ask it <ArrowUpRight /></button><span className="note-decoration">✧</span></div>
      <div className="sidebar-bottom"><span className="demo-label">DEMO CLASSROOM</span><button className="account-button" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }} aria-expanded={profileOpen}><Avatar user={me} /><span><strong>{me.name}</strong><small>{me.role === 'tutor' ? 'Tutor · Switch profile' : 'Student · Switch profile'}</small></span><ChevronDown size={16} /></button>{profileOpen && <div className="profile-menu"><p>Explore another perspective</p>{data.users.map((user) => <button key={user.id} onClick={() => changeProfile(user.id)}><Avatar user={user} small /><span>{user.name}<small>{user.role === 'tutor' ? 'Tutor' : 'Student'}</small></span>{user.id === me.id && <Check size={16} />}</button>)}</div>}</div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button><span className="breadcrumb">My classroom <ChevronRight size={13} /><strong>{navigation.find((n) => n.id === page)?.label}</strong></span></div><div className="topbar-actions"><label className="search-box"><Search size={17} /><input ref={searchRef} placeholder={page === 'curriculum' ? 'Search textbooks or lessons…' : page === 'sessions' ? 'Search sessions…' : 'Search doubts or topics…'} value={search} onChange={(e) => setSearch(page === 'curriculum' ? e.target.value.slice(0, 160) : e.target.value)} aria-label={page === 'curriculum' ? 'Search textbooks or lessons' : 'Search doubts or topics'} />{search ? <button aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button> : <kbd>⌘ K</kbd>}</label><div className="notification-wrapper"><button className="icon-button notification-button" aria-label="View classroom updates" onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }} aria-expanded={notificationsOpen}><Bell size={19} />{recentReplies.length > 0 && <span className="notification-dot" />}</button>{notificationsOpen && <div className="notification-menu"><h3>Classroom updates <span>{recentReplies.length}</span></h3>{recentReplies.length ? recentReplies.slice(0, 5).map((r) => <button key={r.id} onClick={() => { setDialog({ type: 'doubt', id: r.doubt.id }); setNotificationsOpen(false); }}><Avatar user={r.author} small /><span><strong>{r.author.name.split(' ')[0]} replied</strong><small>{r.doubt.title}</small><em>{relative(r.created_at)}</em></span></button>) : <p>You’re all caught up. Replies to your questions will appear here.</p>}</div>}</div><span className="topbar-divider" /><button className="header-profile" aria-label="Switch classroom profile" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); if (window.innerWidth <= 760) setSidebarOpen(true); }}><Avatar user={me} small /></button></div></header>
      <main>
        {loadError && <div className="connection-banner" role="alert">Updates are temporarily unavailable. {loadError} <button onClick={() => void refresh()}>Reconnect</button></div>}
        <div className="page-heading"><div><p className="eyebrow">A LITTLE PROGRESS, EVERY DAY</p><h1>{page === 'dashboard' ? `Hey ${me.name.split(' ')[0]}, let’s keep learning.` : title}</h1><p>{page === 'dashboard' ? 'A fresh question. A new perspective. Your next little breakthrough.' : description}</p></div>{page === 'dashboard' ? <span className="today"><CalendarDays size={15} />{when(new Date().toISOString(), { weekday: 'short', day: 'numeric', month: 'short' })}</span> : page !== 'sessions' && !learningPage && <button className="button primary" onClick={() => setDialog({ type: 'ask' })}><Plus size={17} />Ask a doubt</button>}</div>
        {page === 'dashboard' && <>
          <section className="hero"><div className="hero-copy"><div className="hero-eyebrow"><span className="sparkle-dot"><Sparkles size={12} /></span> BIG IDEAS START WITH LITTLE QUESTIONS</div><h2>A little curious.<br />A lot of <span>potential.</span></h2><p>You don’t have to figure it all out alone.<br className="desktop-break" /> Ask, connect, and learn with your people.</p><div className="hero-actions"><button className="button lime" onClick={() => setDialog({ type: 'ask' })}><Plus size={17} />Ask a doubt <ArrowRight size={16} /></button><button className="hero-link" onClick={() => navigate('sessions')}>Find a study session <ArrowRight size={15} /></button></div><div className="hero-community"><span className="avatar-stack">{data.users.slice(0, 3).map((user) => <Avatar user={user} key={user.id} small />)}</span><span>A classroom that grows with you <span>✦</span></span></div></div><LearningIllustration /></section>
          <div className="stats-grid"><Stat icon={<CircleHelp size={21} />} color="green" value={myDoubts.length} label="Doubts you’ve asked" hint="Curiosity looks good on you" /><Stat icon={<CheckCheck size={21} />} color="purple" value={myDoubts.filter((d) => d.status === 'resolved').length} label="Little breakthroughs" hint="Questions marked resolved" /><Stat icon={<CalendarDays size={21} />} color="peach" value={booked.length} label={me.role === 'tutor' ? 'Sessions you’re hosting' : 'Your study sessions'} hint="Make space for learning" /></div>
        </>}
        {learningPage ? <Suspense fallback={<div className="analytics-card"><p>Opening your learning tools…</p></div>}>
          {page === 'curriculum' ? <Curriculum key={me.id} me={me} search={search} onToast={notify} /> : ['homework', 'planner', 'languages', 'skills', 'progress'].includes(page) ? <Productivity key={`${page}-${me.id}`} mode={page as 'homework' | 'planner' | 'languages' | 'skills' | 'progress'} me={me} users={data.users} update={update} search={search} target={lessonTarget} onToast={notify} openHomework={(id) => setLessonTarget(id)}>{['homework', 'progress'].includes(page) ? (studentId) => <Learning key={`${page}-${studentId}`} mode={page as 'homework' | 'progress'} me={me} users={data.users} update={update} target={lessonTarget} search={search} onToast={notify} viewStudentId={studentId} openLesson={(id) => { navigate('lessons'); setLessonTarget(id); }} /> : undefined}</Productivity> : <Learning key={`${page}-${me.id}`} mode={page as 'lessons' | 'dictionary' | 'mood'} me={me} users={data.users} update={update} target={lessonTarget} search={search} onToast={notify} openLesson={(id) => { navigate('lessons'); setLessonTarget(id); }} />}
        </Suspense> : <div className={`content-grid ${page !== 'dashboard' ? 'full-width' : ''}`}>
          <section className="main-content">
            <div className="section-heading"><div><h2>{page === 'dashboard' ? 'The doubt corner' : page === 'sessions' ? 'Upcoming study sessions' : page === 'doubts' ? 'Your questions' : page === 'saved' ? 'Your saved questions' : 'The doubt corner'}{page !== 'dashboard' && <span className="count-bubble">{page === 'sessions' ? filteredSessions.length : filteredDoubts.length}</span>}</h2><p>{page === 'dashboard' ? 'Ask freely. Think together. Find your aha! moment.' : page === 'sessions' ? 'A good conversation can change the way you see a subject.' : 'There’s a little discovery waiting in every discussion.'}</p></div>{page === 'dashboard' && <button className="text-button" onClick={() => navigate('community')}>View all <ArrowRight size={14} /></button>}</div>
            <div className="subject-filters" aria-label="Filter by subject">{(['All subjects', ...data.subjects] as const).map((s) => { const Icon = subjectIcon(s); return <button key={s} className={`subject-filter ${subject === s ? 'selected' : ''}`} onClick={() => setSubject(s)} aria-pressed={subject === s}>{s !== 'All subjects' && <Icon size={14} />}{s === 'All subjects' ? s : shortSubject(s)}</button>; })}</div>
            {page !== 'sessions' && <div className="list-toolbar"><div className="status-tabs" aria-label="Filter by status">{(['all', 'open', 'resolved'] as const).map((s) => <button key={s} className={status === s ? 'selected' : ''} onClick={() => setStatus(s)} aria-pressed={status === s}>{s === 'all' ? 'All questions' : s === 'open' ? 'Still wondering' : 'Resolved'}</button>)}</div><span className="sort-label"><ArrowDown size={12} />Newest first</span></div>}
            {page === 'sessions' ? <div className="sessions-grid">{filteredSessions.map((session) => <SessionCard key={session.id} session={session} me={me} onOpen={() => setDialog({ type: 'session', id: session.id })} />)}{!filteredSessions.length && <EmptyState icon={<CalendarDays />} title="No sessions found" description="Try another subject or search term." action={() => { setSearch(''); setSubject('All subjects'); }} actionLabel="Reset filters" />}</div> : <div className="doubt-list">{filteredDoubts.slice(0, page === 'dashboard' ? 3 : undefined).map((doubt) => <DoubtCard key={doubt.id} doubt={doubt} onOpen={() => setDialog({ type: 'doubt', id: doubt.id })} onSave={() => void mutate(`/doubts/${doubt.id}/bookmark`, { saved: !doubt.saved }, doubt.saved ? 'Removed from saved questions' : 'Saved for a little later')} busy={!!busy} />)}{!filteredDoubts.length && <EmptyState icon={<MessageCircle />} title={page === 'saved' && !search ? 'Keep a good question close.' : 'A little quiet in here.'} description={search || subject !== 'All subjects' || status !== 'all' ? 'No questions match these filters. Try something else.' : page === 'saved' ? 'Tap the bookmark on any question to find it here later.' : 'Be the first to ask a question. Every doubt is welcome.'} action={() => search || subject !== 'All subjects' || status !== 'all' ? (setSearch(''), setSubject('All subjects'), setStatus('all')) : page === 'saved' ? navigate('community') : setDialog({ type: 'ask' })} actionLabel={search || subject !== 'All subjects' || status !== 'all' ? 'Reset filters' : page === 'saved' ? 'Explore the community' : 'Ask a doubt'} />}</div>}
            {page === 'dashboard' && filteredDoubts.length > 3 && <button className="all-doubts-button" onClick={() => navigate('community')}>A little more curiosity awaits <ArrowRight size={15} /></button>}
          </section>
          {page === 'dashboard' && <aside className="right-column"><section className="upcoming-panel"><div className="section-heading compact"><h2>Learn together</h2><span className="mini-icon"><CalendarDays size={17} /></span></div><p className="panel-subtitle">Your next learning adventures.</p><div className="upcoming-list">{data.sessions.slice(0, 2).map((session) => <SessionCard key={session.id} session={session} me={me} compact onOpen={() => setDialog({ type: 'session', id: session.id })} />)}</div><button className="browse-sessions" onClick={() => navigate('sessions')}>Explore all sessions <ArrowRight size={15} /></button></section><section className="community-note"><span className="community-note-icon"><Leaf size={21} /></span><p>Knowledge grows<br />when we <span>share it.</span></p><span className="community-note-caption">Have an answer? Make someone’s day.</span><button onClick={() => { navigate('community'); setStatus('open'); }}>Help a classmate <ArrowRight size={14} /></button></section><div className="kind-reminder"><span>✦</span> A safe space for every “why?”</div></aside>}
        </div>}
        <footer className="page-footer"><span>Small steps. Big possibilities.</span><span>Made for curious minds <Sparkles size={12} /></span></footer>
      </main>
    </div>
    {dialog?.type === 'ask' && <Modal title="Let’s untangle that doubt." label="ASK AWAY" close={() => setDialog(null)}><AskForm subjects={data.subjects} userId={me.id} onCreated={async (doubt) => { await refresh(); setDialog({ type: 'doubt', id: doubt.id }); notify('Your question is in the classroom. Let’s find an answer!'); }} /></Modal>}
    {activeDoubt && <Modal title="A little thinking, together." label="THE DOUBT CORNER" close={() => setDialog(null)} wide><DoubtDetail doubt={activeDoubt} me={me} busy={!!busy} onReply={(body) => mutate(`/doubts/${activeDoubt.id}/replies`, { body }, 'Your reply is posted. Thanks for sharing!')} onResolve={() => void mutate(`/doubts/${activeDoubt.id}`, { status: activeDoubt.status === 'open' ? 'resolved' : 'open' }, activeDoubt.status === 'open' ? 'Another little breakthrough. Doubt resolved!' : 'Your doubt is open again.', 'PATCH')} /></Modal>}
    {activeSession && <Modal title={activeSession.title} label={`${shortSubject(activeSession.subject).toUpperCase()} · STUDY SESSION`} close={() => setDialog(null)} wide><SessionDetail session={activeSession} me={me} update={update} busy={!!busy} onBook={(booked) => mutate(`/sessions/${activeSession.id}/booking`, { booked }, booked ? 'Your seat is saved. See you in the study room!' : 'Your booking has been cancelled.')} onRefresh={refresh} /></Modal>}
    {toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.error ? <CircleHelp size={19} /> : <CheckCircle2 size={19} />}<span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button></div>}
  </div>;
}

function ArrowUpRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 17 17 7M7 7h10v10" /></svg>; }
function Stat({ icon, color, value, label, hint }: { icon: ReactNode; color: string; value: number; label: string; hint: string }) {
  return <div className="stat-card"><span className={`stat-icon ${color}`}>{icon}</span><div><div className="stat-heading"><strong>{value.toString().padStart(2, '0')}</strong><span>{label}</span></div><p>{hint}</p></div></div>;
}
function DoubtCard({ doubt, onOpen, onSave, busy }: { doubt: Doubt; onOpen: () => void; onSave: () => void; busy: boolean }) {
  return <article className="doubt-card"><div className="doubt-top"><div className="badge-group"><SubjectBadge subject={doubt.subject} /><StatusBadge status={doubt.status} /></div><button className={`save-button ${doubt.saved ? 'is-saved' : ''}`} onClick={onSave} disabled={busy} aria-label={doubt.saved ? 'Unsave question' : 'Save question'} aria-pressed={doubt.saved}><Bookmark size={17} fill={doubt.saved ? 'currentColor' : 'none'} /></button></div><button className="doubt-main" onClick={onOpen}><h3>{doubt.title}</h3><p>{doubt.body}</p></button><div className="doubt-bottom"><span className="author-line"><Avatar user={doubt.author} small /><strong>{doubt.author.name}</strong><span className="meta-dot">·</span><span>{relative(doubt.created_at)}</span></span><button className="reply-count" onClick={onOpen}><MessageSquare size={14} />{doubt.replies.length} {doubt.replies.length === 1 ? 'reply' : 'replies'}<ChevronRight size={13} /></button></div></article>;
}
function SessionCard({ session, me, compact = false, onOpen }: { session: Session; me: User; compact?: boolean; onOpen: () => void }) {
  const Icon = subjectIcon(session.subject);
  return <article className={`session-card ${compact ? 'compact' : ''}`}><div className="session-top"><span className={`session-subject-icon ${subjectClass(session.subject)}`}><Icon size={19} /></span><span className="session-date">{when(session.starts_at, { day: 'numeric', month: 'short' })} <span>· {when(session.starts_at, { hour: 'numeric', minute: '2-digit' })} IST</span></span></div><h3>{session.title}</h3><div className="tutor-line"><Avatar user={session.tutor} small /><span>{session.tutor.name}</span><span className="tutor-verified"><Check size={10} /></span></div>{!compact && <p className="session-description">{session.description}</p>}<div className="session-meta"><span><Clock3 size={13} />{session.duration} min</span><span><Users size={13} />{session.attendees}/{session.capacity} seats</span></div><button className={`session-action ${session.booked || me.id === session.tutor.id ? 'booked' : ''}`} onClick={onOpen}>{session.booked || me.id === session.tutor.id ? <><MessageCircle size={15} />Open study room</> : <>View session <ArrowRight size={14} /></>}</button></article>;
}
function EmptyState({ icon, title, description, action, actionLabel }: { icon: ReactNode; title: string; description: string; action: () => void; actionLabel: string }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{description}</p><button className="button secondary" onClick={action}>{actionLabel}<ArrowRight size={15} /></button></div>;
}
function Modal({ title, label, children, close, wide = false }: { title: string; label: string; children: ReactNode; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus.current?.focus(); };
  }, []);
  return createPortal(<div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><div className={`modal ${wide ? 'wide' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} onKeyDown={(e) => {
    if (e.key !== 'Tab') return;
    const elements = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]') || [])];
    const first = elements[0], last = elements[elements.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first?.focus(); }
  }}><div className="modal-heading"><div><p className="eyebrow">{label}</p><h2 id="modal-title">{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={21} /></button></div>{children}</div></div>, document.body);
}
function AskForm({ subjects, userId, onCreated }: { subjects: Subject[]; userId: string; onCreated: (doubt: Doubt) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState<Subject>('Mathematics');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (sending) return; setSending(true); setError('');
    try {
      const doubt = await api<Doubt>('/doubts', { method: 'POST', body: JSON.stringify({ userId, title, body, subject }) });
      await onCreated(doubt);
    } catch (err) { setError((err as Error).message); } finally { setSending(false); }
  }
  return <form className="ask-form" onSubmit={submit}><p className="form-intro">Big or small, your question belongs here. Give your classmates a little context so they can help.</p><label>What’s on your mind?<input autoFocus required minLength={8} maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Why does the quadratic formula work?" /><span className="field-hint">A clear question is a great place to start. <span>{title.length}/140</span></span></label><label>Pick a subject<select value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>{subjects.map((s) => <option key={s}>{s}</option>)}</select></label><label>Tell us a little more<textarea required minLength={10} maxLength={3000} rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What have you tried? Where did you get stuck?" /></label><div className="form-kind-note"><Lightbulb size={17} />You don’t need the perfect words. Just ask.</div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary submit-button" disabled={sending}>{sending ? 'Sharing your question…' : 'Share with the classroom'}<ArrowRight size={17} /></button></form>;
}
function DoubtDetail({ doubt, me, busy, onReply, onResolve }: { doubt: Doubt; me: User; busy: boolean; onReply: (body: string) => Promise<boolean>; onResolve: () => void }) {
  const [reply, setReply] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); if (await onReply(reply)) setReply(''); }
  return <div className="doubt-detail"><div className="badge-group"><SubjectBadge subject={doubt.subject} /><StatusBadge status={doubt.status} /></div><h3>{doubt.title}</h3><div className="detail-author"><Avatar user={doubt.author} small /><span><strong>{doubt.author.name}</strong><small>{relative(doubt.created_at)}</small></span></div><p className="question-body">{doubt.body}</p>{(doubt.author.id === me.id || me.role === 'tutor') && <button className={`button ${doubt.status === 'resolved' ? 'secondary' : 'resolve-button'}`} onClick={onResolve} disabled={busy}>{doubt.status === 'resolved' ? <><CircleHelp size={16} />Reopen this doubt</> : <><CheckCircle2 size={16} />That helped! Mark resolved</>}</button>}<div className="replies-heading"><h4>Thinking it through <span>{doubt.replies.length}</span></h4><MessageCircle size={18} /></div><div className="thread">{doubt.replies.map((r) => <article className={`thread-reply ${r.author.role === 'tutor' ? 'tutor-reply' : ''}`} key={r.id}><Avatar user={r.author} small /><div><div className="thread-meta"><strong>{r.author.name}</strong>{r.author.role === 'tutor' && <span className="tutor-label"><GraduationCap size={12} />Tutor</span>}<time>{relative(r.created_at)}</time></div><p>{r.body}</p></div></article>)}{!doubt.replies.length && <div className="no-replies"><Sparkles size={19} /><p>The conversation is just getting started. Have a thought to share?</p></div>}</div><form className="reply-form" onSubmit={submit}><label htmlFor="reply-input">{me.role === 'tutor' ? 'Help make it click.' : 'Add your perspective.'}</label><textarea id="reply-input" required maxLength={3000} rows={3} placeholder="An explanation, a follow-up question, an aha! moment…" value={reply} onChange={(e) => setReply(e.target.value)} /><div><span>Be kind. Be curious. Learn together.</span><button className="button primary" disabled={busy || !reply.trim()}><Send size={15} />{busy ? 'Posting…' : 'Post reply'}</button></div></form></div>;
}
function SessionDetail({ session, me, update, busy, onBook, onRefresh }: { session: Session; me: User; update: number; busy: boolean; onBook: (booked: boolean) => Promise<boolean>; onRefresh: () => Promise<void> }) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const canEnter = session.booked || session.tutor.id === me.id;
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!canEnter) { setMessages([]); return; }
    let cancelled = false;
    api<RoomMessage[]>(`/sessions/${session.id}/messages?userId=${me.id}`).then((data) => { if (!cancelled) { setMessages(data); setError(''); } }).catch((err: Error) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [session.id, me.id, update, canEnter]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages.length]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (sending || !message.trim()) return; setSending(true); setError('');
    try {
      const next = await api<RoomMessage[]>(`/sessions/${session.id}/messages`, { method: 'POST', body: JSON.stringify({ userId: me.id, body: message }) });
      setMessages(next); setMessage(''); await onRefresh();
    } catch (err) { setError((err as Error).message); } finally { setSending(false); }
  }
  return <div className="session-detail"><div className="session-detail-meta"><span><CalendarDays size={17} />{when(session.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })} · {when(session.starts_at, { hour: 'numeric', minute: '2-digit' })} IST</span><span><Clock3 size={16} />{session.duration} minutes</span><span><Users size={16} />{session.attendees} of {session.capacity} seats</span></div><div className="session-host"><Avatar user={session.tutor} /><div><span>Your tutor</span><strong>{session.tutor.name}<span className="tutor-verified"><Check size={10} /></span></strong></div></div><p className="session-detail-description">{session.description}</p>{!canEnter ? <div className="booking-panel"><div><h3>A seat for your curiosity.</h3><p>Book a spot to join the shared study room and start a conversation.</p></div><button className="button primary" disabled={busy || session.attendees >= session.capacity} onClick={() => void onBook(true)}>{busy ? 'Saving your seat…' : session.attendees >= session.capacity ? 'Session full' : 'Book my seat'}<ArrowRight size={16} /></button></div> : <><div className="study-room-heading"><h3><MessageCircle size={19} />The study room</h3><span><span className="tiny-dot" />Shared classroom chat</span></div><p className="room-intro">Bring a question, say hello, or work through an idea together.</p><div className="room-messages" role="log" aria-label="Study room messages" aria-live="polite">{messages.map((m) => <div key={m.id} className={`room-message ${m.author.id === me.id ? 'own-message' : ''}`}><Avatar user={m.author} small /><div><span className="room-message-author">{m.author.name.split(' ')[0]}{m.author.role === 'tutor' && <span className="tutor-label">Tutor</span>}<time>{when(m.created_at, { hour: 'numeric', minute: '2-digit' })}</time></span><p>{m.body}</p></div></div>)}{!messages.length && <p className="room-empty">Your study room is ready. Start with a hello!</p>}<div ref={endRef} /></div><form className="room-composer" onSubmit={submit}><input aria-label="Study room message" required maxLength={1500} placeholder="Share a thought with the room…" value={message} onChange={(e) => setMessage(e.target.value)} /><button className="button primary" aria-label="Send message" disabled={sending || !message.trim()}><Send size={17} /></button></form>{me.id !== session.tutor.id && <button className="cancel-booking" disabled={busy} onClick={() => void onBook(false)}><ArrowLeft size={13} />Cancel my booking</button>}</>}{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
function LearningIllustration() {
  return <div className="learning-illustration" aria-hidden="true"><svg viewBox="0 0 400 280" className="orbit-lines"><ellipse cx="208" cy="139" rx="141" ry="97" transform="rotate(-23 208 139)" /><ellipse cx="208" cy="139" rx="108" ry="123" transform="rotate(38 208 139)" /><circle cx="310" cy="77" r="5" fill="#e2e9b7" /><circle cx="92" cy="210" r="4" fill="#e2e9b7" /><path d="m334 186 5 12 12 5-12 5-5 12-5-12-12-5 12-5Z" fill="#dee8af" stroke="none" /><path d="m72 63 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#dee8af" stroke="none" /></svg><div className="math-paper"><div className="paper-top"><span /><span /><span /></div><span className="paper-title">THE ART OF ASKING WHY</span><span className="paper-equation">x² + 2x + 1</span><div className="paper-underline" /><svg viewBox="0 0 180 110" className="paper-graph"><path d="M25 92V10m-9 76h150" stroke="#a0afa3" strokeWidth="1" /><path d="M33 17q52 145 116 0" stroke="#286850" strokeWidth="3" fill="none" /><path d="m145 15 5 3-1 6" stroke="#286850" fill="none" /><circle cx="87" cy="72" r="4" fill="#d5a970" /><text x="153" y="101" fontSize="11" fill="#5d7667">x</text><text x="10" y="14" fontSize="11" fill="#5d7667">y</text></svg><span className="paper-caption">a little clarity, one step at a time.</span></div><div className="idea-bubble"><Lightbulb size={27} strokeWidth={1.5} /><span>aha!</span></div><div className="question-bubble">why<span>?</span></div><div className="small-sparkle">✧</div></div>;
}
