import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getDetailedAnalytics } from '../../utils/api';
import Loader from '../../components/Loader';

const TrackingDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('students');
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [expandedTeacher, setExpandedTeacher] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        getDetailedAnalytics()
            .then(({ data }) => setData(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader />;

    const filteredStudents = data?.studentData?.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.studentClass?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const filteredTeachers = data?.teacherData?.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div style={s.page}>
            <h1 style={s.title}>📊 Admin Tracking Dashboard</h1>
            <p style={s.sub}>Track all teacher quizzes and student performance</p>

            {/* Summary Cards */}
            <div style={s.cards}>
                <div style={s.card}>
                    <span style={s.cardNum}>{data?.studentData?.length || 0}</span>
                    <span style={s.cardLabel}>Total Students</span>
                </div>
                <div style={s.card}>
                    <span style={s.cardNum}>{data?.teacherData?.length || 0}</span>
                    <span style={s.cardLabel}>Total Teachers</span>
                </div>
                <div style={s.card}>
                    <span style={s.cardNum}>{data?.teacherData?.reduce((sum, t) => sum + t.quizCount, 0) || 0}</span>
                    <span style={s.cardLabel}>Total Quizzes Created</span>
                </div>
                <div style={s.card}>
                    <span style={s.cardNum}>{data?.studentData?.reduce((sum, s) => sum + s.attemptCount, 0) || 0}</span>
                    <span style={s.cardLabel}>Total Attempts</span>
                </div>
            </div>

            {/* Tabs */}
            <div style={s.tabs}>
                <button onClick={() => { setTab('students'); setSearch(''); }} style={{ ...s.tab, ...(tab === 'students' ? s.activeTab : {}) }}>
                    🎓 Students & Scores
                </button>
                <button onClick={() => { setTab('teachers'); setSearch(''); }} style={{ ...s.tab, ...(tab === 'teachers' ? s.activeTab : {}) }}>
                    👨‍🏫 Teachers & Quizzes
                </button>
            </div>

            {/* Search */}
            <input
                placeholder={tab === 'students' ? '🔍 Search student by name, email, class...' : '🔍 Search teacher by name or email...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={s.search}
            />

            {/* Students Tab */}
            {tab === 'students' && (
                <div>
                    {filteredStudents.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No students found.</p>}
                    {filteredStudents.map((student, i) => (
                        <motion.div key={student._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }} style={s.row}>
                            <div style={s.rowHeader} onClick={() => setExpandedStudent(expandedStudent === student._id ? null : student._id)}>
                                <div style={s.rowLeft}>
                                    <div style={s.avatar}>{student.name.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <div style={s.rowName}>{student.name}</div>
                                        <div style={s.rowMeta}>
                                            {student.email}
                                            {student.studentClass ? ` • ${student.studentClass}` : ''}
                                            {student.section ? ` • Section ${student.section}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={s.rowRight}>
                                    <div style={s.badge}>📝 {student.attemptCount} Attempts</div>
                                    <div style={{
                                        ...s.badge,
                                        background: student.avgPercent >= 70 ? '#10b98120' : student.avgPercent >= 40 ? '#f59e0b20' : '#ef444420',
                                        color: student.avgPercent >= 70 ? '#10b981' : student.avgPercent >= 40 ? '#f59e0b' : '#ef4444'
                                    }}>
                                        Avg: {student.avgPercent}%
                                    </div>
                                    <span style={{ color: 'var(--text-muted)' }}>{expandedStudent === student._id ? '▲' : '▼'}</span>
                                </div>
                            </div>

                            {expandedStudent === student._id && (
                                <div style={s.details}>
                                    {student.attempts.length === 0 && (
                                        <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>No quiz attempts yet.</p>
                                    )}
                                    {student.attempts.length > 0 && (
                                        <table style={s.table}>
                                            <thead>
                                                <tr>
                                                    <th style={s.th}>Quiz</th>
                                                    <th style={s.th}>Subject</th>
                                                    <th style={s.th}>Score</th>
                                                    <th style={s.th}>Percentage</th>
                                                    <th style={s.th}>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {student.attempts.map((a, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={s.td}>{a.quizTitle}</td>
                                                        <td style={s.td}>{a.subject || '-'}</td>
                                                        <td style={s.td}>{a.score}/{a.totalQuestions}</td>
                                                        <td style={s.td}>
                                                            <span style={{
                                                                color: a.percent >= 70 ? '#10b981' : a.percent >= 40 ? '#f59e0b' : '#ef4444',
                                                                fontWeight: 700
                                                            }}>
                                                                {a.percent}%
                                                            </span>
                                                        </td>
                                                        <td style={s.td}>{new Date(a.date).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Teachers Tab */}
            {tab === 'teachers' && (
                <div>
                    {filteredTeachers.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No teachers found.</p>}
                    {filteredTeachers.map((teacher, i) => (
                        <motion.div key={teacher._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }} style={s.row}>
                            <div style={s.rowHeader} onClick={() => setExpandedTeacher(expandedTeacher === teacher._id ? null : teacher._id)}>
                                <div style={s.rowLeft}>
                                    <div style={{ ...s.avatar, background: '#f59e0b20', color: '#f59e0b' }}>
                                        {teacher.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={s.rowName}>{teacher.name}</div>
                                        <div style={s.rowMeta}>{teacher.email}</div>
                                    </div>
                                </div>
                                <div style={s.rowRight}>
                                    <div style={s.badge}>📝 {teacher.quizCount} Quizzes</div>
                                    <span style={{ color: 'var(--text-muted)' }}>{expandedTeacher === teacher._id ? '▲' : '▼'}</span>
                                </div>
                            </div>

                            {expandedTeacher === teacher._id && (
                                <div style={s.details}>
                                    {teacher.quizzes.length === 0 && (
                                        <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>No quizzes created yet.</p>
                                    )}
                                    {teacher.quizzes.length > 0 && (
                                        <table style={s.table}>
                                            <thead>
                                                <tr>
                                                    <th style={s.th}>Quiz Title</th>
                                                    <th style={s.th}>Subject</th>
                                                    <th style={s.th}>Class</th>
                                                    <th style={s.th}>Attempts</th>
                                                    <th style={s.th}>Status</th>
                                                    <th style={s.th}>Created</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teacher.quizzes.map((q, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={s.td}>{q.title}</td>
                                                        <td style={s.td}>{q.subject || '-'}</td>
                                                        <td style={s.td}>{q.targetClass || '-'}</td>
                                                        <td style={s.td}>{q.totalAttempts || 0}</td>
                                                        <td style={s.td}>
                                                            <span style={{ color: q.isPublished ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                                                                {q.isPublished ? '✅ Published' : '📝 Draft'}
                                                            </span>
                                                        </td>
                                                        <td style={s.td}>{new Date(q.createdAt).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

const s = {
    page: { padding: '2rem 3rem', maxWidth: 1200, margin: '0 auto' },
    title: { fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' },
    sub: { color: 'var(--text-muted)', marginBottom: '2rem' },
    cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' },
    card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' },
    cardNum: { fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' },
    cardLabel: { fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' },
    tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' },
    tab: { padding: '0.6rem 1.5rem', borderRadius: '20px', border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
    activeTab: { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' },
    search: { width: '100%', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '0.95rem', marginBottom: '1.5rem', boxSizing: 'border-box' },
    row: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', marginBottom: '0.8rem', overflow: 'hidden' },
    rowHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', cursor: 'pointer' },
    rowLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
    rowRight: { display: 'flex', alignItems: 'center', gap: '0.8rem' },
    avatar: { width: 40, height: 40, borderRadius: '50%', background: '#6366f120', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' },
    rowName: { fontWeight: 700, color: 'var(--text)' },
    rowMeta: { fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' },
    badge: { background: '#6366f120', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 },
    details: { borderTop: '1px solid var(--border)', padding: '0 0.5rem 0.5rem' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' },
    td: { padding: '0.8rem 1rem', fontSize: '0.88rem', color: 'var(--text)' },
};

export default TrackingDashboard;