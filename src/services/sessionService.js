const sessions = new Map();

// Constants
const TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes
const MAX_HISTORY = 10; // Keep last 10 exchanges

const getSession = (psid) => {
    if (!sessions.has(psid)) {
        sessions.set(psid, {
            id: psid,
            mode: 'BOT', // 'BOT' or 'HUMAN'
            history: [], // For Gemini Chat History
            lastActivity: Date.now()
        });
    }
    return sessions.get(psid);
};

const updateActivity = (psid) => {
    const session = getSession(psid);
    session.lastActivity = Date.now();
    return session;
};

const setMode = (psid, mode) => {
    const session = getSession(psid);
    session.mode = mode;
    session.lastActivity = Date.now();
    return session;
};

const addToHistory = (psid, role, text) => {
    const session = getSession(psid);
    // Role: 'user' or 'model'
    session.history.push({ role, parts: [{ text }] });

    // Trim history to prevent hitting token limits
    if (session.history.length > MAX_HISTORY * 2) {
        session.history = session.history.slice(session.history.length - (MAX_HISTORY * 2));
    }
};

const getHistory = (psid) => {
    return getSession(psid).history;
};

// Check for timeouts and return list of users who timed out from HUMAN mode
const checkTimeouts = () => {
    const timedOutUsers = [];
    const now = Date.now();

    sessions.forEach((session, psid) => {
        if (session.mode === 'HUMAN') {
            if (now - session.lastActivity > TIMEOUT_MS) {
                session.mode = 'BOT';
                timedOutUsers.push(psid);
            }
        }
    });

    return timedOutUsers;
};

module.exports = {
    getSession,
    updateActivity,
    setMode,
    addToHistory,
    getHistory,
    checkTimeouts
};
