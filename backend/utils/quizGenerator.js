/**
 * Quiz Generator Core Function
 * Supports: MCQ, True/False, Fill-in-the-blank
 * Features: Retry logic, validation, difficulty calibration, multi-language
 */

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
const QUESTION_TYPES = ['mcq', 'truefalse', 'fillblank'];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const DIFFICULTY_GUIDELINES = {
    easy: 'basic recall, simple concepts, straightforward answers',
    medium: 'application of concepts, moderate reasoning required',
    hard: 'deep analysis, complex reasoning, edge cases, advanced concepts',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getModel = () => groq;

/**
 * Validate a single question object
 */
const validateQuestion = (q, type = 'mcq') => {
    if (!q.questionText || typeof q.questionText !== 'string' || q.questionText.trim().length < 5)
        return false;

    if (type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length !== 4) return false;
        if (q.options.some(o => !o || typeof o !== 'string' || o.trim().length === 0)) return false;
        if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) return false;
        // Check all options are unique
        const unique = new Set(q.options.map(o => o.toLowerCase().trim()));
        if (unique.size !== 4) return false;
    }

    if (type === 'truefalse') {
        if (typeof q.correctAnswer !== 'boolean' && q.correctAnswer !== 0 && q.correctAnswer !== 1) return false;
    }

    if (type === 'fillblank') {
        if (!q.answer || typeof q.answer !== 'string') return false;
    }

    return true;
};

/**
 * Sanitize and normalize a question
 */
const sanitizeQuestion = (q, type = 'mcq', difficulty = 'medium') => ({
    questionText: q.questionText?.trim(),
    options: type === 'mcq' ? q.options.map(o => o?.trim()) : undefined,
    correctAnswer: type === 'truefalse'
        ? (q.correctAnswer === true || q.correctAnswer === 1 ? 1 : 0)
        : q.correctAnswer,
    answer: type === 'fillblank' ? q.answer?.trim() : undefined,
    explanation: q.explanation?.trim() || '',
    difficulty: DIFFICULTY_LEVELS.includes(q.difficulty) ? q.difficulty : difficulty,
    type,
});

/**
 * Extract JSON array from raw AI response (handles markdown code blocks)
 */
const extractJSON = (raw) => {
    // Remove markdown code blocks if present
    const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in AI response');
    return JSON.parse(match[0]);
};

// ─── Prompt Builders ──────────────────────────────────────────────────────────

const buildMCQPrompt = ({ topic, count, difficulty, subject, targetClass, language }) => `
You are an expert quiz creator. Generate exactly ${count} multiple choice questions.

Topic: "${topic}"
${subject ? `Subject: ${subject}` : ''}
${targetClass ? `Target Class/Level: ${targetClass}` : ''}
Difficulty: ${difficulty} (${DIFFICULTY_GUIDELINES[difficulty]})
${language && language !== 'english' ? `Language: ${language}` : ''}

Return ONLY a valid JSON array with no extra text or markdown:
[
  {
    "questionText": "Clear, specific question?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct.",
    "difficulty": "${difficulty}"
  }
]

Rules:
- correctAnswer is the 0-based index of the correct option
- All 4 options must be distinct, plausible, and non-trivial
- Avoid "All of the above" or "None of the above"
- Questions must be unambiguous
- Return ONLY the JSON array
`.trim();

const buildTrueFalsePrompt = ({ topic, count, difficulty, subject, targetClass }) => `
Generate exactly ${count} True/False questions.

Topic: "${topic}"
${subject ? `Subject: ${subject}` : ''}
${targetClass ? `Level: ${targetClass}` : ''}
Difficulty: ${difficulty} (${DIFFICULTY_GUIDELINES[difficulty]})

Return ONLY a valid JSON array:
[
  {
    "questionText": "Statement to evaluate as true or false.",
    "correctAnswer": true,
    "explanation": "Why this is true/false.",
    "difficulty": "${difficulty}"
  }
]

Rules:
- correctAnswer must be boolean true or false
- Mix true and false answers roughly equally
- Statements must be factually verifiable
- Return ONLY the JSON array
`.trim();

const buildFillBlankPrompt = ({ topic, count, difficulty, subject, targetClass }) => `
Generate exactly ${count} fill-in-the-blank questions.

Topic: "${topic}"
${subject ? `Subject: ${subject}` : ''}
${targetClass ? `Level: ${targetClass}` : ''}
Difficulty: ${difficulty} (${DIFFICULTY_GUIDELINES[difficulty]})

Return ONLY a valid JSON array:
[
  {
    "questionText": "The capital of France is ___.",
    "answer": "Paris",
    "explanation": "Paris is the capital and largest city of France.",
    "difficulty": "${difficulty}"
  }
]

Rules:
- Use ___ to indicate the blank
- answer must be a single word or short phrase
- Return ONLY the JSON array
`.trim();

// ─── Core Generator ───────────────────────────────────────────────────────────

/**
 * Generate questions with retry logic
 * @param {string} prompt - The prompt to send to AI
 * @param {string} type - Question type: 'mcq' | 'truefalse' | 'fillblank'
 * @param {string} difficulty - Difficulty level
 * @param {number} expectedCount - Expected number of questions
 * @returns {Array} Validated and sanitized questions
 */
