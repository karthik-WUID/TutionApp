export type Subject = 'Mathematics' | 'Physics' | 'Chemistry' | 'English';
export type User = { id: string; name: string; initials: string; role: 'student' | 'tutor'; color: string };
export type Reply = { id: string; body: string; created_at: string; author: User };
export type Doubt = { id: string; title: string; body: string; subject: Subject; status: 'open' | 'resolved'; created_at: string; author: User; saved: boolean; replies: Reply[] };
export type Session = { id: string; title: string; description: string; subject: Subject; tutor: User; starts_at: string; duration: number; capacity: number; attendees: number; booked: boolean };
export type RoomMessage = Reply & { session_id: string };
export type Classroom = { me: User; users: User[]; subjects: Subject[]; doubts: Doubt[]; sessions: Session[] };
export type Lesson = {
  id: string; subject: Subject; chapter: number; title: string; description: string; symbol: string; duration: number; skill: string;
  introduction: string; sections: { title: string; body: string }[]; example: { title: string; body: string }; animation: string[];
  fun: { question: string; answer: string }; homework: { id: string; kind: 'written' | 'oneword' | 'bookback'; question: string }[];
  questions: { prompt: string; options: string[] }[];
};
export type Homework = { user_id: string; lesson_id: string; answers: Record<string, string>; status: 'draft' | 'submitted' | 'reviewed'; feedback: string; updated_at: string };
export type Attempt = { id: string; user_id: string; lesson_id: string; answers: number[]; results: { correct: boolean; correctIndex: number; selectedIndex: number; explanation: string }[]; score: number; total: number; created_at: string };
export type MoodName = 'excited' | 'focused' | 'okay' | 'tired' | 'stuck';
export type Mood = { id: string; mood: MoodName; confidence: number; note: string; created_at: string };
export type LearningData = {
  preferences: { grade: number; board: string }; boards: string[];
  mappings: Record<string, { title: string; edition: string; chapter: string; portions: string }>;
  lessons: Lesson[]; dictionary: { term: string; subject: Subject; lessonId: string; meaning: string; example: string }[];
  progress: Record<string, { read: boolean; visual: boolean; updated_at: string }>;
  homework: Record<string, Homework>; attempts: Attempt[]; moods: Mood[];
};
export type CurriculumBoard = { id: string; label: string; providerBoard: string; source: string; kinds: ('textbooks' | 'lessons')[]; mediums: string[]; syllabusUrl: string; textbookUrl: string; sourceUrl: string; syllabusNote: string; extraLinks?: { label: string; url: string }[] };
export type CurriculumMeta = { boards: CurriculumBoard[]; grades: number[]; subjectGroups: { id: string; label: string; aliases: string[] }[]; source: string; note: string };
export type CurriculumResource = { id: string; title: string; description: string; board: string[]; grades: string[]; mediums: string[]; subjects: string[]; category: string; format: 'collection' | 'video' | 'pdf' | 'interactive' | 'link'; mediaUrl: string | null; sourceUrl: string; creator: string; license: string; source?: string; access?: string };
export type CurriculumDirectory = { items: CurriculumResource[]; total: number; offset: number; limit: number; subjects: string[]; fetchedAt: string; cached: boolean; stale: boolean; source: string; note?: string };
export type CurriculumDetail = { item: CurriculumResource; children: CurriculumResource[]; fetchedAt: string; stale: boolean; source: string; note?: string };
