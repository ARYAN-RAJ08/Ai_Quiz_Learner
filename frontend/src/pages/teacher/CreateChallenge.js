import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { createChallenge, getTeacherChallenges, deleteChallenge, generateAICodingChallenges } from '../../utils/api';
import Loader from '../../components/Loader';

const CLASS_OPTIONS = ['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12','College 1st Year','College 2nd Year','College 3rd Year','College 4th Year'];
const emptyTC = () => ({ input: '', expectedOutput: '', isHidden: false });
const emptyForm = () => ({ title: '', description: '', difficulty: 'medium', language: 'javascript', starterCode: '', solution: '', timeLimit: 5, targetClass: '', section: '', tags: '', isPublished: false, testCases: [emptyTC()] });

const AIGeneratorPanel = ({ onChallengesGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [difficulty, setDifficulty] = useState('medium');
    const [count, setCount] = useState(3);
    const [targetClass, setTargetClass] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) return toast.error('Please enter a prompt');
        setLoading(true);
        try {
            const { data } = await generateAICodingChallenges({ prompt, language, difficulty, count, targetClass });
            if (!data.challenges?.length) return toast.error('No challenges generated');
            onChallengesGenerated(data.challenges);
            toast.success(`✨ ${data.challenges.length} challenges generated!`);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Generation failed');
        } finally { setLoading(false); }
    };

    return (
        <div style={{ background: 'linear-gradient(135deg,#6366f110,#06b6d410)', border: '1.5px solid #6366f130', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>🤖</span>
                <div>
                    <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>AI Challenge Generator</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Describe what you want — AI generates complete challenges with test cases</p>
                </div>
            </div>
            <textarea rows={2} value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder='e.g. "Create 3 JavaScript array challenges for Class 10"'
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, resize: 'vertical', minHeight: 60, marginBottom: 12, boxSizing: 'border-box' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={s.input}><option value="javascript">JavaScript</option><option value="python">Python</option><option value="java">Java</option><option value="cpp">C++</option></select>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={s.input}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
                <select value={targetClass} onChange={e => setTargetClass(e.target.value)} style={s.input}><option value="">Any Class</option>{CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}</select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Count:</span>
                    <input type="range" min={1} max={5} value={count} onChange={e => setCount(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--primary)' }} />
                    <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 16 }}>{count}</span>
                </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {['Create 3 JavaScript array problems for Class 10','Python string manipulation for beginners','2 hard recursion problems in Java','Simple math problems in C++ for Class 9'].map(ex => (
                    <button key={ex} onClick={() => setPrompt(ex)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>{ex}</button>
                ))}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleGenerate} disabled={loading}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {loading ? '⟳ Generating…' : '✨ Generate Challenges'}
            </motion.button>
        </div>
    );
};

