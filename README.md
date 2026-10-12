# Smart tutor

A working online tuition prototype for curious students and thoughtful tutors. Built with React, TypeScript, Vite, Express, SQLite, and Three.js. App fonts and decorative illustrations are served locally. Optional word pictures and Oxford pronunciation audio load from their credited providers.

The Android Flutter companion in [mobile](mobile/README.md) opens the same classroom inside an Android app. It has been built, installed, and verified on the connected Samsung phone. Flutter analysis and all three Flutter tests pass. See [local setup](LOCAL_SETUP.md) for starting the server and installing on a connected Android device.

## Start developing

Use Node.js 24 or newer. This Mac has an isolated local toolchain configured by `.local/env.sh`.

```sh
cd /Users/utvyakta.com/Documents/TutionApp/Smart-tutor
source .local/env.sh
npm ci --no-audit --no-fund
npm run dev
```

The frontend runs on port 5173 and proxies `/api` to the server on port 3001. For a production-style local run:

```sh
npm run build
npm start
```

The server then serves both the compiled app and API on port 3001. `PORT` changes the server port. `DATABASE_PATH` changes the database location. Neither value is required for the default workflow. If changing the API port during development, update the Vite proxy accordingly.

The database is created and seeded on the first run at `.data/smart-tutor.sqlite`. Work, messages, check-ins, preferences, mappings, and bookings survive server restarts. Existing data is preserved by dependency installation and builds. Demo dates are seeded relative to the first run; they are not automatically moved every day. Live processes need restarting in a restored cloud task.

## What works

- A responsive learning dashboard, subject filters, search, saved questions, and classroom updates.
- Shared doubts, student and tutor replies, and resolution by the question’s author or tutor.
- Small-group session bookings, capacity checks, cancellations, and study-room text chat updated across browser tabs.
- Class 1–12 and CBSE, Tamil Nadu State Board, and Matriculation / Collins preferences.
- **Syllabus & lessons:** live CBSE and Tamil Nadu State Board textbook/lesson directories from DIKSHA, plus Collins public book series and individual book links. Featured subjects include Social Studies, Tamil, Computer Science and Value Education. Includes class 1–12, medium/subject filters, search and pagination, nested textbook chapters, PDF viewing, supported MP4 lessons, official syllabus links and saved learning preferences. Publisher coverage and licensed access vary.
- 20 original concept starters, arranged into five age ranges (1–3, 4–5, 6–8, 9–10, and 11–12), with four subject topics in each range.
- Reading milestones, written homework, three one-word questions, two original book-back practice questions per lesson, homework drafts/submissions, and tutor feedback.
- A five-question test per lesson, server-side scoring, answer explanations after submission, and persistent attempts.
- Interactive 3D concept models with play/pause, rotation, zoom, and appropriate visuals for the lesson. Physics push demonstrations also offer a force control.
- A browser-recorded 16-second animation explanation with captions, playback, and downloadable WebM video. Video export requires a browser with WebGL, MediaRecorder, and canvas capture support. Optional reading aloud uses the browser’s available speech voices.
- Topic definitions with everyday examples and links back to their lessons.
- Separate progress and mood/skills views. Skill suggestions use the latest test result per topic. Mood suggestions use voluntary student check-ins and confidence ratings.
- Tutors can inspect student progress, read mood check-ins, review submitted homework, and map a concept lesson to an exact textbook title, edition, chapter, and assigned portion for a class and board.
- **My homework:** assignments with IST deadlines, estimated time, draft work, submission, tutor feedback, overdue filters, and project milestones. Students add their own work; tutors can assign work to a selected student. Linked lesson assignments reflect the actual lesson submission and review, including after a class preference changes.
- **Study planner:** saved daily study windows, weekdays, block length, and subject priorities, including language, project, and research time. Generate a seven-day timetable that prioritises upcoming homework and balances other subject practice. Five-minute breaks and booked sessions fit inside the daily window. Larger assignments can span several blocks. Manual blocks and completed blocks survive regeneration; both block creation and live-session booking check for overlaps. Students mark practice time complete separately from submitting homework.
- **Language lab:** English, Hindi, Tamil, Malayalam, French, Spanish, Japanese, and Mandarin Chinese. Each has original beginner greetings with transliteration/meaning, a short reading passage with server-graded comprehension, saved writing practice, communication scenarios and confidence reflections, and vocabulary cards. Optional pronunciation playback uses an installed browser voice; a missing language voice is explained in the interface. External resource links open separately and do not synchronise accounts or progress.
- **Skills & research:** writing, communication, project, and research portfolio entries with drafts, reflections, completed work, and tutor feedback. Research any topic by defining a question, recording notes, searching reference sites, and adding HTTPS sources with evidence notes and a conclusion. The app keeps the student’s research; it does not fetch sources or invent research answers. Portfolio counts and language reading scores also appear in progress views.

