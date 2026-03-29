# Laya MOD Checklist Report

GitHub Pages-ready starter for **MOD Checklist Report**.

## Included
- `index.html`
- `style.css`
- `js/app.js`
- `assets/logo.png`
- `data/checklist_templates.json`
- `firestore.rules`
- `mod_service_layer.js`

## What works now
- Login with built-in demo accounts
- Board / New Issue / Checklist / Activity / More
- Create issue in local demo mode
- Open issue detail, add comment, change status, close / reopen
- Run checklist from uploaded template data
- Create issue from failed checklist item
- Export / import local JSON backup

## Demo accounts
- Admin: `9000 / 9000`
- MOD: `9901 / 9901`
- ENG: `3001 / 3001`
- HK: `4001 / 4001`

## Upload to GitHub Pages
1. Create a new GitHub repository
2. Upload all files in this folder
3. Go to **Settings > Pages**
4. Set source to **Deploy from a branch**
5. Choose branch **main** and folder **/root**
6. Save

## Notes
This package is designed to work immediately in **Local Demo Mode** on GitHub Pages.

When you are ready to connect Firebase:
- Use `firestore.rules` in Firestore Rules
- Use `mod_service_layer.js` as the service layer reference
- Replace the local-storage logic in `js/app.js` with Firebase Auth / Firestore / Storage calls

## Important
Open this app through GitHub Pages or a local web server.
Do not double-click `index.html` directly, because checklist JSON is loaded via `fetch()`.
