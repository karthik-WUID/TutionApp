import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, CheckCircle2, Clock3, GraduationCap, Languages, Plus, X } from 'lucide-react';
import { api } from './api';
import type { User } from './types';
import type { Mutation, Task, TaskKind, Workspace } from './workspace';
import { dayOf, nextDay, localTime, formatDate, isDone } from './workspace';
import Planner from './StudyPlanner';
import LanguageLab from './LanguageLab';
import SkillStudio from './SkillStudio';
import './Productivity.css';

type Props = { mode: 'homework' | 'planner' | 'languages' | 'skills' | 'progress'; me: User; users: User[]; update: number; search: string; target?: string | null; onToast: (message: string, error?: boolean) => void; openHomework: (id: string) => void; children?: ReactNode | ((studentId: string) => ReactNode) };
export default function Productivity({ mode, me, users, update, search, target, onToast, openHomework, children }: Props) {
  const [studentId, setStudentId] = useState(me.role === 'tutor' ? users.find((u) => u.role === 'student')!.id : me.id);
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(target ? 'practice' : 'assignments');
  const active = useRef(studentId); active.current = studentId;
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try { const next = await api<Workspace>(`/workspace?userId=${me.id}&studentId=${studentId}`); if (active.current === studentId && sequence.current === request) { setData(next); setError(''); } }
    catch (err) { if (active.current === studentId) setError((err as Error).message); }
  }, [me.id, studentId]);
  useEffect(() => { void refresh(); }, [update, refresh]);
  useEffect(() => { if (target) setTab('practice'); }, [target]);
  const mutate: Mutation = async (path, body, message, method = 'POST') => {
    if (busy) return false;
    setBusy(true);
    try {
      await api<Workspace>(`/workspace${path}`, { method, body: JSON.stringify({ userId: me.id, studentId, ...body }) });
      await refresh(); onToast(message); return true;
    } catch (err) { onToast((err as Error).message, true); return false; }
    finally { setBusy(false); }
  };
  if (!data) return <div className="analytics-card"><p role={error ? 'alert' : undefined}>{error || 'Gathering your learning tools…'}</p>{error && <button className="button secondary" onClick={() => void refresh()}>Try again</button>}</div>;
  const tutor = me.role === 'tutor';
  const workbook = typeof children === 'function' ? children(studentId) : children;
  const picker = tutor && <label className="student-picker"><GraduationCap size={18} />Viewing student<select value={studentId} onChange={(e) => { setStudentId(e.target.value); setData(null); }}>{users.filter((u) => u.role === 'student').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>;
  if (mode === 'homework') return <div className="productivity"><div className="workspace-tabs"><button className={tab === 'assignments' ? 'selected' : ''} onClick={() => setTab('assignments')}>Assignments & deadlines</button><button className={tab === 'practice' ? 'selected' : ''} onClick={() => setTab('practice')}>Lesson practice</button></div>{picker}{tab === 'practice' ? workbook : <TaskBoard key={studentId} data={data} tutor={tutor} search={search} busy={busy} mutate={mutate} openHomework={(id) => { setTab('practice'); openHomework(id); }} />}</div>;
  if (mode === 'progress') return <>{picker}<PortfolioStats data={data} />{workbook}</>;
  return <div className="productivity">{picker}{mode === 'planner' ? <Planner key={studentId} data={data} tutor={tutor} busy={busy} mutate={mutate} /> : mode === 'languages' ? <LanguageLab key={studentId} data={data} tutor={tutor} search={search} busy={busy} mutate={mutate} onToast={onToast} /> : <SkillStudio key={studentId} data={data} tutor={tutor} search={search} busy={busy} mutate={mutate} />}</div>;
}