The account menu switches between three sample students and a tutor. Try Aanya asking a doubt, Arjun replying, and Neha marking it resolved. In another browser tab, choose a different profile to see shared chat updates.

## Curriculum scope

The **Syllabus & lessons** page integrates publisher resources through DIKSHA's public API, alongside the public Collins school catalogue. CBSE and Tamil Nadu State Board (Samacheer Kalvi) are separate directories. CBSE offers English/Hindi/Urdu filters; Tamil Nadu offers English/Tamil. Featured subjects include **Social Studies, Tamil, Computer Science and Value Education**. Subject aliases group Social Science/History/Geography/Civics/Economics, Tamil-language tags, Computer Science/Computer Applications/IT/ICT/Informatics Practices, and Value Education/Moral Science/Ethics/Life Skills. The Tamil syllabus shortcut selects the Tamil subject on Tamil Nadu State Board in Tamil medium. Switching between textbooks and lessons preserves the chosen subject.

Actual coverage depends on publisher tags and available content. These results can include earlier editions and cross-class collections, so confirm the assigned book and portion with your school. A subject with no public content shows an empty state; supported subjects offer a shortcut to Collins books. The CBSE syllabus link currently points to the official 2026–27 page for Classes 9–12; NCERT provides the textbook directory for other classes. Unsupported interactive formats open on DIKSHA. PDFs also have a direct link because embedded viewing varies by browser and Android WebView.

**Collins books** uses the same catalogue request as the publisher's [public Books page](https://collins.in/books/): a read-only POST to `https://collins.in/wp-admin/admin-ajax.php` with `action=book_search_by_category`, category and school-stage filters. This public website endpoint is not a documented partner API and may change. The app paginates actual returned series, because publisher totals can count individual books or report zero while series are present. School stages map to Classes 1–2, 3–5, 6–8 and 9–12; directory cards are series for a stage, not guaranteed books for one class. Opening a series reads its public page, shows its listed class range, and provides individual book links whose titles identify the selected class. Unnumbered titles remain available on the publisher's page. The current Collins Social Science series is also checked directly for Classes 6–8 because some publisher category results omit it. Computer Science and Value Education map to Collins' public categories; Tamil has no listed public Collins category and returns no matching books. The app does not claim Collins is a school board; saving it preserves the existing `Matriculation / Collins` learning preference.

