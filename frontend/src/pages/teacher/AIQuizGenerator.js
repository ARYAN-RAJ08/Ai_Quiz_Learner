/**
 * AIQuizGenerator.js
 * Teacher page: AI-powered question generation + scheduling.
 *
 * Route: /teacher/ai-generator
 * Role:  teacher (protected)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { generateAIQuestions, scheduleAIQuiz } from '../../utils/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_OPTIONS = [
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12',
    'College 1st Year', 'College 2nd Year', 'College 3rd Year', 'College 4th Year',
];

const SUBJECT_OPTIONS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'English', 'Hindi', 'History', 'Geography',
    'Computer Science', 'Economics', 'Political Science',
    'Environmental Science', 'Other',
];

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const TYPE_OPTIONS       = ['mcq', 'truefalse', 'fillblank'];

const STEP = { PROMPT: 1, PREVIEW: 2, SCHEDULE: 3 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toLocalDatetimeValue = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const minScheduledAt = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5); // at least 5 min in future
    return toLocalDatetimeValue(d);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = ({ label, color = '#6366f1' }) => (
    <span style={{
        display: 'inline-block', fontSize: 11, fontWeight: 600,
        padding: '2px 8px', borderRadius: 99,
        background: color + '20', color,
        textTransform: 'uppercase', letterSpacing: 0.5,
    }}>{label}</span>
);

const StepIndicator = ({ current }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {[
            { n: 1, label: 'Prompt' },
            { n: 2, label: 'Preview & Edit' },
            { n: 3, label: 'Schedule' },
        ].map(({ n, label }, idx) => (
            <React.Fragment key={n}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 15,
                        background: current >= n ? 'var(--primary)' : 'var(--border)',
                        color: current >= n ? '#fff' : 'var(--text-muted)',
                        transition: 'all 0.3s',
                    }}>{current > n ? '✓' : n}</div>
                    <span style={{ fontSize: 11, color: current >= n ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                </div>
                {idx < 2 && (
                    <div style={{
                        flex: 1, height: 2, marginBottom: 18,
                        background: current > n ? 'var(--primary)' : 'var(--border)',
                        transition: 'background 0.3s',
                    }} />
                )}
            </React.Fragment>
        ))}
    </div>
);

const FormField = ({ label, required, children, hint }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
            {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
        {children}
        {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
);

const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text)', fontSize: 14, transition: 'border 0.2s',
};

const btnPrimary = {
    padding: '11px 28px', borderRadius: 10, border: 'none',
    background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    transition: 'opacity 0.2s',
};

const btnOutline = {
    padding: '11px 28px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'transparent',
    color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
};

// ─── Question Editor Card ─────────────────────────────────────────────────────

const QuestionCard = ({ q, idx, total, onChange, onRemove }) => {
    const [expanded, setExpanded] = useState(true);

    const diffColor = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
                background: 'var(--card)', borderRadius: 14,
                border: '1.5px solid var(--border)', marginBottom: 14, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 18px', cursor: 'pointer',
                    borderBottom: expanded ? '1px solid var(--border)' : 'none',
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--primary)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, flexShrink: 0,
                    }}>{idx + 1}</span>
                    <span style={{
                        fontWeight: 600, fontSize: 14, color: 'var(--text)',
                        maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {q.questionText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Untitled question</span>}
                    </span>
                    <Badge label={q.difficulty || 'medium'} color={diffColor[q.difficulty] || '#6366f1'} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {total > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
                            title="Remove question"
                        >🗑</button>
                    )}
                    <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
                </div>
            </div>

            {/* Body */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: 18 }}>
                            {/* Question text */}
                            <FormField label="Question">
                                <textarea
                                    rows={2}
                                    value={q.questionText}
                                    onChange={(e) => onChange('questionText', e.target.value)}
                                    placeholder="Enter question text…"
                                    style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                                />
                            </FormField>

                            {/* Options (MCQ) */}
                            {q.type !== 'truefalse' && q.type !== 'fillblank' && Array.isArray(q.options) && (
                                <FormField label="Options (click radio to set correct answer)">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {q.options.map((opt, oi) => (
                                            <div key={oi} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '8px 12px', borderRadius: 8,
                                                border: `1.5px solid ${q.correctAnswer === oi ? 'var(--success)' : 'var(--border)'}`,
                                                background: q.correctAnswer === oi ? 'rgba(16,185,129,0.07)' : 'var(--surface)',
                                            }}>
                                                <input
                                                    type="radio"
                                                    name={`correct-${idx}`}
                                                    checked={q.correctAnswer === oi}
                                                    onChange={() => onChange('correctAnswer', oi)}
                                                    style={{ accentColor: 'var(--success)', cursor: 'pointer' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const opts = [...q.options];
                                                        opts[oi] = e.target.value;
                                                        onChange('options', opts);
                                                    }}
                                                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                    style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </FormField>
                            )}

                            {/* True/False */}
                            {q.type === 'truefalse' && (
                                <FormField label="Correct Answer">
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        {['True', 'False'].map((label, vi) => (
                                            <label key={vi} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                                                <input
                                                    type="radio"
                                                    checked={q.correctAnswer === vi}
                                                    onChange={() => onChange('correctAnswer', vi)}
                                                    style={{ accentColor: 'var(--primary)' }}
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </FormField>
                            )}

                            {/* Fill in the blank */}
                            {q.type === 'fillblank' && (
                                <FormField label="Correct Answer">
                                    <input
                                        type="text"
                                        value={q.answer || ''}
                                        onChange={(e) => onChange('answer', e.target.value)}
                                        placeholder="Enter the correct answer…"
                                        style={inputStyle}
                                    />
                                </FormField>
                            )}

                            {/* Explanation + Difficulty */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                                <FormField label="Explanation (optional)">
                                    <input
                                        type="text"
                                        value={q.explanation || ''}
                                        onChange={(e) => onChange('explanation', e.target.value)}
                                        placeholder="Why is this the correct answer?"
                                        style={inputStyle}
                                    />
                                </FormField>
                                <FormField label="Difficulty">
                                    <select
                                        value={q.difficulty || 'medium'}
                                        onChange={(e) => onChange('difficulty', e.target.value)}
                                        style={{ ...inputStyle, width: 'auto', paddingRight: 32 }}
                                    >
                                        {DIFFICULTY_OPTIONS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </FormField>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AIQuizGenerator = () => {
    const navigate = useNavigate();

    // ── Step state ──
    const [step, setStep] = useState(STEP.PROMPT);

    // ── Prompt / generation config ──
    const [prompt,     setPrompt]     = useState('');
    const [subject,    setSubject]    = useState('');
    const [targetClass,setTargetClass]= useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [qType,      setQType]      = useState('mcq');
    const [qCount,     setQCount]     = useState(5);
    const [aiLoading,  setAiLoading]  = useState(false);

    // ── Generated questions (editable) ──
    const [questions,  setQuestions]  = useState([]);
    const [genMeta,    setGenMeta]    = useState(null);

    // ── Schedule / quiz metadata ──
    const [title,        setTitle]        = useState('');
    const [category,     setCategory]     = useState('');
    const [duration,     setDuration]     = useState(30);
    const [scheduledAt,  setScheduledAt]  = useState('');
    const [expiryTime,   setExpiryTime]   = useState('');
    const [saving,       setSaving]       = useState(false);

    // ─── Step 1: Generate ────────────────────────────────────────────────────

    const handleGenerate = async () => {
        if (!prompt.trim()) return toast.error('Please enter a prompt or topic');
        setAiLoading(true);
        try {
            const { data } = await generateAIQuestions({
                prompt,
                subject,
                targetClass,
                difficulty,
                type: qType,
                count: qCount,
            });

            const qs = (data.questions || []).map(q => ({ ...q, type: qType }));
            if (qs.length === 0) {
                toast.error('AI returned no questions — try rephrasing your prompt');
                return;
            }

            setQuestions(qs);
            setGenMeta(data.meta);

            // Pre-fill schedule form from parsed prompt
            if (data.parsedPrompt) {
                if (!subject && data.parsedPrompt.subject) setSubject(data.parsedPrompt.subject);
                if (!targetClass && data.parsedPrompt.targetClass) setTargetClass(data.parsedPrompt.targetClass);
            }

            // Pre-fill title suggestion
            const topicLabel = data.meta?.topic || prompt.slice(0, 40);
            setTitle(`AI Quiz: ${topicLabel}`);
            setCategory(data.meta?.subject || subject || 'General');

            toast.success(`✨ ${qs.length} questions generated!`);
            setStep(STEP.PREVIEW);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Generation failed — check your API key or try again');
        } finally {
            setAiLoading(false);
        }
    };

    // ─── Step 2: Edit questions ──────────────────────────────────────────────

    const updateQuestion = useCallback((idx, field, value) => {
        setQuestions(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    }, []);

    const removeQuestion = useCallback((idx) => {
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const addBlankQuestion = () => {
        setQuestions(prev => [...prev, {
            questionText: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            explanation: '',
            difficulty: 'medium',
            type: qType,
        }]);
    };

    // ─── Step 3: Save scheduled quiz ─────────────────────────────────────────

    const handleSchedule = async () => {
        if (!title.trim())       return toast.error('Quiz title is required');
        if (!scheduledAt)        return toast.error('Please select a date and time');
        if (questions.length === 0) return toast.error('Add at least one question');

        // Validate all questions have question text
        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].questionText?.trim())
                return toast.error(`Question ${i + 1} is missing text`);
        }

        setSaving(true);
        try {
            const payload = {
                title,
                description: `AI-generated quiz on ${genMeta?.topic || prompt}`,
                category: category || subject || 'General',
                subject,
                targetClass,
                questions: questions.map(({ type, ...q }) => ({
                    questionText: q.questionText,
                    options: q.options || ['True', 'False'],
                    correctAnswer: typeof q.correctAnswer === 'boolean'
                        ? (q.correctAnswer ? 0 : 1)
                        : (q.correctAnswer ?? 0),
                    explanation: q.explanation || '',
                    difficulty: q.difficulty || 'medium',
                })),
                duration,
                difficulty,
                scheduledAt: new Date(scheduledAt).toISOString(),
                expiryTime: expiryTime ? new Date(expiryTime).toISOString() : undefined,
            };

            const { data } = await scheduleAIQuiz(payload);
            toast.success(data.message || 'Quiz scheduled!');
            navigate('/teacher/quizzes');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to schedule quiz');
        } finally {
            setSaving(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px' }}>
            <div style={{ maxWidth: 820, margin: '0 auto' }}>

                {/* Page header */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <span style={{ fontSize: 32 }}>🤖</span>
                        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                            AI Question Generator
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
                        Generate quiz questions with AI, edit them, then schedule auto-publishing for your students.
                    </p>
                </motion.div>

                <StepIndicator current={step} />

                {/* ── STEP 1: Prompt ─────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {step === STEP.PROMPT && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            style={{ background: 'var(--card)', borderRadius: 18, padding: 28, border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)' }}
                        >
                            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📝 Describe Your Quiz</h2>

                            <FormField
                                label="Prompt"
                                required
                                hint='Try: "Create 5 questions from Math for Class 9" or "10 hard Physics MCQs on Optics"'
                            >
                                <textarea
                                    rows={3}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g. Create 5 questions from Math for Class 9"
                                    style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
                                />
                            </FormField>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <FormField label="Subject">
                                    <select value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle}>
                                        <option value="">Auto-detect from prompt</option>
                                        {SUBJECT_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </FormField>

                                <FormField label="Target Class">
                                    <select value={targetClass} onChange={e => setTargetClass(e.target.value)} style={inputStyle}>
                                        <option value="">Auto-detect from prompt</option>
                                        {CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </FormField>

                                <FormField label="Question Type">
                                    <select value={qType} onChange={e => setQType(e.target.value)} style={inputStyle}>
                                        <option value="mcq">Multiple Choice (MCQ)</option>
                                        <option value="truefalse">True / False</option>
                                        <option value="fillblank">Fill in the Blank</option>
                                    </select>
                                </FormField>

                                <FormField label="Difficulty">
                                    <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputStyle}>
                                        {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                                    </select>
                                </FormField>
                            </div>

                            <FormField label="Number of Questions" hint="1–30 questions">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <input
                                        type="range" min={1} max={30} value={qCount}
                                        onChange={e => setQCount(Number(e.target.value))}
                                        style={{ flex: 1, accentColor: 'var(--primary)' }}
                                    />
                                    <span style={{
                                        minWidth: 36, textAlign: 'center', fontWeight: 700,
                                        fontSize: 16, color: 'var(--primary)',
                                    }}>{qCount}</span>
                                </div>
                            </FormField>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleGenerate}
                                    disabled={aiLoading}
                                    style={{ ...btnPrimary, opacity: aiLoading ? 0.7 : 1, minWidth: 180 }}
                                >
                                    {aiLoading ? (
                                        <>
                                            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                                            Generating…
                                        </>
                                    ) : (
                                        <> ✨ Generate Questions </>
                                    )}
                                </motion.button>
                            </div>

                            {/* Quick examples */}
                            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>💡 QUICK EXAMPLES — click to use:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {[
                                        'Create 5 questions from Math for Class 9',
                                        '10 easy questions on Photosynthesis for Class 8',
                                        '7 hard questions on Newton\'s Laws for Class 11',
                                        'Create 8 questions from English Grammar for Class 6',
                                    ].map(ex => (
                                        <button
                                            key={ex}
                                            onClick={() => setPrompt(ex)}
                                            style={{
                                                padding: '6px 12px', borderRadius: 8,
                                                border: '1px solid var(--border)', background: 'var(--surface)',
                                                color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >{ex}</button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 2: Preview & Edit ─────────────────────────── */}
                    {step === STEP.PREVIEW && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                        >
                            {/* Meta banner */}
                            {genMeta && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #6366f115, #06b6d415)',
                                    border: '1.5px solid #6366f130',
                                    borderRadius: 14, padding: '14px 18px',
                                    marginBottom: 20,
                                    display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
                                }}>
                                    <div>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TOPIC</span>
                                        <p style={{ fontWeight: 700, margin: 0 }}>{genMeta.topic}</p>
                                    </div>
                                    {genMeta.subject && <div>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>SUBJECT</span>
                                        <p style={{ fontWeight: 700, margin: 0 }}>{genMeta.subject}</p>
                                    </div>}
                                    {genMeta.targetClass && <div>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CLASS</span>
                                        <p style={{ fontWeight: 700, margin: 0 }}>{genMeta.targetClass}</p>
                                    </div>}
                                    <div>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>GENERATED</span>
                                        <p style={{ fontWeight: 700, margin: 0 }}>{questions.length} questions</p>
                                    </div>
                                    <button
                                        onClick={() => { setStep(STEP.PROMPT); setQuestions([]); }}
                                        style={{ marginLeft: 'auto', ...btnOutline, fontSize: 12, padding: '6px 14px' }}
                                    >↩ Re-generate</button>
                                </div>
                            )}

                            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                                ✏️ Preview & Edit Questions
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 10 }}>
                                    All fields are editable
                                </span>
                            </h2>

                            <AnimatePresence>
                                {questions.map((q, idx) => (
                                    <QuestionCard
                                        key={idx}
                                        q={q}
                                        idx={idx}
                                        total={questions.length}
                                        onChange={(field, value) => updateQuestion(idx, field, value)}
                                        onRemove={() => removeQuestion(idx)}
                                    />
                                ))}
                            </AnimatePresence>

                            <button
                                onClick={addBlankQuestion}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: 12,
                                    border: '2px dashed var(--border)', background: 'transparent',
                                    color: 'var(--text-muted)', fontWeight: 600, fontSize: 14,
                                    cursor: 'pointer', marginBottom: 24,
                                    transition: 'all 0.2s',
                                }}
                            >+ Add Question Manually</button>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button onClick={() => setStep(STEP.PROMPT)} style={btnOutline}>← Back</button>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => {
                                        if (questions.some(q => !q.questionText?.trim()))
                                            return toast.error('All questions must have text');
                                        setStep(STEP.SCHEDULE);
                                    }}
                                    style={btnPrimary}
                                >
                                    Proceed to Schedule →
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 3: Schedule ───────────────────────────────── */}
                    {step === STEP.SCHEDULE && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            style={{ background: 'var(--card)', borderRadius: 18, padding: 28, border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)' }}
                        >
                            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📅 Schedule Quiz</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ gridColumn: '1/-1' }}>
                                    <FormField label="Quiz Title" required>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="e.g. Math Quiz — Chapter 5"
                                            style={inputStyle}
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Subject">
                                    <select value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle}>
                                        <option value="">Select subject</option>
                                        {SUBJECT_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </FormField>

                                <FormField label="Target Class">
                                    <select value={targetClass} onChange={e => setTargetClass(e.target.value)} style={inputStyle}>
                                        <option value="">Select class</option>
                                        {CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </FormField>

                                <FormField label="Category">
                                    <input
                                        type="text"
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        placeholder="e.g. Mathematics"
                                        style={inputStyle}
                                    />
                                </FormField>

                                <FormField label="Duration (minutes)">
                                    <input
                                        type="number"
                                        value={duration}
                                        min={5}
                                        max={300}
                                        onChange={e => setDuration(Number(e.target.value))}
                                        style={inputStyle}
                                    />
                                </FormField>

                                <FormField label="Publish Date & Time" required hint="Quiz becomes visible to students at this time">
                                    <input
                                        type="datetime-local"
                                        value={scheduledAt}
                                        min={minScheduledAt()}
                                        onChange={e => setScheduledAt(e.target.value)}
                                        style={inputStyle}
                                    />
                                </FormField>

                                <FormField label="Expiry Date & Time (optional)" hint="Quiz becomes inactive after this time">
                                    <input
                                        type="datetime-local"
                                        value={expiryTime}
                                        min={scheduledAt || minScheduledAt()}
                                        onChange={e => setExpiryTime(e.target.value)}
                                        style={inputStyle}
                                    />
                                </FormField>
                            </div>

                            {/* Summary */}
                            <div style={{
                                background: 'linear-gradient(135deg, #6366f110, #10b98110)',
                                border: '1.5px solid #6366f130',
                                borderRadius: 12, padding: 16, marginTop: 12, marginBottom: 20,
                            }}>
                                <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>📋 Quiz Summary</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                                    <span>Questions: <strong style={{ color: 'var(--text)' }}>{questions.length}</strong></span>
                                    <span>Difficulty: <Badge label={difficulty} /></span>
                                    <span>Type: <strong style={{ color: 'var(--text)' }}>{qType.toUpperCase()}</strong></span>
                                    <span>Duration: <strong style={{ color: 'var(--text)' }}>{duration} min</strong></span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button onClick={() => setStep(STEP.PREVIEW)} style={btnOutline}>← Back to Edit</button>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleSchedule}
                                    disabled={saving}
                                    style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, minWidth: 180 }}
                                >
                                    {saving ? '⟳ Saving…' : '📅 Schedule Quiz'}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                button:hover { opacity: 0.88; }
            `}</style>
        </div>
    );
};

export default AIQuizGenerator;
