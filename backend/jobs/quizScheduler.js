/**
 * quizScheduler.js
 * Runs every minute to auto-publish and auto-expire scheduled quizzes.
 *
 * Usage — call startQuizScheduler() once after MongoDB connects:
 *
 *   const { startQuizScheduler } = require('./jobs/quizScheduler');
 *   startQuizScheduler();
 *
 * Requires: npm install node-cron
 */

const cron = require('node-cron');
const Quiz = require('../models/Quiz');

// ─── Auto-publish quizzes whose scheduledAt has arrived ──────────────────────

const publishDueQuizzes = async () => {
    try {
        const now = new Date();

        const result = await Quiz.updateMany(
            {
                quizType: 'scheduled',
                status: 'scheduled',
                scheduledAt: { $lte: now },
            },
            {
                $set: { status: 'active', isPublished: true },
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[Scheduler] ✅ Auto-published ${result.modifiedCount} quiz(zes) at ${now.toISOString()}`);
        }
    } catch (err) {
        console.error('[Scheduler] ❌ Error publishing quizzes:', err.message);
    }
};

// ─── Auto-expire quizzes whose expiryTime has passed ─────────────────────────

const expireOldQuizzes = async () => {
    try {
        const now = new Date();

        const result = await Quiz.updateMany(
            {
                quizType: 'scheduled',
                status: 'active',
                expiryTime: { $lte: now, $ne: null },
            },
            {
                $set: { status: 'expired', isPublished: false },
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[Scheduler] ⏰ Expired ${result.modifiedCount} quiz(zes) at ${now.toISOString()}`);
        }
    } catch (err) {
        console.error('[Scheduler] ❌ Error expiring quizzes:', err.message);
    }
};

// ─── Main scheduler task ──────────────────────────────────────────────────────

const runSchedulerTick = async () => {
    await publishDueQuizzes();
    await expireOldQuizzes();
};

// every 5 minutes
const startQuizScheduler = () => {
    console.log('[Scheduler] 🕐 Quiz scheduler started — checking every minute');

    // Run once immediately on startup (catches any missed windows during downtime)
    runSchedulerTick();

    // Then schedule recurring checks
    cron.schedule('* * * * *', runSchedulerTick, {
        scheduled: true,
        timezone: process.env.SCHEDULER_TIMEZONE || 'Asia/Kolkata', // IST default; change as needed
    });
};

module.exports = { startQuizScheduler, publishDueQuizzes, expireOldQuizzes };
