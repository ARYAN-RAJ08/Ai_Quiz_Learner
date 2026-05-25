/**
 * ScheduledQuizzes.js
 * Teacher page: view, manage, and delete scheduled quizzes.
 *
 * Route: /teacher/scheduled-quizzes
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getScheduledQuizzes, deleteScheduledQuiz } from '../../utils/api';

const statusConfig = {
    scheduled: { label: 'Scheduled',  color: '#f59e0b', bg: '#f59e0b15', icon: '🕐' },
    active:    { label: 'Active',     color: '#10b981', bg: '#10b98115', icon: '✅' },
    expired:   { label: 'Expired',    color: '#94a3b8', bg: '#94a3b815', icon: '⏰' },
    draft:     { label: 'Draft',      color: '#6366f1', bg: '#6366f115', icon: '📝' },
};

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig.draft;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: cfg.bg, color: cfg.color,
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
};

const ScheduledQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    const fetchQuizzes = () => {
        setLoading(true);
        getScheduledQuizzes()
            .then(({ data }) => setQuizzes(data))
            .catch(() => toast.error('Failed to load scheduled quizzes'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchQuizzes(); }, []);

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
        setDeleting(id);
        try {
            await deleteScheduledQuiz(id);
            toast.success('Quiz deleted');
            setQuizzes(prev => prev.filter(q => q._id !== id));
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Delete failed');
        } finally {
            setDeleting(null);
        }
    };

    const grouped = {
        active:    quizzes.filter(q => q.status === 'active'),
        scheduled: quizzes.filter(q => q.status === 'scheduled'),
        expired:   quizzes.filter(q => q.status === 'expired'),
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800 }}>📅 Scheduled Quizzes</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                            Quizzes are auto-published when their scheduled time arrives.
                        </p>
                    </div>
                    <Link to="/teacher/ai-generator">
                        <button style={{
                            padding: '10px 20px', borderRadius: 10, border: 'none',
                            background: 'var(--primary)', color: '#fff', fontWeight: 700,
                            fontSize: 14, cursor: 'pointer',
                        }}>
                            ✨ New AI Quiz
                        </button>
                    </Link>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        Loading…
                    </div>
                ) : quizzes.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: 60,
                        background: 'var(--card)', borderRadius: 18,
                        border: '1.5px solid var(--border)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>No scheduled quizzes yet.</p>
                        <Link to="/teacher/ai-generator">
                            <button style={{
                                marginTop: 16, padding: '10px 24px', borderRadius: 10,
                                border: 'none', background: 'var(--primary)', color: '#fff',
                                fontWeight: 700, cursor: 'pointer',
                            }}>Create Your First AI Quiz</button>
                        </Link>
                    </div>
                ) : (
                    ['active', 'scheduled', 'expired'].map(statusKey => (
                        grouped[statusKey].length > 0 && (
                            <div key={statusKey} style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: statusConfig[statusKey]?.color }}>
                                    {statusConfig[statusKey]?.icon} {statusConfig[statusKey]?.label} ({grouped[statusKey].length})
                                </h2>
                                {grouped[statusKey].map((quiz, i) => (
                                    <motion.div
                                        key={quiz._id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        style={{
                                            background: 'var(--card)', borderRadius: 14,
                                            border: '1.5px solid var(--border)',
                                            padding: '16px 20px', marginBottom: 12,
                                            display: 'flex', alignItems: 'center',
                                            gap: 16, flexWrap: 'wrap',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{ fontWeight: 700, fontSize: 15 }}>{quiz.title}</span>
                                                <StatusBadge status={quiz.status} />
                                            </div>
                                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                {quiz.subject    && <span>📚 {quiz.subject}</span>}
                                                {quiz.targetClass && <span>🎓 {quiz.targetClass}</span>}
                                                <span>❓ {quiz.questionCount} questions</span>
                                                <span>⏱ {quiz.duration} min</span>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                                            <div style={{ marginBottom: 2 }}>
                                                <strong>Publishes:</strong> {formatDate(quiz.scheduledAt)}
                                            </div>
                                            {quiz.expiryTime && (
                                                <div><strong>Expires:</strong> {formatDate(quiz.expiryTime)}</div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleDelete(quiz._id, quiz.title)}
                                            disabled={deleting === quiz._id}
                                            style={{
                                                padding: '7px 14px', borderRadius: 8,
                                                border: '1px solid var(--danger)',
                                                background: 'transparent', color: 'var(--danger)',
                                                fontWeight: 600, fontSize: 12, cursor: 'pointer',
                                            }}
                                        >
                                            {deleting === quiz._id ? '…' : '🗑 Delete'}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )
                    ))
                )}
            </div>
        </div>
    );
};

export default ScheduledQuizzes;
