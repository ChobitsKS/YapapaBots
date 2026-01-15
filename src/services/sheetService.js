const { google } = require('googleapis');
const NodeCache = require('node-cache');
require('dotenv').config();

// ตั้งค่า Cache: เก็บข้อมูล 5 นาที (300 วินาที) ลดการยิง API
const sheetCache = new NodeCache({ stdTTL: 300 });

// ตั้งค่า Authentication
// บน Render: ระบบจะอ่านไฟล์จาก Path ที่ระบุใน GOOGLE_APPLICATION_CREDENTIALS เอง
const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * ดึงข้อมูลทั้งหมดจาก Google Sheets (มี Cache)
 */
async function getAllData() {
    const cacheKey = 'all_sheet_data';
    const cachedData = sheetCache.get(cacheKey);

    // 1. ถ้ามีใน Cache ให้ใช้เลย
    if (cachedData) {
        console.log('📦 [Sheet] ใช้ข้อมูลจาก Cache');
        return cachedData;
    }

    // 2. ถ้าไม่มี ให้ดึงจาก Google API
    try {
        if (!process.env.GOOGLE_SHEET_ID) throw new Error('ไม่พบ GOOGLE_SHEET_ID');

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:E', // ปรับ Range ตามข้อมูลจริงใน Sheet
        });

        const rows = response.data.values || [];
        // แปลงแถวเป็น String เพื่อให้ Search ง่าย
        const formattedData = rows.map(row => row.join(' ')); 
        
        // เก็บลง Cache
        sheetCache.set(cacheKey, formattedData);
        console.log('🌐 [Sheet] ดึงข้อมูลใหม่จาก Google API สำเร็จ');
        
        return formattedData;
    } catch (error) {
        console.error('❌ [Sheet Error]:', error.message);
        return [];
    }
}

/**
 * ค้นหาข้อมูลที่ตรงกับ Keyword (Smart Search)
 * คืนค่าไม่เกิน 5 แถว
 */
async function searchContext(userQuery) {
    const allRows = await getAllData();
    if (!userQuery || allRows.length === 0) return [];

    const queryWords = userQuery.toLowerCase().split(/\s+/);

    // ให้คะแนนความเหมือน (Match Score)
    const scoredRows = allRows.map(row => {
        const rowLower = row.toLowerCase();
        let score = 0;
        queryWords.forEach(word => {
            if (rowLower.includes(word)) score++;
        });
        return { text: row, score };
    });

    // กรองเอาเฉพาะที่มีคะแนน > 0 และเอา Top 5
    return scoredRows
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.text)
        .join('\n');
}

module.exports = { searchContext };