/**
 * Memory เก็บข้อมูล Session ของผู้ใช้
 * Key: PSID (Facebook User ID)
 */
const sessions = new Map();

const HANDOVER_TIMEOUT = 60 * 1000; // 1 นาที (หน่วย ms)

function getSession(psid) {
    if (!sessions.has(psid)) {
        sessions.set(psid, {
            history: [],           // ประวัติการคุย
            lastActivity: Date.now(),
            isBotPaused: false     // สถานะว่าบอทโดนปิดปากหรือไม่
        });
    }
    return sessions.get(psid);
}

// อัปเดตเวลาล่าสุดที่ User มีการเคลื่อนไหว
function updateActivity(psid) {
    const session = getSession(psid);
    session.lastActivity = Date.now();
}

// เพิ่มประวัติการคุย (จำแค่ 10 ข้อความล่าสุด)
function addHistory(psid, role, message) {
    const session = getSession(psid);
    if (session.history.length >= 10) {
        session.history.shift(); // ลบเก่าสุดออก
    }
    session.history.push({ role, parts: [{ text: message }] });
}

// เช็คว่าบอทควรตอบหรือไม่ (Logic สำคัญของ Handover)
function shouldBotReply(psid) {
    const session = getSession(psid);
    const now = Date.now();

    // กรณีปกติ: บอทไม่ถูกหยุด -> ตอบได้
    if (!session.isBotPaused) {
        return true;
    }

    // กรณีถูกหยุด: เช็คว่า Admin หายไปเกิน 1 นาทีหรือยัง
    if (now - session.lastActivity > HANDOVER_TIMEOUT) {
        console.log(`🤖 [Handover] หมดเวลา 1 นาที บอทกลับมาทำงานสำหรับ User: ${psid}`);
        session.isBotPaused = false; // ปลดล็อค
        return true;
    }

    // ยังไม่ครบ 1 นาที -> บอทเงียบ
    return false;
}

// เรียกเมื่อ Admin เข้ามาตอบ (หยุดบอททันที)
function handleAdminIntervention(psid) {
    const session = getSession(psid);
    console.log(`👨‍💻 [Handover] Admin มาตอบ! บอทหยุดทำงานสำหรับ User: ${psid}`);
    session.isBotPaused = true;
    session.lastActivity = Date.now();
}

module.exports = {
    getSession,
    updateActivity,
    addHistory,
    shouldBotReply,
    handleAdminIntervention
};