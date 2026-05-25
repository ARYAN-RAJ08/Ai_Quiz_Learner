const CodingChallenge = require('../models/CodingChallenge');
const CodingAttempt = require('../models/CodingAttempt');
const vm = require('vm');
const axios = require('axios');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const LANG_IDS = { javascript: 63, python: 71, java: 62, cpp: 54 };
const JUDGE0_URL = 'https://ce.judge0.com';

// ─── AI Generate ─────────────────────────────────────────────────────────────
const generateCodingChallenges = async (req, res) => {
    try {
        const { prompt, language = 'javascript', difficulty = 'medium', count = 3, targetClass = '' } = req.body;
        if (!prompt?.trim()) return res.status(400).json({ message: 'Prompt is required' });
        const safeCount = Math.min(Math.max(parseInt(count) || 3, 1), 5);
        const aiPrompt = `You are an expert coding challenge creator. Generate exactly ${safeCount} coding challenges.
Prompt: "${prompt}"
Language: ${language}, Difficulty: ${difficulty}${targetClass ? `, Target Class: ${targetClass}` : ''}

Return ONLY a valid JSON array:
[{"title":"Challenge title","description":"Clear description with examples.\\nInput: describe\\nOutput: describe\\nExample:\\nInput: 5\\nOutput: 25","starterCode":"// Write solution here\\nfunction solution(n) {\\n  // your code\\n}","solution":"function solution(n) {\\n  return n * n;\\n}","testCases":[{"input":"5","expectedOutput":"25","isHidden":false},{"input":"10","expectedOutput":"100","isHidden":false},{"input":"3","expectedOutput":"9","isHidden":true}],"tags":["math"]}]

Rules: Generate exactly ${safeCount} challenges. starterCode has empty body. solution is complete. At least 3 test cases each. Return ONLY JSON array.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: aiPrompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 4000,
        });
        const raw = completion.choices[0]?.message?.content?.trim();
        const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('AI returned invalid response');
        const challenges = JSON.parse(match[0]);
        if (!Array.isArray(challenges) || challenges.length === 0) throw new Error('No challenges generated');
        const valid = challenges.filter(c => c.title && c.description && c.starterCode && c.solution && Array.isArray(c.testCases))
            .map(c => ({ title: c.title?.trim(), description: c.description?.trim(), starterCode: c.starterCode?.trim(), solution: c.solution?.trim(), testCases: c.testCases.map(tc => ({ input: String(tc.input || ''), expectedOutput: String(tc.expectedOutput || ''), isHidden: tc.isHidden || false })), tags: Array.isArray(c.tags) ? c.tags : [], difficulty, language, targetClass, timeLimit: 5 }));
        if (valid.length === 0) throw new Error('No valid challenges after validation');
        res.json({ challenges: valid, meta: { prompt, language, difficulty, count: valid.length } });
    } catch (err) {
        console.error('[generateCodingChallenges]', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ─── Run/Submit ───────────────────────────────────────────────────────────────
const runViaJudge0 = async (code, language, input = '', timeLimit = 5) => {
    const languageId = LANG_IDS[language];
    if (!languageId) return { output: '', error: `Language "${language}" not supported` };
    try {
        const submitRes = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, { source_code: code, language_id: languageId, stdin: input, cpu_time_limit: timeLimit, wall_time_limit: timeLimit + 5 }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        const result = submitRes.data;
        const statusId = result.status?.id;
        if (statusId === 6) return { output: '', error: `Compilation Error:\n${result.compile_output || ''}` };
        if (statusId === 5) return { output: '', error: 'Time Limit Exceeded' };
        if (statusId >= 7 && statusId <= 12) return { output: '', error: `Runtime Error:\n${result.stderr || ''}` };
        return { output: (result.stdout || '').trim(), error: result.stderr ? result.stderr.trim() : null };
    } catch (err) {
        if (language === 'javascript') return runJS(code, input);
        return { output: '', error: 'Code execution service unavailable.' };
    }
};

const runJS = (code, input, timeLimit = 5000) => new Promise((resolve) => {
    try {
        const logs = [];
        const sandbox = { console: { log: (...args) => logs.push(args.map(String).join(' ')) }, input, setTimeout: undefined, setInterval: undefined, fetch: undefined, require: undefined, process: undefined };
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox, { timeout: timeLimit });
        resolve({ output: logs.join('\n'), error: null });
    } catch (err) { resolve({ output: '', error: err.message }); }
});

const runCode = async (req, res) => {
    try {
        const { challengeId, code, language } = req.body;
        const challenge = await CodingChallenge.findById(challengeId);
        if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
        const results = [];
        for (const tc of challenge.testCases.filter(t => !t.isHidden)) {
            const { output, error } = await runViaJudge0(code, language, tc.input, challenge.timeLimit);
            results.push({ input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: error || output, passed: !error && output.trim() === tc.expectedOutput.trim() });
        }
        res.json({ results });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const submitCode = async (req, res) => {
    try {
        const { challengeId, code, language } = req.body;
        const challenge = await CodingChallenge.findById(challengeId);
        if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
        let passed = 0; const total = challenge.testCases.length; const start = Date.now();
        for (const tc of challenge.testCases) { const { output, error } = await runViaJudge0(code, language, tc.input, challenge.timeLimit); if (!error && output.trim() === tc.expectedOutput.trim()) passed++; }
        const executionTime = Date.now() - start;
        const status = passed === total ? 'passed' : passed > 0 ? 'partial' : 'failed';
        const attempt = await CodingAttempt.create({ studentId: req.user._id, challengeId, code, language, testsPassed: passed, totalTests: total, status, executionTime });
        await CodingChallenge.findByIdAndUpdate(challengeId, { $inc: { totalAttempts: 1 } });
        res.status(201).json({ attempt, testsPassed: passed, totalTests: total, status });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const getChallenges = async (req, res) => { try { res.json(await CodingChallenge.find({ isPublished: true }).populate('teacherId', 'name').select('-testCases -solution -starterCode').sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ message: err.message }); } };

const getTeacherChallenges = async (req, res) => { try { res.json(await CodingChallenge.find({ teacherId: req.user._id }).sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ message: err.message }); } };

const getChallengeById = async (req, res) => { try { const challenge = await CodingChallenge.findById(req.params.id).populate('teacherId', 'name'); if (!challenge) return res.status(404).json({ message: 'Challenge not found' }); if (req.user.role === 'student') { challenge.testCases = challenge.testCases.filter(t => !t.isHidden); challenge.solution = undefined; } res.json(challenge); } catch (err) { res.status(500).json({ message: err.message }); } };

// ─── FIXED: isPublished defaults to true so students can see challenges ───────
const createChallenge = async (req, res) => {
    try {
        res.status(201).json(await CodingChallenge.create({
            ...req.body,
            teacherId: req.user._id,
            isPublished: req.body.isPublished ?? true
        }));
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteChallenge = async (req, res) => { try { await CodingChallenge.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id }); res.json({ message: 'Deleted' }); } catch (err) { res.status(500).json({ message: err.message }); } };

const updateChallenge = async (req, res) => { try { res.json(await CodingChallenge.findOneAndUpdate({ _id: req.params.id, teacherId: req.user._id }, req.body, { new: true })); } catch (err) { res.status(500).json({ message: err.message }); } };

const getMyAttempts = async (req, res) => { try { res.json(await CodingAttempt.find({ studentId: req.user._id }).populate('challengeId', 'title difficulty language').sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ message: err.message }); } };

module.exports = { generateCodingChallenges, runCode, submitCode, getChallenges, getTeacherChallenges, getChallengeById, createChallenge, deleteChallenge, updateChallenge, getMyAttempts };