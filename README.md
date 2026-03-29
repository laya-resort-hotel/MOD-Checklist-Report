# MOD Checklist Report — GitHub Upload Ready (Firebase Config Added)

ชุดนี้เป็นเว็บแอพ MVP สำหรับ GitHub Pages โดย **ใส่ Firebase config ให้แล้ว** จากโปรเจกต์:
- projectId: `mod-checklist-report`

## ไฟล์สำคัญ
- `index.html`
- `style.css`
- `js/app.js` → UI + local demo data layer
- `js/firebase-config.js` → Firebase config ที่ใส่ให้แล้ว
- `js/firebase-init.js` → bootstrap Firebase app/analytics แบบ no-build
- `data/checklist_templates.json`
- `firestore.rules`
- `mod_service_layer.js`

## สถานะปัจจุบัน
- หน้าเว็บ **เปิดบน GitHub Pages ได้ทันที**
- Firebase config **ถูกใส่แล้ว**
- ตอนนี้ **data layer ยังเป็น Local Demo Mode** เพื่อให้เทส UI/Flow ได้เลย
- ยังไม่ได้ผูก login / firestore / storage เข้ากับ `js/app.js`

## วิธีอัปขึ้น GitHub
1. แตก ZIP
2. อัปโหลดทุกไฟล์ขึ้น repo
3. เปิด GitHub Pages จาก branch `main`
4. เปิดเว็บเพื่อตรวจว่า banner ขึ้น `Firebase Config Ready` หรือ `Firebase Config Added`

## บัญชีเดโม
- Admin: `9000 / 9000`
- MOD: `9901 / 9901`
- ENG: `3001 / 3001`
- HK: `4001 / 4001`

## หมายเหตุสำคัญ
ถ้าต้องการให้ระบบใช้งาน Firebase จริง:
- login ต้องเลือกวิธี auth ให้ชัด
- แล้วค่อยย้าย logic ใน `js/app.js` จาก localStorage ไป Firestore/Storage ตาม service layer
