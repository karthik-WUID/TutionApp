import { extraLessons, extraDictionary } from './starter-portions.mjs';
export const lessons = [
  {
    id: 'quadratics', subject: 'Mathematics', chapter: 1, title: 'Getting to know quadratic equations',
    description: 'From a curved ball’s flight to finding roots: make sense of equations with a squared term.',
    symbol: 'x² + bx + c', duration: 20, skill: 'Algebra & problem solving',
    introduction: 'A quadratic equation has the form ax² + bx + c = 0, where a is not zero. The highest power of x is two. Its graph is a parabola, a smooth U-shaped curve. The roots are the x-values where this curve crosses the horizontal axis.',
    sections: [
      { title: 'Start with the shape', body: 'In y = x², positive and negative x-values give the same positive y-value. That symmetry creates a U-shaped graph. Adding terms moves or stretches the curve, but it stays a parabola.' },
      { title: 'Find the roots by factoring', body: 'For x² − 5x + 6 = 0, find two numbers that multiply to 6 and add to −5: −2 and −3. So (x − 2)(x − 3) = 0. At least one factor must be zero; the roots are 2 and 3.' },
      { title: 'When factoring is tricky', body: 'The quadratic formula is x = (−b ± √(b² − 4ac)) / 2a. The expression b² − 4ac is the discriminant. Positive means two distinct real roots, zero means one repeated real root, and negative means no real roots.' },
    ],
    example: { title: 'A garden with a little mystery', body: 'A rectangular garden is 2 metres longer than it is wide. Its area is 15 m². Let the width be x: x(x + 2) = 15, so x² + 2x − 15 = 0. Factoring gives (x + 5)(x − 3) = 0. A width cannot be negative, so the garden is 3 m wide and 5 m long.' },
    animation: ['A parabola shows how a squared term creates a curve.', 'Move from left to right: both sides rise away from the vertex.', 'The roots are where the curve touches the horizontal axis.', 'Two roots, one repeated root, or no real roots: the discriminant tells us.'],
    fun: { question: 'Why did the parabola bring two friends to the party?', answer: 'Because it had two roots to introduce! For x² − 5x + 6, those friends are x = 2 and x = 3. Can you factor their invitation?' },
    homework: [
      { id: 'q-written', kind: 'written', question: 'Explain, in your own words, how factoring helps you find the roots of x² − 5x + 6 = 0.' },
      { id: 'q-word-1', kind: 'oneword', question: 'What is the shape of the graph of a quadratic function?' },
      { id: 'q-word-2', kind: 'oneword', question: 'What is the highest power of x in a quadratic equation?' },
      { id: 'q-word-3', kind: 'oneword', question: 'What do we call b² − 4ac?' },
      { id: 'q-book-1', kind: 'bookback', question: 'Solve x² − 7x + 12 = 0 by factorisation. Show each step.' },
      { id: 'q-book-2', kind: 'bookback', question: 'A rectangle has width x and length x + 1. Its area is 12 cm². Form a quadratic equation and find the dimensions.' },
    ],
    questions: [
      { prompt: 'Which equation is quadratic?', options: ['3x + 4 = 0', 'x² − 5x + 6 = 0', 'x³ + 2 = 0', '4 = 4'], answer: 1, explanation: 'A quadratic equation has a non-zero x² term as its highest power.' },
      { prompt: 'The roots of x² − 5x + 6 = 0 are…', options: ['−2 and −3', '1 and 6', '2 and 3', '5 and 6'], answer: 2, explanation: '(x − 2)(x − 3) = 0, so x = 2 or x = 3.' },
      { prompt: 'What does a positive discriminant tell us?', options: ['No real roots', 'One repeated real root', 'Two distinct real roots', 'The graph is a straight line'], answer: 2, explanation: 'When b² − 4ac is positive, its square root gives two different real solutions.' },
      { prompt: 'What is the vertex of y = x²?', options: ['(0, 0)', '(1, 1)', '(0, 1)', '(−1, 0)'], answer: 0, explanation: 'The smallest value of x² is zero, reached at x = 0. The vertex is (0, 0).' },
      { prompt: 'Which roots fit x² − 9 = 0?', options: ['Only 3', 'Only −3', '0 and 9', '3 and −3'], answer: 3, explanation: 'Both 3² and (−3)² equal 9. Factoring gives (x − 3)(x + 3) = 0.' },
    ],
  },
  {
    id: 'newton', subject: 'Physics', chapter: 1, title: 'Newton’s laws, in real life',
    description: 'Discover why a football moves, why seat belts matter, and why rockets lift off.',
    symbol: 'F = ma', duration: 18, skill: 'Forces & scientific reasoning',
    introduction: 'Newton’s three laws connect forces with motion. A force is a push or pull. The net force is the total effect of all the forces acting on an object. These laws help explain everyday movement, from a rolling ball to a launching rocket.',
    sections: [
      { title: 'First law: things resist a change', body: 'An object stays at rest or keeps moving at constant velocity unless an unbalanced force acts on it. This tendency is inertia. When a car brakes, your body tends to keep moving; a seat belt provides the force that slows you safely.' },
      { title: 'Second law: force, mass, acceleration', body: 'F = ma means net force equals mass times acceleration. The same push accelerates a light trolley more than a heavy one. Double the net force on the same mass, and the acceleration doubles.' },
      { title: 'Third law: forces come in pairs', body: 'For every action force there is an equal and opposite reaction force. These forces act on different objects, so they do not cancel on one object. A rocket pushes gases downward; the gases push the rocket upward.' },
    ],
    example: { title: 'The shopping-trolley challenge', body: 'Push a 10 kg trolley with a net force of 20 N. Its acceleration is a = F/m = 2 m/s². Add groceries until its mass is 20 kg. With the same net force, its acceleration becomes 1 m/s². More mass needs more force for the same acceleration.' },
    animation: ['The ball stays at rest until a push acts on it: inertia.', 'A force starts the ball moving along the track.', 'A greater force produces a greater acceleration for the same mass.', 'Every push has an equal opposite partner acting on another object.'],
    fun: { question: 'Why does a lazy football refuse to move until you kick it?', answer: 'It is a huge fan of Newton’s first law! A ball at rest stays at rest until an unbalanced force gives it a reason to move. That’s inertia, not laziness.' },
    homework: [
      { id: 'n-written', kind: 'written', question: 'Explain why you lean forward when a moving bus suddenly stops. Name the law involved.' },
      { id: 'n-word-1', kind: 'oneword', question: 'What is the tendency to resist a change in motion called?' },
      { id: 'n-word-2', kind: 'oneword', question: 'What is the SI unit of force?' },
      { id: 'n-word-3', kind: 'oneword', question: 'What is the rate of change of velocity called?' },
      { id: 'n-book-1', kind: 'bookback', question: 'A net force of 15 N acts on a mass of 3 kg. Find the acceleration and show your working.' },
      { id: 'n-book-2', kind: 'bookback', question: 'Explain how a swimmer moves forward by pushing water backward. Why do the forces not cancel?' },
    ],
    questions: [
      { prompt: 'Which property resists a change in motion?', options: ['Speed', 'Inertia', 'Temperature', 'Colour'], answer: 1, explanation: 'Inertia is the tendency of an object to resist a change in its state of motion.' },
      { prompt: 'A 2 kg object has a net force of 10 N. Its acceleration is…', options: ['20 m/s²', '0.2 m/s²', '5 m/s²', '12 m/s²'], answer: 2, explanation: 'a = F/m = 10/2 = 5 m/s².' },
      { prompt: 'Action and reaction forces act on…', options: ['The same object', 'Different objects', 'Only moving objects', 'Only objects in air'], answer: 1, explanation: 'Third-law force pairs act on different objects. They cannot cancel the net force on a single object.' },
      { prompt: 'Double the mass while keeping net force constant. Acceleration…', options: ['Doubles', 'Stays the same', 'Becomes zero', 'Halves'], answer: 3, explanation: 'From a = F/m, doubling the mass halves acceleration when force stays the same.' },
      { prompt: 'What makes a rocket move upward?', options: ['There is no gravity', 'Air holds it up', 'Expelled gas pushes the rocket upward', 'Its mass increases'], answer: 2, explanation: 'The rocket pushes gases downward and those gases exert an equal, opposite force upward on the rocket.' },
    ],
  },
  {
    id: 'bonds', subject: 'Chemistry', chapter: 1, title: 'Atoms make better bonds together',
    description: 'Understand how sharing or transferring electrons helps atoms form compounds.',
    symbol: 'H · + · H', duration: 16, skill: 'Atomic structure & bonding',
    introduction: 'Atoms form chemical bonds through interactions involving their outer electrons. Two useful models are ionic bonding, where electrons transfer and charged ions attract, and covalent bonding, where atoms share electron pairs. These models explain why different substances have different properties.',
    sections: [
      { title: 'Get to know the outer electrons', body: 'The electrons in the outermost occupied shell are called valence electrons. They are the main participants in bonding. Many simple atoms become more stable with a filled outer shell; hydrogen needs two electrons in its first shell.' },
      { title: 'Ionic: transfer, then attraction', body: 'Sodium transfers one electron to chlorine. Sodium becomes a positive ion and chlorine becomes a negative ion. Their opposite charges attract. In salt, many ions form a repeating lattice, rather than separate two-atom molecules.' },
      { title: 'Covalent: a shared pair', body: 'Two hydrogen atoms each contribute one electron to a shared pair. Each gains access to two electrons in a covalent H₂ molecule. Sharing can involve one, two, or three pairs, producing single, double, or triple bonds.' },
    ],
    example: { title: 'A glass of water, a pinch of salt', body: 'The hydrogen and oxygen atoms in water are held by covalent bonds. Table salt has an ionic lattice of sodium and chloride ions. When salt dissolves, the ions can move in the water, so the solution can conduct electricity.' },
    animation: ['Each hydrogen atom starts with one electron.', 'As the atoms approach, their electron regions overlap.', 'The two electrons form a shared pair between the atoms.', 'Sharing makes the hydrogen molecule stable: a covalent bond.'],
    fun: { question: 'Why did the two hydrogen atoms become best friends?', answer: 'They decided to share instead of argue! Each brings one electron to a shared pair. Together they form H₂: chemistry’s smallest study group.' },
    homework: [
      { id: 'b-written', kind: 'written', question: 'Explain the difference between ionic and covalent bonding using sodium chloride and hydrogen as examples.' },
      { id: 'b-word-1', kind: 'oneword', question: 'What do we call the electrons in an atom’s outermost shell?' },
      { id: 'b-word-2', kind: 'oneword', question: 'What bond forms by sharing an electron pair?' },
      { id: 'b-word-3', kind: 'oneword', question: 'A negatively charged ion is called an…' },
      { id: 'b-book-1', kind: 'bookback', question: 'Describe what happens to the electrons and charges when sodium reacts with chlorine.' },
      { id: 'b-book-2', kind: 'bookback', question: 'Why can salt solution conduct electricity while a solid salt crystal cannot conduct well?' },
    ],
    questions: [
      { prompt: 'A covalent bond involves…', options: ['Sharing electrons', 'Only transferring electrons', 'Sharing protons', 'Removing the nucleus'], answer: 0, explanation: 'Covalent bonding involves shared electron pairs.' },
      { prompt: 'When sodium loses an electron, it becomes…', options: ['A negative ion', 'A positive ion', 'A neutron', 'A different element'], answer: 1, explanation: 'Losing a negative electron leaves sodium with a positive charge.' },
      { prompt: 'The electrons most involved in bonding are…', options: ['Inner-shell electrons', 'All electrons equally', 'Valence electrons', 'Free protons'], answer: 2, explanation: 'Valence electrons are in the outermost occupied shell and participate in bonding.' },
      { prompt: 'What attracts sodium and chloride ions?', options: ['Their colours', 'Equal positive charges', 'Gravity alone', 'Opposite electrical charges'], answer: 3, explanation: 'The positive sodium ion and negative chloride ion attract electrostatically.' },
      { prompt: 'In a hydrogen molecule, the atoms share…', options: ['One proton', 'A pair of electrons', 'A pair of neutrons', 'Two nuclei'], answer: 1, explanation: 'Each hydrogen contributes one electron, forming one shared pair.' },
    ],
  },
  {
    id: 'tenses', subject: 'English', chapter: 1, title: 'Time-travel with perfect tenses',
    description: 'Choose between “has been” and “had been” with a little help from a timeline.',
    symbol: 'then → now', duration: 15, skill: 'Grammar & clear communication',
    introduction: 'Perfect tenses connect an action with a reference point in time. The present perfect connects a past action with now. The past perfect looks backward from a point that is already in the past. Imagine a timeline: what happened first, and what moment are you talking about?',
    sections: [
      { title: 'Present perfect: a connection to now', body: 'Use has or have plus a past participle: “She has finished her homework.” The action happened before now, and the result matters now. “She has been studying for an hour” uses the present perfect continuous for an ongoing activity.' },
      { title: 'Past perfect: before another past moment', body: 'Use had plus a past participle: “She had finished before the class began.” Finishing came before another event in the past. “She had been studying for an hour when I arrived” focuses on an activity continuing up to that past moment.' },
      { title: 'Let the time words help', body: 'Since marks a starting point: “since Monday.” For marks a duration: “for three days.” Before, by the time, and when can help establish the order of past events. Avoid using the present perfect with a finished past time such as “yesterday.”' },
    ],
    example: { title: 'The homework detective', body: 'At 6 pm today: “I have finished my homework.” At 6 pm yesterday, looking back: “I had finished my homework before dinner.” The action can be similar; the reference time decides which perfect tense tells the story clearly.' },
    animation: ['Read the timeline from left to right: past, then, now.', 'Present perfect connects an earlier action to NOW.', 'Past perfect places one action before a second past event.', 'Choose the reference point first, then choose has/have or had.'],
    fun: { question: 'Why did the grammar detective carry a time machine?', answer: 'To find out who “had been” there before everyone else! “Has been” looks back from now; “had been” looks back from another moment in the past. Case closed.' },
    homework: [
      { id: 't-written', kind: 'written', question: 'Explain the difference between “She has finished” and “She had finished” using your own examples.' },
      { id: 't-word-1', kind: 'oneword', question: 'Complete: He ___ completed his work. (present perfect)' },
      { id: 't-word-2', kind: 'oneword', question: 'Complete: I had left ___ she arrived. (use a time connector)' },
      { id: 't-word-3', kind: 'oneword', question: 'Complete: We have waited ___ two hours. (since/for)' },
      { id: 't-book-1', kind: 'bookback', question: 'Write two present-perfect sentences and two past-perfect sentences. Explain the reference time in each.' },
      { id: 't-book-2', kind: 'bookback', question: 'Correct “I have seen that film yesterday” and explain why your version is more suitable.' },
    ],
    questions: [
      { prompt: 'Which sentence uses the present perfect?', options: ['She finishes daily.', 'She had finished.', 'She has finished.', 'She will finish.'], answer: 2, explanation: '“Has finished” uses has + past participle and connects the action to now.' },
      { prompt: 'Choose: By the time I arrived, they ___ left.', options: ['have', 'has', 'will', 'had'], answer: 3, explanation: 'Leaving happened before another past event, so use the past perfect: had left.' },
      { prompt: 'Choose: She has been studying ___ Monday.', options: ['for', 'since', 'during', 'by'], answer: 1, explanation: 'Since identifies the starting point. For would identify a duration.' },
      { prompt: 'Which sentence is best with a finished past time?', options: ['I have watched it yesterday.', 'I has watched it yesterday.', 'I watched it yesterday.', 'I watching it yesterday.'], answer: 2, explanation: 'Yesterday is a finished past time, so the simple past “watched” is appropriate.' },
      { prompt: '“Had been studying” looks back from…', options: ['A future event', 'Now only', 'An unspecified future', 'Another past moment'], answer: 3, explanation: 'The past perfect continuous describes an activity continuing up to a past reference point.' },
    ],
  },
];