const GeneratedChallengeCard = ({ challenge, idx, onSave, onDiscard, saving }) => {
    const [expanded, setExpanded] = useState(true);
    const [form, setForm] = useState({ ...challenge, isPublished: false });
    const [editorTab, setEditorTab] = useState('starter');
    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
    const updateTC = (i, key, val) => { const tcs = [...form.testCases]; tcs[i] = { ...tcs[i], [key]: val }; set('testCases', tcs); };
    const diffColor = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };

    return (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--card)', borderRadius: 14, border: '1.5px solid var(--border)', marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }} onClick={() => setExpanded(!expanded)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{idx + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{form.title}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: diffColor[form.difficulty] + '20', color: diffColor[form.difficulty], textTransform: 'uppercase' }}>{form.difficulty}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#6366f120', color: 'var(--primary)' }}>{form.language}</span>
                </div>
                <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: 18 }}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={s.label}>Title</label>
                                <input value={form.title} onChange={e => set('title', e.target.value)} style={s.input} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={s.label}>Description</label>
                                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 12 }}>
                                <div><label style={s.label}>Difficulty</label><select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} style={s.input}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
                                <div><label style={s.label}>Language</label><select value={form.language} onChange={e => set('language', e.target.value)} style={s.input}><option value="javascript">JavaScript</option><option value="python">Python</option><option value="java">Java</option><option value="cpp">C++</option></select></div>
                                <div><label style={s.label}>Time Limit (sec)</label><input type="number" value={form.timeLimit} min={1} max={30} onChange={e => set('timeLimit', e.target.value)} style={s.input} /></div>
                                <div><label style={s.label}>Target Class</label><select value={form.targetClass} onChange={e => set('targetClass', e.target.value)} style={s.input}><option value="">Optional</option>{CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}</select></div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={s.label}>Code</label>
                                <div style={{ display: 'flex', gap: 0, borderRadius: '10px 10px 0 0', overflow: 'hidden', border: '1px solid #333', borderBottom: 'none' }}>
                                    {['starter','solution'].map(tab => (
                                        <button key={tab} type="button" onClick={() => setEditorTab(tab)} style={{ flex: 1, padding: '8px', background: editorTab === tab ? '#1e1e1e' : '#2d2d2d', color: editorTab === tab ? '#fff' : '#aaa', border: 'none', cursor: 'pointer', fontWeight: editorTab === tab ? 700 : 500, fontSize: 13 }}>
                                            {tab === 'starter' ? 'Starter Code' : 'Solution (hidden)'}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ borderRadius: '0 0 10px 10px', overflow: 'hidden', border: '1px solid #333' }}>
                                    <Editor height="180px" language={form.language} value={editorTab === 'starter' ? form.starterCode : form.solution} onChange={val => set(editorTab === 'starter' ? 'starterCode' : 'solution', val || '')} theme="vs-dark" options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 10 } }} />
                                </div>
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={s.label}>Test Cases ({form.testCases.length})</label>
                                {form.testCases.map((tc, i) => (
                                    <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary)' }}>Case {i + 1}</span>
                                            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={tc.isHidden} onChange={e => updateTC(i, 'isHidden', e.target.checked)} /> Hidden
                                            </label>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <div><label style={{ ...s.label, fontSize: 11 }}>Input</label><textarea rows={2} value={tc.input} onChange={e => updateTC(i, 'input', e.target.value)} style={{ ...s.input, fontFamily: 'monospace', resize: 'vertical', fontSize: 12 }} /></div>
                                            <div><label style={{ ...s.label, fontSize: 11 }}>Expected Output</label><textarea rows={2} value={tc.expectedOutput} onChange={e => updateTC(i, 'expectedOutput', e.target.value)} style={{ ...s.input, fontFamily: 'monospace', resize: 'vertical', fontSize: 12 }} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                                    <input type="checkbox" checked={form.isPublished} onChange={e => set('isPublished', e.target.checked)} /> Publish immediately
                                </label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => onDiscard(idx)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>🗑 Discard</button>
                                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => onSave(form, idx)} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                                        {saving ? '⟳ Saving…' : '✅ Save Challenge'}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const CreateChallenge = () => {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editorTab, setEditorTab] = useState('starter');
    const [generatedChallenges, setGeneratedChallenges] = useState([]);
    const [savingIdx, setSavingIdx] = useState(null);
    const [activeTab, setActiveTab] = useState('ai');

    const fetchChallenges = () => { getTeacherChallenges().then(({ data }) => setChallenges(data)).finally(() => setLoading(false)); };
    useEffect(() => { fetchChallenges(); }, []);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
    const updateTC = (i, key, val) => { const tcs = [...form.testCases]; tcs[i] = { ...tcs[i], [key]: val }; set('testCases', tcs); };
    const addTC = () => set('testCases', [...form.testCases, emptyTC()]);
    const removeTC = (i) => set('testCases', form.testCases.filter((_, idx) => idx !== i));

    const handleSaveGenerated = async (challengeForm, idx) => {
        if (!challengeForm.title || !challengeForm.description) return toast.error('Title and description required');
        setSavingIdx(idx);
        try {
            const tags = typeof challengeForm.tags === 'string' ? challengeForm.tags.split(',').map(t => t.trim()).filter(Boolean) : challengeForm.tags || [];
            await createChallenge({ ...challengeForm, tags });
            toast.success(`✅ "${challengeForm.title}" saved!`);
            setGeneratedChallenges(prev => prev.filter((_, i) => i !== idx));
            fetchChallenges();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
        finally { setSavingIdx(null); }
    };

    const handleSaveAll = async () => {
        if (generatedChallenges.length === 0) return;
        setSaving(true);
        let saved = 0;
        for (const c of generatedChallenges) { try { await createChallenge({ ...c, tags: c.tags || [] }); saved++; } catch { } }
        toast.success(`✅ Saved ${saved} challenges!`);
        setGeneratedChallenges([]);
        fetchChallenges();
        setSaving(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.description) return toast.error('Title and description required');
        if (form.testCases.some(tc => !tc.expectedOutput)) return toast.error('All test cases need expected output');
        setSaving(true);
        try {
            const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            await createChallenge({ ...form, tags });
            toast.success('Challenge created!');
            setForm(emptyForm()); setShowForm(false); fetchChallenges();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this challenge?')) return;
        try { await deleteChallenge(id); setChallenges(prev => prev.filter(c => c._id !== id)); toast.success('Deleted'); }
        catch { toast.error('Delete failed'); }
    };

    if (loading) return <Loader />;

    return (
        <div style={s.page}>
            <div style={s.header}>
                <h1 style={s.title}>💻 Coding Challenges</h1>
                <button onClick={() => setShowForm(!showForm)} style={s.toggleBtn}>{showForm ? '✕ Cancel' : '+ Create Challenge'}</button>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={s.card}>
                    <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                        {[{ key: 'ai', label: '🤖 AI Generator' }, { key: 'manual', label: '✏️ Manual' }].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '10px', background: activeTab === tab.key ? 'var(--primary)' : 'var(--surface)', color: activeTab === tab.key ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.2s' }}>{tab.label}</button>
                        ))}
                    </div>

                    {activeTab === 'ai' && (
                        <div>
                            <AIGeneratorPanel onChallengesGenerated={setGeneratedChallenges} />
                            {generatedChallenges.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h3 style={{ margin: 0, fontWeight: 700 }}>✏️ Preview & Edit ({generatedChallenges.length} challenges)</h3>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button onClick={() => setGeneratedChallenges([])} style={{ ...s.toggleBtn, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>🗑 Discard All</button>
                                            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveAll} disabled={saving} style={{ ...s.toggleBtn, background: '#10b981' }}>{saving ? '⟳ Saving…' : `✅ Save All (${generatedChallenges.length})`}</motion.button>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {generatedChallenges.map((c, idx) => (
                                            <GeneratedChallengeCard key={idx} challenge={c} idx={idx} saving={savingIdx === idx} onSave={handleSaveGenerated} onDiscard={(i) => setGeneratedChallenges(prev => prev.filter((_, pi) => pi !== i))} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'manual' && (
                        <form onSubmit={handleSubmit}>
                            <h2 style={s.sec}>Challenge Details</h2>
                            <div style={s.grid}>
                                <input style={s.input} placeholder="Title *" value={form.title} onChange={e => set('title', e.target.value)} required />
                                <select style={s.input} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
                                <select style={s.input} value={form.language} onChange={e => set('language', e.target.value)}><option value="javascript">JavaScript</option><option value="python">Python</option><option value="java">Java</option><option value="cpp">C++</option></select>
                                <input style={s.input} type="number" placeholder="Time Limit (sec)" value={form.timeLimit} onChange={e => set('timeLimit', e.target.value)} min={1} max={30} />
                                <select style={s.input} value={form.targetClass} onChange={e => set('targetClass', e.target.value)}><option value="">Target Class (optional)</option>{CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                <input style={s.input} placeholder="Section (optional)" value={form.section} onChange={e => set('section', e.target.value)} />
                                <input style={s.input} placeholder="Tags (comma separated)" value={form.tags} onChange={e => set('tags', e.target.value)} />
                                <label style={s.checkLabel}><input type="checkbox" checked={form.isPublished} onChange={e => set('isPublished', e.target.checked)} /> Publish immediately</label>
                            </div>
                            <textarea style={s.textarea} placeholder="Problem description *" value={form.description} onChange={e => set('description', e.target.value)} required />
                            <h2 style={{ ...s.sec, marginTop: '1.5rem' }}>Code</h2>
                            <div style={s.editorTabs}>
                                <button type="button" style={{ ...s.edTab, ...(editorTab === 'starter' ? s.edTabActive : {}) }} onClick={() => setEditorTab('starter')}>Starter Code</button>
                                <button type="button" style={{ ...s.edTab, ...(editorTab === 'solution' ? s.edTabActive : {}) }} onClick={() => setEditorTab('solution')}>Solution (hidden)</button>
                            </div>
                            <div style={{ borderRadius: '0 0 10px 10px', overflow: 'hidden', border: '1px solid #333' }}>
                                {editorTab === 'starter' ? <Editor height="200px" language={form.language} value={form.starterCode} onChange={val => set('starterCode', val || '')} theme="vs-dark" options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 10 } }} /> : <Editor height="200px" language={form.language} value={form.solution} onChange={val => set('solution', val || '')} theme="vs-dark" options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 10 } }} />}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem' }}>
                                <h2 style={s.sec}>Test Cases</h2>
                                <button type="button" onClick={addTC} style={s.addBtn}>+ Add Test Case</button>
                            </div>
                            {form.testCases.map((tc, i) => (
                                <div key={i} style={s.tcCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>Case {i + 1}</span>
                                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                            <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}><input type="checkbox" checked={tc.isHidden} onChange={e => updateTC(i, 'isHidden', e.target.checked)} /> Hidden</label>
                                            {form.testCases.length > 1 && <button type="button" onClick={() => removeTC(i)} style={s.removeBtn}>✕</button>}
                                        </div>
                                    </div>
                                    <div style={s.tcGrid}>
                                        <div><label style={s.tcLabel}>Input (optional)</label><textarea style={s.tcInput} placeholder="e.g. 5" value={tc.input} onChange={e => updateTC(i, 'input', e.target.value)} rows={3} /></div>
                                        <div><label style={s.tcLabel}>Expected Output *</label><textarea style={s.tcInput} placeholder="e.g. 25" value={tc.expectedOutput} onChange={e => updateTC(i, 'expectedOutput', e.target.value)} rows={3} required /></div>
                                    </div>
                                </div>
                            ))}
                            <motion.button whileTap={{ scale: 0.97 }} type="submit" style={s.submitBtn} disabled={saving}>{saving ? 'Creating...' : '🚀 Create Challenge'}</motion.button>
                        </form>
                    )}
                </motion.div>
            )}

            <h2 style={{ ...s.sec, marginTop: '2rem' }}>My Challenges ({challenges.length})</h2>
            <div style={s.list}>
                {challenges.map(c => (
                    <motion.div key={c._id} whileHover={{ x: 3 }} style={s.row}>
                        <div>
                            <div style={s.rowTitle}>{c.title}</div>
                            <div style={s.rowMeta}>
                                <span style={{ color: c.difficulty === 'easy' ? '#10b981' : c.difficulty === 'medium' ? '#f59e0b' : '#ef4444', fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>{c.difficulty}</span>
                                <span style={s.langBadge}>{c.language}</span>
                                {c.targetClass && <span style={s.classBadge}>{c.targetClass}{c.section ? ` · ${c.section}` : ''}</span>}
                                <span style={{ color: c.isPublished ? '#10b981' : '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>{c.isPublished ? '✅ Published' : '📝 Draft'}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>🏆 {c.totalAttempts} attempts</span>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(c._id)} style={s.deleteBtn}>🗑 Delete</button>
                    </motion.div>
                ))}
                {challenges.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No challenges yet.</p>}
            </div>
        </div>
    );
};

const s = {
    page: { padding: '2rem 3rem', maxWidth: 1000, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
    title: { fontSize: '2rem', fontWeight: 700, color: 'var(--text)' },
    toggleBtn: { background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' },
    card: { background: 'var(--card)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--border)', marginBottom: '2rem' },
    sec: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' },
    input: { padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' },
    label: { display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 },
    textarea: { width: '100%', minHeight: 120, padding: '0.9rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit', marginBottom: '0.5rem', boxSizing: 'border-box' },
    checkLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.95rem', cursor: 'pointer' },
    editorTabs: { display: 'flex', gap: '0', borderRadius: '10px 10px 0 0', overflow: 'hidden', border: '1px solid #333', borderBottom: 'none' },
    edTab: { flex: 1, padding: '0.6rem', background: '#2d2d2d', color: '#aaa', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' },
    edTabActive: { background: '#1e1e1e', color: '#fff', fontWeight: 700 },
    addBtn: { background: '#10b98120', color: '#10b981', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' },
    tcCard: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '0.8rem' },
    tcGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    tcLabel: { display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' },
    tcInput: { width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' },
    removeBtn: { background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' },
    submitBtn: { background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.9rem', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', width: '100%', marginTop: '1.5rem', cursor: 'pointer' },
    list: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
    row: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
    rowTitle: { fontWeight: 600, color: 'var(--text)', marginBottom: '0.3rem' },
    rowMeta: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' },
    langBadge: { background: '#6366f120', color: 'var(--primary)', padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 },
    classBadge: { background: '#06b6d420', color: '#06b6d4', padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 },
    deleteBtn: { background: '#ef444420', color: '#ef4444', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' },
};

export default CreateChallenge;
