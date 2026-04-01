# MOD Checklist Report — GitHub Ready + Firebase Employee ID Auth

เวอร์ชันนี้รองรับ:
- Sign In ด้วย **Employee ID + Password**
- Register ด้วย **Employee ID** โดยระบบจะสร้าง email ภายในแบบซ่อนหลังบ้านอัตโนมัติ
- บันทึกโปรไฟล์ผู้ใช้ลง `users/{uid}` ใน Firestore
- Local Demo Mode ยังอยู่ เผื่อใช้ตอน Firebase ยังไม่พร้อม

## การสมัครสมาชิก
ผู้ใช้กรอก:
- Employee ID
- Full Name
- Access Type (`MOD` หรือ `Department User`)
- Department
- Password

ระบบจะสร้าง Firebase Auth account ด้วยรูปแบบ email ภายใน เช่น:
- `9901@employee.mod-checklist-report.local`

ผู้ใช้จะเห็นแค่ **Employee ID** ไม่ต้องรู้หรือใช้ email นี้

## หมายเหตุเรื่องสิทธิ์
เวอร์ชันนี้เปิด self-register ได้สำหรับ role:
- `mod`
- `dept_user`

จะ **ไม่** อนุญาตให้สมัครเป็น `admin` เอง

## ใช้งานจริง
1. Deploy ขึ้น GitHub Pages
2. เปิด Email/Password ใน Firebase Authentication
3. Deploy `firestore.rules`
4. เปิดหน้าเว็บแล้วสมัครสมาชิกด้วย Employee ID ได้ทันที

## ข้อควรทราบ
- data issue/checklist ในเวอร์ชันนี้ยังเป็น Local Demo Flow เป็นหลัก
- แต่ระบบ Sign In / Register ใช้ Firebase Auth + Firestore จริงแล้ว
- รอบถัดไปสามารถย้าย issue board / comments / checklist runs ไป Firestore live ได้ต่อทันที


## Mobile photo picker fix
- แยกปุ่ม "เลือกรูปจากเครื่อง" และ "ถ่ายรูป"
- ไม่บังคับ `capture` กับการเลือกรูปจากเครื่องอีกต่อไป
- รองรับมือถือได้เสถียรกว่าเดิม


## Patch note v5
- New Issue now writes to Firestore when Firebase is live
- Board reads issues from Firestore via onSnapshot
- Status changes and comments also write to Firestore
- Mobile image resize flow remains enabled before save


## Firebase Storage
- Publish ไฟล์ `storage.rules` ใน Firebase Storage Rules
- เวอร์ชันนี้อัปภาพ issue ไปที่ `issue_photos/{uid}/{issueId}/before/...`
- Firestore จะเก็บเฉพาะ URL และ path ของรูป ไม่เก็บ base64 ลง issue document
