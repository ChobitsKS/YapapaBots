/**
 * sheetService.js
 * จัดการดึงข้อมูลจาก Google Sheets + Caching
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

// ตั้งค่า Google Auth
// รองรับทั้งแบบ JSON File Path และ JSON Object String (เพื่อความยืดหยุ่นตอน Deploy)
let jwtClient;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // กรณีใส่ JSON ใน ENV (Render แนะนำวิธีนี้)
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    jwtClient = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // กรณีใช้ไฟล์
    const creds = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    jwtClient = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, jwtClient);

// Cache System
// Map<Keyword, { data: Row[], timestamp: number }>
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 นาที

/**
 * ค้นหาข้อมูลจาก Google Sheets
 * @param {string} userMessage ข้อความของผู้ใช้ (ใช้ตัด keyword)
 * @returns {Promise<string[]>} ข้อมูลที่เกี่ยวข้อง (เป็น Array ของ String)
 */
async function searchKnowledgeBase(userMessage) {
    try {
        // 1. ลองหาใน Cache (แบบง่ายๆ ไปก่อนคือ cache based on exact user message หรือ keyword)
        // เพื่อความง่ายและแม่นยำในบริบทนี้ เราจะ Cache เป็น "All Data" ถ้า Sheet ไม่ใหญ่
        // หรือถ้า Sheet ใหญ่ เราจะ Cache based on searched keyword.
        // สมมติว่า Sheet ไม่ใหญ่มาก (ไม่เกิน 1000 แถว) -> Load All & Memory Filter คือเร็วสุดและประหยัด Quota สุด

        const cacheKey = 'FULL_SHEET_DATA';
        let rowsData = [];

        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log('[Sheet] Used Cache');
                rowsData = cached.data;
            }
        }

        if (rowsData.length === 0) {
            console.log('[Sheet] Fetching from API...');
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0]; // อ่าน Sheet แรก
            const rows = await sheet.getRows();

            // แปลงเป็น String array เพื่อเก็บใน Cache
            // สมมติ Column A = คำถาม/หัวข้อ, B = คำตอบ/รายละเอียด
            rowsData = rows.map(row => {
                const header = sheet.headerValues;
                // ดึงทุก column มาต่อกัน
                return header.map(h => `${h}: ${row.get(h)}`).join(' | ');
            });

            // Update Cache
            cache.set(cacheKey, { data: rowsData, timestamp: Date.now() });
        }

        // 2. Filter หาแถวที่เกี่ยวข้อง (Simple Keyword Matching)
        // ตัด Stop words หรือวิเคราะห์ keyword จริงจังต้องใช้ NLP แต่ที่นี้เอา Simple Text Match
        const keywords = userMessage.split(' ').filter(w => w.length > 2);

        let matchedRows = rowsData.filter(rowStr => {
            // ตรวจสอบว่า keyword ปรากฏใน rowStr บ้างไหม
            return keywords.some(kw => rowStr.includes(kw));
        });

        // ถ้าหาไม่เจอเลย ให้ส่งกลับมาบ้างแบบ random หรือ default (แต่ใน prompt บอกให้ค้นที่เกี่ยวข้อง)
        // ถ้าไม่มี keyword match เลย อาจจะ return rowsData บางส่วนเพื่อให้ AI มี context บ้าง (เช่น ข้อมูลทั่วไป)
        // แต่เพื่อความประหยัด Token เอาเฉพาะที่ match

        if (matchedRows.length === 0) {
            // กรณีไม่ตรงเลย อาจจะส่งข้อมูล Top 5 แถวแรกไปเป็น Context พื้นฐาน
            matchedRows = rowsData.slice(0, 5);
        }

        // 3. Limit 5 แถว
        return matchedRows.slice(0, 5);

    } catch (error) {
        console.error('[Sheet] Error:', error.message);
        return []; // กรณี Error ให้ Return array ว่าง (Gemini จะตอบด้วยความรู้ตัวเอง หรือบอกไม่รู้)
    }
}

module.exports = {
    searchKnowledgeBase
};
