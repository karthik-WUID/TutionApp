// Original beginner practice, with explicit translations and server-graded reading questions.
const course = (id, name, native, locale, phrases, text, translation, questions, writing, scenario) => ({ id, name, native, locale, phrases, text, translation, questions, writing, scenario });
export const languages = [
  course('english', 'English', 'English', 'en-IN', [
    ['Hello!', 'Hello!', 'A friendly greeting'], ['How are you?', 'How are you?', 'Ask how someone feels'], ['Thank you.', 'Thank you.', 'Show appreciation'], ['Please explain again.', 'Please explain again.', 'Ask for help'],
  ], 'Hello! My name is Maya. I live in Chennai. I like reading books. Every evening, I read with my brother.', 'Maya introduces herself, says where she lives, and describes reading with her brother in the evening.', [
    { prompt: 'Where does Maya live?', options: ['Chennai', 'Paris', 'Tokyo'], answer: 0, explanation: 'The passage says, “I live in Chennai.”' },
    { prompt: 'When does Maya read?', options: ['Every morning', 'Every evening', 'Only on Sunday'], answer: 1, explanation: 'Maya reads with her brother every evening.' },
  ], 'Introduce yourself in 4–6 sentences. Include your name, where you live, a hobby, and a learning goal.', 'Introduce yourself to a new classmate. Greet them, share a hobby, and ask about theirs.'),
  course('hindi', 'Hindi', 'हिन्दी', 'hi-IN', [
    ['नमस्ते।', 'Namaste.', 'Hello.'], ['आप कैसे हैं?', 'Aap kaise hain?', 'How are you?'], ['धन्यवाद।', 'Dhanyavaad.', 'Thank you.'], ['फिर से समझाइए।', 'Phir se samjhaaiye.', 'Please explain again.'],
  ], 'नमस्ते। मेरा नाम मीरा है। मैं चेन्नई में रहती हूँ। मुझे किताबें पढ़ना पसंद है। मैं हर शाम पढ़ती हूँ।', 'Hello. My name is Meera. I live in Chennai. I like reading books. I read every evening.', [
    { prompt: 'What is the speaker’s name?', options: ['Meera', 'Ravi', 'Anu'], answer: 0, explanation: 'मेरा नाम मीरा है means “My name is Meera.”' },
    { prompt: 'What does she enjoy?', options: ['Cooking', 'Reading books', 'Swimming'], answer: 1, explanation: 'किताबें पढ़ना means “reading books.”' },
  ], 'Introduce yourself using मेरा नाम … है। Add a greeting and something you enjoy. Native script or transliteration is welcome.', 'Greet a classmate with नमस्ते, introduce yourself, and thank them for helping you.'),
  course('tamil', 'Tamil', 'தமிழ்', 'ta-IN', [
    ['வணக்கம்.', 'Vanakkam.', 'Hello.'], ['நீங்கள் எப்படி இருக்கிறீர்கள்?', 'Neengal eppadi irukkireergal?', 'How are you?'], ['நன்றி.', 'Nandri.', 'Thank you.'], ['மீண்டும் விளக்குங்கள்.', 'Meendum vilakkungal.', 'Please explain again.'],
  ], 'வணக்கம். என் பெயர் மீனா. நான் சென்னையில் வசிக்கிறேன். எனக்கு புத்தகங்கள் படிக்கப் பிடிக்கும். நான் தினமும் மாலையில் படிப்பேன்.', 'Hello. My name is Meena. I live in Chennai. I like reading books. I read every evening.', [
    { prompt: 'Where does Meena live?', options: ['Chennai', 'Delhi', 'Kochi'], answer: 0, explanation: 'சென்னையில் வசிக்கிறேன் means “I live in Chennai.”' },
    { prompt: 'When does Meena read?', options: ['At midnight', 'Every evening', 'Only on Fridays'], answer: 1, explanation: 'தினமும் மாலையில் means “every evening.”' },
  ], 'Write a greeting, your name using என் பெயர் …, and one thing you like. You may start with transliteration.', 'Say வணக்கம், introduce yourself, and ask for a concept to be explained again politely.'),
  course('malayalam', 'Malayalam', 'മലയാളം', 'ml-IN', [
    ['നമസ്കാരം.', 'Namaskaaram.', 'Hello.'], ['സുഖമാണോ?', 'Sukhamaano?', 'How are you?'], ['നന്ദി.', 'Nandi.', 'Thank you.'], ['വീണ്ടും വിശദീകരിക്കാമോ?', 'Veendum vishadeekarikkaamo?', 'Could you explain again?'],
  ], 'നമസ്കാരം. എന്റെ പേര് മീന. ഞാൻ കൊച്ചിയിൽ താമസിക്കുന്നു. എനിക്ക് പുസ്തകങ്ങൾ വായിക്കാൻ ഇഷ്ടമാണ്. ഞാൻ എല്ലാ വൈകുന്നേരവും വായിക്കുന്നു.', 'Hello. My name is Meena. I live in Kochi. I like reading books. I read every evening.', [
    { prompt: 'Where does the speaker live?', options: ['Kochi', 'Chennai', 'Paris'], answer: 0, explanation: 'കൊച്ചിയിൽ താമസിക്കുന്നു means “I live in Kochi.”' },
    { prompt: 'What does she like?', options: ['Dancing', 'Reading books', 'Football'], answer: 1, explanation: 'പുസ്തകങ്ങൾ വായിക്കാൻ means “reading books.”' },
  ], 'Introduce yourself using എന്റെ പേര് … . Add a greeting and a sentence about a hobby, in script or transliteration.', 'Greet a new friend, tell them your name, and ask സുഖമാണോ?'),
  course('french', 'French', 'Français', 'fr-FR', [
    ['Bonjour !', 'Bon-zhoor', 'Hello!'], ['Comment allez-vous ?', 'Ko-mon ta-lay voo', 'How are you? (polite)'], ['Merci.', 'Mehr-see', 'Thank you.'], ['Pouvez-vous expliquer encore ?', 'Poo-vay voo eks-plee-kay on-kor', 'Can you explain again?'],
  ], 'Bonjour ! Je m’appelle Maya. J’habite à Paris. J’aime lire des livres. Je lis chaque soir avec mon frère.', 'Hello! My name is Maya. I live in Paris. I like reading books. I read every evening with my brother.', [
    { prompt: 'Where does Maya live?', options: ['Paris', 'Madrid', 'Tokyo'], answer: 0, explanation: 'J’habite à Paris means “I live in Paris.”' },
    { prompt: 'Who reads with Maya?', options: ['Her teacher', 'Her brother', 'Her cousin'], answer: 1, explanation: 'Mon frère means “my brother.”' },
  ], 'Start with Bonjour ! Je m’appelle … . Add where you live and a hobby using J’aime … .', 'Introduce yourself politely and ask a classmate what they enjoy.'),
  course('spanish', 'Spanish', 'Español', 'es-ES', [
    ['¡Hola!', 'O-la', 'Hello!'], ['¿Cómo estás?', 'Ko-mo es-tas', 'How are you?'], ['Gracias.', 'Gra-syas', 'Thank you.'], ['¿Puedes explicar otra vez?', 'Pweh-des eks-plee-kar o-tra ves', 'Can you explain again?'],
  ], '¡Hola! Me llamo Maya. Vivo en Madrid. Me gusta leer libros. Leo cada tarde con mi hermano.', 'Hello! My name is Maya. I live in Madrid. I like reading books. I read every evening with my brother.', [
    { prompt: 'Where does Maya live?', options: ['Madrid', 'Paris', 'Beijing'], answer: 0, explanation: 'Vivo en Madrid means “I live in Madrid.”' },
    { prompt: 'What does Maya enjoy?', options: ['Cooking', 'Reading books', 'Running'], answer: 1, explanation: 'Me gusta leer libros means “I like reading books.”' },
  ], 'Write ¡Hola! Me llamo … . Add where you live with Vivo en … and something you like.', 'Greet a classmate, introduce yourself, and ask ¿Cómo estás?'),
  course('japanese', 'Japanese', '日本語', 'ja-JP', [
    ['こんにちは。', 'Konnichiwa.', 'Hello.'], ['お元気ですか。', 'Ogenki desu ka.', 'How are you?'], ['ありがとうございます。', 'Arigatou gozaimasu.', 'Thank you.'], ['もう一度説明してください。', 'Mou ichido setsumei shite kudasai.', 'Please explain once more.'],
  ], 'こんにちは。私の名前はマヤです。東京に住んでいます。本を読むのが好きです。毎晩、兄と本を読みます。', 'Hello. My name is Maya. I live in Tokyo. I like reading books. Every evening I read with my older brother.', [
    { prompt: 'Where does Maya live?', options: ['Tokyo', 'Kyoto', 'Chennai'], answer: 0, explanation: '東京に住んでいます means “I live in Tokyo.”' },
    { prompt: 'Who reads with Maya?', options: ['Her teacher', 'Her older brother', 'Her neighbour'], answer: 1, explanation: '兄 means “older brother.”' },
  ], 'Introduce yourself with 私の名前は … です。 Add a greeting and a thank you. Script or romaji is welcome.', 'Greet someone, say your name, and politely ask them to explain again.'),
  course('mandarin', 'Mandarin Chinese', '普通话', 'zh-CN', [
    ['你好！', 'Nǐ hǎo!', 'Hello!'], ['你好吗？', 'Nǐ hǎo ma?', 'How are you?'], ['谢谢。', 'Xièxie.', 'Thank you.'], ['请再解释一遍。', 'Qǐng zài jiěshì yí biàn.', 'Please explain once more.'],
  ], '你好！我叫玛雅。我住在北京。我喜欢看书。我每天晚上和哥哥一起看书。', 'Hello! My name is Maya. I live in Beijing. I like reading books. Every evening I read with my older brother.', [
    { prompt: 'Where does Maya live?', options: ['Beijing', 'Shanghai', 'Tokyo'], answer: 0, explanation: '我住在北京 means “I live in Beijing.”' },
    { prompt: 'What does Maya like?', options: ['Singing', 'Reading books', 'Painting'], answer: 1, explanation: '我喜欢看书 means “I like reading books.”' },
  ], 'Write 你好！我叫 … . Add a thank you and a sentence about yourself. Chinese characters or pinyin is welcome.', 'Greet a classmate, introduce yourself, and practise saying thank you. Notice the tone marks in pinyin.'),
];
export const publicLanguages = () => languages.map((l) => ({ ...l, questions: l.questions.map(({ prompt, options }) => ({ prompt, options })) }));
