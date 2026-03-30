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
    firebaseIssuesUnsub: null,
    firebaseIssueCommentsUnsub: null,
    firebaseTemplatesUnsub: null,
    firebaseChecklistRunsUnsub: null,
    ui: {
      activeView: 'boardView',
      boardFilter: 'all',
      boardSearch: '',
      closedSearch: '',
      newIssuePriority: 'medium',
      selectedTemplateCode: null,
      openIssueId: null,
      liveIssueComments: [],
      pendingIssuePhoto: null,
      pendingIssueVideo: null,
      checklistBuilderSections: [],
    },
    data: {
      issues: [],
      checklistRuns: [],
      activity: [],
      templates: [],
      baseTemplates: [],
      customTemplates: [],
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
    if (!window.LAYA_FIREBASE_CONFIG_PRESENT && !state.data.issues.length && !state.data.activity.length) {
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
        stopIssueSync();
        stopIssueCommentsSync();
        stopTemplatesSync();
        stopChecklistRunsSync();
        state.ui.liveIssueComments = [];
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
        startTemplatesSync();
        startChecklistRunsSync();

        try {
          await fb.sdk.updateDoc(userRef, {
            last_login_at: fb.sdk.serverTimestamp(),
            updated_at: fb.sdk.serverTimestamp()
          });
        } catch (_) {}

        setAuthStatus('เข้าสู่ระบบสำเร็จ', 'success');
        startIssuesSync();
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
      closedSearch: qs('#closedSearch'),
      boardFilterChips: qs('#boardFilterChips'),
      closedList: qs('#closedList'),
      openClosedJobsBtn: qs('#openClosedJobsBtn'),
      openClosedJobsFromMore: qs('#openClosedJobsFromMore'),
      backToBoardBtn: qs('#backToBoardBtn'),
      issueTitle: qs('#issueTitle'),
      issueDescription: qs('#issueDescription'),
      issueType: qs('#issueType'),
      issueLocation: qs('#issueLocation'),
      issueDepartment: qs('#issueDepartment'),
      issuePhotoInput: qs('#issuePhotoInput'),
      issueCameraInput: qs('#issueCameraInput'),
      issuePhotoPickBtn: qs('#issuePhotoPickBtn'),
      issueCameraPickBtn: qs('#issueCameraPickBtn'),
      issuePhotoHint: qs('#issuePhotoHint'),
      issuePhotoPreview: qs('#issuePhotoPreview'),
      issueVideoInput: qs('#issueVideoInput'),
      issueVideoCameraInput: qs('#issueVideoCameraInput'),
      issueVideoPickBtn: qs('#issueVideoPickBtn'),
      issueVideoCameraPickBtn: qs('#issueVideoCameraPickBtn'),
      issueVideoHint: qs('#issueVideoHint'),
      issueVideoPreview: qs('#issueVideoPreview'),
      saveIssueBtn: qs('#saveIssueBtn'),
      clearIssueBtn: qs('#clearIssueBtn'),
      prioritySegment: qs('#prioritySegment'),
      templateCards: qs('#templateCards'),
      addChecklistTemplateBtn: qs('#addChecklistTemplateBtn'),
      checklistTemplateBuilder: qs('#checklistTemplateBuilder'),
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
    if (el.closedSearch) el.closedSearch.addEventListener('input', (e) => {
      state.ui.closedSearch = e.target.value.trim().toLowerCase();
      renderClosedJobs();
    });
    if (el.openClosedJobsBtn) el.openClosedJobsBtn.addEventListener('click', () => switchView('closedView'));
    if (el.openClosedJobsFromMore) el.openClosedJobsFromMore.addEventListener('click', () => switchView('closedView'));
    if (el.backToBoardBtn) el.backToBoardBtn.addEventListener('click', () => switchView('boardView'));
    el.boardFilterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.ui.boardFilter = chip.dataset.filter;
      qsa('.chip', el.boardFilterChips).forEach(c => c.classList.toggle('active', c === chip));
      renderBoard();
    });
    el.issuePhotoInput.addEventListener('change', handleIssuePhotoPicked);
    if (el.issueCameraInput) el.issueCameraInput.addEventListener('change', handleIssuePhotoPicked);
    if (el.issuePhotoPickBtn) el.issuePhotoPickBtn.addEventListener('click', () => { if (el.issuePhotoInput) el.issuePhotoInput.value = ''; });
    if (el.issueCameraPickBtn) el.issueCameraPickBtn.addEventListener('click', () => { if (el.issueCameraInput) el.issueCameraInput.value = ''; });
    if (el.issueVideoInput) el.issueVideoInput.addEventListener('change', handleIssueVideoPicked);
    if (el.issueVideoCameraInput) el.issueVideoCameraInput.addEventListener('change', handleIssueVideoPicked);
    if (el.issueVideoPickBtn) el.issueVideoPickBtn.addEventListener('click', () => { if (el.issueVideoInput) el.issueVideoInput.value = ''; });
    if (el.issueVideoCameraPickBtn) el.issueVideoCameraPickBtn.addEventListener('click', () => { if (el.issueVideoCameraInput) el.issueVideoCameraInput.value = ''; });
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
    if (el.addChecklistTemplateBtn) {
      el.addChecklistTemplateBtn.addEventListener('click', openChecklistTemplateBuilder);
    }
  }

  async function loadTemplates() {
    try {
      const res = await fetch('./data/checklist_templates.json');
      const data = await res.json();
      state.data.baseTemplates = Array.isArray(data.templates) ? data.templates : [];
    } catch (err) {
      console.error('Failed to load checklist templates', err);
      state.data.baseTemplates = [];
    }
    mergeTemplates();
  }

  function mergeTemplates() {
    const map = new Map();
    (state.data.baseTemplates || []).forEach(t => {
      if (t?.template_code) map.set(t.template_code, t);
    });
    (state.data.customTemplates || []).forEach(t => {
      if (t?.template_code) map.set(t.template_code, t);
    });
    state.data.templates = Array.from(map.values()).sort((a, b) => String(a.template_name || '').localeCompare(String(b.template_name || '')));
  }

  function hydrateFromStorage() {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        state.data = {
          ...state.data,
          ...parsed.data,
          baseTemplates: state.data.baseTemplates,
          templates: state.data.templates,
          customTemplates: Array.isArray(parsed.data.customTemplates) ? parsed.data.customTemplates : (state.data.customTemplates || []),
        };
        mergeTemplates();
      }
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
        baseTemplates: undefined,
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
        before_videos: [],
        after_photos: [],
        after_videos: [],
      })),
    };
  }

  function isInlineDataUrl(value) {
    return typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('data:video/'));
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
    stopIssueSync();
    stopIssueCommentsSync();
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
    if (viewId === 'newIssueView') {
      clearIssueForm();
    }
    qsa('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
    qsa('.nav-link').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
    if (viewId === 'boardView') renderBoard();
    if (viewId === 'activityView') renderActivity();
    if (viewId === 'checklistView') renderTemplateCards();
    if (viewId === 'closedView') renderClosedJobs();
  }

  function renderAll() {
    renderAuthState();
    if (!state.currentUser) return;
    renderSummary();
    renderBoard();
    renderTemplateCards();
    renderActivity();
    renderClosedJobs();
    switchView(state.ui.activeView);
  }

  function renderSummary() {
    const visibleIssues = getVisibleIssuesForCurrentUser().filter(i => i.issue_type !== 'checklist_submission');
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

  function renderClosedJobs() {
    if (!el.closedList) return;
    const closedItems = getClosedIssuesForCurrentUser();

    if (!closedItems.length) {
      el.closedList.innerHTML = `<div class="empty-state">ยังไม่มีงานที่ปิดแล้ว</div>`;
      return;
    }

    el.closedList.innerHTML = closedItems.map(issue => {
      const deptName = getDepartmentName(issue.assigned_department);
      const thumb = issue.cover_thumb_url || issue.cover_photo_url || issue.before_videos?.[0]?.thumb_url || issue.before_videos?.[0]?.poster_url || '';
      const hasVideo = Array.isArray(issue.before_videos) && issue.before_videos.length > 0;
      const thumbHtml = thumb
        ? `<div class="issue-thumb-wrap">${thumb ? `<img class="issue-thumb" src="${thumb}" alt="Closed issue media" />` : ''}${hasVideo ? '<span class="media-badge">VIDEO</span>' : ''}</div>`
        : `<div class="issue-thumb placeholder">DONE</div>`;
      const closedMeta = issue.closed_at ? `<span>•</span><span>Closed ${formatDateTime(issue.closed_at)}</span>` : '';
      return `
        <article class="issue-card issue-tone-closed">
          ${thumbHtml}
          <div>
            <div class="issue-title-row">
              <div>
                <div class="issue-title">${escapeHtml(issue.title)}</div>
                <div class="meta-row">
                  <span>${escapeHtml(deptName)}</span>
                  <span>•</span>
                  <span>${escapeHtml(issue.location_text || '-')}</span>
                  ${closedMeta}
                </div>
              </div>
              <div class="issue-badges">
                <div class="status-pill status-closed">Closed</div>
              </div>
            </div>
            <div class="issue-desc">${escapeHtml(issue.description || '')}</div>
            <div class="meta-row">
              <span>${escapeHtml(issue.issue_no || issue.id)}</span>
              <span>•</span>
              <span>Closed by ${escapeHtml(issue.closed_by_name || '-')}</span>
            </div>
            <div class="issue-actions">
              <button class="mini-btn" data-open-issue="${issue.id}">Open Detail</button>
              ${canWorkIssue(issue) ? `<button class="mini-btn" data-status-action="open" data-issue-id="${issue.id}">Reopen</button>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    qsa('[data-open-issue]', el.closedList).forEach(btn => btn.addEventListener('click', () => openIssueModal(btn.dataset.openIssue)));
    qsa('[data-status-action]', el.closedList).forEach(btn => btn.addEventListener('click', () => {
      updateIssueStatus(btn.dataset.issueId, btn.dataset.statusAction);
    }));
  }

  function renderBoard() {
    if (state.ui.boardFilter === 'closed') state.ui.boardFilter = 'all';
    const boardItems = getBoardFeedItems();

    if (!boardItems.length) {
      el.boardList.innerHTML = `<div class="empty-state">ยังไม่มีรายการในมุมมองนี้</div>`;
      return;
    }

    el.boardList.innerHTML = boardItems.map(item => {
      if (item.board_type === 'checklist_run') {
        return renderChecklistBoardCard(item);
      }
      const issue = item;
      const deptName = getDepartmentName(issue.assigned_department);
      const thumb = issue.cover_thumb_url || issue.cover_photo_url || issue.before_videos?.[0]?.thumb_url || issue.before_videos?.[0]?.poster_url || '';
      const hasVideo = Array.isArray(issue.before_videos) && issue.before_videos.length > 0;
      const mediaNote = hasVideo ? `<span>•</span><span>${issue.before_videos.length} video${issue.before_videos.length > 1 ? 's' : ''}</span>` : '';
      const thumbHtml = thumb
        ? `<div class="issue-thumb-wrap">${issue.cover_photo_url || issue.cover_thumb_url ? `<img class="issue-thumb" src="${thumb}" alt="Issue photo" />` : `<img class="issue-thumb" src="${thumb}" alt="Issue media poster" />`} ${hasVideo ? '<span class="media-badge">VIDEO</span>' : ''}</div>`
        : `<div class="issue-thumb placeholder">${hasVideo ? 'VIDEO' : (issue.issue_type === 'checklist_submission' ? 'CHECKLIST' : 'NO PHOTO')}</div>`;
      return `
        <article class="issue-card ${getIssueCardToneClass(issue)}">
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
                ${issue.issue_type === 'checklist_submission' ? '<div class="status-pill status-closed">Checklist</div>' : `<div class="priority-pill priority-${issue.priority}">${labelize(issue.priority)}</div>`}
                <div class="status-pill status-${issue.status}">${labelize(issue.status)}</div>
              </div>
            </div>
            <div class="issue-desc">${escapeHtml(issue.description || '')}</div>
            <div class="meta-row">
              <span>${issue.comment_count || 0} comments</span>
              ${mediaNote}
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
    qsa('[data-open-checklist-run]', el.boardList).forEach(btn => btn.addEventListener('click', () => openChecklistRunSummary(btn.dataset.openChecklistRun)));
  }

  function getIssueCardToneClass(issue) {
    if (!issue) return 'issue-tone-medium';
    if (issue.status === 'closed') return 'issue-tone-closed';
    if (issue.priority === 'critical') return 'issue-tone-critical';
    if (issue.priority === 'high') return 'issue-tone-high';
    if (issue.priority === 'low') return 'issue-tone-low';
    return 'issue-tone-medium';
  }

  function renderQuickStatusButtons(issue) {
    if (!canWorkIssue(issue) || issue.issue_type === 'checklist_submission') return '';
    const buttons = [];
    if (issue.status === 'open') buttons.push(`<button class="mini-btn" data-status-action="in_progress" data-issue-id="${issue.id}">Start Work</button>`);
    if (issue.status !== 'closed') buttons.push(`<button class="mini-btn" data-status-action="closed" data-issue-id="${issue.id}">Close</button>`);
    if (issue.status === 'closed') buttons.push(`<button class="mini-btn" data-status-action="open" data-issue-id="${issue.id}">Reopen</button>`);
    return buttons.join('');
  }

  function renderChecklistBoardCard(run) {
    const failCount = run.fail_count || 0;
    const issueCount = run.issue_count || 0;
    const desc = `${run.template_name} • ${run.pass_count || 0} pass • ${failCount} fail • ${run.na_count || 0} N/A${issueCount ? ` • ${issueCount} issue` : ''}`;
    return `
      <article class="issue-card issue-tone-closed checklist-board-card">
        <div class="issue-thumb placeholder checklist-placeholder">DONE</div>
        <div>
          <div class="issue-title-row">
            <div>
              <div class="issue-title">Checklist submitted: ${escapeHtml(run.template_name || 'Checklist')}</div>
              <div class="meta-row">
                <span>${escapeHtml(run.location_text || '-')}</span>
                <span>•</span>
                <span>${escapeHtml(labelize(run.shift || '-'))}</span>
                <span>•</span>
                <span>${formatDateTime(run.submitted_at || run.created_at)}</span>
              </div>
            </div>
            <div class="issue-badges">
              <div class="status-pill status-closed">Submitted</div>
              <div class="priority-pill priority-low">Checklist</div>
            </div>
          </div>
          <div class="issue-desc">${escapeHtml(desc)}</div>
          <div class="meta-row">
            <span>${escapeHtml(run.run_no || run.id)}</span>
            <span>•</span>
            <span>Inspector ${escapeHtml(run.inspector_name || '-')}</span>
          </div>
          <div class="issue-actions">
            <button class="mini-btn" data-open-checklist-run="${run.id}">Open Summary</button>
          </div>
        </div>
      </article>
    `;
  }

  function getBoardFeedItems() {
    const issueItems = applyBoardFilters(getVisibleIssuesForCurrentUser()).sort(sortIssues);
    const checklistItems = getVisibleChecklistRunsForBoard();
    return [...issueItems, ...checklistItems].sort(sortBoardItems);
  }

  function getVisibleChecklistRunsForBoard() {
    if (!state.currentUser) return [];
    const filter = state.ui.boardFilter;
    const search = state.ui.boardSearch;
    if (!(filter === 'all' || filter === 'mine')) return [];
    let runs = [...(state.data.checklistRuns || [])].filter(run => run.status === 'submitted');
    if (filter === 'mine') {
      runs = runs.filter(run => (run.inspector_department || 'MOD') === state.currentUser.department);
    }
    if (search) {
      runs = runs.filter(run => [run.template_name, run.location_text, run.run_no, run.inspector_name].join(' ').toLowerCase().includes(search));
    }
    return runs.map(run => ({ ...run, board_type: 'checklist_run' }));
  }

  function sortBoardItems(a, b) {
    const ad = new Date((a.updated_at || a.submitted_at || a.created_at || 0)).getTime();
    const bd = new Date((b.updated_at || b.submitted_at || b.created_at || 0)).getTime();
    return bd - ad;
  }

  function openChecklistRunSummary(runId) {
    const run = (state.data.checklistRuns || []).find(r => r.id === runId);
    if (!run) return;
    const answerHtml = (run.answers || []).map(ans => `
      <div class="comment-item">
        <div class="comment-meta">${escapeHtml(ans.section_title || '')}</div>
        <div><strong>${escapeHtml(ans.item_text || '')}</strong></div>
        <div class="meta-row"><span>${escapeHtml((ans.response || '').toUpperCase())}</span>${ans.create_issue ? '<span>•</span><span>Issue created</span>' : ''}</div>
        ${ans.note ? `<div>${escapeHtml(ans.note)}</div>` : ''}
      </div>
    `).join('');
    el.issueModalContent.innerHTML = `
      <div class="issue-detail-grid">
        <div>
          <div class="panel glass inner-panel">
            <div class="panel-header"><h3>${escapeHtml(run.template_name || 'Checklist')}</h3></div>
            <div class="detail-meta">
              <div><strong>Run No:</strong> ${escapeHtml(run.run_no || run.id)}</div>
              <div><strong>Inspector:</strong> ${escapeHtml(run.inspector_name || '-')}</div>
              <div><strong>Location:</strong> ${escapeHtml(run.location_text || '-')}</div>
              <div><strong>Date:</strong> ${formatDateTime(run.submitted_at || run.created_at)}</div>
              <div><strong>Result:</strong> ${run.pass_count || 0} pass • ${run.fail_count || 0} fail • ${run.na_count || 0} N/A</div>
            </div>
          </div>
        </div>
        <div>
          <div class="panel glass inner-panel">
            <div class="panel-header"><h3>Checklist Answers</h3></div>
            <div class="comments-list">${answerHtml || '<div class="empty-state">No answers</div>'}</div>
          </div>
        </div>
      </div>
    `;
    el.issueModal.classList.remove('hidden');
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
      state.ui.pendingIssuePhoto = optimized;
      el.issuePhotoPreview.src = optimized.previewDataUrl || optimized.thumbDataUrl || optimized.fullDataUrl;
      el.issuePhotoPreview.dataset.lockedFromCurrentSelection = '1';
      el.issuePhotoPreview.classList.remove('hidden');
      setIssuePhotoHint(
        `ย่อรูปแล้ว ${formatBytes(optimized.originalBytes)} → ${formatBytes(optimized.fullBytes)} • thumbnail ${formatBytes(optimized.thumbBytes)}`,
        'success'
      );
    } catch (err) {
      console.error('Issue photo process failed', err);
      el.issuePhotoInput.value = '';
      if (el.issueCameraInput) el.issueCameraInput.value = '';
      el.issuePhotoPreview.src = '';
      el.issuePhotoPreview.classList.add('hidden');
      delete el.issuePhotoPreview.dataset.lockedFromCurrentSelection;
      state.ui.pendingIssuePhoto = null;
      const msg = err?.message === 'invalid_file_type'
        ? 'ไฟล์นี้ไม่ใช่รูปภาพ'
        : 'เลือกรูปไม่สำเร็จ ลองใช้รูป JPG/PNG เปิดสิทธิ์รูปภาพ/กล้อง แล้วลองอีกครั้ง';
      setIssuePhotoHint(msg, 'error');
      alert(msg);
    }
  }

  async function handleIssueVideoPicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIssueVideoHint('กำลังเตรียมวิดีโอสำหรับอัปโหลด…', '');
      if (!file.type || !file.type.startsWith('video/')) {
        throw new Error('invalid_video_type');
      }
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('video_too_large');
      }
      const prepared = await prepareIssueVideo(file);
      revokeIssueVideoPreview();
      state.ui.pendingIssueVideo = prepared;
      const hasCurrentPhotoFile = Boolean(el.issuePhotoInput?.files?.length || el.issueCameraInput?.files?.length);
      if (!hasCurrentPhotoFile && !el.issuePhotoPreview?.dataset?.lockedFromCurrentSelection) {
        // กันกรณีรูปเก่าค้างจาก issue ก่อนหน้าแล้วมาปนกับวิดีโอใหม่
        state.ui.pendingIssuePhoto = null;
        if (el.issuePhotoPreview) {
          el.issuePhotoPreview.src = '';
          el.issuePhotoPreview.classList.add('hidden');
        }
        setIssuePhotoHint('ยังไม่ได้เลือกรูป • หากต้องการแนบเฉพาะวิดีโอ ระบบจะใช้ poster จากวิดีโอแทน', '');
      }
      if (el.issueVideoPreview) {
        el.issueVideoPreview.src = prepared.previewUrl;
        el.issueVideoPreview.classList.remove('hidden');
        el.issueVideoPreview.load();
      }
      setIssueVideoHint(`พร้อมอัปโหลดวิดีโอ ${formatBytes(prepared.originalBytes)} • poster ${formatBytes(prepared.posterBytes)}`, 'success');
    } catch (err) {
      console.error('Issue video process failed', err);
      if (el.issueVideoInput) el.issueVideoInput.value = '';
      if (el.issueVideoCameraInput) el.issueVideoCameraInput.value = '';
      revokeIssueVideoPreview();
      state.ui.pendingIssueVideo = null;
      if (el.issueVideoPreview) {
        el.issueVideoPreview.pause();
        el.issueVideoPreview.removeAttribute('src');
        el.issueVideoPreview.classList.add('hidden');
      }
      const msg = err?.message === 'invalid_video_type'
        ? 'ไฟล์นี้ไม่ใช่วิดีโอ'
        : err?.message === 'video_too_large'
          ? 'วิดีโอต้องไม่เกิน 25 MB'
          : 'เลือกวิดีโอไม่สำเร็จ ลองไฟล์ MP4/MOV ที่ขนาดไม่เกิน 25 MB';
      setIssueVideoHint(msg, 'error');
      alert(msg);
    }
  }

  function revokeIssueVideoPreview() {
    const url = state.ui.pendingIssueVideo?.previewUrl;
    if (url && String(url).startsWith('blob:')) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
  }

  function setIssueVideoHint(message, tone = '') {
    if (!el.issueVideoHint) return;
    el.issueVideoHint.textContent = message;
    el.issueVideoHint.classList.remove('error', 'success');
    if (tone) el.issueVideoHint.classList.add(tone);
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
    if (el.issueCameraInput) el.issueCameraInput.value = '';
    el.issuePhotoPreview.src = '';
    el.issuePhotoPreview.classList.add('hidden');
    delete el.issuePhotoPreview.dataset.imageData;
    delete el.issuePhotoPreview.dataset.thumbData;
    delete el.issuePhotoPreview.dataset.lockedFromCurrentSelection;
    state.ui.pendingIssuePhoto = null;
    if (el.issueVideoInput) el.issueVideoInput.value = '';
    if (el.issueVideoCameraInput) el.issueVideoCameraInput.value = '';
    revokeIssueVideoPreview();
    state.ui.pendingIssueVideo = null;
    if (el.issueVideoPreview) {
      el.issueVideoPreview.pause();
      el.issueVideoPreview.removeAttribute('src');
      el.issueVideoPreview.classList.add('hidden');
    }
    setIssuePhotoHint('แนะนำรูปไม่เกิน 10 MB • ระบบจะย่อรูปก่อนบันทึกทุกครั้ง • ใช้ได้ทั้งเลือกรูปจากเครื่องและถ่ายรูป');
    setIssueVideoHint('รองรับวิดีโอไม่เกิน 25 MB • แนะนำ MP4/MOV • ระบบจะสร้าง poster ให้ใช้อัตโนมัติ');
    state.ui.newIssuePriority = 'medium';
    qsa('.segment', el.prioritySegment).forEach(seg => seg.classList.toggle('active', seg.dataset.value === 'medium'));
  }

  async function saveIssueFromForm() {
    const title = el.issueTitle.value.trim();
    const description = el.issueDescription.value.trim();
    const issueType = el.issueType.value;
    const location = el.issueLocation.value.trim();
    const assignedDepartment = el.issueDepartment.value;
    const priority = state.ui.newIssuePriority;
    const pendingPhoto = state.ui.pendingIssuePhoto;
    const pendingVideo = state.ui.pendingIssueVideo;

    if (!title) return alert('กรุณาใส่หัวข้อ issue');
    if (!location) return alert('กรุณาใส่ location');

    try {
      el.saveIssueBtn.disabled = true;
      el.saveIssueBtn.textContent = isFirebaseLive() ? 'Saving...' : 'Saving...';
      await createIssue({
        source_type: 'manual',
        title,
        description,
        issue_type: issueType,
        priority,
        assigned_department: assignedDepartment,
        location_text: location,
        before_photos: pendingPhoto ? [{ url: pendingPhoto.fullDataUrl, thumb_url: pendingPhoto.thumbDataUrl }] : [],
        before_videos: pendingVideo ? [{
          file: pendingVideo.file,
          preview_url: pendingVideo.previewUrl,
          poster_url: pendingVideo.posterDataUrl,
          thumb_url: pendingVideo.thumbDataUrl,
          mime_type: pendingVideo.mimeType,
          original_name: pendingVideo.fileName,
          size: pendingVideo.originalBytes,
        }] : [],
      });
      clearIssueForm();
      switchView('boardView');
      setAuthStatus(isFirebaseLive() ? 'บันทึก issue เข้า Firebase แล้ว' : 'บันทึก issue แล้ว', 'success');
    } catch (err) {
      console.error('create issue failed', err);
      alert(friendlyIssueError(err));
    } finally {
      el.saveIssueBtn.disabled = false;
      el.saveIssueBtn.textContent = 'Save Issue';
    }
  }

  async function createIssue(payload) {
    if (isFirebaseLive()) {
      return createIssueFirebase(payload);
    }
    return createIssueLocal(payload);
  }

  function createIssueLocal(payload) {
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
      status: payload.status || 'open',
      assigned_department: payload.assigned_department || 'ENG',
      assigned_to_uid: '',
      assigned_to_name: '',
      location_text: payload.location_text || '',
      reported_by_uid: state.currentUser.uid,
      reported_by_name: state.currentUser.full_name,
      reported_by_department: state.currentUser.department,
      cover_photo_url: payload.before_photos?.[0]?.url || payload.before_videos?.[0]?.poster_url || '',
      cover_thumb_url: payload.before_photos?.[0]?.thumb_url || payload.before_videos?.[0]?.thumb_url || payload.before_videos?.[0]?.poster_url || '',
      before_photos: payload.before_photos || [],
      before_videos: payload.before_videos || [],
      after_photos: [],
      after_videos: [],
      comments: [],
      comment_count: 0,
      activity_count: 1,
      created_at: now,
      updated_at: now,
      last_activity_at: now,
      last_comment_at: '',
      closed_at: payload.status === 'closed' ? now : '',
      closed_by_uid: payload.status === 'closed' ? state.currentUser.uid : '',
      closed_by_name: payload.status === 'closed' ? state.currentUser.full_name : '',
    };
    state.data.issues.unshift(issue);
    addActivity({ type: 'issue', title: issue.title, text: `${state.currentUser.full_name} created issue ${issue.issue_no}`, created_at: now });
    persist();
    renderAll();
    return issue;
  }

  async function createIssueFirebase(payload) {
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const uid = fb.auth.currentUser?.uid;
    if (!uid || !state.currentUser) throw new Error('not_signed_in');

    const issueRef = sdk.doc(sdk.collection(fb.db, 'issues'));
    const uploadedBeforePhotos = await prepareIssuePhotosForFirebase(issueRef.id, payload.before_photos || []);
    const uploadedBeforeVideos = await prepareIssueVideosForFirebase(issueRef.id, payload.before_videos || []);

    await sdk.runTransaction(fb.db, async (tx) => {
      const counterRef = sdk.doc(fb.db, 'counters', 'issue_counter');
      const counterSnap = await tx.get(counterRef);
      let nextNumber = 1;
      if (counterSnap.exists()) {
        nextNumber = (counterSnap.data().last_number || 0) + 1;
        tx.update(counterRef, { last_number: nextNumber, updated_at: sdk.serverTimestamp() });
      } else {
        tx.set(counterRef, { name: 'issue_counter', last_number: 1, updated_at: sdk.serverTimestamp() });
      }

      const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueRef.id}/activity`));
      const issueNo = buildIssueNo(nextNumber);
      const beforePhotos = Array.isArray(uploadedBeforePhotos) ? uploadedBeforePhotos : [];
      const beforeVideos = Array.isArray(uploadedBeforeVideos) ? uploadedBeforeVideos : [];

      tx.set(issueRef, {
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
        building: '',
        floor: '',
        room_no: '',
        reported_by_uid: state.currentUser.uid,
        reported_by_name: state.currentUser.full_name,
        reported_by_department: state.currentUser.department,
        cover_photo_url: beforePhotos[0]?.url || beforeVideos[0]?.poster_url || '',
        cover_thumb_url: beforePhotos[0]?.thumb_url || beforeVideos[0]?.thumb_url || beforeVideos[0]?.poster_url || '',
        before_photos: beforePhotos,
        before_videos: beforeVideos,
        after_photos: [],
        after_videos: [],
        comment_count: 0,
        activity_count: 1,
        last_comment_at: null,
        last_activity_at: sdk.serverTimestamp(),
        closed_at: payload.status === 'closed' ? sdk.serverTimestamp() : null,
        closed_by_uid: payload.status === 'closed' ? state.currentUser.uid : '',
        closed_by_name: payload.status === 'closed' ? state.currentUser.full_name : '',
        created_at: sdk.serverTimestamp(),
        updated_at: sdk.serverTimestamp(),
      });

      tx.set(activityRef, {
        action: payload.source_type === 'checklist' ? 'created_from_checklist' : 'created',
        note: '',
        by_uid: state.currentUser.uid,
        by_name: state.currentUser.full_name,
        by_department: state.currentUser.department,
        created_at: sdk.serverTimestamp(),
      });
    });

    return issueRef.id;
  }

  async function prepareIssuePhotosForFirebase(issueId, beforePhotos) {
    if (!Array.isArray(beforePhotos) || beforePhotos.length === 0) return [];
    if (!isFirebaseLive()) return beforePhotos;

    const first = beforePhotos[0] || {};
    const fullDataUrl = first.url || '';
    const thumbDataUrl = first.thumb_url || fullDataUrl;
    if (!fullDataUrl) return [];

    const uploaded = await uploadIssuePhotoSet({
      issueId,
      fullDataUrl,
      thumbDataUrl,
      mimeType: 'image/jpeg'
    });

    return [{
      url: uploaded.fullUrl,
      thumb_url: uploaded.thumbUrl,
      storage_path: uploaded.fullPath,
      thumb_storage_path: uploaded.thumbPath,
      uploaded_at: new Date().toISOString(),
    }];
  }

  async function prepareIssueVideosForFirebase(issueId, beforeVideos) {
    if (!Array.isArray(beforeVideos) || beforeVideos.length === 0) return [];
    if (!isFirebaseLive()) return beforeVideos;

    const first = beforeVideos[0] || {};
    if (!first.file) return [];

    const uploaded = await uploadIssueVideoSet({
      issueId,
      file: first.file,
      mimeType: first.mime_type || first.file.type || 'video/mp4',
      fileName: first.original_name || first.file.name || 'video.mp4',
      posterDataUrl: first.poster_url || '',
      thumbDataUrl: first.thumb_url || first.poster_url || ''
    });

    return [{
      url: uploaded.videoUrl,
      poster_url: uploaded.posterUrl,
      thumb_url: uploaded.thumbUrl || uploaded.posterUrl,
      storage_path: uploaded.videoPath,
      poster_storage_path: uploaded.posterPath,
      thumb_storage_path: uploaded.thumbPath,
      mime_type: first.mime_type || first.file.type || 'video/mp4',
      original_name: first.original_name || first.file.name || 'video.mp4',
      size: first.size || first.file.size || 0,
      uploaded_at: new Date().toISOString(),
    }];
  }

  async function uploadIssueVideoSet({ issueId, file, mimeType = 'video/mp4', fileName = 'video.mp4', posterDataUrl = '', thumbDataUrl = '' }) {
    const fb = window.LAYA_FIREBASE;
    if (!fb?.ready || !fb.storage || !fb.sdk?.storageRef || !fb.sdk?.uploadBytes || !fb.sdk?.getDownloadURL) {
      throw new Error('storage_not_ready');
    }

    const uid = fb.auth.currentUser?.uid;
    if (!uid) throw new Error('not_signed_in');

    const ts = Date.now();
    const ext = getFileExtension(fileName, mimeType);
    const videoPath = `issue_videos/${uid}/${issueId}/before/video_${ts}.${ext}`;
    const videoRef = fb.sdk.storageRef(fb.storage, videoPath);
    await fb.sdk.uploadBytes(videoRef, file, { contentType: mimeType, cacheControl: 'public,max-age=3600' });
    const videoUrl = await fb.sdk.getDownloadURL(videoRef);

    let posterUrl = '';
    let thumbUrl = '';
    let posterPath = '';
    let thumbPath = '';

    if (posterDataUrl) {
      posterPath = `issue_videos/${uid}/${issueId}/before/poster_${ts}.jpg`;
      const posterRef = fb.sdk.storageRef(fb.storage, posterPath);
      await fb.sdk.uploadString(posterRef, posterDataUrl, 'data_url', { contentType: 'image/jpeg', cacheControl: 'public,max-age=3600' });
      posterUrl = await fb.sdk.getDownloadURL(posterRef);
    }

    if (thumbDataUrl) {
      thumbPath = `issue_videos/${uid}/${issueId}/before/thumb_${ts}.jpg`;
      const thumbRef = fb.sdk.storageRef(fb.storage, thumbPath);
      await fb.sdk.uploadString(thumbRef, thumbDataUrl, 'data_url', { contentType: 'image/jpeg', cacheControl: 'public,max-age=3600' });
      thumbUrl = await fb.sdk.getDownloadURL(thumbRef);
    }

    return { videoUrl, videoPath, posterUrl, posterPath, thumbUrl, thumbPath };
  }

  async function uploadIssuePhotoSet({ issueId, fullDataUrl, thumbDataUrl, mimeType = 'image/jpeg' }) {
    const fb = window.LAYA_FIREBASE;
    if (!fb?.ready || !fb.storage || !fb.sdk?.storageRef || !fb.sdk?.uploadString || !fb.sdk?.getDownloadURL) {
      throw new Error('storage_not_ready');
    }

    const uid = fb.auth.currentUser?.uid;
    if (!uid) throw new Error('not_signed_in');

    const ts = Date.now();
    const fullPath = `issue_photos/${uid}/${issueId}/before/full_${ts}.jpg`;
    const thumbPath = `issue_photos/${uid}/${issueId}/before/thumb_${ts}.jpg`;

    const fullRef = fb.sdk.storageRef(fb.storage, fullPath);
    await fb.sdk.uploadString(fullRef, fullDataUrl, 'data_url', {
      contentType: mimeType,
      cacheControl: 'public,max-age=3600'
    });
    const fullUrl = await fb.sdk.getDownloadURL(fullRef);

    let thumbUrl = fullUrl;
    if (thumbDataUrl) {
      const thumbRef = fb.sdk.storageRef(fb.storage, thumbPath);
      await fb.sdk.uploadString(thumbRef, thumbDataUrl, 'data_url', {
        contentType: mimeType,
        cacheControl: 'public,max-age=3600'
      });
      thumbUrl = await fb.sdk.getDownloadURL(thumbRef);
    }

    return { fullUrl, thumbUrl, fullPath, thumbPath };
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

  async function submitChecklistRun(template, runId) {
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

    const baseRun = {
      id: runId,
      run_no: buildChecklistRunNo((state.data.counters.checklist || 0) + 1, inspectionDate),
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
      submitted_at: new Date().toISOString(),
      total_items: answers.length,
      pass_count: answers.filter(a => a.response === 'pass').length,
      fail_count: answers.filter(a => a.response === 'fail').length,
      na_count: answers.filter(a => a.response === 'na').length,
      issue_count: answers.filter(a => a.create_issue).length,
    };

    try {
      let run = null;
      if (isFirebaseLive()) {
        run = await createChecklistRunFirebase(baseRun);
        if (!state.data.checklistRuns.find(item => item.id === run.id)) {
          state.data.checklistRuns.unshift(run);
        }
      } else {
        run = createChecklistRunLocal(baseRun);
      }

      const issueAnswers = answers.filter(a => a.create_issue);
      for (const a of issueAnswers) {
        await createIssue({
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
      }
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
      setAuthStatus('Submit checklist แล้ว และขึ้นบน Board แล้ว', 'success');
    } catch (err) {
      console.error('submit checklist failed', err);
      alert(friendlyIssueError(err));
    }
  }

  function createChecklistRunLocal(run) {
    state.data.counters.checklist += 1;
    const finalRun = {
      ...run,
      run_no: buildChecklistRunNo(state.data.counters.checklist, run.inspection_date),
    };
    state.data.checklistRuns.unshift(finalRun);
    return finalRun;
  }

  async function createChecklistRunFirebase(run) {
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const runRef = sdk.doc(sdk.collection(fb.db, 'checklist_runs'));
    let runNumber = 1;
    await sdk.runTransaction(fb.db, async (tx) => {
      const counterRef = sdk.doc(fb.db, 'counters', 'checklist_counter');
      const counterSnap = await tx.get(counterRef);
      if (counterSnap.exists()) {
        runNumber = (counterSnap.data().last_number || 0) + 1;
        tx.update(counterRef, { last_number: runNumber, updated_at: sdk.serverTimestamp() });
      } else {
        runNumber = 1;
        tx.set(counterRef, { name: 'checklist_counter', last_number: 1, updated_at: sdk.serverTimestamp() });
      }
      tx.set(runRef, {
        run_no: buildChecklistRunNo(runNumber, run.inspection_date),
        template_code: run.template_code,
        template_name: run.template_name,
        template_version: 1,
        status: 'submitted',
        inspector_uid: run.inspector_uid,
        inspector_name: run.inspector_name,
        inspector_department: run.inspector_department,
        inspection_date: run.inspection_date,
        location_text: run.location_text || '',
        shift: run.shift || 'morning',
        source: 'checklist',
        answers: run.answers,
        total_items: run.total_items,
        pass_count: run.pass_count,
        fail_count: run.fail_count,
        na_count: run.na_count,
        issue_count: run.issue_count,
        created_at: sdk.serverTimestamp(),
        submitted_at: sdk.serverTimestamp(),
        updated_at: sdk.serverTimestamp(),
      });
    });
    return {
      ...run,
      id: runRef.id,
      run_no: buildChecklistRunNo(runNumber, run.inspection_date),
    };
  }

  function openIssueModal(issueId) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue) return;
    state.ui.openIssueId = issueId;
    if (isFirebaseLive()) {
      startIssueCommentsSync(issueId);
    }
    renderIssueModalContent(issue);
    el.issueModal.classList.remove('hidden');
  }

  function renderIssueModalContent(issue) {
    const comments = isFirebaseLive()
      ? (state.ui.openIssueId === issue.id ? state.ui.liveIssueComments : [])
      : (Array.isArray(issue.comments) ? issue.comments : []);

    el.issueModalContent.innerHTML = `
      <div class="issue-detail-grid">
        <div>
          ${renderIssueMediaBlock(issue)}
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
            <div><strong>Media:</strong> ${(issue.before_photos?.length || 0)} photo / ${(issue.before_videos?.length || 0)} video</div>
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

    qsa('[data-detail-status]', el.issueModalContent).forEach(btn => btn.addEventListener('click', () => updateIssueStatus(issue.id, btn.dataset.detailStatus)));
    const addCommentBtn = qs('#addCommentBtn', el.issueModalContent);
    if (addCommentBtn) {
      addCommentBtn.addEventListener('click', async () => {
        const input = qs('#detailCommentText', el.issueModalContent);
        const message = input.value.trim();
        if (!message) return;
        await addIssueComment(issue.id, message);
        if (!isFirebaseLive()) openIssueModal(issue.id);
      });
    }
  }

  function renderIssueMediaBlock(issue) {
    const photos = Array.isArray(issue.before_photos) ? issue.before_photos.filter(Boolean) : [];
    const videos = Array.isArray(issue.before_videos) ? issue.before_videos.filter(Boolean) : [];
    const parts = [];

    if (photos.length) {
      parts.push(...photos.map((photo, index) => `
        <div class="issue-media-card">
          <img class="issue-hero" src="${photo.url || photo.thumb_url || issue.cover_photo_url || ''}" alt="Issue image ${index + 1}" />
        </div>
      `));
    }

    if (videos.length) {
      parts.push(...videos.map((video, index) => `
        <div class="issue-media-card">
          <div class="issue-media-label">Video ${index + 1}</div>
          <video class="issue-video" src="${video.url || ''}" ${video.poster_url ? `poster="${video.poster_url}"` : ''} controls playsinline preload="metadata"></video>
        </div>
      `));
    }

    if (!parts.length) {
      return `<div class="issue-hero placeholder issue-thumb">NO MEDIA</div>`;
    }

    return `<div class="issue-media-stack">${parts.join('')}</div>`;
  }

  function closeIssueModal() {
    state.ui.openIssueId = null;
    stopIssueCommentsSync();
    el.issueModal.classList.add('hidden');
  }


  async function updateIssueStatus(issueId, toStatus) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) return;
    if (!isValidTransition(issue.status, toStatus)) return alert('Status transition ไม่ถูกต้อง');

    if (!isFirebaseLive()) {
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
      return;
    }

    try {
      const fb = window.LAYA_FIREBASE;
      const sdk = fb.sdk;
      await sdk.runTransaction(fb.db, async (tx) => {
        const issueRef = sdk.doc(fb.db, 'issues', issueId);
        const snap = await tx.get(issueRef);
        if (!snap.exists()) throw new Error('issue_not_found');
        const liveIssue = { id: snap.id, ...snap.data() };
        if (!canWorkIssue(liveIssue)) throw new Error('permission_denied');
        if (!isValidTransition(liveIssue.status, toStatus)) throw new Error('invalid_transition');

        const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
        const patch = {
          status: toStatus,
          updated_at: sdk.serverTimestamp(),
          last_activity_at: sdk.serverTimestamp(),
          activity_count: sdk.increment(1),
        };
        if (toStatus === 'closed') {
          patch.closed_at = sdk.serverTimestamp();
          patch.closed_by_uid = state.currentUser.uid;
          patch.closed_by_name = state.currentUser.full_name;
        }
        if (toStatus === 'open') {
          patch.closed_at = null;
          patch.closed_by_uid = '';
          patch.closed_by_name = '';
        }
        tx.update(issueRef, patch);
        tx.set(activityRef, {
          action: toStatus === 'open' && liveIssue.status === 'closed' ? 'reopened' : (toStatus === 'closed' ? 'closed' : 'status_changed'),
          from_status: liveIssue.status,
          to_status: toStatus,
          note: '',
          by_uid: state.currentUser.uid,
          by_name: state.currentUser.full_name,
          by_department: state.currentUser.department,
          created_at: sdk.serverTimestamp(),
        });
      });
      if (state.ui.openIssueId === issueId) openIssueModal(issueId);
    } catch (err) {
      console.error('update status failed', err);
      alert(friendlyIssueError(err));
    }
  }

  async function addIssueComment(issueId, message) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) return;

    if (!isFirebaseLive()) {
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
      return;
    }

    try {
      const fb = window.LAYA_FIREBASE;
      const sdk = fb.sdk;
      await sdk.runTransaction(fb.db, async (tx) => {
        const issueRef = sdk.doc(fb.db, 'issues', issueId);
        const snap = await tx.get(issueRef);
        if (!snap.exists()) throw new Error('issue_not_found');
        const liveIssue = { id: snap.id, ...snap.data() };
        if (!canWorkIssue(liveIssue)) throw new Error('permission_denied');

        const commentRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/comments`));
        const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
        tx.set(commentRef, {
          type: 'user',
          message,
          by_uid: state.currentUser.uid,
          by_name: state.currentUser.full_name,
          by_role: state.currentUser.role,
          by_department: state.currentUser.department,
          mentions: [],
          photos: [],
          created_at: sdk.serverTimestamp(),
        });
        tx.set(activityRef, {
          action: 'comment_added',
          note: message,
          by_uid: state.currentUser.uid,
          by_name: state.currentUser.full_name,
          by_department: state.currentUser.department,
          created_at: sdk.serverTimestamp(),
        });
        tx.update(issueRef, {
          comment_count: sdk.increment(1),
          activity_count: sdk.increment(1),
          last_comment_at: sdk.serverTimestamp(),
          last_activity_at: sdk.serverTimestamp(),
          updated_at: sdk.serverTimestamp(),
        });
      });
    } catch (err) {
      console.error('add comment failed', err);
      alert(friendlyIssueError(err));
    }
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

  function stopIssueSync() {
    if (typeof state.firebaseIssuesUnsub === 'function') {
      try { state.firebaseIssuesUnsub(); } catch (_) {}
    }
    state.firebaseIssuesUnsub = null;
  }

  function stopIssueCommentsSync() {
    if (typeof state.firebaseIssueCommentsUnsub === 'function') {
      try { state.firebaseIssueCommentsUnsub(); } catch (_) {}
    }
    state.firebaseIssueCommentsUnsub = null;
    state.ui.liveIssueComments = [];
  }

  function stopTemplatesSync() {
    if (typeof state.firebaseTemplatesUnsub === 'function') {
      try { state.firebaseTemplatesUnsub(); } catch (_) {}
    }
    state.firebaseTemplatesUnsub = null;
  }

  function stopChecklistRunsSync() {
    if (typeof state.firebaseChecklistRunsUnsub === 'function') {
      try { state.firebaseChecklistRunsUnsub(); } catch (_) {}
    }
    state.firebaseChecklistRunsUnsub = null;
  }

  function startTemplatesSync() {
    if (!isFirebaseLive() || !state.currentUser) return;
    stopTemplatesSync();
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const q = sdk.query(sdk.collection(fb.db, 'checklist_templates'));
    state.firebaseTemplatesUnsub = sdk.onSnapshot(q, (snap) => {
      state.data.customTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      mergeTemplates();
      renderTemplateCards();
    }, (err) => console.error('checklist templates sync failed', err));
  }

  function startChecklistRunsSync() {
    if (!isFirebaseLive() || !state.currentUser) return;
    if (!['admin', 'mod'].includes(state.currentUser.role)) {
      state.data.checklistRuns = [];
      return;
    }
    stopChecklistRunsSync();
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const q = sdk.query(sdk.collection(fb.db, 'checklist_runs'));
    state.firebaseChecklistRunsUnsub = sdk.onSnapshot(q, (snap) => {
      state.data.checklistRuns = snap.docs.map(normalizeChecklistRunDoc).sort((a, b) => new Date(b.submitted_at || b.created_at || 0) - new Date(a.submitted_at || a.created_at || 0));
      renderBoard();
    }, (err) => console.error('checklist runs sync failed', err));
  }

  function startIssuesSync() {
    if (!isFirebaseLive() || !state.currentUser) return;
    stopIssueSync();
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    let q = null;
    if (state.currentUser.role === 'dept_user') {
      q = sdk.query(sdk.collection(fb.db, 'issues'), sdk.where('assigned_department', '==', state.currentUser.department));
    } else {
      q = sdk.query(sdk.collection(fb.db, 'issues'));
    }

    state.firebaseIssuesUnsub = sdk.onSnapshot(q, (snap) => {
      state.data.issues = snap.docs.map(normalizeIssueDoc);
      renderAll();
      if (state.ui.openIssueId) {
        const liveIssue = state.data.issues.find(i => i.id === state.ui.openIssueId);
        if (!liveIssue) closeIssueModal();
        else renderIssueModalContent(liveIssue);
      }
    }, (err) => {
      console.error('issues onSnapshot failed', err);
      setAuthStatus('อ่าน Issue จาก Firestore ไม่สำเร็จ', 'error');
    });
  }

  function startIssueCommentsSync(issueId) {
    if (!isFirebaseLive()) return;
    stopIssueCommentsSync();
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const q = sdk.query(sdk.collection(fb.db, `issues/${issueId}/comments`));
    state.firebaseIssueCommentsUnsub = sdk.onSnapshot(q, (snap) => {
      state.ui.liveIssueComments = snap.docs
        .map(docSnap => normalizeCommentDoc(docSnap))
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      const issue = state.data.issues.find(i => i.id === issueId);
      if (issue && state.ui.openIssueId === issueId) renderIssueModalContent(issue);
    }, (err) => {
      console.error('issue comments onSnapshot failed', err);
    });
  }

  function normalizeIssueDoc(docSnap) {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      before_photos: Array.isArray(data.before_photos) ? data.before_photos : [],
      before_videos: Array.isArray(data.before_videos) ? data.before_videos : [],
      after_photos: Array.isArray(data.after_photos) ? data.after_photos : [],
      after_videos: Array.isArray(data.after_videos) ? data.after_videos : [],
      created_at: normalizeDateValue(data.created_at),
      updated_at: normalizeDateValue(data.updated_at),
      last_activity_at: normalizeDateValue(data.last_activity_at),
      last_comment_at: normalizeDateValue(data.last_comment_at),
      closed_at: normalizeDateValue(data.closed_at),
      comments: [],
    };
  }

  function normalizeCommentDoc(docSnap) {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      created_at: normalizeDateValue(data.created_at),
    };
  }

  function normalizeChecklistRunDoc(docSnap) {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      answers: Array.isArray(data.answers) ? data.answers : [],
      created_at: normalizeDateValue(data.created_at),
      updated_at: normalizeDateValue(data.updated_at),
      submitted_at: normalizeDateValue(data.submitted_at),
    };
  }

  function normalizeDateValue(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  function friendlyIssueError(err) {
    const code = String(err?.code || '');
    const msg = String(err?.message || err || '');
    if (code.includes('permission-denied') || msg.includes('permission_denied')) {
      return 'ไม่มีสิทธิ์ทำรายการนี้ หรือ Firestore Rules ยังไม่ถูกต้อง';
    }
    if (msg.includes('issue_counter_not_found')) {
      return 'ไม่พบตัวนับ issue แต่ระบบควรสร้างให้อัตโนมัติแล้ว ลองใหม่อีกครั้ง';
    }
    if (msg.includes('not_signed_in')) {
      return 'กรุณาเข้าสู่ระบบใหม่';
    }
    if (code.includes('storage') || msg.includes('storage/')) {
      return 'อัปโหลดรูปเข้า Firebase Storage ไม่สำเร็จ • ตรวจสอบ Storage Rules และสิทธิ์การอัปโหลดรูป';
    }
    if (msg.includes('storage_not_ready')) {
      return 'Firebase Storage ยังไม่พร้อม • ตรวจสอบ firebase-init และ config';
    }
    return msg ? `บันทึกข้อมูลไม่สำเร็จ: ${msg}` : 'บันทึกข้อมูลไม่สำเร็จ';
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
      const openOnly = issue.status !== 'closed';
      const statusMatch = filter === 'all' || filter === 'mine' ? openOnly : issue.status === filter;
      const hay = [issue.title, issue.description, issue.location_text, issue.assigned_department, issue.issue_no].join(' ').toLowerCase();
      const searchMatch = !search || hay.includes(search);
      return deptMatch && statusMatch && searchMatch;
    });
  }

  function getClosedIssuesForCurrentUser() {
    if (!state.currentUser) return [];
    const search = state.ui.closedSearch;
    return getVisibleIssuesForCurrentUser()
      .filter(issue => issue.status === 'closed')
      .filter(issue => {
        const hay = [issue.title, issue.description, issue.location_text, issue.assigned_department, issue.issue_no, issue.closed_by_name].join(' ').toLowerCase();
        return !search || hay.includes(search);
      })
      .sort((a, b) => new Date(b.closed_at || b.updated_at || b.created_at) - new Date(a.closed_at || a.updated_at || a.created_at));
  }

  function sortIssues(a, b) {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
  }

  function openChecklistTemplateBuilder() {
    state.ui.checklistBuilderSections = [{ id: cryptoRandom(), title: '', itemsText: '' }];
    renderChecklistTemplateBuilder();
    el.checklistTemplateBuilder.classList.remove('hidden');
  }

  function renderChecklistTemplateBuilder() {
    const sections = state.ui.checklistBuilderSections || [];
    el.checklistTemplateBuilder.innerHTML = `
      <div class="panel-header panel-header-split">
        <div>
          <h3>Add Checklist</h3>
          <p class="muted">สร้าง checklist ใหม่ แล้วเก็บไว้ใช้ซ้ำได้</p>
        </div>
        <button class="btn btn-ghost" id="closeChecklistBuilderBtn">Hide</button>
      </div>
      <div class="form-grid two-col compact-grid">
        <div>
          <label>Checklist Name</label>
          <input id="newChecklistName" type="text" placeholder="เช่น MOD Public Area Check" />
        </div>
        <div>
          <label>Source / Sheet</label>
          <input id="newChecklistSource" type="text" placeholder="เช่น Custom" value="Custom" />
        </div>
      </div>
      <div id="checklistBuilderSections" class="stack"></div>
      <div class="sticky-actions">
        <button class="btn btn-secondary" id="addChecklistSectionBtn">+ Add Section</button>
        <button class="btn btn-primary" id="saveChecklistTemplateBtn">Save Checklist</button>
      </div>
    `;
    const host = qs('#checklistBuilderSections', el.checklistTemplateBuilder);
    host.innerHTML = sections.map((section, idx) => `
      <div class="section-card builder-section" data-builder-section-id="${section.id}">
        <div class="section-head"><h4>Section ${idx + 1}</h4></div>
        <div class="section-body">
          <label>Section Title</label>
          <input type="text" data-builder-title value="${escapeHtml(section.title || '')}" placeholder="เช่น Public Area" />
          <label>Checklist Items</label>
          <textarea rows="5" data-builder-items placeholder="1 บรรทัด = 1 checklist item">${escapeHtml(section.itemsText || '')}</textarea>
          <div class="sticky-actions">
            <button class="btn btn-ghost" type="button" data-remove-builder-section="${section.id}">Remove Section</button>
          </div>
        </div>
      </div>
    `).join('');

    qs('#closeChecklistBuilderBtn', el.checklistTemplateBuilder).addEventListener('click', () => el.checklistTemplateBuilder.classList.add('hidden'));
    qs('#addChecklistSectionBtn', el.checklistTemplateBuilder).addEventListener('click', () => {
      syncChecklistBuilderDraft();
      state.ui.checklistBuilderSections.push({ id: cryptoRandom(), title: '', itemsText: '' });
      renderChecklistTemplateBuilder();
    });
    qs('#saveChecklistTemplateBtn', el.checklistTemplateBuilder).addEventListener('click', saveChecklistTemplate);
    qsa('[data-remove-builder-section]', el.checklistTemplateBuilder).forEach(btn => btn.addEventListener('click', () => {
      syncChecklistBuilderDraft();
      state.ui.checklistBuilderSections = state.ui.checklistBuilderSections.filter(sec => sec.id !== btn.dataset.removeBuilderSection);
      if (!state.ui.checklistBuilderSections.length) state.ui.checklistBuilderSections.push({ id: cryptoRandom(), title: '', itemsText: '' });
      renderChecklistTemplateBuilder();
    }));
  }

  function syncChecklistBuilderDraft() {
    const sections = qsa('.builder-section', el.checklistTemplateBuilder).map(card => ({
      id: card.dataset.builderSectionId,
      title: qs('[data-builder-title]', card)?.value.trim() || '',
      itemsText: qs('[data-builder-items]', card)?.value || '',
    }));
    state.ui.checklistBuilderSections = sections;
  }

  async function saveChecklistTemplate() {
    syncChecklistBuilderDraft();
    const templateName = qs('#newChecklistName', el.checklistTemplateBuilder)?.value.trim() || '';
    const sourceSheet = qs('#newChecklistSource', el.checklistTemplateBuilder)?.value.trim() || 'Custom';
    if (!templateName) {
      alert('กรุณาใส่ชื่อ checklist');
      return;
    }
    const sections = (state.ui.checklistBuilderSections || []).map((sec, secIdx) => {
      const normalizedItemsText = String(sec.itemsText || '').replace(/\r/g, '');
      const items = normalizedItemsText
        .split('\n')
        .map(v => v.trim())
        .filter(Boolean)
        .map((item, itemIdx) => ({
          item_code: `ITEM_${secIdx + 1}_${itemIdx + 1}_${cryptoRandom().slice(0,4)}`,
          item_text: item,
        }));
      return {
        section_code: `SEC_${secIdx + 1}_${cryptoRandom().slice(0,4)}`,
        section_title: sec.title || `Section ${secIdx + 1}`,
        item_count: items.length,
        items,
      };
    }).filter(sec => sec.items.length > 0);

    if (!sections.length) {
      alert('กรุณาเพิ่มอย่างน้อย 1 section ที่มี checklist item');
      return;
    }

    const templateCode = `CUSTOM_${slugify(templateName)}_${Date.now()}`;
    const template = {
      template_code: templateCode,
      template_name: templateName,
      source_sheet: sourceSheet,
      active: true,
      version: 1,
      created_by_uid: state.currentUser?.uid || '',
      created_by_name: state.currentUser?.full_name || '',
      sections,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      if (isFirebaseLive()) {
        const fb = window.LAYA_FIREBASE;
        await fb.sdk.setDoc(fb.sdk.doc(fb.db, 'checklist_templates', templateCode), {
          ...template,
          created_at: fb.sdk.serverTimestamp(),
          updated_at: fb.sdk.serverTimestamp(),
        });
        state.data.customTemplates.unshift(template);
        mergeTemplates();
        renderTemplateCards();
      } else {
        state.data.customTemplates.unshift(template);
        mergeTemplates();
        persist();
        renderTemplateCards();
      }
      addActivity({ type: 'checklist_template', title: templateName, text: `${state.currentUser.full_name} added checklist template`, created_at: new Date().toISOString() });
      el.checklistTemplateBuilder.classList.add('hidden');
      setAuthStatus('บันทึก checklist template แล้ว', 'success');
    } catch (err) {
      console.error('save checklist template failed', err);
      alert(friendlyIssueError(err));
    }
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

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'checklist';
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

  async function prepareIssueVideo(file) {
    const previewUrl = URL.createObjectURL(file);
    let posterDataUrl = '';
    let thumbDataUrl = '';
    try {
      const poster = await extractVideoPoster(file);
      posterDataUrl = poster.posterDataUrl || '';
      thumbDataUrl = poster.thumbDataUrl || poster.posterDataUrl || '';
    } catch (err) {
      console.warn('video poster generation failed', err);
    }

    return {
      file,
      fileName: file.name || 'video.mp4',
      mimeType: file.type || 'video/mp4',
      originalBytes: file.size || 0,
      previewUrl,
      posterDataUrl,
      thumbDataUrl,
      posterBytes: estimateDataUrlBytes(posterDataUrl),
    };
  }

  async function extractVideoPoster(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = objectUrl;

      await new Promise((resolve, reject) => {
        video.onerror = () => reject(new Error('video_load_failed'));
        video.onloadeddata = () => resolve();
      });

      const captureAt = Number.isFinite(video.duration) && video.duration > 0.2 ? Math.min(0.2, video.duration / 2) : 0;
      if (captureAt > 0) {
        await new Promise((resolve, reject) => {
          const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = captureAt;
          setTimeout(() => { video.removeEventListener('seeked', onSeeked); resolve(); }, 1200);
        });
      }

      const posterDataUrl = videoFrameToDataUrl(video, 1280, 0.78);
      const thumbDataUrl = videoFrameToDataUrl(video, 480, 0.62);
      return { posterDataUrl, thumbDataUrl };
    } finally {
      try { URL.revokeObjectURL(objectUrl); } catch (_) {}
    }
  }

  function videoFrameToDataUrl(video, maxSize = 1280, quality = 0.76) {
    const scale = Math.min(1, maxSize / Math.max(video.videoWidth || 1, video.videoHeight || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((video.videoWidth || 1) * scale));
    canvas.height = Math.max(1, Math.round((video.videoHeight || 1) * scale));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  function getFileExtension(fileName, mimeType = '') {
    const clean = String(fileName || '').split('?')[0];
    const ext = clean.includes('.') ? clean.split('.').pop().toLowerCase() : '';
    if (ext) return ext;
    if (mimeType.includes('quicktime')) return 'mov';
    if (mimeType.includes('webm')) return 'webm';
    return 'mp4';
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
