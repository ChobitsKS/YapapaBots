# Facebook Gemini Chatbot v5

Chatbot สำหรับโรงเรียนแพทย์ที่ใช้ Gemini AI และ Google Sheets

## Requirements
- Node.js environment
- Google Service Account (JSON file)
- Gemini API Key
- Facebook Page & App

## Installation

1. Clone repository
2. Run `npm install` (หากติดตั้ง dependencies ไม่ผ่าน กรุณาตรวจสอบ node version)

## Configuration (.env)

สร้างไฟล์ `.env` จาก `.env.example` และใส่ข้อมูล:
- `GEMINI_API_KEY`: จาก Google AI Studio
- `GOOGLE_SHEET_ID`: ID จาก URL ของ Google Sheet
- `GOOGLE_APPLICATION_CREDENTIALS`: Path ไปยังไฟล์ JSON key (หรือ base64 content บน Render)
- `PAGE_ACCESS_TOKEN`: จาก Facebook Developer Console
- `VERIFY_TOKEN`: กำหนดเอง (ต้องตรงกับที่ใส่ใน Facebook Console)

## Google Sheets Structure

**Tab: KnowledgeBase**
- Column A: Question / Keyword
- Column B: Answer / Detail

**Tab: Logs**
- (Optional) สร้างไว้สำหรับเก็บ log การสนทนา

## Running

```bash
npm start
```

## Deployment (Render.com)

1. Connect GitHub Repo
2. Add Environment Variables in Render Dashboard
3. Build Command: `npm install`
4. Start Command: `node index.js`