export function PortfolioStats({ data }: { data: Workspace }) {
  const values = [
    { icon: CheckCircle2, count: data.tasks.filter(isDone).length, label: 'Assignments submitted', detail: `${data.tasks.filter((t) => t.status === 'reviewed').length} reviewed by your tutor` },
    { icon: Clock3, count: data.blocks.filter((b) => b.status === 'completed').reduce((n, b) => n + b.minutes, 0), label: 'Study minutes completed', detail: 'From blocks you marked complete' },
    { icon: Languages, count: Object.values(data.practice).filter((p) => p.reading || p.writing || p.speaking).length, label: 'Languages practised', detail: 'Reading, writing or communication' },
    { icon: BookOpen, count: data.entries.filter((e) => e.status === 'completed').length, label: 'Portfolio activities', detail: 'Completed work and reflections' },
  ];
  return <div className="portfolio-stats">{values.map(({ icon: Icon, count, label, detail }) => <div className="portfolio-stat" key={label}><Icon size={19} /><strong>{count}</strong><span>{label}</span><small>{detail}</small></div>)}</div>;
}

function TaskBoard({ data, tutor, search, busy, mutate, openHomework }: { data: Workspace; tutor: boolean; search: string; busy: boolean; mutate: Mutation; openHomework: (id: string) => void }) {
  const [filter, setFilter] = useState('All work');
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const task = data.tasks.find((t) => t.id === selected);
  const overdue = data.tasks.filter((t) => !isDone(t) && Date.parse(t.due_at) < Date.now()).length;
  const tasks = data.tasks.filter((t) => `${t.title} ${t.subject} ${t.kind}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All work' || filter === 'To do' && !isDone(t) || filter === 'Submitted' && isDone(t) || filter === 'Overdue' && !isDone(t) && Date.parse(t.due_at) < Date.now()));
  return <><div className="workspace-banner"><div><p className="eyebrow">SMALL STEPS, WELL PLANNED</p><h2>Your work has a place.</h2><p>Keep the deadline, the draft, and your tutor’s feedback together.</p></div><div className="banner-count"><strong>{data.tasks.filter((t) => !isDone(t)).length}</strong><span>to do · {overdue} overdue</span></div></div><div className="workspace-toolbar"><div className="workspace-tabs">{['All work', 'To do', 'Submitted', 'Overdue'].map((f) => <button className={filter === f ? 'selected' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>)}</div><button className="button primary" onClick={() => { setCreating(!creating); setSelected(null); }}><Plus size={16} />{tutor ? 'Assign work' : 'Add an assignment'}</button></div>{creating && <TaskForm data={data} busy={busy} onClose={() => setCreating(false)} mutate={mutate} />}{task ? <TaskDetail key={task.id} task={task} tutor={tutor} busy={busy} mutate={mutate} close={() => setSelected(null)} openHomework={openHomework} /> : <div className="task-grid">{tasks.map((t) => <button className="task-card" key={t.id} onClick={() => setSelected(t.id)}><span className="task-meta"><span>{t.subject} · {t.kind === 'speaking' ? 'communication' : t.kind}</span><span className={`work-status ${t.status}`}>{t.status.replace('_', ' ')}</span></span><h3>{t.title}</h3><p>{t.instructions}</p><span className={`task-deadline ${!isDone(t) && Date.parse(t.due_at) < Date.now() ? 'overdue' : ''}`}><Clock3 size={14} />Due {formatDate(t.due_at)} · {t.minutes} min</span>{t.steps.length > 0 && <span className="step-progress">{t.completed_steps.length}/{t.steps.length} project steps complete</span>}{t.feedback && <span className="feedback-note">Tutor feedback ready</span>}</button>)}{!tasks.length && <div className="analytics-card"><p>No assignments match this view. Add a new activity or choose another filter.</p></div>}</div>}</>;
}

function TaskForm({ data, busy, mutate, onClose }: { data: Workspace; busy: boolean; mutate: Mutation; onClose: () => void }) {
  const [kind, setKind] = useState<TaskKind>('homework');
  return <form className="work-form analytics-card" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    if (await mutate('/tasks', { title: f.get('title'), subject: f.get('subject'), kind, instructions: f.get('instructions'), minutes: Number(f.get('minutes')), dueAt: localTime(String(f.get('due')), String(f.get('time'))), steps: String(f.get('steps') || '').split('\n').map((s) => s.trim()).filter(Boolean) }, 'Assignment added to your tracker.')) onClose();
  }}><div className="panel-title"><h3>A new learning goal</h3><button type="button" className="icon-button" aria-label="Close assignment form" onClick={onClose}><X size={18} /></button></div><div className="form-grid"><label>Assignment title<input name="title" required maxLength={160} placeholder="What will you work on?" /></label><label>Subject<select aria-label="Subject" name="subject">{data.subjects.map((s) => <option key={s}>{s}</option>)}</select></label><label>Activity type<select aria-label="Activity type" value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>{['homework', 'reading', 'writing', 'speaking', 'project', 'research'].map((k) => <option key={k} value={k}>{k === 'speaking' ? 'Communication' : k.charAt(0).toUpperCase() + k.slice(1)}</option>)}</select></label><label>Estimated minutes<input name="minutes" type="number" required min={5} max={180} defaultValue={25} /></label><label>Due date<input name="due" type="date" required defaultValue={nextDay(dayOf(), 2)} /></label><label>Due time (IST)<input name="time" type="time" required defaultValue="18:00" /></label></div><label>Instructions<textarea name="instructions" maxLength={4000} rows={3} placeholder="The lesson portion, questions or learning goal…" /></label>{kind === 'project' && <label>Project steps (one per line, up to 10)<textarea name="steps" rows={3} defaultValue={'Plan the idea\nBuild or investigate\nPresent and reflect'} /></label>}<button className="button primary" disabled={busy}>Add to tracker</button></form>;
}

function TaskDetail({ task, tutor, busy, mutate, close, openHomework }: { task: Task; tutor: boolean; busy: boolean; mutate: Mutation; close: () => void; openHomework: (id: string) => void }) {
  const [work, setWork] = useState(task.work);
  const [steps, setSteps] = useState(task.completed_steps);
  const [feedback, setFeedback] = useState(task.feedback);
  return <div className="analytics-card work-form"><div className="panel-title"><div><p className="eyebrow">{task.subject} · {task.kind}</p><h3>{task.title}</h3></div><button className="icon-button" aria-label="Close assignment" onClick={close}><X size={18} /></button></div><p>{task.instructions}</p><p className="task-deadline">Due {formatDate(task.due_at)} (IST) · {task.minutes} minutes · {task.status.replace('_', ' ')}</p>{task.lesson_id ? <><p>Written answers, one-word practice, and lesson questions are saved in the lesson workbook.</p><button className="button primary" onClick={() => openHomework(task.lesson_id!)}>Open lesson homework</button></> : <>{task.steps.length > 0 && <fieldset className="practice-checklist"><legend>Project milestones</legend>{task.steps.map((s) => <label key={s}><input type="checkbox" checked={steps.includes(s)} disabled={tutor} onChange={(e) => setSteps(e.target.checked ? [...steps, s] : steps.filter((v) => v !== s))} />{s}</label>)}</fieldset>}<label>Your work<textarea aria-label="Your work" rows={7} value={work} maxLength={12000} readOnly={tutor} onChange={(e) => setWork(e.target.value)} placeholder="Write your answers, findings, or project explanation…" /></label>{!tutor && <div className="form-actions"><button className="button secondary" disabled={busy} onClick={() => void mutate(`/tasks/${task.id}`, { work, completedSteps: steps, status: 'in_progress' }, 'Draft and project steps saved.', 'PATCH')}>Save draft</button><button className="button primary" disabled={busy} onClick={() => void mutate(`/tasks/${task.id}`, { work, completedSteps: steps, status: 'submitted' }, 'Work submitted for tutor feedback.', 'PATCH')}>Submit work</button></div>}{tutor && isDone(task) && <form onSubmit={(e) => { e.preventDefault(); void mutate(`/tasks/${task.id}/review`, { feedback }, 'Tutor feedback saved.'); }}><label>Tutor feedback<textarea aria-label="Tutor feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} required maxLength={3000} rows={3} /></label><button disabled={busy} className="button primary">Review assignment</button></form>}</>}{task.feedback && <div className="workspace-feedback"><strong>Your tutor’s feedback</strong><p>{task.feedback}</p></div>}</div>;
}