const generateWithRetry = async (prompt, type, difficulty, expectedCount) => {
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 4000,
});
const raw = completion.choices[0]?.message?.content?.trim();

            const parsed = extractJSON(raw);

            if (!Array.isArray(parsed) || parsed.length === 0)
                throw new Error('AI returned empty or non-array response');

            // Validate and sanitize each question
            const valid = parsed
                .filter(q => validateQuestion(q, type))
                .map(q => sanitizeQuestion(q, type, difficulty));

            if (valid.length === 0)
                throw new Error('No valid questions after validation');

            // Warn if fewer than expected but still return what we have
            if (valid.length < expectedCount)
                console.warn(`[QuizGenerator] Got ${valid.length}/${expectedCount} valid questions on attempt ${attempt}`);

            return valid;
        } catch (err) {
            lastError = err;
            console.error(`[QuizGenerator] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
            if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
        }
    }

    throw new Error(`Quiz generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main quiz generator function
 *
 * @param {Object} options
 * @param {string} options.topic          - Topic to generate questions on (required)
 * @param {number} [options.count=5]      - Number of questions (1-30)
 * @param {string} [options.difficulty]   - 'easy' | 'medium' | 'hard' (default: 'medium')
 * @param {string} [options.type]         - 'mcq' | 'truefalse' | 'fillblank' (default: 'mcq')
 * @param {string} [options.subject]      - Subject name for context
 * @param {string} [options.targetClass]  - Target class/level for context
 * @param {string} [options.language]     - Language for questions (default: 'english')
 * @param {boolean} [options.shuffle]     - Shuffle question order (default: false)
 *
 * @returns {Promise<{questions: Array, meta: Object}>}
 */
const generateQuiz = async ({
    topic,
    count = 5,
    difficulty = 'medium',
    type = 'mcq',
    subject = '',
    targetClass = '',
    language = 'english',
    shuffle = false,
} = {}) => {
    // ── Input validation ──
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0)
        throw new Error('Topic is required');

    const safeCount = Math.min(Math.max(parseInt(count) || 5, 1), 30);
    const safeDifficulty = DIFFICULTY_LEVELS.includes(difficulty) ? difficulty : 'medium';
    const safeType = QUESTION_TYPES.includes(type) ? type : 'mcq';

    const params = {
        topic: topic.trim(),
        count: safeCount,
        difficulty: safeDifficulty,
        subject: subject?.trim(),
        targetClass: targetClass?.trim(),
        language: language?.trim() || 'english',
    };

    // ── Build prompt based on type ──
    let prompt;
    if (safeType === 'truefalse') prompt = buildTrueFalsePrompt(params);
    else if (safeType === 'fillblank') prompt = buildFillBlankPrompt(params);
    else prompt = buildMCQPrompt(params);

    // ── Generate with retry ──
    let questions = await generateWithRetry(prompt, safeType, safeDifficulty, safeCount);

    // ── Trim to requested count ──
    questions = questions.slice(0, safeCount);

    // ── Shuffle if requested ──
    if (shuffle) {
        questions = questions.sort(() => Math.random() - 0.5);
    }

    return {
        questions,
        meta: {
            topic: params.topic,
            subject: params.subject,
            targetClass: params.targetClass,
            difficulty: safeDifficulty,
            type: safeType,
            requested: safeCount,
            generated: questions.length,
            language: params.language,
        },
    };
};

/**
 * Generate a mixed quiz with multiple difficulty levels
 * Useful for comprehensive tests
 *
 * @param {Object} options
 * @param {string} options.topic
 * @param {number} [options.easyCount=3]
 * @param {number} [options.mediumCount=4]
 * @param {number} [options.hardCount=3]
 * @param {string} [options.subject]
 * @param {string} [options.targetClass]
 */
const generateMixedQuiz = async ({
    topic,
    easyCount = 3,
    mediumCount = 4,
    hardCount = 3,
    subject = '',
    targetClass = '',
} = {}) => {
    if (!topic) throw new Error('Topic is required');

    const [easy, medium, hard] = await Promise.all([
        easyCount > 0 ? generateQuiz({ topic, count: easyCount, difficulty: 'easy', subject, targetClass }) : { questions: [] },
        mediumCount > 0 ? generateQuiz({ topic, count: mediumCount, difficulty: 'medium', subject, targetClass }) : { questions: [] },
        hardCount > 0 ? generateQuiz({ topic, count: hardCount, difficulty: 'hard', subject, targetClass }) : { questions: [] },
    ]);

    const questions = [...easy.questions, ...medium.questions, ...hard.questions];

    return {
        questions,
        meta: {
            topic,
            subject,
            targetClass,
            type: 'mixed',
            generated: questions.length,
            breakdown: {
                easy: easy.questions.length,
                medium: medium.questions.length,
                hard: hard.questions.length,
            },
        },
    };
};

module.exports = { generateQuiz, generateMixedQuiz, validateQuestion, sanitizeQuestion };