export const dictionary = [
  { term: 'Quadratic', subject: 'Mathematics', lessonId: 'quadratics', meaning: 'An equation or expression whose highest variable power is two.', example: 'The equation x² + 2x − 15 = 0 can describe the dimensions of a garden.' },
  { term: 'Parabola', subject: 'Mathematics', lessonId: 'quadratics', meaning: 'The U-shaped curve made by a quadratic function.', example: 'Ignoring air resistance, a thrown ball follows a parabolic path under gravity.' },
  { term: 'Discriminant', subject: 'Mathematics', lessonId: 'quadratics', meaning: 'The expression b² − 4ac, which tells you the number of real roots of a quadratic.', example: 'For x² − 5x + 6, the discriminant is 25 − 24 = 1, so there are two real roots.' },
  { term: 'Root', subject: 'Mathematics', lessonId: 'quadratics', meaning: 'A value of the variable that makes an equation true when the expression equals zero.', example: 'x = 3 is a root of x² − 9 = 0 because 9 − 9 = 0.' },
  { term: 'Inertia', subject: 'Physics', lessonId: 'newton', meaning: 'The tendency of an object to resist changes in its state of motion.', example: 'When a bus brakes, your body tends to continue moving forward.' },
  { term: 'Acceleration', subject: 'Physics', lessonId: 'newton', meaning: 'The rate at which velocity changes over time, including direction changes.', example: 'A cyclist speeds up from 2 m/s to 6 m/s in 2 seconds: the average acceleration is 2 m/s².' },
  { term: 'Net force', subject: 'Physics', lessonId: 'newton', meaning: 'The combined effect of all forces on an object, taking directions into account.', example: 'If two people push a box with 10 N and 6 N in opposite directions, the net force is 4 N.' },
  { term: 'Newton', subject: 'Physics', lessonId: 'newton', meaning: 'The SI unit of force: the force that accelerates 1 kg by 1 m/s².', example: 'A 2 kg object accelerating at 3 m/s² needs a net force of 6 newtons.' },
  { term: 'Valence electrons', subject: 'Chemistry', lessonId: 'bonds', meaning: 'Electrons in an atom’s outermost occupied shell, important in chemical bonding.', example: 'Sodium has one valence electron, which it can transfer to chlorine.' },
  { term: 'Covalent bond', subject: 'Chemistry', lessonId: 'bonds', meaning: 'A chemical bond involving a shared pair of electrons between atoms.', example: 'Two hydrogen atoms share two electrons to form a hydrogen molecule, H₂.' },
  { term: 'Ion', subject: 'Chemistry', lessonId: 'bonds', meaning: 'An atom or group of atoms with an electrical charge because it has gained or lost electrons.', example: 'Sodium loses an electron to become Na⁺; chlorine gains one to become Cl⁻.' },
  { term: 'Ionic bond', subject: 'Chemistry', lessonId: 'bonds', meaning: 'The attraction between oppositely charged ions.', example: 'Positive sodium ions and negative chloride ions form the lattice in table salt.' },
  { term: 'Present perfect', subject: 'English', lessonId: 'tenses', meaning: 'Has/have plus a past participle, connecting an earlier action with now.', example: '“I have finished my homework” tells us the homework is complete now.' },
  { term: 'Past perfect', subject: 'English', lessonId: 'tenses', meaning: 'Had plus a past participle, placing one action before another past moment.', example: '“I had eaten before the train arrived” shows that eating happened first.' },
  { term: 'Past participle', subject: 'English', lessonId: 'tenses', meaning: 'The verb form used with perfect tenses and passive constructions.', example: '“Written” is the past participle of “write”: “She has written a story.”' },
  { term: 'Duration', subject: 'English', lessonId: 'tenses', meaning: 'The length of time an action or state continues.', example: '“For two hours” describes a duration; “since noon” describes a starting point.' },
];

lessons.forEach((l) => { l.minGrade = 9; l.maxGrade = 10; });
lessons.push(...extraLessons);
dictionary.push(...extraDictionary);
export function publicLessons(selected = lessons) {
  return selected.map(({ questions, words, ...lesson }) => ({ ...lesson, questions: questions.map(({ answer, explanation, ...q }) => q) }));
}