Collins full e-books, digital lessons, worksheets and samples remain subject to publisher/school access or registration. The page links to Collins school catalogues, individual books and [DigiSuite](https://collins.in/digisuite/). No public full-book API was found, and this app does not access protected content. Direct in-app access to licensed Collins lesson content would require an authorised publisher integration and school entitlement.

No API key is required for the public integration. The server uses `https://diksha.gov.in/api/content/v1/search`, `content/v1/read/:id` and `course/v1/hierarchy/:id`, normalises public Live content, and restricts media URLs to trusted publisher hosts. Collins HTML is parsed into plain catalogue metadata; publisher HTML, scripts and protected books are never embedded. Requests time out after 12 seconds; response bodies are capped at 4 MB. Results are cached in memory for five minutes, with dated stale results for up to 24 hours during an outage. The cache resets on server restart. If there is no cached copy, the page explains the outage and keeps the official directory links available. Curriculum endpoints are `/api/curriculum`, `/api/curriculum/directory`, and `/api/curriculum/resources/:id` (optional `rootId` preserves textbook membership when navigating units; `grade` filters Collins book links); each uses the existing demo `userId`. This integration does not import publisher content into the original quizzes, homework scoring or progress records.

The included lessons are **original starter content**, not a complete class 1–12 syllabus or a verified transcription of Collins, CBSE, or Tamil Nadu textbooks. Board preferences identify the classroom and its shared textbook mappings; the same concept starters are available across boards. Exact textbook alignment requires the real book titles, editions, assigned chapters, and approved teaching content. Primary science starters are grouped under Physics and Chemistry for the prototype; these are not official primary-school subject assignments. The book-back questions are original end-of-lesson exercises.

To map a portion, switch to Neha’s tutor profile, open Learning path, select a class and board, expand **Map a textbook portion**, and enter the book information. Students using that same class and board see the mapping. Content lives in `server/curriculum.mjs` and `server/starter-portions.mjs`; adding full subject curricula is a content-development task.

## Oxford English dictionary and pictures

**Topic dictionary** now includes an Oxford English search for British or American English: meanings and nested senses, usage examples, IPA/audio pronunciations, sense-level synonyms, and additional grouped synonyms/antonyms from Oxford Thesaurus. The current API v2 Words endpoint resolves inflections (such as “walking” to “walk”); synonyms use the returned headword with the English Thesaurus endpoint. Coverage is the live content available to your Oxford subscription, not a downloaded dictionary edition. Classroom topic vocabulary remains below the Oxford search.

Set credentials on the Mac in the ignored `.env.local` file (a blank template has been prepared). The template is also in `.env.example`:

```dotenv
OXFORD_APP_ID=your_app_id
OXFORD_APP_KEY=your_app_key
OXFORD_API_MODE=production
```

Use the App ID/key from [your Oxford API account](https://account.oxforddictionaries.com/). For complete word coverage, your plan must include Words and Thesaurus access. Sandbox credentials need `OXFORD_API_MODE=sandbox`; Oxford’s sandbox allows only words beginning with “a” and has a finite request allowance. Restart the local server after editing credentials. The server loads `.env.local`, then `.env`, preserving explicitly exported variables. Never put secrets into `VITE_` variables or the browser. Credentials are not exposed by the status endpoint or error responses.

One submitted lookup makes one Words request and one Thesaurus request. Typing makes no Oxford requests. A thesaurus access failure keeps the available definitions and explains the missing extra synonyms. Missing words, exhausted allowance, and provider outages have explicit messages. No full dictionary download, database storage, persistent caching or offline reuse is implemented; dictionary responses carry `Cache-Control: no-store`. Use your Oxford account’s licensing and attribution requirements for your deployment. [Official dictionary guide](https://developer.oxforddictionaries.com/dictionary-api), [Sandbox guide](https://developer.oxforddictionaries.com/documentation/getting_started/sandbox).

Pictures come separately from a matching Wikipedia article’s freely licensed Wikimedia Commons image, with creator, license and source links. They are related article illustrations, not Oxford images or guaranteed matches for every sense. Ambiguous articles and images without attribution are omitted. Some words have no picture; picture outages do not block Oxford meanings. **Find a picture** also works before Oxford activation. No image API key is needed.

Oxford endpoints are `/api/dictionary/oxford/status` and `/api/dictionary/oxford?word=apple&language=en-gb`; pictures use `/api/dictionary/picture?word=apple`. Each requires the selected demo `userId`. Automated tests use synthetic Oxford-shaped fixtures, not live Oxford content or paid requests. Live Oxford verification is pending credentials.

## Verification

```sh
npm test
npm run test:browser
# Focused curriculum UI checks, after npm run build:
npm run test:curriculum:browser
# Focused dictionary checks, after npm run build:
npm run test:dictionary:browser
```

The API suite verifies classroom interactions, role rules within the demo, booking capacity, all 36 class/board combinations, all 20 quiz answer keys, homework review, mood validation, textbook mapping, live events, assignment tracking, project milestones, weighted scheduling and conflict checks, all eight language answer keys, source validation, portfolio feedback, database persistence across restarts, DIKSHA subject aliases/public chapter hierarchies, Collins catalogue routing and selected-class book links, missing content, publisher outages and cache expiry. Tests create isolated databases and leave the development classroom unchanged.

The browser smoke tests build the app and run isolated classrooms. They exercise student/tutor discussions, cross-browser chat, class/board selection, a rendered 3D scene, a recorded video that actually plays, homework submission/review, quiz results, progress, mood check-ins, dictionary search, assignment drafts and review, schedule generation/completion/conflicts, every language’s reading/writing/communication workflow, research draft persistence and feedback, profile isolation, all four featured curriculum subjects, Collins book links and saved preferences, provider outage/retry, Oxford meanings/synonyms and error handling, picture attribution and mobile layouts. Screenshots are written to `/tmp/smart-tutor-*.png`. Tests use `/usr/bin/chromium` when available, or `CHROMIUM_PATH`; otherwise install Playwright Chromium with `npx playwright install chromium`.

## Prototype boundaries

Profiles are deliberately selectable demo identities, not secure user authentication. Before opening this app to real students, add real sign-in, server-enforced account identities, classroom membership and access rules, and an appropriate deployment/backup strategy. Tutor-only actions enforce the role of the selected demo identity; anyone can choose that identity in this prototype.

Study sessions currently provide a shared text room. Live camera/audio tutoring, payments, automatic AI-generated answers, automatic emotion detection, and external video hosting are not implemented. Mood check-ins are explicit student input and do not attempt to diagnose a student. Animated explanation videos are generated locally from the concept model, with captions; they are not pre-recorded video lessons.

The classroom and curriculum directories work without external service keys. Oxford word lookup requires server-only Oxford Dictionaries credentials. Related word pictures do not require a key.

Language content is a beginner starter, not a complete fluency course or a textbook-aligned language syllabus. Communication reflections and confidence are student-reported; pronunciation, grammar, and source credibility are not automatically graded. Tutors provide qualitative feedback on completed portfolio activities. The planner estimates practice time rather than measuring time spent, and cannot guarantee that every deadline fits in the selected study window.
