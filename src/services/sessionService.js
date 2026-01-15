/**
 * sessionService.js
 * จัดการ Session ของผู้ใช้แต่ละคน (Memory & Handover State)
 */

// เก็บ Session ใน Memory (ถ้า Production จริงแนะนำใช้ Redis)
// Key: PSID (User ID), Value: Session Object
const sessions = new Map();

// ระยะเวลา Handover (Admin Reply → Bot Pause) ที่จะให้บอทกลับมาทำงานอัตโนมัติ (1 นาที)
const IDLE_TIMEOUT = 60 * 1000; 

/**
 * โครงสร้าง Session Object:
 * {
 *   mode: 'BOT' | 'HUMAN',    // โหมดปัจจุบัน
 *   history: [],              // ประวัติการสนทนา (User + Bot)
 *   lastInteraction: Date,    // เวลาล่าสุดที่มี activity
 *   timer: TimeoutID          // ตัวจับเวลาสำหรับ Reset mode
 * }
 */

// ดึง Session ของผู้ใช้
const getSession = (psid) => {
    if (!sessions.has(psid)) {
        sessions.set(psid, {
            mode: 'BOT',
            history: [],
            lastInteraction: Date.now(),
            timer: null
        });
    }
    return sessions.get(psid);
};

// อัปเดตเวลาล่าสุด
const touchSession = (psid) => {
    const session = getSession(psid);
    session.lastInteraction = Date.now();
    
    // ถ้าอยู่ในโหมด HUMAN และมีการเคลื่อนไหว (เช่น Admin พิมพ์ หรือ User พิมพ์)
    // ให้ reset ตัวนับเวลาถอยหลังใหม่
    if (session.mode === 'HUMAN') {
        resetIdleTimer(psid);
    }
};

// เพิ่มประวัติการสนทนา
const addHistory = (psid, userMsg, botMsg) => {
    const session = getSession(psid);
    session.history.push({ role: 'user', content: userMsg });
    session.history.push({ role: 'model', content: botMsg });
    
    // จำกัดความยาว history (เช่น 10 คู่ล่าสุด) เพื่อประหยัด Token
    if (session.history.length > 20) {
        session.history = session.history.slice(session.history.length - 20);
    }
};

// เปลี่ยนโหมดเป็น HUMAN (Admin เข้ามาตอบ)
const setHumanMode = (psid) => {
    const session = getSession(psid);
    session.mode = 'HUMAN';
    console.log(`[Session] User ${psid} switched to HUMAN mode.`);
    resetIdleTimer(psid);
};

// เปลี่ยนโหมดเป็น BOT
const setBotMode = (psid) => {
    const session = getSession(psid);
    session.mode = 'BOT';
    if (session.timer) clearTimeout(session.timer);
    console.log(`[Session] User ${psid} switched back to BOT mode.`);
};

// ตัวจับเวลา Reset กลับเป็น Bot
const resetIdleTimer = (psid) => {
    const session = getSession(psid);
    if (session.timer) clearTimeout(session.timer);
    
    session.timer = setTimeout(() => {
        setBotMode(psid);
    }, IDLE_TIMEOUT);
};

// เช็คว่าบอทควรตอบหรือไม่
const shouldBotReply = (psid) => {
    const session = getSession(psid);
    return session.mode === 'BOT';
};

// ดึง History สำหรับส่งให้ AI
const getHistory = (psid) => {
    return getSession(psid).history;
};

module.exports = {
    getSession,
    touchSession,
    addHistory,
    setHumanMode,
    setBotMode,
    shouldBotReply,
    getHistory
};
