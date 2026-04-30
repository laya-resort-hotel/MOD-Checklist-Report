MOD Checklist Performance Patch v90 – Light Startup Data

แก้ไขหลัก:
1) แก้บั๊ก CSS หาย/หน้าเว็บกลายเป็น HTML ดิบ จาก v89 ที่ style.css ถูกทับเหลือเฉพาะ patch CSS
2) ลดโหลดข้อมูลตอนเข้าแอพ: โหลด Issues ก่อนเป็นหลัก
3) Checklist history / Users / Usage logs เปลี่ยนเป็น lazy-load หลังหน้า Board แสดงผล หรือเมื่อเปิดหน้าที่เกี่ยวข้อง
4) ลด Firestore query limit: issues 120, checklist 35, usage logs 60, mention alerts 30
5) เพิ่ม cache-busting ?v=v90-light-startup ให้ style.css, js/app.js, js/firebase-init.js
6) ปรับ Service Worker เป็น network-first สำหรับ JS/CSS ลดปัญหา cache เก่าค้าง

ไฟล์ที่ต้องอัปทับ:
- index.html
- style.css
- sw.js
- app.js
- js/app.js

หลังอัปโหลดขึ้น GitHub Pages:
1) เปิดเว็บ
2) กดปุ่ม ล้างแคช 1 ครั้ง
3) ปิดแท็บแล้วเข้าใหม่
