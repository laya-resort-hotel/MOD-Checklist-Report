MOD Checklist Report – Performance Patch v89

Purpose:
- Fix the first 4–5 seconds where dashboard cards show 0 before Firestore finishes loading.
- Show loading state instead of false zero.
- Hydrate dashboard from a small local cache so repeat visits show the last known counts immediately while Firestore refreshes.
- Start issues listener before last_login_at write, so job data begins loading earlier.

Upload these files over the existing files:
- app.js
- js/app.js
- style.css
- sw.js

After upload:
1. Open the site.
2. Tap Clear Cache once.
3. Close and reopen the browser/app.
4. First load may still show “กำลังโหลดข้อมูลงาน...” briefly; next loads should show cached counts immediately and then update from Firestore.
