(() => {
  const APP_KEY = 'laya_mod_checklist_v1';
  const PENDING_REG_KEY = 'laya_mod_pending_registration_v1';
  const DEMO_USERS = [
    { uid: 'uid_admin_9000', employee_id: '9000', password: '9000', full_name: 'Admin Demo', role: 'admin', department: 'ADMIN' },
    { uid: 'uid_mod_9901', employee_id: '9901', password: '9901', full_name: 'Somchai MOD', role: 'mod', department: 'MOD' },
    { uid: 'uid_eng_3001', employee_id: '3001', password: '3001', full_name: 'Engineering Demo', role: 'dept_user', department: 'ENG' },
    { uid: 'uid_hk_4001', employee_id: '4001', password: '4001', full_name: 'Housekeeping Demo', role: 'dept_user', department: 'HK' },
  ];

  const DEPARTMENTS = [
    { code: 'ENG', name: 'Engineering' },
    { code: 'HK', name: 'Housekeeping' },
    { code: 'FO', name: 'Front Office' },
    { code: 'FB', name: 'Food & Beverage' },
    { code: 'SEC', name: 'Security' },
    { code: 'MOD', name: 'MOD' },
    { code: 'ADMIN', name: 'Admin' },
  ];

  const PRIORITIES = ['low', 'medium', 'high', 'critical'];
  const STATUS_ORDER = { open: 1, in_progress: 2, waiting: 3, closed: 4 };

  const state = {
    currentUser: null,
    firebaseAuthBound: false,
    ui: {
      activeView: 'boardView',
      boardFilter: 'all',
      boardSearch: '',
      newIssuePriority: 'medium',
      selectedTemplateCode: null,
      openIssueId: null,
    },
    data: {
      issues: [],
      checklistRuns: [],
      activity: [],
      templates: [],
      counters: { issue: 0, checklist: 0 },
    },
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheEls();
    bindEvents();
    bindFirebaseEvents();
    showAuthTab('signin');
    applyRuntimeMode();
    await loadTemplates();
    hydrateFromStorage();
    if (!state.data.issues.length && !state.data.activity.length) {
      seedDemoData();
    }
    renderTemplateCards();
    renderAll();
  }


  function bindFirebaseEvents() {
    window.addEventListener('laya-firebase-ready', applyRuntimeMode);
    window.addEventListener('laya-firebase-error', applyRuntimeMode);
  }

  function applyRuntimeMode() {
    const fb = window.LAYA_FIREBASE;
    if (fb?.ready) {
      if (el.modeBanner) el.modeBanner.textContent = `Firebase Auth Ready • ${fb.projectId || 'connected'}`;
      if (el.connectionBadge) {
        el.connectionBadge.textContent = 'Firebase Live';
        el.connectionBadge.classList.remove('warning');
        el.connectionBadge.classList.add('success');
      }
      if (el.demoBox) el.demoBox.classList.add('hidden');
      bootstrapFirebaseAuth();
      return;
    }

    if (window.LAYA_FIREBASE_CONFIG_PRESENT) {
      if (el.modeBanner) el.modeBanner.textContent = 'Firebase Config Added • Waiting for Auth / fallback to Local Demo';
      if (el.connectionBadge) {
        el.connectionBadge.textContent = 'Demo Data';
        el.connectionBadge.classList.remove('success');
        el.connectionBadge.classList.add('warning');
      }
      if (el.demoBox) el.demoBox.classList.remove('hidden');
      return;
    }

    if (el.modeBanner) el.modeBanner.textContent = 'Local Demo Mode';
    if (el.connectionBadge) {
      el.connectionBadge.textContent = 'Ready';
      el.connectionBadge.classList.remove('warning');
      el.connectionBadge.classList.add('success');
    }
    if (el.demoBox) el.demoBox.classList.remove('hidden');
  }

  function showAuthTab(tab) {
    const signIn = tab !== 'register';
    el.showSignInTab.classList.toggle('active', signIn);
    el.showRegisterTab.classList.toggle('active', !signIn);
    el.signInPane.classList.toggle('hidden', !signIn);
    el.registerPane.classList.toggle('hidden', signIn);
    setAuthStatus('');
  }

  function setAuthStatus(message, type = 'info') {
    if (!el.authStatus) return;
    if (!message) {
      el.authStatus.textContent = '';
      el.authStatus.className = 'auth-status hidden';
      return;
    }
    el.authStatus.textContent = message;
    el.authStatus.className = `auth-status ${type}`;
  }

  function syncRegisterRoleDepartment() {
    if (!el.registerRole || !el.registerDepartment) return;
    const role = el.registerRole.value;
    if (role === 'mod') {
      el.registerDepartment.value = 'MOD';
      el.registerDepartment.disabled = true;
    } else {
      el.registerDepartment.disabled = false;
      if (el.registerDepartment.value === 'MOD' || el.registerDepartment.value === 'ADMIN') {
        el.registerDepartment.value = 'ENG';
      }
    }
  }

  function employeeIdToEmail(employeeId) {
    return `${String(employeeId).trim().toLowerCase()}@employee.mod-checklist-report.local`;
  }

  function savePendingRegistration(data) {
    try {
      sessionStorage.setItem(PENDING_REG_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function getPendingRegistration() {
    try {
      const raw = sessionStorage.getItem(PENDING_REG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearPendingRegistration() {
    try {
      sessionStorage.removeItem(PENDING_REG_KEY);
    } catch (_) {}
  }

  function buildUserProfile({ employeeId, fullName, role, department, position = '', email = '' }) {
    return {
      employee_id: employeeId,
      full_name: fullName,
      role,
      department,
      position,
      is_active: true,
      phone: '',
      email,
      avatar_url: '',
      created_at: window.LAYA_FIREBASE.sdk.serverTimestamp(),
      updated_at: window.LAYA_FIREBASE.sdk.serverTimestamp(),
      last_login_at: window.LAYA_FIREBASE.sdk.serverTimestamp()
    };
  }

  function friendlyRegisterError(err) {
    const code = String(err?.code || '');
    const msg = String(err?.message || err || '');

    if (code.includes('permission-denied')) {
      return 'สมัคร Auth สำเร็จแต่เขียน Firestore ไม่ได้ • ตรวจสอบว่า publish Firestore Rules แล้ว';
    }
    if (code.includes('email-already-in-use')) {
      return 'รหัสพนักงานนี้ถูกสมัครไว้แล้ว';
    }
    if (code.includes('weak-password')) {
      return 'รหัสผ่านอ่อนเกินไป';
    }
    if (code.includes('invalid-email')) {
      return 'รูปแบบรหัสพนักงานไม่ถูกต้อง';
    }
    if (msg) return `สมัครสมาชิกไม่สำเร็จ: ${msg}`;
    return 'สมัครสมาชิกไม่สำเร็จ';
  }

  function isFirebaseLive() {
    return !!(window.LAYA_FIREBASE && window.LAYA_FIREBASE.ready && window.LAYA_FIREBASE.auth && window.LAYA_FIREBASE.db);
  }

  function bootstrapFirebaseAuth() {
    if (!isFirebaseLive() || state.firebaseAuthBound) return;
    state.firebaseAuthBound = true;

    const fb = window.LAYA_FIREBASE;
    fb.sdk.onAuthStateChanged(fb.auth, async (user) => {
      if (!user) {
        state.currentUser = null;
        renderAuthState();
        return;
      }

      const userRef = fb.sdk.doc(fb.db, 'users', user.uid);

      try {
        let snap = await fb.sdk.getDoc(userRef);

        if (!snap.exists()) {
          const pending = getPendingRegistration();
          if (pending && pending.email === user.email) {
            await fb.sdk.setDoc(userRef, buildUserProfile(pending));
            clearPendingRegistration();
            snap = await fb.sdk.getDoc(userRef);
          }
        }

        if (!snap.exists()) {
          setAuthStatus('พบผู้ใช้ใน Authentication แล้ว แต่ยังไม่มีโปรไฟล์ใน Firestore', 'error');
          state.currentUser = null;
          renderAuthState();
          return;
        }

        const profile = snap.data();
        state.currentUser = { uid: user.uid, ...profile };

        try {
          await fb.sdk.updateDoc(userRef, {
            last_login_at: fb.sdk.serverTimestamp(),
            updated_at: fb.sdk.serverTimestamp()
          });
        } catch (_) {}

        setAuthStatus('เข้าสู่ระบบสำเร็จ', 'success');
        renderAll();
      } catch (err) {
        console.error(err);
        setAuthStatus('โหลดข้อมูลผู้ใช้จาก Firestore ไม่สำเร็จ', 'error');
      }
    });
  }

  function cacheEls() {
    Object.assign(el, {
      loginScreen: qs('#loginScreen'),
      appShell: qs('#appShell'),
      loginEmployeeId: qs('#loginEmployeeId'),
      loginPassword: qs('#loginPassword'),
      loginBtn: qs('#loginBtn'),
      registerEmployeeId: qs('#registerEmployeeId'),
      registerFullName: qs('#registerFullName'),
      registerRole: qs('#registerRole'),
      registerDepartment: qs('#registerDepartment'),
      registerPassword: qs('#registerPassword'),
      registerConfirmPassword: qs('#registerConfirmPassword'),
      registerBtn: qs('#registerBtn'),
      showSignInTab: qs('#showSignInTab'),
      showRegisterTab: qs('#showRegisterTab'),
      signInPane: qs('#signInPane'),
      registerPane: qs('#registerPane'),
      authStatus: qs('#authStatus'),
      demoBox: qs('#demoBox'),
      logoutBtn: qs('#logoutBtn'),
      welcomeText: qs('#welcomeText'),
      summaryGrid: qs('#summaryGrid'),
      boardList: qs('#boardList'),
      boardSearch: qs('#boardSearch'),
      boardFilterChips: qs('#boardFilterChips'),
      issueTitle: qs('#issueTitle'),
      issueDescription: qs('#issueDescription'),
      issueType: qs('#issueType'),
      issueLocation: qs('#issueLocation'),
      issueDepartment: qs('#issueDepartment'),
      issuePhotoInput: qs('#issuePhotoInput'),
      issuePhotoPickBtn: qs('#issuePhotoPickBtn'),
    issuePhotoHint: qs('#issuePhotoHint'),
      issuePhotoPreview: qs('#issuePhotoPreview'),
      saveIssueBtn: qs('#saveIssueBtn'),
      clearIssueBtn: qs('#clearIssueBtn'),
      prioritySegment: qs('#prioritySegment'),
      templateCards: qs('#templateCards'),
      checklistRunPanel: qs('#checklistRunPanel'),
      activityList: qs('#activityList'),
      issueModal: qs('#issueModal'),
      issueModalContent: qs('#issueModalContent'),
      closeIssueModalBtn: qs('#closeIssueModalBtn'),
      exportJsonBtn: qs('#exportJsonBtn'),
      importJsonInput: qs('#importJsonInput'),
      seedDemoBtn: qs('#seedDemoBtn'),
      fabNewIssue: qs('#fabNewIssue'),
      modeBanner: qs('#modeBanner'),
      connectionBadge: qs('#connectionBadge'),
    });

    populateDepartmentSelects();
  }

  function bindEvents() {
    el.loginBtn.addEventListener('click', handleLogin);
    el.registerBtn.addEventListener('click', handleRegister);
    el.logoutBtn.addEventListener('click', handleLogout);
    el.showSignInTab.addEventListener('click', () => showAuthTab('signin'));
    el.showRegisterTab.addEventListener('click', () => showAuthTab('register'));
    el.registerRole.addEventListener('change', syncRegisterRoleDepartment);
    qsa('.demo-user').forEach(btn => btn.addEventListener('click', () => {
      el.loginEmployeeId.value = btn.dataset.id;
      el.loginPassword.value = btn.dataset.pass;
      handleLogin();
    }));
    qsa('.nav-link').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
    el.fabNewIssue.addEventListener('click', () => switchView('newIssueView'));
    el.boardSearch.addEventListener('input', (e) => {
      state.ui.boardSearch = e.target.value.trim().toLowerCase();
      renderBoard();
    });
    el.boardFilterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.ui.boardFilter = chip.dataset.filter;
      qsa('.chip', el.boardFilterChips).forEach(c => c.classList.toggle('active', c === chip));
      renderBoard();
    });
    el.issuePhotoInput.addEventListener('change', handleIssuePhotoPicked);
    el.saveIssueBtn.addEventListener('click', saveIssueFromForm);
    el.clearIssueBtn.addEventListener('click', clearIssueForm);
    el.prioritySegment.addEventListener('click', (e) => {
      const btn = e.target.closest('.segment');
      if (!btn) return;
      state.ui.newIssuePriority = btn.dataset.value;
      qsa('.segment', el.prioritySegment).forEach(seg => seg.classList.toggle('active', seg === btn));
    });
    el.closeIssueModalBtn.addEventListener('click', closeIssueModal);
    el.issueModal.addEventListener('click', (e) => {
      if (e.target.dataset.closeModal) closeIssueModal();
    });
    el.exportJsonBtn.addEventListener('click', exportLocalJson);
    el.importJsonInput.addEventListener('change', importLocalJson);
    el.seedDemoBtn.addEventListener('click', () => {
      if (!confirm('Reset demo data?')) return;
      seedDemoData();
      persist();
      renderAll();
    });
  }

  async function loadTemplates() {
    try {
      const res = await fetch('./data/checklist_templates.json');
      const data = await res.json();
      state.data.templates = Array.isArray(data.templates) ? data.templates : [];
    } catch (err) {
      console.error('Failed to load checklist templates', err);
      state.data.templates = [];
    }
  }

  function hydrateFromStorage() {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.data) state.data = { ...state.data, ...parsed.data, templates: state.data.templates };
      if (!window.LAYA_FIREBASE_CONFIG_PRESENT && parsed?.currentUser) state.currentUser = parsed.currentUser;
    } catch (err) {
      console.warn('Failed to hydrate local state', err);
    }
  }

  function persist() {
    const payload = {
      currentUser: isFirebaseLive() ? null : state.currentUser,
      data: {
        ...state.data,
        templates: undefined,
      }
    };

    try {
      localStorage.setItem(APP_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Persist failed, retrying without inline photos', err);
      const fallback = {
        ...payload,
        data: stripInlinePhotosFromData(payload.data),
      };
      localStorage.setItem(APP_KEY, JSON.stringify(fallback));
    }
  }

  function stripInlinePhotosFromData(data) {
    return {
      ...data,
      issues: (data.issues || []).map(issue => ({
        ...issue,
        cover_photo_url: isInlineDataUrl(issue.cover_photo_url) ? '' : (issue.cover_photo_url || ''),
        cover_thumb_url: isInlineDataUrl(issue.cover_thumb_url) ? '' : (issue.cover_thumb_url || ''),
        before_photos: [],
        after_photos: [],
      })),
    };
  }

  function isInlineDataUrl(value) {
    return typeof value === 'string' && value.startsWith('data:image/');
  }

  async function handleLogin() {
    const employeeId = el.loginEmployeeId.value.trim();
    const password = el.loginPassword.value.trim();
    if (!employeeId || !password) {
      setAuthStatus('กรุณาใส่ Employee ID และ Password', 'error');
      return;
    }

    if (isFirebaseLive()) {
      try {
        setAuthStatus('กำลังเข้าสู่ระบบ...', 'info');
        const fb = window.LAYA_FIREBASE;
        await fb.sdk.signInWithEmailAndPassword(fb.auth, employeeIdToEmail(employeeId), password);
      } catch (err) {
        console.error(err);
        setAuthStatus('Employee ID หรือ Password ไม่ถูกต้อง', 'error');
      }
      return;
    }

    const user = DEMO_USERS.find(u => u.employee_id === employeeId && u.password === password);
    if (!user) {
      alert('Employee ID หรือ Password ไม่ถูกต้อง');
      return;
    }
    state.currentUser = { ...user };
    persist();
    renderAuthState();
    renderAll();
  }

  async function handleRegister() {
    if (!isFirebaseLive()) {
      setAuthStatus('ต้องเชื่อม Firebase ให้พร้อมก่อนจึงจะสมัครสมาชิกได้', 'error');
      return;
    }

    const employeeId = el.registerEmployeeId.value.trim();
    const fullName = el.registerFullName.value.trim();
    const role = el.registerRole.value;
    const department = role === 'mod' ? 'MOD' : el.registerDepartment.value;
    const position = '';
    const password = el.registerPassword.value.trim();
    const confirmPassword = el.registerConfirmPassword.value.trim();

    if (!employeeId || !fullName || !password || !confirmPassword) {
      setAuthStatus('กรุณากรอกข้อมูลสมัครสมาชิกให้ครบ', 'error');
      return;
    }
    if (password.length < 6) {
      setAuthStatus('รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร', 'error');
      return;
    }
    if (password !== confirmPassword) {
      setAuthStatus('Confirm Password ไม่ตรงกัน', 'error');
      return;
    }

    const fb = window.LAYA_FIREBASE;
    const email = employeeIdToEmail(employeeId);
    const pending = { employeeId, fullName, role, department, position, email };
    let createdUser = null;

    try {
      savePendingRegistration(pending);
      setAuthStatus('กำลังสร้างบัญชี...', 'info');

      const cred = await fb.sdk.createUserWithEmailAndPassword(fb.auth, email, password);
      createdUser = cred.user;

      const userRef = fb.sdk.doc(fb.db, 'users', cred.user.uid);
      await fb.sdk.setDoc(userRef, buildUserProfile(pending));

      clearPendingRegistration();
      setAuthStatus('สร้างบัญชีสำเร็จ กำลังเข้าสู่ระบบ...', 'success');
      el.registerPassword.value = '';
      el.registerConfirmPassword.value = '';
    } catch (err) {
      console.error(err);
      if (createdUser) {
        try {
          await fb.sdk.deleteUser(createdUser);
        } catch (cleanupErr) {
          console.warn('Failed to rollback auth user after profile write error', cleanupErr);
        }
      }
      clearPendingRegistration();
      setAuthStatus(friendlyRegisterError(err), 'error');
    }
  }

  async function handleLogout() {
    if (isFirebaseLive()) {
      try {
        await window.LAYA_FIREBASE.sdk.signOut(window.LAYA_FIREBASE.auth);
        setAuthStatus('ออกจากระบบแล้ว', 'info');
      } catch (err) {
        console.error(err);
        setAuthStatus('ออกจากระบบไม่สำเร็จ', 'error');
      }
      return;
    }
    state.currentUser = null;
    persist();
    renderAuthState();
  }

  function renderAuthState() {
    const loggedIn = !!state.currentUser;
    el.loginScreen.classList.toggle('hidden', loggedIn);
    el.appShell.classList.toggle('hidden', !loggedIn);
    if (!loggedIn) return;
    el.welcomeText.textContent = `${state.currentUser.full_name} • ${state.currentUser.role.toUpperCase()} • ${state.currentUser.department}`;
  }

  function switchView(viewId) {
    state.ui.activeView = viewId;
    qsa('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
    qsa('.nav-link').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
    if (viewId === 'boardView') renderBoard();
    if (viewId === 'activityView') renderActivity();
    if (viewId === 'checklistView') renderTemplateCards();
  }

  function renderAll() {
    renderAuthState();
    if (!state.currentUser) return;
    renderSummary();
    renderBoard();
    renderTemplateCards();
    renderActivity();
    switchView(state.ui.activeView);
  }

  function renderSummary() {
    const visibleIssues = getVisibleIssuesForCurrentUser();
    const openCount = visibleIssues.filter(i => i.status === 'open').length;
    const progressCount = visibleIssues.filter(i => i.status === 'in_progress').length;
    const criticalCount = visibleIssues.filter(i => i.priority === 'critical' && i.status !== 'closed').length;
    const closedTodayCount = visibleIssues.filter(i => i.status === 'closed' && isToday(i.closed_at || i.updated_at)).length;

    const cards = [
      { label: 'Open Today', value: openCount, hint: 'ยังต้องตามต่อ' },
      { label: 'In Progress', value: progressCount, hint: 'กำลังดำเนินการ' },
      { label: 'Critical', value: criticalCount, hint: 'ต้องเร่งตรวจ' },
      { label: 'Closed Today', value: closedTodayCount, hint: 'ปิดงานวันนี้' },
    ];

    el.summaryGrid.innerHTML = cards.map(card => `
      <article class="summary-card">
        <div class="summary-label">${escapeHtml(card.label)}</div>
        <div class="summary-value">${card.value}</div>
        <div class="summary-hint">${escapeHtml(card.hint)}</div>
      </article>
    `).join('');
  }

  function renderBoard() {
    const issues = applyBoardFilters(getVisibleIssuesForCurrentUser()).sort(sortIssues);

    if (!issues.length) {
      el.boardList.innerHTML = `<div class="empty-state">ยังไม่มี issue ในมุมมองนี้</div>`;
      return;
    }

    el.boardList.innerHTML = issues.map(issue => {
      const deptName = getDepartmentName(issue.assigned_department);
      const thumb = issue.cover_thumb_url || issue.cover_photo_url;
      const thumbHtml = thumb
        ? `<img class="issue-thumb" src="${thumb}" alt="Issue photo" />`
        : `<div class="issue-thumb placeholder">NO PHOTO</div>`;
      return `
        <article class="issue-card">
          ${thumbHtml}
          <div>
            <div class="issue-title-row">
              <div>
                <div class="issue-title">${escapeHtml(issue.title)}</div>
                <div class="meta-row">
                  <span>${escapeHtml(deptName)}</span>
                  <span>•</span>
                  <span>${escapeHtml(issue.location_text || '-')}</span>
                  <span>•</span>
                  <span>${formatDateTime(issue.created_at)}</span>
                </div>
              </div>
              <div class="issue-badges">
                <div class="priority-pill priority-${issue.priority}">${labelize(issue.priority)}</div>
                <div class="status-pill status-${issue.status}">${labelize(issue.status)}</div>
              </div>
            </div>
            <div class="issue-desc">${escapeHtml(issue.description || '')}</div>
            <div class="meta-row">
              <span>${issue.comment_count || 0} comments</span>
              <span>•</span>
              <span>${escapeHtml(issue.issue_no || issue.id)}</span>
              <span>•</span>
              <span>Reported by ${escapeHtml(issue.reported_by_name || '-')}</span>
            </div>
            <div class="issue-actions">
              <button class="mini-btn" data-open-issue="${issue.id}">Open Detail</button>
              ${renderQuickStatusButtons(issue)}
            </div>
          </div>
        </article>
      `;
    }).join('');

    qsa('[data-open-issue]', el.boardList).forEach(btn => btn.addEventListener('click', () => openIssueModal(btn.dataset.openIssue)));
    qsa('[data-status-action]', el.boardList).forEach(btn => btn.addEventListener('click', () => {
      updateIssueStatus(btn.dataset.issueId, btn.dataset.statusAction);
    }));
  }

  function renderQuickStatusButtons(issue) {
    if (!canWorkIssue(issue)) return '';
    const buttons = [];
    if (issue.status === 'open') buttons.push(`<button class="mini-btn" data-status-action="in_progress" data-issue-id="${issue.id}">Start Work</button>`);
    if (issue.status !== 'closed') buttons.push(`<button class="mini-btn" data-status-action="closed" data-issue-id="${issue.id}">Close</button>`);
    if (issue.status === 'closed') buttons.push(`<button class="mini-btn" data-status-action="open" data-issue-id="${issue.id}">Reopen</button>`);
    return buttons.join('');
  }

  async function handleIssuePhotoPicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIssuePhotoHint('กำลังย่อรูปก่อนอัปโหลด…', '');
      if (!file.type || !file.type.startsWith('image/')) {
        throw new Error('invalid_file_type');
      }
      const optimized = await optimizeIssuePhoto(file);
      el.issuePhotoPreview.src = optimized.previewDataUrl || optimized.thumbDataUrl || optimized.fullDataUrl;
      el.issuePhotoPreview.classList.remove('hidden');
      el.issuePhotoPreview.dataset.imageData = optimized.fullDataUrl;
      el.issuePhotoPreview.dataset.thumbData = optimized.thumbDataUrl;
      setIssuePhotoHint(
        `ย่อรูปแล้ว ${formatBytes(optimized.originalBytes)} → ${formatBytes(optimized.fullBytes)} • thumbnail ${formatBytes(optimized.thumbBytes)}`,
        'success'
      );
    } catch (err) {
      console.error('Issue photo process failed', err);
      el.issuePhotoInput.value = '';
      el.issuePhotoPreview.src = '';
      el.issuePhotoPreview.classList.add('hidden');
      delete el.issuePhotoPreview.dataset.imageData;
      delete el.issuePhotoPreview.dataset.thumbData;
      const msg = err?.message === 'invalid_file_type'
        ? 'ไฟล์นี้ไม่ใช่รูปภาพ'
        : 'เลือกรูปไม่สำเร็จ ลองใช้รูป JPG/PNG หรือถ่ายใหม่อีกครั้ง';
      setIssuePhotoHint(msg, 'error');
      alert(msg);
    }
  }

  function setIssuePhotoHint(message, tone = '') {
    if (!el.issuePhotoHint) return;
    el.issuePhotoHint.textContent = message;
    el.issuePhotoHint.classList.remove('error', 'success');
    if (tone) el.issuePhotoHint.classList.add(tone);
  }

  function clearIssueForm() {
    el.issueTitle.value = '';
    el.issueDescription.value = '';
    el.issueLocation.value = '';
    el.issueType.value = 'water_leak';
    el.issueDepartment.value = 'ENG';
    el.issuePhotoInput.value = '';
    el.issuePhotoPreview.src = '';
    el.issuePhotoPreview.classList.add('hidden');
    delete el.issuePhotoPreview.dataset.imageData;
    delete el.issuePhotoPreview.dataset.thumbData;
    setIssuePhotoHint('แนะนำรูปไม่เกิน 10 MB • ระบบจะย่อรูปก่อนบันทึกทุกครั้ง');
    state.ui.newIssuePriority = 'medium';
    qsa('.segment', el.prioritySegment).forEach(seg => seg.classList.toggle('active', seg.dataset.value === 'medium'));
  }

  function saveIssueFromForm() {
    const title = el.issueTitle.value.trim();
    const description = el.issueDescription.value.trim();
    const issueType = el.issueType.value;
    const location = el.issueLocation.value.trim();
    const assignedDepartment = el.issueDepartment.value;
    const priority = state.ui.newIssuePriority;
    const photoData = el.issuePhotoPreview.dataset.imageData || '';
    const thumbData = el.issuePhotoPreview.dataset.thumbData || photoData;

    if (!title) return alert('กรุณาใส่หัวข้อ issue');
    if (!location) return alert('กรุณาใส่ location');

    createIssue({
      source_type: 'manual',
      title,
      description,
      issue_type: issueType,
      priority,
      assigned_department: assignedDepartment,
      location_text: location,
      before_photos: photoData ? [{ url: photoData, thumb_url: thumbData }] : [],
    });

    clearIssueForm();
    switchView('boardView');
  }

  function createIssue(payload) {
    const now = new Date().toISOString();
    state.data.counters.issue += 1;
    const id = `issue_${cryptoRandom()}`;
    const issueNo = buildIssueNo(state.data.counters.issue);
    const issue = {
      id,
      issue_no: issueNo,
      source_type: payload.source_type || 'manual',
      source_checklist_run_id: payload.source_checklist_run_id || '',
      source_checklist_answer_id: payload.source_checklist_answer_id || '',
      title: payload.title,
      description: payload.description || '',
      issue_type: payload.issue_type || 'other',
      priority: payload.priority || 'medium',
      status: 'open',
      assigned_department: payload.assigned_department || 'ENG',
      assigned_to_uid: '',
      assigned_to_name: '',
      location_text: payload.location_text || '',
      reported_by_uid: state.currentUser.uid,
      reported_by_name: state.currentUser.full_name,
      reported_by_department: state.currentUser.department,
      cover_photo_url: payload.before_photos?.[0]?.url || '',
      cover_thumb_url: payload.before_photos?.[0]?.thumb_url || '',
      before_photos: payload.before_photos || [],
      after_photos: [],
      comments: [],
      comment_count: 0,
      activity_count: 1,
      created_at: now,
      updated_at: now,
      last_activity_at: now,
      last_comment_at: '',
      closed_at: '',
      closed_by_uid: '',
      closed_by_name: '',
    };
    state.data.issues.unshift(issue);
    addActivity({ type: 'issue', title: issue.title, text: `${state.currentUser.full_name} created issue ${issue.issue_no}`, created_at: now });
    persist();
    renderAll();
  }

  function renderTemplateCards() {
    if (!state.data.templates.length) {
      el.templateCards.innerHTML = `<div class="empty-state">ยังไม่พบ checklist template</div>`;
      return;
    }
    el.templateCards.innerHTML = state.data.templates.map(template => {
      const itemCount = template.sections?.reduce((sum, sec) => sum + (sec.item_count || sec.items?.length || 0), 0) || 0;
      return `
        <article class="template-card">
          <div>
            <div class="eyebrow">CHECKLIST TEMPLATE</div>
            <h4>${escapeHtml(template.template_name)}</h4>
            <div class="template-meta">${template.sections?.length || 0} sections • ${itemCount} items</div>
          </div>
          <div class="muted">${escapeHtml(template.source_sheet || '')}</div>
          <button class="btn btn-primary" data-template-open="${template.template_code}">Open Checklist</button>
        </article>
      `;
    }).join('');

    qsa('[data-template-open]', el.templateCards).forEach(btn => btn.addEventListener('click', () => openChecklistRun(btn.dataset.templateOpen)));
  }

  function openChecklistRun(templateCode) {
    state.ui.selectedTemplateCode = templateCode;
    const template = state.data.templates.find(t => t.template_code === templateCode);
    if (!template) return;

    const runId = `draft_${cryptoRandom()}`;
    const html = `
      <div class="panel-header">
        <h3>${escapeHtml(template.template_name)}</h3>
        <p class="muted">บันทึกผลตรวจ แล้วสร้าง issue เฉพาะข้อที่ fail และต้อง follow up</p>
      </div>
      <div class="checklist-run-head">
        <div>
          <label>Location</label>
          <input id="runLocation" type="text" placeholder="เช่น Main Resort / Public Area" />
        </div>
        <div>
          <label>Shift</label>
          <select id="runShift">
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
          </select>
        </div>
        <div>
          <label>Date</label>
          <input id="runDate" type="date" value="${todayInputValue()}" />
        </div>
      </div>
      <div id="checklistSections"></div>
      <div class="sticky-actions">
        <button class="btn btn-primary" id="submitChecklistBtn">Submit Checklist</button>
        <button class="btn btn-ghost" id="hideChecklistBtn">Hide</button>
      </div>
    `;
    el.checklistRunPanel.innerHTML = html;
    el.checklistRunPanel.classList.remove('hidden');

    const sectionsHost = qs('#checklistSections', el.checklistRunPanel);
    sectionsHost.innerHTML = template.sections.map(section => renderChecklistSection(section)).join('');
    bindChecklistItemEvents(sectionsHost);
    qs('#hideChecklistBtn', el.checklistRunPanel).addEventListener('click', () => el.checklistRunPanel.classList.add('hidden'));
    qs('#submitChecklistBtn', el.checklistRunPanel).addEventListener('click', () => submitChecklistRun(template, runId));
  }

  function renderChecklistSection(section) {
    const items = section.items || [];
    if (!items.length) {
      return `
        <section class="section-card">
          <div class="section-head">
            <h4>${escapeHtml(section.section_title)}</h4>
            <span class="muted">Special form / placeholder</span>
          </div>
          <div class="section-body">
            <div class="empty-state">ส่วนนี้เป็น form แยกหรือ placeholder จากไฟล์ต้นทาง</div>
          </div>
        </section>
      `;
    }
    return `
      <section class="section-card" data-section-code="${section.section_code}">
        <div class="section-head">
          <h4>${escapeHtml(section.section_title)}</h4>
          <span class="muted">${items.length} items</span>
        </div>
        <div class="section-body">
          ${items.map(item => `
            <div class="item-card" data-item-code="${item.item_code}">
              <div class="item-text">${escapeHtml(item.item_text)}</div>
              <div class="item-controls">
                <div class="inline-options" data-response-group>
                  <button class="option-btn pass" type="button" data-response="pass">Pass</button>
                  <button class="option-btn fail" type="button" data-response="fail">Fail</button>
                  <button class="option-btn na" type="button" data-response="na">N/A</button>
                </div>
                <textarea data-note rows="2" placeholder="Note (optional)"></textarea>
                <div class="fail-extra hidden" data-fail-extra>
                  <select data-fail-dept>${renderDepartmentOptions()}</select>
                  <select data-fail-priority>
                    ${PRIORITIES.map(p => `<option value="${p}" ${p === 'medium' ? 'selected' : ''}>${labelize(p)}</option>`).join('')}
                  </select>
                </div>
                <label class="check-row hidden" data-create-issue-row>
                  <input type="checkbox" data-create-issue />
                  <span>Create issue if this item fails</span>
                </label>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function bindChecklistItemEvents(host) {
    qsa('[data-response-group]', host).forEach(group => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.option-btn');
        if (!btn) return;
        qsa('.option-btn', group).forEach(opt => opt.classList.toggle('active', opt === btn));
        const itemCard = group.closest('.item-card');
        itemCard.dataset.response = btn.dataset.response;
        const failExtra = qs('[data-fail-extra]', itemCard);
        const createIssueRow = qs('[data-create-issue-row]', itemCard);
        const isFail = btn.dataset.response === 'fail';
        failExtra.classList.toggle('hidden', !isFail);
        createIssueRow.classList.toggle('hidden', !isFail);
        if (!isFail) {
          const check = qs('[data-create-issue]', itemCard);
          if (check) check.checked = false;
        }
      });
    });
  }

  function submitChecklistRun(template, runId) {
    const location = qs('#runLocation', el.checklistRunPanel).value.trim();
    const shift = qs('#runShift', el.checklistRunPanel).value;
    const inspectionDate = qs('#runDate', el.checklistRunPanel).value;
    const itemCards = qsa('.item-card', el.checklistRunPanel);
    const answers = [];

    itemCards.forEach(card => {
      const response = card.dataset.response || '';
      const itemCode = card.dataset.itemCode;
      const sectionCard = card.closest('.section-card');
      const sectionCode = sectionCard?.dataset.sectionCode || '';
      const sectionTitle = qs('h4', sectionCard)?.textContent || '';
      const itemText = qs('.item-text', card)?.textContent || '';
      const note = qs('[data-note]', card)?.value.trim() || '';
      const createIssue = !!qs('[data-create-issue]', card)?.checked;
      const failDept = qs('[data-fail-dept]', card)?.value || 'ENG';
      const failPriority = qs('[data-fail-priority]', card)?.value || 'medium';
      if (!response) return;
      answers.push({
        item_code: itemCode,
        section_code: sectionCode,
        section_title: sectionTitle,
        item_text: itemText,
        response,
        note,
        create_issue: createIssue && response === 'fail',
        fail_department: failDept,
        fail_priority: failPriority,
      });
    });

    if (!answers.length) return alert('กรุณาตอบ checklist อย่างน้อย 1 ข้อ');

    state.data.counters.checklist += 1;
    const runNo = buildChecklistRunNo(state.data.counters.checklist, inspectionDate);
    const run = {
      id: runId,
      run_no: runNo,
      template_code: template.template_code,
      template_name: template.template_name,
      inspector_uid: state.currentUser.uid,
      inspector_name: state.currentUser.full_name,
      inspector_department: state.currentUser.department,
      inspection_date: inspectionDate,
      location_text: location,
      shift,
      status: 'submitted',
      answers,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_items: answers.length,
      pass_count: answers.filter(a => a.response === 'pass').length,
      fail_count: answers.filter(a => a.response === 'fail').length,
      na_count: answers.filter(a => a.response === 'na').length,
    };

    state.data.checklistRuns.unshift(run);

    const issueAnswers = answers.filter(a => a.create_issue);
    issueAnswers.forEach(a => {
      createIssue({
        source_type: 'checklist',
        source_checklist_run_id: run.id,
        source_checklist_answer_id: a.item_code,
        title: a.item_text,
        description: a.note || `Created from checklist fail: ${a.item_text}`,
        issue_type: 'other',
        priority: a.fail_priority,
        assigned_department: a.fail_department,
        location_text: location || template.template_name,
        before_photos: [],
      });
    });

    addActivity({
      type: 'checklist',
      title: template.template_name,
      text: `${state.currentUser.full_name} submitted ${run.run_no}${issueAnswers.length ? ` and created ${issueAnswers.length} issues` : ''}`,
      created_at: new Date().toISOString(),
    });

    persist();
    renderAll();
    el.checklistRunPanel.classList.add('hidden');
    switchView('boardView');
  }

  function openIssueModal(issueId) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue) return;
    state.ui.openIssueId = issueId;
    const comments = Array.isArray(issue.comments) ? issue.comments : [];

    el.issueModalContent.innerHTML = `
      <div class="issue-detail-grid">
        <div>
          ${issue.cover_photo_url ? `<img class="issue-hero" src="${issue.cover_photo_url}" alt="Issue image" />` : `<div class="issue-hero placeholder issue-thumb">NO PHOTO</div>`}
        </div>
        <div>
          <div class="detail-head">
            <h3>${escapeHtml(issue.title)}</h3>
            <div class="inline-options">
              <span class="priority-pill priority-${issue.priority}">${labelize(issue.priority)}</span>
              <span class="status-pill status-${issue.status}">${labelize(issue.status)}</span>
              <span class="status-pill status-open">${escapeHtml(getDepartmentName(issue.assigned_department))}</span>
            </div>
          </div>
          <div class="detail-meta">
            <div><strong>Location:</strong> ${escapeHtml(issue.location_text || '-')}</div>
            <div><strong>Issue No:</strong> ${escapeHtml(issue.issue_no || issue.id)}</div>
            <div><strong>Reported by:</strong> ${escapeHtml(issue.reported_by_name || '-')}</div>
            <div><strong>Created:</strong> ${formatDateTime(issue.created_at)}</div>
          </div>
          <div class="muted">${escapeHtml(issue.description || '')}</div>

          <div class="action-row">
            ${canWorkIssue(issue) && issue.status === 'open' ? `<button class="btn btn-secondary" data-detail-status="in_progress">Start Work</button>` : ''}
            ${canWorkIssue(issue) && issue.status !== 'closed' ? `<button class="btn btn-primary" data-detail-status="closed">Close Job</button>` : ''}
            ${canWorkIssue(issue) && issue.status === 'closed' ? `<button class="btn btn-secondary" data-detail-status="open">Reopen</button>` : ''}
            ${canWorkIssue(issue) && issue.status !== 'waiting' && issue.status !== 'closed' ? `<button class="btn btn-ghost" data-detail-status="waiting">Waiting</button>` : ''}
            ${canWorkIssue(issue) && issue.status === 'waiting' ? `<button class="btn btn-ghost" data-detail-status="in_progress">Resume</button>` : ''}
          </div>

          ${canWorkIssue(issue) ? `
            <div class="comment-box">
              <textarea id="detailCommentText" rows="3" placeholder="Add comment"></textarea>
              <div class="action-row">
                <button class="btn btn-secondary" id="addCommentBtn">Add Comment</button>
              </div>
            </div>
          ` : ''}

          <div class="comment-list">
            ${comments.length ? comments.map(comment => `
              <div class="comment-item ${comment.type === 'system' ? 'system-comment' : ''}">
                <div class="comment-meta">${escapeHtml(comment.by_name || comment.type || 'System')} • ${formatDateTime(comment.created_at)}</div>
                <div>${escapeHtml(comment.message || '')}</div>
              </div>
            `).join('') : '<div class="empty-state">ยังไม่มี comment</div>'}
          </div>
        </div>
      </div>
    `;

    el.issueModal.classList.remove('hidden');
    qsa('[data-detail-status]', el.issueModalContent).forEach(btn => btn.addEventListener('click', () => updateIssueStatus(issueId, btn.dataset.detailStatus)));
    const addCommentBtn = qs('#addCommentBtn', el.issueModalContent);
    if (addCommentBtn) {
      addCommentBtn.addEventListener('click', () => {
        const input = qs('#detailCommentText', el.issueModalContent);
        const message = input.value.trim();
        if (!message) return;
        addIssueComment(issueId, message);
        openIssueModal(issueId);
      });
    }
  }

  function closeIssueModal() {
    state.ui.openIssueId = null;
    el.issueModal.classList.add('hidden');
  }

  function updateIssueStatus(issueId, toStatus) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) return;
    if (!isValidTransition(issue.status, toStatus)) return alert('Status transition ไม่ถูกต้อง');

    const fromStatus = issue.status;
    issue.status = toStatus;
    issue.updated_at = new Date().toISOString();
    issue.last_activity_at = issue.updated_at;

    if (toStatus === 'closed') {
      issue.closed_at = issue.updated_at;
      issue.closed_by_uid = state.currentUser.uid;
      issue.closed_by_name = state.currentUser.full_name;
    }
    if (toStatus === 'open') {
      issue.closed_at = '';
      issue.closed_by_uid = '';
      issue.closed_by_name = '';
    }

    addSystemComment(issue, `Status changed from ${labelize(fromStatus)} to ${labelize(toStatus)}`);
    addActivity({
      type: 'issue',
      title: issue.title,
      text: `${state.currentUser.full_name} changed status to ${labelize(toStatus)}`,
      created_at: new Date().toISOString(),
    });

    persist();
    renderAll();
    if (state.ui.openIssueId === issueId) openIssueModal(issueId);
  }

  function addIssueComment(issueId, message) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) return;
    const now = new Date().toISOString();
    issue.comments = Array.isArray(issue.comments) ? issue.comments : [];
    issue.comments.push({
      id: cryptoRandom(),
      type: 'user',
      by_uid: state.currentUser.uid,
      by_name: state.currentUser.full_name,
      created_at: now,
      message,
    });
    issue.comment_count = issue.comments.length;
    issue.updated_at = now;
    issue.last_comment_at = now;
    issue.last_activity_at = now;

    addActivity({
      type: 'comment',
      title: issue.title,
      text: `${state.currentUser.full_name}: ${message}`,
      created_at: now,
    });

    persist();
    renderBoard();
    renderActivity();
  }

  function addSystemComment(issue, message) {
    const now = new Date().toISOString();
    issue.comments = Array.isArray(issue.comments) ? issue.comments : [];
    issue.comments.push({
      id: cryptoRandom(),
      type: 'system',
      by_name: 'System',
      created_at: now,
      message,
    });
    issue.comment_count = issue.comments.length;
  }

  function renderActivity() {
    const items = [...state.data.activity].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!items.length) {
      el.activityList.innerHTML = `<div class="empty-state">ยังไม่มีกิจกรรม</div>`;
      return;
    }
    el.activityList.innerHTML = items.map(item => `
      <div class="activity-item">
        <div class="comment-meta">${formatDateTime(item.created_at)}</div>
        <div><strong>${escapeHtml(item.title || item.type || 'Activity')}</strong></div>
        <div>${escapeHtml(item.text || '')}</div>
      </div>
    `).join('');
  }

  function addActivity(item) {
    state.data.activity.unshift({ id: cryptoRandom(), ...item });
    state.data.activity = state.data.activity.slice(0, 200);
  }

  function getVisibleIssuesForCurrentUser() {
    if (!state.currentUser) return [];
    if (['admin', 'mod', 'viewer'].includes(state.currentUser.role)) return [...state.data.issues];
    if (state.currentUser.role === 'dept_user') {
      return state.data.issues.filter(i => i.assigned_department === state.currentUser.department);
    }
    return [];
  }

  function canWorkIssue(issue) {
    if (!state.currentUser || !issue) return false;
    return state.currentUser.role === 'admin'
      || state.currentUser.role === 'mod'
      || (state.currentUser.role === 'dept_user' && issue.assigned_department === state.currentUser.department);
  }

  function applyBoardFilters(issues) {
    return issues.filter(issue => {
      const filter = state.ui.boardFilter;
      const search = state.ui.boardSearch;
      const deptMatch = filter !== 'mine' || issue.assigned_department === state.currentUser.department;
      const statusMatch = filter === 'all' || filter === 'mine' || issue.status === filter;
      const hay = [issue.title, issue.description, issue.location_text, issue.assigned_department, issue.issue_no].join(' ').toLowerCase();
      const searchMatch = !search || hay.includes(search);
      return deptMatch && statusMatch && searchMatch;
    });
  }

  function sortIssues(a, b) {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
  }

  function populateDepartmentSelects() {
    const issueHtml = renderDepartmentOptions();
    const registerHtml = renderDepartmentOptions(['ENG', 'HK', 'FO', 'FB', 'SEC', 'MOD']);
    el.issueDepartment.innerHTML = issueHtml;
    if (el.registerDepartment) el.registerDepartment.innerHTML = registerHtml;
    syncRegisterRoleDepartment();
  }

  function renderDepartmentOptions(allowedCodes = null) {
    const list = allowedCodes ? DEPARTMENTS.filter(dept => allowedCodes.includes(dept.code)) : DEPARTMENTS;
    return list.map(dept => `<option value="${dept.code}">${dept.name}</option>`).join('');
  }

  function seedDemoData() {
    state.data.issues = [];
    state.data.checklistRuns = [];
    state.data.activity = [];
    state.data.counters = { issue: 0, checklist: 0 };

    const demoIssues = [
      {
        title: 'Water leak at lobby entrance',
        description: 'Water found on floor during inspection. Possible leak from nearby pipe.',
        issue_type: 'water_leak',
        priority: 'high',
        assigned_department: 'ENG',
        location_text: 'Lobby entrance near main corridor',
      },
      {
        title: 'Dirty glass at lobby entrance',
        description: 'Glass panel needs immediate housekeeping attention.',
        issue_type: 'dirty_area',
        priority: 'medium',
        assigned_department: 'HK',
        location_text: 'Lobby main entrance',
      },
      {
        title: 'Exit sign light not working',
        description: 'Emergency sign appears dim and needs checking.',
        issue_type: 'light_issue',
        priority: 'critical',
        assigned_department: 'ENG',
        location_text: 'B2 service corridor',
      }
    ];

    const reporter = DEMO_USERS.find(u => u.role === 'mod');
    demoIssues.forEach((entry, idx) => {
      state.data.counters.issue += 1;
      const createdAt = new Date(Date.now() - (idx * 60 * 60 * 1000)).toISOString();
      const issue = {
        id: `seed_${idx + 1}`,
        issue_no: buildIssueNo(state.data.counters.issue, createdAt.slice(0, 10)),
        source_type: 'manual',
        source_checklist_run_id: '',
        source_checklist_answer_id: '',
        title: entry.title,
        description: entry.description,
        issue_type: entry.issue_type,
        priority: entry.priority,
        status: idx === 1 ? 'in_progress' : 'open',
        assigned_department: entry.assigned_department,
        assigned_to_uid: '',
        assigned_to_name: '',
        location_text: entry.location_text,
        reported_by_uid: reporter.uid,
        reported_by_name: reporter.full_name,
        reported_by_department: reporter.department,
        cover_photo_url: '',
        cover_thumb_url: '',
        before_photos: [],
        after_photos: [],
        comments: [
          {
            id: cryptoRandom(),
            type: 'system',
            by_name: 'System',
            created_at: createdAt,
            message: 'Issue created',
          }
        ],
        comment_count: 1,
        activity_count: 1,
        created_at: createdAt,
        updated_at: createdAt,
        last_activity_at: createdAt,
        last_comment_at: createdAt,
        closed_at: '',
        closed_by_uid: '',
        closed_by_name: '',
      };
      state.data.issues.push(issue);
      addActivity({ type: 'seed', title: issue.title, text: `${reporter.full_name} created ${issue.issue_no}`, created_at: createdAt });
    });
  }

  function exportLocalJson() {
    const blob = new Blob([JSON.stringify({ currentUser: state.currentUser, data: state.data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laya-mod-demo-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importLocalJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed?.data) {
          state.data = { ...state.data, ...parsed.data, templates: state.data.templates };
          state.currentUser = parsed.currentUser || state.currentUser;
          persist();
          renderAll();
          alert('Import complete');
        }
      } catch (err) {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function isValidTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus) return true;
    const map = {
      open: ['in_progress', 'waiting', 'closed'],
      in_progress: ['open', 'waiting', 'closed'],
      waiting: ['open', 'in_progress', 'closed'],
      closed: ['open'],
    };
    return (map[fromStatus] || []).includes(toStatus);
  }

  function buildIssueNo(nextNumber, dateLike = new Date()) {
    const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `ISS-${y}${m}${d}-${String(nextNumber).padStart(4, '0')}`;
  }

  function buildChecklistRunNo(nextNumber, dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `CHK-${y}${m}${d}-${String(nextNumber).padStart(4, '0')}`;
  }

  async function fileToDataUrl(fileOrImage, maxSize = 1400, quality = 0.82) {
    const img = fileOrImage instanceof HTMLImageElement ? fileOrImage : await readFileAsImage(fileOrImage);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  async function fileToOptimizedDataUrl(fileOrImage, options = {}) {
    const img = fileOrImage instanceof HTMLImageElement ? fileOrImage : await readFileAsImage(fileOrImage);
    const targetBytes = options.targetBytes || 220 * 1024;
    const steps = options.steps || [
      { maxSize: 1440, quality: 0.8 },
      { maxSize: 1280, quality: 0.76 },
      { maxSize: 1080, quality: 0.72 },
      { maxSize: 960, quality: 0.66 },
      { maxSize: 820, quality: 0.6 },
      { maxSize: 720, quality: 0.56 },
      { maxSize: 640, quality: 0.5 },
    ];

    let best = '';
    for (const step of steps) {
      const candidate = await fileToDataUrl(img, step.maxSize, step.quality);
      best = candidate;
      if (estimateDataUrlBytes(candidate) <= targetBytes) break;
    }
    return best;
  }

  async function optimizeIssuePhoto(file) {
    const img = await readFileAsImage(file);
    const fullDataUrl = await fileToOptimizedDataUrl(img, {
      targetBytes: 220 * 1024,
      steps: [
        { maxSize: 1400, quality: 0.8 },
        { maxSize: 1280, quality: 0.76 },
        { maxSize: 1080, quality: 0.7 },
        { maxSize: 960, quality: 0.64 },
        { maxSize: 820, quality: 0.58 },
        { maxSize: 720, quality: 0.52 },
      ],
    });
    const thumbDataUrl = await fileToOptimizedDataUrl(img, {
      targetBytes: 45 * 1024,
      steps: [
        { maxSize: 640, quality: 0.68 },
        { maxSize: 520, quality: 0.62 },
        { maxSize: 420, quality: 0.56 },
        { maxSize: 360, quality: 0.5 },
      ],
    });

    return {
      originalBytes: file.size || 0,
      fullBytes: estimateDataUrlBytes(fullDataUrl),
      thumbBytes: estimateDataUrlBytes(thumbDataUrl),
      fullDataUrl,
      thumbDataUrl,
      previewDataUrl: thumbDataUrl,
    };
  }

  function estimateDataUrlBytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return 0;
    const base64 = dataUrl.split(',')[1] || '';
    return Math.ceil((base64.length * 3) / 4);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function readFileAsImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function todayInputValue() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function isToday(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function getDepartmentName(code) {
    return DEPARTMENTS.find(d => d.code === code)?.name || code || '-';
  }

  function labelize(value) {
    if (!value) return '-';
    return String(value).replaceAll('_', ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  }

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function escapeHtml(input) {
    return String(input ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cryptoRandom() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return Math.random().toString(36).slice(2, 10);
  }
})();
