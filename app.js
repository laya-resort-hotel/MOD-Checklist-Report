(() => {
  const APP_KEY = 'laya_mod_checklist_v1';
  const APP_VERSION = window.LAYA_APP_VERSION || 'v114-closed-summary-report';
  const APP_VERSION_KEY = 'laya_mod_active_version_v1';
  const PENDING_REG_KEY = 'laya_mod_pending_registration_v1';

  const LANG_KEY = 'laya_mod_lang_v1';
  const HIDDEN_TEMPLATE_KEY = 'laya_mod_hidden_templates_v2';
  const MAX_VIDEO_UPLOAD_MB = 200;
  const MAX_VIDEO_UPLOAD_BYTES = MAX_VIDEO_UPLOAD_MB * 1024 * 1024;

  function getSavedLanguage() {
    try {
      const raw = localStorage.getItem(LANG_KEY);
      return raw === 'en' ? 'en' : 'th';
    } catch (_) {
      return 'th';
    }
  }

  function saveLanguagePreference(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang === 'en' ? 'en' : 'th');
    } catch (_) {}
  }

  function getHiddenTemplateCodes() {
    try {
      const raw = localStorage.getItem(HIDDEN_TEMPLATE_KEY);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function saveHiddenTemplateCodes(codes) {
    try {
      localStorage.setItem(HIDDEN_TEMPLATE_KEY, JSON.stringify(Array.from(new Set((codes || []).filter(Boolean)))));
    } catch (_) {}
  }

  function currentLang() {
    return state?.ui?.language === 'en' ? 'en' : 'th';
  }

  function txt(th, en) {
    return currentLang() === 'en' ? en : th;
  }

  function localizedValue(obj, enKey, thKey) {
    if (!obj || typeof obj !== 'object') return '';
    const enVal = obj[enKey];
    const thVal = obj[thKey];
    if (currentLang() === 'th') return thVal || enVal || '';
    return enVal || thVal || '';
  }

  function templateLabel(template) {
    return localizedValue(template, 'template_name', 'template_name_th');
  }

  function sectionLabel(section) {
    return localizedValue(section, 'section_title', 'section_title_th');
  }

  function itemLabel(item) {
    return localizedValue(item, 'item_text', 'item_text_th');
  }

  function runTemplateLabel(run) {
    return localizedValue(run, 'template_name', 'template_name_th') || txt('เช็กลิสต์', 'Checklist');
  }

  function runSectionLabel(entry) {
    return localizedValue(entry, 'section_title', 'section_title_th');
  }

  function runItemLabel(entry) {
    return localizedValue(entry, 'item_text', 'item_text_th');
  }

  const DEPARTMENTS = [
    { code: 'ENG', name: 'Engineering / Maintenance', name_th: 'วิศวกรรม / ซ่อมบำรุง' },
    { code: 'HK', name: 'Housekeeping', name_th: 'แม่บ้าน' },
    { code: 'FO', name: 'Front Office', name_th: 'ฟร้อนท์ออฟฟิศ' },
    { code: 'FB', name: 'Food & Beverage', name_th: 'อาหารและเครื่องดื่ม' },
    { code: 'SEC', name: 'Security', name_th: 'รักษาความปลอดภัย' },
    { code: 'HR', name: 'Human Resources', name_th: 'ทรัพยากรบุคคล' },
    { code: 'RSV', name: 'Reservation', name_th: 'สำรองห้องพัก' },
    { code: 'SALES', name: 'Sales & Marketing', name_th: 'ฝ่ายขายและการตลาด' },
    { code: 'REC', name: 'Recreation', name_th: 'สันทนาการ' },
    { code: 'KIT', name: 'Kitchen', name_th: 'ครัว' },
    { code: 'FNA', name: 'Finance & Accounting', name_th: 'การเงินและบัญชี' },
    { code: 'PUR', name: 'Purchasing / Procurement', name_th: 'จัดซื้อ / จัดหา' },
    { code: 'SPA', name: 'Spa & Wellness', name_th: 'สปาและเวลเนส' },
    { code: 'IT', name: 'IT Department / Information Technology', name_th: 'แผนก IT / เทคโนโลยีสารสนเทศ' },
    { code: 'GM', name: "Administration / General Manager's Office", name_th: 'ฝ่ายบริหาร / สำนักงานผู้จัดการทั่วไป' },
    { code: 'ROOMS', name: 'Room Division', name_th: 'รูมดิวิชั่น' },
    { code: 'MOD', name: 'MOD', name_th: 'MOD' },
    { code: 'ADMIN', name: 'Admin', name_th: 'ผู้ดูแลระบบ' },
  ];
  const WORK_DEPARTMENT_CODES = ['ENG', 'HK', 'FO', 'FB', 'SEC', 'HR', 'RSV', 'SALES', 'REC', 'KIT', 'FNA', 'PUR', 'SPA', 'IT', 'GM', 'ROOMS'];
  const USER_DEPARTMENT_CODES = [...WORK_DEPARTMENT_CODES, 'MOD', 'ADMIN'];
  const ALL_DEPARTMENT_CODES = DEPARTMENTS.map(dept => dept.code);

  // v98: ใช้ Department Code เป็นมาตรฐานใน Firestore
  // เช่น assigned_department = ENG และ user.department = ENG; ชื่อเต็มเป็นแค่ label สำหรับแสดงผล
  const DEPARTMENT_ALIASES = {
    ENG: ['ENGINEER', 'ENGINEERING', 'ENGINEERING / MAINTENANCE', 'ENGINEERING/MAINTENANCE', 'ENGINEERING & MAINTENANCE', 'MAINTENANCE', 'DIRECTOR OF ENGINEER', 'วิศวกรรม', 'ซ่อมบำรุง', 'ช่าง'],
    HK: ['HOUSEKEEPING', 'HOUSE KEEPING', 'แม่บ้าน'],
    FO: ['FRONT OFFICE', 'FRONT OFFICE - RESORT', 'ฟร้อนท์', 'ฟร้อนท์ออฟฟิศ'],
    FB: ['FOOD & BEVERAGE', 'F&B', 'FB', 'FOOD AND BEVERAGE', 'อาหารและเครื่องดื่ม', 'ห้องอาหาร'],
    SEC: ['SECURITY', 'รักษาความปลอดภัย'],
    HR: ['HUMAN RESOURCES', 'HUMAN RESOURCE', 'HR', 'ทรัพยากรบุคคล'],
    RSV: ['RESERVATION', 'RESERVATIONS', 'สำรองห้องพัก'],
    SALES: ['SALES & MARKETING', 'SALES AND MARKETING', 'DIGITAL MARKETING', 'MARKETING', 'ฝ่ายขายและการตลาด'],
    REC: ['RECREATION', 'สันทนาการ'],
    KIT: ['KITCHEN', 'CULINARY', 'ครัว'],
    FNA: ['FINANCE & ACCOUNTING', 'FINANCE AND ACCOUNTING', 'ACCOUNTING', 'FINANCE', 'การเงินและบัญชี'],
    PUR: ['PURCHASING / PROCUREMENT', 'PURCHASING', 'PROCUREMENT', 'จัดซื้อ', 'จัดหา'],
    SPA: ['SPA & WELLNESS', 'SPA', 'WELLNESS', 'สปา'],
    IT: ['I.T.', 'IT DEPARTMENT', 'INFORMATION TECHNOLOGY', 'INFORMATION TECHNOLOGY DEPARTMENT', 'INFORMATION TECHNOLOGY MANAGER - RESORT', 'เทคโนโลยีสารสนเทศ', 'แผนก IT'],
    GM: ["ADMINISTRATION / GENERAL MANAGER'S OFFICE", "GENERAL MANAGER'S OFFICE", 'ADMINISTRATION', 'GM OFFICE', 'EXECUTIVE OFFICE', 'ฝ่ายบริหาร'],
    ROOMS: ['ROOM DIVISION', 'ROOMS DIVISION', 'DIRECTOR OF ROOM', 'ROOMS', 'รูมดิวิชั่น'],
    MOD: ['MOD TEAM'],
    ADMIN: ['SYSTEM ADMIN', 'ADMINISTRATOR', 'ผู้ดูแลระบบ'],
  };

  function normalizeDepartmentCode(value, fallback = 'ENG') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    const direct = raw.toUpperCase();
    if (ALL_DEPARTMENT_CODES.includes(direct)) return direct;
    const normalized = direct.replace(/\s+/g, ' ').replace(/ /g, ' ').trim();
    for (const dept of DEPARTMENTS) {
      if (normalized === String(dept.name || '').toUpperCase()) return dept.code;
      if (normalized === String(dept.name_th || '').toUpperCase()) return dept.code;
    }
    for (const [code, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
      if ((aliases || []).some(alias => normalized === String(alias || '').toUpperCase())) return code;
    }
    return fallback;
  }

  function normalizeDepartmentValue(value, fallback = 'ENG') {
    return normalizeDepartmentCode(value, fallback);
  }

  const ROLES = [
    { code: 'admin', name: 'Admin', name_th: 'ผู้ดูแลระบบ' },
    { code: 'manager', name: 'Manager', name_th: 'ผู้จัดการ' },
    { code: 'mod', name: 'MOD', name_th: 'MOD' },
    { code: 'supervisor', name: 'Supervisor', name_th: 'หัวหน้างาน' },
    { code: 'staff', name: 'Staff', name_th: 'พนักงาน' },
  ];
  const PRIVILEGED_ROLES = ['admin', 'manager', 'mod'];

  const DEMO_USERS = [
    { uid: 'demo-9901', employee_id: '9901', full_name: 'Somchai MOD', role: 'mod', department: 'MOD', position: 'MOD', password: '9901', is_active: true },
    { uid: 'demo-9902', employee_id: '9902', full_name: 'Nok HK', role: 'staff', department: 'HK', position: 'HK Staff', password: '9902', is_active: true },
    { uid: 'demo-9903', employee_id: '9903', full_name: 'Brown ENG', role: 'supervisor', department: 'ENG', position: 'Engineering Supervisor', password: '9903', is_active: true },
    { uid: 'demo-9904', employee_id: '9904', full_name: 'Mint FO', role: 'manager', department: 'FO', position: 'FO Manager', password: '9904', is_active: true },
    { uid: 'demo-25381', employee_id: '25381', full_name: 'Wuttichai KOJI-NOI-FB', role: 'admin', department: 'FB', position: 'MOD / F&B', password: '25381', is_active: true }
  ];

  const HOD_PROFILE_PRESET = {
    '25381': { full_name: 'Wuttichai Koji', role: 'admin', department: 'FB', position: 'Assistant Food and Beverage Manager', is_active: true },
    '26421': { full_name: 'Phatteera Pongsantikul', role: 'manager', department: 'FNA', position: 'Chief Accountant - Residences', is_active: true },
    '26428': { full_name: 'Maneeral Wisedkanakul', role: 'manager', department: 'HK', position: 'Assistant Executive Housekeeper', is_active: true },
    '23052': { full_name: 'Siwach Pechdee', role: 'manager', department: 'PUR', position: 'Purchasing Manager', is_active: true },
    '24202': { full_name: 'Walaipan Chaithap Na Sakun', role: 'manager', department: 'FO', position: 'Front Office Manager - Resort', is_active: true },
    '23027': { full_name: 'Teeradech Tongpon', role: 'manager', department: 'HR', position: 'Director of Human Resources', is_active: true },
    '25352': { full_name: 'Supannee Srisawat', role: 'manager', department: 'HK', position: 'Executive Housekeeper', is_active: true },
    '25340': { full_name: 'Pitak Nammongkol', role: 'manager', department: 'KIT', position: 'Executive Chef', is_active: true },
    '24127': { full_name: 'Nontachai Sutitapun', role: 'supervisor', department: 'KIT', position: 'Sous Chef - Staff Canteen', is_active: true },
    '23012': { full_name: 'Dara Sujjawongwanit', role: 'manager', department: 'FNA', position: 'Cluster Financial Controller', is_active: true },
    '25280': { full_name: 'Natthawut Sungkhiew', role: 'manager', department: 'ENG', position: 'Director of Engineer', is_active: true },
    '26394': { full_name: 'Sirin Jiraro', role: 'manager', department: 'GM', position: 'Executive Assistant', is_active: true },
    '23078': { full_name: 'Nattiya Chusriying', role: 'manager', department: 'SPA', position: 'Spa Manager', is_active: true },
    '23008': { full_name: 'Chayada Soirungrueng', role: 'manager', department: 'SALES', position: 'Digital Marketing Manager', is_active: true },
    '25369': { full_name: 'Jirapha Kaewjan', role: 'manager', department: 'FNA', position: 'Chief Accountant', is_active: true },
    '24173': { full_name: 'Rattana Chaichum', role: 'manager', department: 'SALES', position: 'Director of Sales and Marketing', is_active: true },
    '23024': { full_name: 'DOR - Ritdhibhorn V', role: 'manager', department: 'ROOMS', position: 'Director of Room', is_active: true },
    '26401': { full_name: 'Boonchart Chaikeaw', role: 'manager', department: 'FB', position: 'Director Of Food and Beverage', is_active: true },
    '24273': { full_name: 'Chayanit Chusuwan (HM)', role: 'manager', department: 'GM', position: 'Hotel Manager', is_active: true },
    '26411': { full_name: 'Ms. Natthakarn Watthanapan', role: 'staff', department: 'SEC', position: 'Department User', is_active: true },
    '10001': { full_name: 'Woody', role: 'manager', department: 'GM', position: 'General Manager', is_active: true },
    '1001': { full_name: 'Woody', role: 'manager', department: 'GM', position: 'General Manager', is_active: true },
    '23053': { full_name: 'Pornpen Molen', role: 'manager', department: 'HR', position: 'Assistant HR Manager', is_active: true }
  };
  const HOD_PROFILE_SKIPPED_EMPLOYEE_IDS = ['24174', '32052', '25000', '25285', '26432'];

  const PRIORITIES = ['low', 'medium', 'high', 'critical'];
  const STATUS_ORDER = { open: 1, in_progress: 2, waiting: 3, closed: 4 };

  function departmentLabel(dept) {
    if (!dept) return '';
    return currentLang() === 'en' ? (dept.name || dept.code || '') : (dept.name_th || dept.name || dept.code || '');
  }

  function getDepartmentMeta(code) {
    const raw = String(code || '').trim();
    const normalized = normalizeDepartmentCode(raw, raw || '');
    return DEPARTMENTS.find(d => d.code === normalized) || DEPARTMENTS.find(d => d.code === raw) || null;
  }

  function getDepartmentName(code) {
    const dept = getDepartmentMeta(code);
    return dept ? departmentLabel(dept) : (code || '-');
  }

  function normalizeRole(role) {
    const value = String(role || 'staff').toLowerCase();
    if (value === 'dept_user' || value === 'viewer') return 'staff';
    return ROLES.some(item => item.code === value) ? value : 'staff';
  }

  function getRoleMeta(role) {
    const code = normalizeRole(role);
    return ROLES.find(item => item.code === code) || ROLES[ROLES.length - 1];
  }

  function getRoleName(role) {
    const entry = getRoleMeta(role);
    return currentLang() === 'en' ? entry.name : entry.name_th;
  }

  function canManageUsers() {
    return normalizeRole(state.currentUser?.role) === 'admin';
  }

  function canManageAllWork() {
    return PRIVILEGED_ROLES.includes(normalizeRole(state.currentUser?.role));
  }

  function canCreateIssueForRole() {
    // v96: ทุก Role/Position ที่ยัง Active สามารถเปิด Issue ใหม่ได้
    // Role ยังใช้คุมสิทธิ์ Admin/Manager/MOD ส่วน Position ใช้โชว์ตำแหน่งเท่านั้น
    if (!state.currentUser) return false;
    return state.currentUser.is_active !== false;
  }

  function canUseChecklistForRole() {
    return canManageAllWork();
  }

  function getUserInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'M';
    return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
  }

  function translatePriority(value) {
    const map = {
      low: { th: 'ต่ำ', en: 'Low' },
      medium: { th: 'ปานกลาง', en: 'Medium' },
      high: { th: 'สูง', en: 'High' },
      critical: { th: 'วิกฤต', en: 'Critical' },
    };
    const entry = map[value];
    if (!entry) return labelize(value);
    return currentLang() === 'en' ? entry.en : entry.th;
  }

  function translateStatus(value) {
    const map = {
      open: { th: 'เปิดอยู่', en: 'Open' },
      in_progress: { th: 'กำลังดำเนินการ', en: 'In Progress' },
      waiting: { th: 'รอ', en: 'Waiting' },
      closed: { th: 'ปิดแล้ว', en: 'Closed' },
    };
    const entry = map[value];
    if (!entry) return labelize(value);
    return currentLang() === 'en' ? entry.en : entry.th;
  }

  const state = {
    currentUser: null,
    firebaseAuthBound: false,
    authSurfaceBound: false,
    firebaseIssuesUnsub: null,
    firebaseIssueCommentsUnsub: null,
    firebaseTemplatesUnsub: null,
    firebaseChecklistRunsUnsub: null,
    firebaseUsersUnsub: null,
    firebaseUsageLogsUnsub: null,
    ui: {
      activeView: 'boardView',
      boardFilter: 'all',
      boardSearch: '',
      boardDateFilter: '',
      closedSearch: '',
      closedDateFilter: '',
      closedSummarySearch: '',
      closedSummaryFromDate: '',
      closedSummaryToDate: '',
      logSearch: '',
      newIssuePriority: 'medium',
      selectedTemplateCode: null,
      openIssueId: null,
      openChecklistRunId: null,
      liveIssueComments: [],
      pendingIssuePhotos: [],
      pendingIssueVideo: null,
      pendingIssueCoverPhoto: null,
      pendingEvidenceBusy: false,
      checklistBuilderSections: [],
      language: getSavedLanguage(),
      hiddenTemplateCodes: getHiddenTemplateCodes(),
      checklistFailMedia: {},
      didInitialMentionCheck: false,
      didDepartmentPendingAlert: false,
      mentionModalOpen: false,
      alertModalMode: '',
      pendingMentionItems: [],
      pendingProfileAvatar: null,
      passwordChangeDraft: null,
      passwordChangeBusy: false,
      passwordEditorMode: 'normal',
      accountMenuOpen: false,
      mediaPreviewOpen: false,
      mediaPreviewIssueId: null,
      mediaPreviewItems: [],
      mediaPreviewIndex: 0,
      mediaPreviewTouchStartX: 0,
      editingUserUid: '',
      issueSyncStatus: 'idle',
      checklistSyncStatus: 'idle',
      fastDashboardCacheActive: false,
      fastDashboardCacheTime: '',
    },
    data: {
      issues: [],
      checklistRuns: [],
      activity: [],
      templates: [],
      baseTemplates: [],
      customTemplates: [],
      counters: { issue: 0, checklist: 0 },
      teamMembers: [],
      usageLogs: [],
    },
  };

  const el = {};

  function safeClone(value) {
    try {
      if (typeof structuredClone === 'function') return structuredClone(value);
    } catch (_) {}
    return JSON.parse(JSON.stringify(value));
  }

  const FALLBACK_CHECKLIST_TEMPLATES = [
  {
    "template_code": "MOD_DAILY_CHECKLIST",
    "template_name": "MOD Daily Checklist (Reduced)",
    "source_sheet": "MOD Checklist",
    "default_response_mode": "pass_fail_na",
    "default_fields": {
      "note": true,
      "photo": true,
      "create_issue_on_fail": true
    },
    "sections": [
      {
        "section_code": "MOD_01_OVERALL",
        "section_order": 1,
        "section_title": "Overall Hotel Condition",
        "item_count": 5,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "MOD_01_01",
            "item_order": 1,
            "item_text": "Main hotel entrance is clean and orderly.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "พื้นที่ทางเข้าโรงแรมสะอาดและเรียบร้อย"
          },
          {
            "item_code": "MOD_01_02",
            "item_order": 2,
            "item_text": "Lobby is clean and free from unusual odor.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ล็อบบี้สะอาดและไม่มีกลิ่นผิดปกติ"
          },
          {
            "item_code": "MOD_01_03",
            "item_order": 3,
            "item_text": "Lighting in public areas is functioning properly.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "แสงสว่างในพื้นที่สาธารณะใช้งานได้"
          },
          {
            "item_code": "MOD_01_04",
            "item_order": 4,
            "item_text": "Lobby music and ambiance are appropriate.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "เพลงและบรรยากาศในล็อบบี้เหมาะสม"
          },
          {
            "item_code": "MOD_01_05",
            "item_order": 5,
            "item_text": "Staff at key service points are present and properly groomed.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "พนักงานตามจุดบริการหลักอยู่ครบและแต่งกายเรียบร้อย"
          }
        ],
        "section_title_th": "ภาพรวมโรงแรม"
      },
      {
        "section_code": "MOD_02_FO",
        "section_order": 2,
        "section_title": "Front Office",
        "item_count": 5,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "MOD_02_01",
            "item_order": 1,
            "item_text": "Front Office counter is clean and ready for service.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "เคาน์เตอร์ FO สะอาดและพร้อมให้บริการ"
          },
          {
            "item_code": "MOD_02_02",
            "item_order": 2,
            "item_text": "Check-in / check-out systems are working properly.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ระบบ check-in / check-out ใช้งานได้"
          },
          {
            "item_code": "MOD_02_03",
            "item_order": 3,
            "item_text": "There is no unusual guest queue or delay at reception.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ไม่มีคิวแขกรอนานผิดปกติที่หน้าเคาน์เตอร์"
          },
          {
            "item_code": "MOD_02_04",
            "item_order": 4,
            "item_text": "VIP, arrival, and departure information has been reviewed.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "มีการติดตามข้อมูล VIP / arrival / departure แล้ว"
          },
          {
            "item_code": "MOD_02_05",
            "item_order": 5,
            "item_text": "Front Office team is aware of today’s key information.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ทีม FO รับทราบข้อมูลสำคัญประจำวันแล้ว"
          }
        ],
        "section_title_th": "แผนกต้อนรับ"
      },
      {
        "section_code": "MOD_03_HK",
        "section_order": 3,
        "section_title": "Housekeeping",
        "item_count": 5,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "MOD_03_01",
            "item_order": 1,
            "item_text": "Guest corridors and visible guest areas are clean.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "พื้นที่ทางเดินและจุดใช้งานแขกสะอาด"
          },
          {
            "item_code": "MOD_03_02",
            "item_order": 2,
            "item_text": "Available clean rooms are sufficient for operations.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ห้องพักพร้อมขายเพียงพอต่อการใช้งาน"
          },
          {
            "item_code": "MOD_03_03",
            "item_order": 3,
            "item_text": "Key cleaning tasks in priority areas are completed.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "งานทำความสะอาดในพื้นที่สำคัญเรียบร้อย"
          },
          {
            "item_code": "MOD_03_04",
            "item_order": 4,
            "item_text": "No major pending issue is affecting guest experience.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ไม่มี issue ค้างสำคัญที่กระทบแขก"
          },
          {
            "item_code": "MOD_03_05",
            "item_order": 5,
            "item_text": "Housekeeping team is aware of urgent tasks.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ทีม HK รับทราบงานเร่งด่วนแล้ว"
          }
        ],
        "section_title_th": "แผนกแม่บ้าน"
      },
      {
        "section_code": "MOD_04_ENG_SAFETY",
        "section_order": 4,
        "section_title": "Engineering / Safety",
        "item_count": 5,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "MOD_04_01",
            "item_order": 1,
            "item_text": "Electricity, air-conditioning, and water systems are normal.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ระบบไฟฟ้า แอร์ และน้ำใช้งานปกติ"
          },
          {
            "item_code": "MOD_04_02",
            "item_order": 2,
            "item_text": "No major problem found with elevators or critical equipment.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ลิฟต์หรืออุปกรณ์หลักไม่มีปัญหาสำคัญ"
          },
          {
            "item_code": "MOD_04_03",
            "item_order": 3,
            "item_text": "No visible safety hazard is found in public areas.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ไม่มีอันตรายที่มองเห็นได้ในพื้นที่สาธารณะ"
          },
          {
            "item_code": "MOD_04_04",
            "item_order": 4,
            "item_text": "Fire exit routes and key safety points are ready.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ทางหนีไฟและจุดความปลอดภัยหลักพร้อมใช้งาน"
          },
          {
            "item_code": "MOD_04_05",
            "item_order": 5,
            "item_text": "Urgent repair items are being followed up.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "งานซ่อมเร่งด่วนถูกติดตามแล้ว"
          }
        ],
        "section_title_th": "วิศวกรรม / ความปลอดภัย"
      },
      {
        "section_code": "MOD_05_FB",
        "section_order": 5,
        "section_title": "F&B / Outlet",
        "item_count": 5,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "MOD_05_01",
            "item_order": 1,
            "item_text": "Restaurant or outlet is ready for operation.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ห้องอาหารหรือเอาต์เล็ตพร้อมเปิดบริการ"
          },
          {
            "item_code": "MOD_05_02",
            "item_order": 2,
            "item_text": "Tables, chairs, and service areas are clean and ready.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "โต๊ะ เก้าอี้ และจุดบริการสะอาดเรียบร้อย"
          },
          {
            "item_code": "MOD_05_03",
            "item_order": 3,
            "item_text": "Outlet staff are present and ready to serve.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "พนักงานประจำเอาต์เล็ตพร้อมให้บริการ"
          },
          {
            "item_code": "MOD_05_04",
            "item_order": 4,
            "item_text": "Key food, beverage, and operating items are ready.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "อาหาร เครื่องดื่ม และอุปกรณ์หลักพร้อม"
          },
          {
            "item_code": "MOD_05_05",
            "item_order": 5,
            "item_text": "No major guest complaint remains without follow-up.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ไม่มี complaint สำคัญค้างโดยไม่ติดตาม"
          }
        ],
        "section_title_th": "อาหารและเครื่องดื่ม"
      },
      {
        "section_code": "MOD_06_GUEST_FOLLOWUP",
        "section_order": 6,
        "section_title": "Guest Experience / Follow-up",
        "item_count": 5,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "MOD_06_01",
            "item_order": 1,
            "item_text": "Today’s complaints or special cases have been followed up.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "Complaint หรือ special case วันนี้ถูกติดตามแล้ว"
          },
          {
            "item_code": "MOD_06_02",
            "item_order": 2,
            "item_text": "VIP, long stay, and special attention guests have been reviewed.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "VIP / Long stay / Special attention ถูกดูแลแล้ว"
          },
          {
            "item_code": "MOD_06_03",
            "item_order": 3,
            "item_text": "No unresolved major issue requires escalation.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ไม่มี issue สำคัญที่ต้อง escalate เพิ่ม"
          },
          {
            "item_code": "MOD_06_04",
            "item_order": 4,
            "item_text": "MOD log and handover notes are completed.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "MOD log / handover ถูกบันทึกครบ"
          },
          {
            "item_code": "MOD_06_05",
            "item_order": 5,
            "item_text": "Key points have been handed over to the next team.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "มีการส่งต่อประเด็นสำคัญให้ทีมถัดไปแล้ว"
          }
        ],
        "section_title_th": "ประสบการณ์แขก / การติดตามผล"
      }
    ],
    "template_name_th": "เช็กลิสต์ MOD ประจำวัน (เวอร์ชันย่อ)",
    "total_item_count": 30,
    "special_forms": [
      {
        "module": "mod_checklist",
        "form_code": "MOD_GENERAL_COMMENTS",
        "form_name": "General Comments / Issues",
        "source_rows": "quick-check",
        "description": "Freeform issue log for additional findings not captured in checklist items.",
        "columns": [
          "No.",
          "Issue",
          "Remarks"
        ],
        "suggested_actions": [
          "allow photo",
          "allow assign department",
          "allow create issue directly"
        ],
        "form_name_th": "ความคิดเห็นทั่วไป / ประเด็นปัญหา"
      },
      {
        "module": "mod_checklist",
        "form_code": "MOD_GUEST_FEEDBACK",
        "form_name": "Guest Interview Log (3 guests)",
        "source_rows": "quick-check",
        "description": "Log 3 guest conversations during inspection.",
        "columns": [
          "No.",
          "Name",
          "Guest Type",
          "Room Number",
          "Time",
          "Question and the answer"
        ],
        "suggested_actions": [
          "text only by default",
          "optional photo off"
        ],
        "form_name_th": "บันทึกการพูดคุยกับแขก (3 ท่าน)"
      },
      {
        "module": "mod_checklist",
        "form_code": "MOD_EMPLOYEE_KNOWLEDGE",
        "form_name": "Employee Knowledge Check (3 employees)",
        "source_rows": "quick-check",
        "description": "Check product knowledge and daily activities with 3 employees.",
        "columns": [
          "No.",
          "Name",
          "Department",
          "Job title",
          "Time",
          "Question and the answer"
        ],
        "suggested_actions": [
          "text only by default",
          "optional photo off"
        ],
        "form_name_th": "ตรวจความรู้พนักงาน (3 คน)"
      }
    ]
  },
  {
    "template_code": "ROOM_CHECK_STANDARD",
    "template_name": "Daily Room Checklist (Reduced)",
    "source_sheet": "Room Check",
    "default_response_mode": "pass_fail_na",
    "default_fields": {
      "note": true,
      "photo": true,
      "create_issue_on_fail": true
    },
    "sections": [
      {
        "section_code": "ROOM_01_ENTRANCE",
        "section_order": 1,
        "section_title": "Entrance / Front Door",
        "item_count": 3,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "ROOM_01_01",
            "item_order": 1,
            "item_text": "Room number sign is clear and in good condition.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ป้ายเลขห้องชัดเจนและสภาพดี"
          },
          {
            "item_code": "ROOM_01_02",
            "item_order": 2,
            "item_text": "Door, door bell, and switches are working properly.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ประตูห้อง กริ่ง และสวิตช์ใช้งานได้"
          },
          {
            "item_code": "ROOM_01_03",
            "item_order": 3,
            "item_text": "Entrance floor is clean with no trash or stain.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "พื้นหน้าห้องสะอาด ไม่มีขยะหรือคราบ"
          }
        ],
        "section_title_th": "หน้าห้อง / ทางเข้า"
      },
      {
        "section_code": "ROOM_02_ROOM",
        "section_order": 2,
        "section_title": "Guest Room Interior",
        "item_count": 5,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "ROOM_02_01",
            "item_order": 1,
            "item_text": "Room odor is normal with no damp or unusual smell.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "กลิ่นห้องปกติ ไม่มีอับหรือกลิ่นผิดปกติ"
          },
          {
            "item_code": "ROOM_02_02",
            "item_order": 2,
            "item_text": "Room floor is clean and free from dust or debris.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "พื้นห้องสะอาด ไม่มีฝุ่นหรือเศษขยะ"
          },
          {
            "item_code": "ROOM_02_03",
            "item_order": 3,
            "item_text": "Main lights are functioning properly.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "แสงสว่างหลักใช้งานได้"
          },
          {
            "item_code": "ROOM_02_04",
            "item_order": 4,
            "item_text": "Air-conditioning is working properly with suitable temperature.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "แอร์ทำงานปกติ อุณหภูมิเหมาะสม"
          },
          {
            "item_code": "ROOM_02_05",
            "item_order": 5,
            "item_text": "Main furniture is in good and orderly condition.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "เฟอร์นิเจอร์หลักอยู่ในสภาพเรียบร้อย"
          }
        ],
        "section_title_th": "ภายในห้องพัก"
      },
      {
        "section_code": "ROOM_03_BED",
        "section_order": 3,
        "section_title": "Bed / Linen",
        "item_count": 3,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "ROOM_03_01",
            "item_order": 1,
            "item_text": "Bed is properly made and well presented.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "เตียงจัดเรียบร้อย"
          },
          {
            "item_code": "ROOM_03_02",
            "item_order": 2,
            "item_text": "Bed linen is clean and free from visible stain or damage.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ผ้าปู ปลอกหมอน และผ้านวมสะอาด ไม่มีรอย"
          },
          {
            "item_code": "ROOM_03_03",
            "item_order": 3,
            "item_text": "Towels and key amenities are complete.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ผ้าเช็ดตัวและ amenity หลักครบ"
          }
        ],
        "section_title_th": "เตียง / ผ้าลินิน"
      },
      {
        "section_code": "ROOM_04_BATHROOM",
        "section_order": 4,
        "section_title": "Bathroom",
        "item_count": 5,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "ROOM_04_01",
            "item_order": 1,
            "item_text": "Bathroom fixtures and surfaces are clean.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "สุขภัณฑ์และพื้นผิวห้องน้ำสะอาด"
          },
          {
            "item_code": "ROOM_04_02",
            "item_order": 2,
            "item_text": "Shower, faucet, and toilet are working properly.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ฝักบัว ก๊อกน้ำ และชักโครกใช้งานได้"
          },
          {
            "item_code": "ROOM_04_03",
            "item_order": 3,
            "item_text": "Hot and cold water are normal.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "น้ำร้อนน้ำเย็นปกติ"
          },
          {
            "item_code": "ROOM_04_04",
            "item_order": 4,
            "item_text": "Mirror and wash basin are clean.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "กระจกและอ่างล้างหน้าสะอาด"
          },
          {
            "item_code": "ROOM_04_05",
            "item_order": 5,
            "item_text": "Bathroom floor is dry and safe.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "พื้นห้องน้ำแห้งและปลอดภัย"
          }
        ],
        "section_title_th": "ห้องน้ำ"
      },
      {
        "section_code": "ROOM_05_EQUIPMENT",
        "section_order": 5,
        "section_title": "Equipment / Minibar",
        "item_count": 3,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "ROOM_05_01",
            "item_order": 1,
            "item_text": "TV, telephone, kettle, and safe are working properly.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ทีวี โทรศัพท์ kettle และ safe ใช้งานได้"
          },
          {
            "item_code": "ROOM_05_02",
            "item_order": 2,
            "item_text": "Minibar, drinking water, and standard setup are complete.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "มินิบาร์ น้ำดื่ม และของวางมาตรฐานครบ"
          },
          {
            "item_code": "ROOM_05_03",
            "item_order": 3,
            "item_text": "Main power outlets are working properly.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ปลั๊กไฟหลักใช้งานได้"
          }
        ],
        "section_title_th": "อุปกรณ์ / มินิบาร์"
      },
      {
        "section_code": "ROOM_06_READINESS",
        "section_order": 6,
        "section_title": "Room Readiness",
        "item_count": 3,
        "item_type": "checklist",
        "items": [
          {
            "item_code": "ROOM_06_01",
            "item_order": 1,
            "item_text": "No major defect affects guest stay.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ไม่มี defect สำคัญที่กระทบการเข้าพัก"
          },
          {
            "item_code": "ROOM_06_02",
            "item_order": 2,
            "item_text": "If a defect is found, an issue has been created.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "หากพบ defect มีการ create issue แล้ว"
          },
          {
            "item_code": "ROOM_06_03",
            "item_order": 3,
            "item_text": "Room is ready for sale or check-in.",
            "response_mode": "pass_fail_na",
            "allow_note": true,
            "allow_photo": true,
            "create_issue_on_fail": true,
            "item_text_th": "ห้องพร้อมขายหรือพร้อมเข้าพัก"
          }
        ],
        "section_title_th": "ความพร้อมขายห้อง"
      }
    ],
    "template_name_th": "เช็กลิสต์ตรวจห้องประจำวัน (เวอร์ชันย่อ)",
    "total_item_count": 22
  }
];

  const FIREBASE_BOOT_TIMEOUT_MS = 14000;
  const PERF_LIMITS = {
    issues: 180,
    checklistRuns: 80,
    usageLogs: 200,
    mentionAlerts: 50,
    fastCacheIssues: 80,
    fastCacheChecklistRuns: 40,
  };
  const FAST_DASHBOARD_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  let xlsxLoadPromise = null;
  let firebaseBootWatchdog = null;
  let firebaseBootGraceUntil = 0;

  function markAppVersionCurrent() {
    try {
      localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    } catch (_) {}
  }

  async function clearBrowserCachesSilentlyForLogin() {
    // ล้างเฉพาะ web/app cache เพื่อกันไฟล์เก่าค้าง แต่ไม่ลบ cache ข้อมูลงานล่าสุด
    // เพื่อให้ Dashboard ยังเปิดได้ไวและไม่กระพริบเป็น 0
    const tasks = [];

    try {
      if ('caches' in window) {
        tasks.push(
          caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        );
      }
    } catch (cacheErr) {
      console.warn('Auto login cache clear skipped', cacheErr);
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        tasks.push(
          navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(
            regs.map((reg) => (reg.update ? reg.update().catch(() => {}) : Promise.resolve()))
          ))
        );
      }
    } catch (swErr) {
      console.warn('Auto service worker update skipped', swErr);
    }

    try {
      await Promise.allSettled(tasks);
    } catch (_) {}

    try {
      const savedLang = currentLang();
      const keepPrefixes = [
        `${APP_KEY}_fast_dashboard_`,
        `${APP_KEY}_mention_seen_`,
      ];
      Object.keys(localStorage || {}).forEach((key) => {
        if (key === LANG_KEY || key === APP_KEY || key === APP_VERSION_KEY) return;
        if (keepPrefixes.some((prefix) => key.startsWith(prefix))) return;
        if (key === HIDDEN_TEMPLATE_KEY || key.startsWith('workbox-') || key.startsWith('sw-') || key.startsWith('cache-')) {
          localStorage.removeItem(key);
        }
      });
      saveLanguagePreference(savedLang);
      markAppVersionCurrent();
    } catch (storageErr) {
      console.warn('Auto local cache cleanup skipped', storageErr);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    markAppVersionCurrent();
    cacheEls();
    bindEvents();
    bindFirebaseEvents();
    startFirebaseBootWatchdog();
    applyLanguageToStaticUI();
    showAuthTab('signin');
    applyRuntimeMode();
    await loadTemplates();
    hydrateFromStorage();
    if (!window.LAYA_FIREBASE_CONFIG_PRESENT && !state.data.issues.length && !state.data.activity.length) {
      seedDemoData();
    }
    state.data.teamMembers = DEMO_USERS.map(user => ({ uid: user.uid, employee_id: user.employee_id, full_name: user.full_name, role: normalizeRole(user.role), department: normalizeDepartmentValue(user.department, 'MOD'), position: user.position || getRoleName(user.role), is_active: true }));
    renderTemplateCards();
    renderUsageLogs();
    renderAll();
  }


  function bindFirebaseEvents() {
    window.addEventListener('laya-firebase-booting', () => {
      startFirebaseBootWatchdog();
      applyRuntimeMode();
    });

    window.addEventListener('laya-firebase-ready', () => {
      clearFirebaseBootWatchdog();
      applyRuntimeMode();
    });

    window.addEventListener('laya-firebase-error', () => {
      clearFirebaseBootWatchdog();
      applyRuntimeMode();
    });
  }

  function clearFirebaseBootWatchdog() {
    if (firebaseBootWatchdog) {
      window.clearTimeout(firebaseBootWatchdog);
      firebaseBootWatchdog = null;
    }
  }

  function startFirebaseBootWatchdog() {
    if (!window.LAYA_FIREBASE_CONFIG_PRESENT) return;

    firebaseBootGraceUntil = Date.now() + FIREBASE_BOOT_TIMEOUT_MS;
    clearFirebaseBootWatchdog();

    const current = window.LAYA_FIREBASE || {};
    if (!current.ready && current.booting == null) {
      window.LAYA_FIREBASE = {
        ready: false,
        booting: true,
        mode: current.mode || 'booting',
        error: current.error || '',
        projectId: current.projectId || window.LAYA_FIREBASE_CONFIG?.projectId || ''
      };
    }

    firebaseBootWatchdog = window.setTimeout(() => {
      const fb = window.LAYA_FIREBASE;
      if (fb?.ready) return;

      const timeoutError = !fb
        ? 'firebase_init_not_started'
        : fb.booting
          ? 'firebase_init_timeout'
          : (fb.error || 'firebase_init_incomplete');

      window.LAYA_FIREBASE = {
        ...(fb || {}),
        ready: false,
        booting: false,
        mode: 'config_error',
        error: timeoutError,
        projectId: (fb && fb.projectId) || window.LAYA_FIREBASE_CONFIG?.projectId || ''
      };

      window.dispatchEvent(new CustomEvent('laya-firebase-error', { detail: window.LAYA_FIREBASE }));
    }, FIREBASE_BOOT_TIMEOUT_MS);
  }

  function isFirebaseBootGraceActive() {
    return !!(window.LAYA_FIREBASE_CONFIG_PRESENT && Date.now() < firebaseBootGraceUntil);
  }

  function applyRuntimeMode() {
    const fb = window.LAYA_FIREBASE;
    const isBooting = !!fb?.booting || (!!window.LAYA_FIREBASE_CONFIG_PRESENT && !fb?.ready && isFirebaseBootGraceActive());

    if (fb?.ready) {
      if (el.modeBanner) el.modeBanner.textContent = txt('Firebase Auth พร้อมใช้งาน', 'Firebase Auth Ready') + ` • ${fb.projectId || txt('เชื่อมแล้ว', 'connected')}`;
      if (el.connectionBadge) {
        el.connectionBadge.textContent = txt('เชื่อม Firebase แล้ว', 'Firebase Live');
        el.connectionBadge.classList.remove('warning');
        el.connectionBadge.classList.add('success');
      }
      if (el.demoBox) el.demoBox.classList.add('hidden');
      bootstrapFirebaseAuth();
      return;
    }

    if (isBooting) {
      if (el.modeBanner) el.modeBanner.textContent = txt('กำลังเชื่อม Firebase...', 'Connecting to Firebase...');
      setAuthStatus(txt('กำลังเชื่อมระบบ กรุณารอสักครู่...', 'Connecting... please wait a moment.'), 'info');
      if (el.connectionBadge) {
        el.connectionBadge.textContent = txt('กำลังเชื่อมต่อ', 'Connecting');
        el.connectionBadge.classList.remove('success', 'warning');
      }
      if (el.demoBox) el.demoBox.classList.remove('hidden');
      return;
    }

    if (window.LAYA_FIREBASE_CONFIG_PRESENT) {
      if (el.modeBanner) el.modeBanner.textContent = txt('เพิ่ม Firebase Config แล้ว • รอ Auth', 'Firebase Config Added • Waiting for Auth');
      setAuthStatus(describeFirebaseUnavailable(), 'error');
      if (el.connectionBadge) {
        el.connectionBadge.textContent = txt('ข้อมูลเดโม', 'Demo Data');
        el.connectionBadge.classList.remove('success');
        el.connectionBadge.classList.add('warning');
      }
      if (el.demoBox) el.demoBox.classList.remove('hidden');
      return;
    }

    if (el.modeBanner) el.modeBanner.textContent = txt('โหมดเดโมในเครื่อง', 'Local Demo Mode');
    if (el.connectionBadge) {
      el.connectionBadge.textContent = txt('พร้อมใช้งาน', 'Ready');
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


  function setNodeText(selector, th, en, root = document) {
    const node = qs(selector, root);
    if (node) node.textContent = txt(th, en);
  }

  function setNodePlaceholder(selector, th, en, root = document) {
    const node = qs(selector, root);
    if (node) node.placeholder = txt(th, en);
  }

  function applyLanguageToStaticUI() {
    document.documentElement.lang = currentLang();

    qsa('[data-lang-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.langBtn === currentLang());
    });

    setNodeText('.brand-subtitle', 'MOD Checklist Report', 'MOD Checklist Report');
    setNodeText('#loginScreen h1', 'ระบบตรวจโรงแรมและบอร์ดติดตามงาน', 'Hotel Inspection & Issue Board');
    setNodeText('#showSignInTab', 'เข้าสู่ระบบ', 'Sign In');
    setNodeText('#showRegisterTab', 'สมัครสมาชิก', 'Register');
    setNodeText('#loginBtn', 'เข้าสู่ระบบ', 'Sign In');
    setNodeText('#registerBtn', 'สร้างบัญชี', 'Create Account');
    setNodeText('#demoBox .demo-title', 'บัญชีเดโม', 'Demo Accounts');

    const signInLabels = qsa('#signInPane label');
    if (signInLabels[0]) signInLabels[0].textContent = txt('รหัสพนักงาน', 'Employee ID');
    if (signInLabels[1]) signInLabels[1].textContent = txt('รหัสผ่าน', 'Password');

    const registerLabels = qsa('#registerPane label');
    const registerTexts = [
      txt('รหัสพนักงาน', 'Employee ID'),
      txt('ชื่อ-นามสกุล', 'Full Name'),
      txt('Role เริ่มต้น', 'Default Role'),
      txt('แผนก', 'Department'),
      txt('ตำแหน่งจริง', 'Position'),
      txt('รหัสผ่าน', 'Password'),
      txt('ยืนยันรหัสผ่าน', 'Confirm Password'),
    ];
    registerLabels.forEach((label, index) => {
      if (registerTexts[index]) label.textContent = registerTexts[index];
    });

    setNodePlaceholder('#loginEmployeeId', 'เช่น 9901', 'e.g. 9901');
    setNodePlaceholder('#loginPassword', 'รหัสผ่าน', 'Password');
    setNodeText('#loginClearCacheBtn', 'ล้างแคช', 'Clear Cache');
    setNodeText('#loginPasswordHelp', 'หากลืมรหัสผ่าน ให้ติดต่อ Admin เพื่อขอรหัสชั่วคราว', 'If you forgot your password, ask an admin for a temporary password.');
    setNodePlaceholder('#registerEmployeeId', 'เช่น 5521', 'e.g. 5521');
    setNodePlaceholder('#registerFullName', 'ชื่อ-นามสกุล', 'Full name');
    setNodePlaceholder('#registerPosition', 'เช่น FO Staff / HK Supervisor', 'e.g. FO Staff / HK Supervisor');
    setNodePlaceholder('#registerPassword', 'อย่างน้อย 6 ตัวอักษร', 'At least 6 characters');
    setNodePlaceholder('#registerConfirmPassword', 'ยืนยันรหัสผ่าน', 'Confirm password');

    if (el.registerRole) {
      const staffOpt = qs('option[value="staff"]', el.registerRole);
      if (staffOpt) staffOpt.textContent = txt('Staff - รอ Admin กำหนดสิทธิ์', 'Staff - admin will assign permission');
    }

    const sidebarLabels = {
      boardView: txt('บอร์ด', 'Board'),
      newIssueView: txt('แจ้งปัญหาใหม่', 'New Issue'),
      checklistView: txt('เช็กลิสต์', 'Checklist'),
      logView: txt('บันทึกการใช้งาน', 'Log'),
      closedView: txt('งานที่ปิดแล้ว', 'Closed Jobs'),
      closedSummaryView: txt('สรุปงานปิด', 'Closed Summary'),
      settingsView: txt('ตั้งค่า', 'Settings'),
    };
    qsa('.sidebar-nav .nav-link, .bottom-nav .nav-link').forEach(btn => {
      const label = sidebarLabels[btn.dataset.view];
      if (label) btn.textContent = label;
    });

    setNodeText('.topbar .eyebrow', 'LAYA RESORT PHUKET', 'LAYA RESORT PHUKET');
    setNodeText('.topbar-title', 'MOD Checklist Report', 'MOD Checklist Report');
    setNodeText('#openSettingsBtn', 'ตั้งค่า', 'Settings');
    setNodeText('#clearCacheBtn', 'ล้างแคช', 'Clear Cache');
    setNodeText('#clearCacheBtnMore', 'ล้างแคช', 'Clear Cache');
    setNodeText('#settingsAdminToolsPanel .panel-header h3', 'จัดการผู้ใช้งาน', 'User Management');
    setNodeText('#settingsAdminToolsPanel .panel-header p', 'แก้ Role / Department / Position และออกรหัสชั่วคราวให้พนักงาน', 'Manage role, department, position, and temporary passwords for staff.');
    setNodeText('#openTeamMembersFromSettings', 'จัดการผู้ใช้งาน', 'Manage Users');
    setNodeText('#applyUserProfilePresetBtn', 'อัปเดตชื่อ/ตำแหน่ง/แผนก HOD', 'Update HOD profiles');
    setNodeText('#standardizeDepartmentCodesBtn', 'จัดมาตรฐาน Department Code + เพิ่ม IT', 'Standardize Department Codes + IT');
    setNodeText('#logoutBtn', 'ออกจากระบบ', 'Logout');
    setNodeText('#topbarAccountName', 'บัญชีของฉัน', 'My Account');
    setNodeText('#topbarAccountMeta', 'ทีม MOD', 'MOD Team');
    setNodeText('#accountMenuName', 'บัญชีของฉัน', 'My Account');
    setNodeText('#accountMenuMeta', '0000 • MOD', '0000 • MOD');
    setNodeText('#accountMenuOpenTeamMembers', 'จัดการผู้ใช้งาน', 'Manage Users');
    setNodeText('#accountMenuOpenSettings', 'เปิดตั้งค่า', 'Open Settings');
    setNodeText('#accountMenuClearCache', 'ล้างแคช', 'Clear Cache');
    setNodeText('#accountMenuLogout', 'ออกจากระบบ', 'Logout');
    if (!state.currentUser) setNodeText('#welcomeText', 'ยินดีต้อนรับ', 'Welcome');

    setNodePlaceholder('#boardSearch', 'ค้นหา issue, location, department', 'Search issue, location, department');
    setNodeText('#boardDateClearBtn', 'ล้างวัน', 'Clear Date');
    if (el.boardDateFilter) el.boardDateFilter.title = txt('เลือกวันที่ของ Issue', 'Choose issue date');
    setNodeText('#openClosedJobsBtn', 'งานที่ปิดแล้ว', 'Closed Jobs');

    const chips = {
      all: txt('ทั้งหมด', 'All'),
      open: txt('เปิดอยู่', 'Open'),
      in_progress: txt('กำลังดำเนินการ', 'In Progress'),
      waiting: txt('รอ', 'Waiting'),
    };
    qsa('#boardFilterChips .chip').forEach(btn => {
      const label = chips[btn.dataset.filter];
      if (label) btn.textContent = label;
    });

    setNodeText('#newIssueView .panel-header h3', 'แจ้งปัญหาใหม่', 'New Issue');
    setNodeText('#newIssueView .panel-header p', 'แจ้งปัญหาใหม่แบบเร็ว เน้นถ่ายรูปและ assign แผนกให้ชัด', 'Quick issue report with clear photos and department assignment.');
    setNodeText('#issuePhotoGalleryPickBtn .media-btn-label', 'เลือกรูป', 'Choose Photo');
    setNodeText('#issuePhotoCameraPickBtn .media-btn-label', 'ถ่ายรูป', 'Take Photo');
    setNodeText('#issueVideoGalleryPickBtn .media-btn-label', 'เลือกวิดีโอ', 'Choose Video');
    setNodeText('#issueVideoCameraPickBtn .media-btn-label', 'ถ่ายวิดีโอ', 'Record Video');
    setNodeText('#issuePhotoHint', 'แนะนำรูปไม่เกิน 10 MB ต่อรูป • เลือกได้หลายรูป • ระบบจะย่อรูปให้อัตโนมัติก่อนบันทึก', 'Recommended max 10 MB per image • Multiple images allowed • Images will be compressed automatically before save');
    setNodeText('#issueVideoHint', `รองรับวิดีโอไม่เกิน ${MAX_VIDEO_UPLOAD_MB} MB • แนะนำ MP4/MOV • ระบบจะสร้าง poster ให้ใช้อัตโนมัติ`, `Video up to ${MAX_VIDEO_UPLOAD_MB} MB • Recommended MP4/MOV • Poster image will be generated automatically`);

    const issueLabels = qsa('#newIssueView .form-grid label');
    const issueLabelTexts = [
      txt('หัวข้อ', 'Title'),
      txt('ประเภทปัญหา', 'Issue Type'),
      txt('รายละเอียด', 'Description'),
      txt('ตำแหน่ง', 'Location'),
      txt('มอบหมายแผนก', 'Assign Department'),
    ];
    issueLabels.forEach((label, index) => {
      if (!issueLabelTexts[index]) return;
      const firstText = Array.from(label.childNodes || []).find(node => node.nodeType === Node.TEXT_NODE);
      if (firstText) {
        firstText.nodeValue = issueLabelTexts[index] + ' ';
      } else {
        label.textContent = issueLabelTexts[index];
      }
    });
    setNodePlaceholder('#issueTitle', 'เช่น น้ำรั่วบริเวณทางเข้าล็อบบี้', 'e.g. Water leak at lobby entrance');
    setNodePlaceholder('#issueDescription', 'รายละเอียดเพิ่มเติม', 'Additional details');
    setNodePlaceholder('#issueLocation', 'เช่น Lobby entrance near main corridor', 'e.g. Lobby entrance near main corridor');
    const issueTypeMap = {
      water_leak: txt('น้ำรั่ว', 'Water Leak'),
      light_issue: txt('ไฟมีปัญหา', 'Light Issue'),
      dirty_area: txt('พื้นที่สกปรก', 'Dirty Area'),
      broken_furniture: txt('เฟอร์นิเจอร์ชำรุด', 'Broken Furniture'),
      safety_concern: txt('จุดเสี่ยงด้านความปลอดภัย', 'Safety Concern'),
      guest_area_defect: txt('พื้นที่แขกมีปัญหา', 'Guest Area Defect'),
      ac_issue: txt('แอร์มีปัญหา', 'AC Issue'),
      pest_issue: txt('ปัญหาแมลง/สัตว์รบกวน', 'Pest Issue'),
      other: txt('อื่นๆ', 'Other'),
    };
    qsa('#issueType option').forEach(opt => {
      opt.textContent = issueTypeMap[opt.value] || opt.textContent;
    });
    const priorityLabel = qsa('#newIssueView > .panel glass label');
    setNodeText('#newIssueView > .panel > div:nth-last-of-type(2) > label', 'ระดับความสำคัญ', 'Priority');
    qsa('#prioritySegment .segment').forEach(btn => {
      const textNode = qs('.priority-text', btn);
      const priorityLabelText = translatePriority(btn.dataset.value);
      if (textNode) {
        textNode.textContent = priorityLabelText;
      } else {
        btn.textContent = priorityLabelText;
      }
    });
    setNodeText('#saveIssueBtn', '💾 บันทึกปัญหา', '💾 Save Issue');
    setNodeText('#clearIssueBtn', '🗑 ล้าง', '🗑 Clear');

    setNodeText('#checklistView .panel-header h3', 'โมดูลเช็กลิสต์', 'Checklist Module');
    setNodeText('#checklistView .panel-header p', 'แยกจาก Board เพื่อให้หน้าบอร์ดสะอาด และเมื่อ submit แล้วจะขึ้นบน Board เพื่อบอกว่าตรวจแล้ว', 'Separated from the board to keep it clean. Submitted checklist cards will appear on the board to show inspection is completed.');
    setNodeText('#addChecklistTemplateBtn', '+ เพิ่มเช็กลิสต์', '+ Add Checklist');

    setNodeText('#activityView .panel-header h3', 'กิจกรรม', 'Activity');
    setNodeText('#activityView .panel-header p', 'ความเคลื่อนไหวล่าสุดของ issue และ checklist', 'Latest issue and checklist activity');

    setNodeText('#logView .panel-header h3', 'บันทึกการใช้งาน', 'Usage Log');
    setNodeText('#logView .panel-header p', 'โหลดและดูข้อมูลการใช้งานล่าสุดของระบบ เช่น การสร้างงาน ปิดงาน คอมเมนต์ ส่ง checklist และอัปหลักฐาน', 'View recent system activity such as issue creation, closing jobs, comments, checklist submissions, and evidence uploads.');
    setNodeText('#reloadUsageLogBtn', 'โหลดล่าสุด', 'Load Latest');
    setNodeText('#exportUsageLogExcelBtn', 'ส่งออก Excel', 'Export Excel');
    setNodePlaceholder('#logSearch', 'ค้นหา log, ผู้ใช้, issue no, checklist no', 'Search log, user, issue no, checklist no');

    setNodeText('#closedView .panel-header h3', 'งานที่ปิดแล้วและประวัติเช็กลิสต์', 'Closed Jobs & Checklist History');
    setNodeText('#closedView .panel-header p', 'งานที่ปิดแล้วและ checklist ที่ซ่อนจาก Board จะถูกเก็บไว้ที่นี่ เพื่อไม่ให้ปนกับงานที่ยังต้องติดตาม', 'Closed jobs and checklist cards hidden from the board are kept here so they do not mix with active follow-up items.');
    setNodeText('#openClosedSummaryBtn', 'สรุปงานปิด', 'Closed Summary');
    setNodeText('#backToBoardBtn', 'กลับไปบอร์ด', 'Back to Board');
    setNodePlaceholder('#closedSearch', 'ค้นหางานที่ปิดแล้ว, checklist, location, issue no', 'Search closed jobs, checklist, location, issue no');
    setNodeText('#closedDateClearBtn', 'ล้างวัน', 'Clear Date');
    if (el.closedDateFilter) el.closedDateFilter.title = txt('เลือกวันที่ของ Issue ที่ปิดแล้ว', 'Choose closed issue date');

    setNodeText('#closedSummaryView .panel-header h3', 'สรุปงานปิด', 'Closed Summary');
    setNodeText('#closedSummaryView .panel-header p', 'เลือกช่วงวันที่เพื่อดูงานที่ปิดจบแล้ว พร้อมรูปก่อนแก้ไขและรูปหลังส่งงาน', 'Choose a date range to review completed jobs with before and after evidence.');
    setNodeText('#closedSummaryTodayBtn', 'วันนี้', 'Today');
    setNodeText('#closedSummaryBackBtn', 'กลับไปงานปิด', 'Back to Closed Jobs');
    setNodeText('#closedSummaryClearBtn', 'ล้างตัวกรอง', 'Clear Filters');
    setNodeText('label[for="closedSummaryFromDate"]', 'จากวันที่', 'From');
    setNodeText('label[for="closedSummaryToDate"]', 'ถึงวันที่', 'To');
    setNodeText('label[for="closedSummarySearch"]', 'ค้นหา', 'Search');
    setNodePlaceholder('#closedSummarySearch', 'ค้นหาเลขงาน, หัวข้อ, สถานที่, แผนก, ผู้ปิดงาน', 'Search issue no, title, location, department, closed by');

    setNodeText('#moreView .panel-header h3', 'ทีมและเครื่องมือ', 'Team & Tools');
    setNodeText('#openClosedJobsFromMore', 'เปิดงานที่ปิดแล้ว', 'Open Closed Jobs');
    setNodeText('#openUsageLogFromMore', 'เปิด Usage Log', 'Open Usage Log');
    setNodeText('#openSettingsFromMore', 'เปิดตั้งค่า', 'Open Settings');
    setNodeText('#exportJsonBtn', 'ส่งออก Local JSON', 'Export Local JSON');
    setNodeText('#settingsView .panel:nth-of-type(1) .panel-header h3', 'ตั้งค่าโปรไฟล์', 'Profile Settings');
    setNodeText('#settingsView .panel:nth-of-type(1) .panel-header p', 'เปลี่ยนชื่อ รูปโปรไฟล์ และดูข้อมูลบัญชีของคุณ', 'Update your display name, profile photo, and account details.');
    setNodeText('#settingsView .panel:nth-of-type(2) .panel-header h3', 'ตั้งค่ารหัสผ่าน', 'Password Settings');
    setNodeText('#settingsView .panel:nth-of-type(2) .panel-header p', 'เปลี่ยนรหัสผ่านสำหรับการเข้าสู่ระบบครั้งถัดไป', 'Change your password for future sign in.');
    setNodeText('#settingsView .settings-form-grid.compact > div:nth-child(1) > label', 'รหัสพนักงาน', 'Employee ID');
    setNodeText('#settingsView .settings-form-grid.compact > div:nth-child(2) > label', 'สิทธิ์การใช้งาน', 'Role');
    setNodeText('#settingsView .settings-form-grid.compact > div:nth-child(3) > label', 'แผนก', 'Department');
    setNodeText('#settingsView .settings-form-grid.compact > div:nth-child(4) > label', 'ตำแหน่งจริง', 'Position');
    setNodeText('#settingsView .settings-form-grid.compact > div:nth-child(5) > label', 'ชื่อ-นามสกุล', 'Full Name');
    setNodePlaceholder('#settingsFullName', 'ชื่อ-นามสกุล', 'Full Name');
    setNodeText('#openFullNameEditorBtn', 'แก้ไขชื่อ', 'Edit Name');
    setNodeText('#saveProfileSettingsBtn', 'บันทึกโปรไฟล์', 'Save Profile');
    setNodeText('#openPasswordEditorBtn', 'เปลี่ยนรหัสผ่าน', 'Change Password');
    setNodeText('#settingsPasswordHelper', 'เพื่อความปลอดภัย ฟอร์มรหัสผ่านจะเปิดในหน้าต่างแยก', 'For security, password fields open in a separate popup.');
    setNodeText('#settingsAvatarPickBtn', 'เลือกรูปโปรไฟล์', 'Choose Photo');
    setNodeText('#settingsAvatarCameraBtn', 'ถ่ายรูปโปรไฟล์', 'Take Photo');
    setNodeText('#settingsAvatarRemoveBtn', 'ลบรูป', 'Remove Photo');
    setNodeText('#settingsAvatarHint', 'ระบบจะย่อรูปให้อัตโนมัติก่อนบันทึก', 'Your photo will be compressed automatically before saving.');
    setNodeText('#fullNameEditorTitle', 'แก้ไขชื่อ-นามสกุล', 'Edit Full Name');
    setNodeText('#fullNameEditorMessage', 'อัปเดตชื่อที่ใช้แสดงในระบบ', 'Update the display name used in the system.');
    setNodeText('#fullNameEditorLabel', 'ชื่อ-นามสกุล', 'Full Name');
    setNodePlaceholder('#fullNameEditorInput', 'ชื่อ-นามสกุล', 'Full Name');
    setNodeText('#cancelFullNameEditorBtn', 'ยกเลิก', 'Cancel');
    setNodeText('#saveFullNameEditorBtn', 'บันทึกชื่อ', 'Save Name');
    setNodeText('#passwordEditorTitle', 'เปลี่ยนรหัสผ่าน', 'Change Password');
    setNodeText('#passwordEditorMessage', 'กรอกรหัสผ่านเดิมและรหัสผ่านใหม่ในหน้าต่างนี้', 'Enter your current password and a new password in this popup.');
    setNodeText('#passwordEditorCurrentLabel', 'รหัสผ่านปัจจุบัน', 'Current Password');
    setNodeText('#passwordEditorNewLabel', 'รหัสผ่านใหม่', 'New Password');
    setNodeText('#passwordEditorConfirmLabel', 'ยืนยันรหัสผ่านใหม่', 'Confirm New Password');
    setNodePlaceholder('#passwordEditorCurrent', 'รหัสผ่านปัจจุบัน', 'Current password');
    setNodePlaceholder('#passwordEditorNew', 'อย่างน้อย 6 ตัวอักษร', 'At least 6 characters');
    setNodePlaceholder('#passwordEditorConfirm', 'ยืนยันรหัสผ่านใหม่', 'Confirm new password');
    setNodeText('#cancelPasswordEditorBtn', 'ยกเลิก', 'Cancel');
    setNodeText('#continuePasswordEditorBtn', 'ตรวจสอบก่อนยืนยัน', 'Review Before Confirm');
    setNodeText('#passwordConfirmTitle', 'ยืนยันการเปลี่ยนรหัสผ่าน', 'Confirm password change');
    setNodeText('#passwordConfirmMessage', 'ระบบจะอัปเดตรหัสผ่านใหม่ทันทีหลังยืนยัน', 'Your password will be updated immediately after confirmation.');
    setNodeText('#passwordConfirmSummaryLabel', 'บัญชี', 'Account');
    setNodeText('#passwordConfirmLengthLabel', 'ความยาวรหัสผ่านใหม่', 'New password length');
    setNodeText('#cancelPasswordChangeBtn', 'ยกเลิก', 'Cancel');
    setNodeText('#confirmPasswordChangeBtn', 'ยืนยันเปลี่ยนรหัสผ่าน', 'Confirm password change');
    const importLabel = qs('#moreView .upload-btn');
    if (importLabel && importLabel.childNodes[0]) importLabel.childNodes[0].textContent = txt('นำเข้า Local JSON', 'Import Local JSON');
    setNodeText('#seedDemoBtn', 'รีเซ็ตข้อมูลเดโม', 'Reset Demo Data');
    setNodeText('#moreView .more-grid .panel:nth-of-type(2) .panel-header h3', 'สมาชิกทีม', 'Team Members');
    setNodeText('#moreView .more-grid .panel:nth-of-type(2) .panel-header p', 'ผู้ใช้ทั้งหมดของระบบนี้', 'All users in this system');

    if (el.fabNewIssue) {
      el.fabNewIssue.title = txt('แจ้งปัญหาใหม่', 'New Issue');
    }

    populateDepartmentSelects();
    syncRegisterRoleDepartment();
    applyRuntimeMode();
  }

  function setLanguage(lang) {
    const next = lang === 'en' ? 'en' : 'th';
    state.ui.language = next;
    saveLanguagePreference(next);
    applyLanguageToStaticUI();
    renderAll();
    refreshLanguageSensitiveDynamicUI();
    if (state.ui.openIssueId) {
      const issue = state.data.issues.find(i => i.id === state.ui.openIssueId);
      if (issue) renderIssueModalContent(issue);
    } else if (state.ui.openChecklistRunId) {
      openChecklistRunSummary(state.ui.openChecklistRunId);
    }
  }

  function syncRegisterRoleDepartment() {
    if (!el.registerDepartment) return;
    const previousValue = el.registerDepartment.value;
    const deptCodes = WORK_DEPARTMENT_CODES;
    el.registerDepartment.innerHTML = renderDepartmentOptions(deptCodes);
    if (previousValue && deptCodes.includes(previousValue)) {
      el.registerDepartment.value = previousValue;
    }
    if (!deptCodes.includes(el.registerDepartment.value)) {
      el.registerDepartment.value = 'ENG';
    }
    el.registerDepartment.disabled = false;
    if (el.registerRole) el.registerRole.value = 'staff';
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

  function buildUserProfile({ employeeId, fullName, role = 'staff', department = 'ENG', position = '', email = '' }) {
    return {
      employee_id: employeeId,
      full_name: fullName,
      role: normalizeRole(role),
      department: normalizeDepartmentValue(department, 'ENG'),
      position: position || getRoleName(role),
      is_active: true,
      phone: '',
      email,
      avatar_url: '',
      avatar_storage_path: '',
      password_change_required: false,
      temporary_password_issued_at: null,
      temporary_password_issued_by_uid: '',
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
  function isFirebaseConfiguredButUnavailable() {
    if (!window.LAYA_FIREBASE_CONFIG_PRESENT) return false;
    if (isFirebaseLive()) return false;
    if (window.LAYA_FIREBASE?.booting) return false;
    if (isFirebaseBootGraceActive()) return false;
    return true;
  }

  function getFirebaseUnavailableReason() {
    const raw = String(window.LAYA_FIREBASE?.error || '').trim();

    if (!raw) {
      if (window.LAYA_FIREBASE?.booting || isFirebaseBootGraceActive()) {
        return txt('ระบบกำลังเชื่อม Firebase', 'Firebase is still starting');
      }
      return '';
    }

    const normalized = raw.toLowerCase();

    if (normalized === 'firebase_init_not_started') {
      return txt(
        'ไฟล์ js/firebase-init.js ยังไม่เริ่มทำงาน หรือถูกแคช/บล็อกไว้',
        'js/firebase-init.js did not start, or was cached/blocked.'
      );
    }

    if (normalized === 'firebase_init_timeout') {
      return txt(
        'Firebase ใช้เวลาเชื่อมต่อนานเกินไปบนเบราว์เซอร์นี้',
        'Firebase took too long to initialize on this browser.'
      );
    }

    if (normalized === 'firebase_init_incomplete') {
      return txt(
        'Firebase เริ่มทำงานแล้ว แต่ยังเชื่อม Auth/Firestore ไม่ครบ',
        'Firebase started but did not finish connecting Auth/Firestore.'
      );
    }

    return raw;
  }

  function describeFirebaseUnavailable() {
    const reason = getFirebaseUnavailableReason();
    const base = txt(
      'Firebase ยังไม่พร้อมบนเบราว์เซอร์นี้ กรุณากดล้างแคชแล้วลองใหม่',
      'Firebase is not ready on this browser. Please clear cache and try again.'
    );
    return reason ? `${base} (${reason})` : base;
  }


  function resetSignedOutState() {
    state.ui.issueSyncStatus = 'idle';
    state.ui.checklistSyncStatus = 'idle';
    state.ui.fastDashboardCacheActive = false;
    state.ui.fastDashboardCacheTime = '';
    state.currentUser = null;
    stopIssueSync();
    stopIssueCommentsSync();
    stopTemplatesSync();
    stopChecklistRunsSync();
    stopUsersSync();
    stopUsageLogsSync();
    state.data.teamMembers = [];
    state.data.usageLogs = [];
    state.ui.liveIssueComments = [];
    state.ui.didInitialMentionCheck = false;
    state.ui.didDepartmentPendingAlert = false;
    state.ui.alertModalMode = '';
    state.ui.pendingMentionItems = [];
    closeMentionAlertModal(true);
    closePasswordConfirmModal(true);
    renderAuthState();
  }

  function describeFirebaseLoginError(err) {
    const code = String(err?.code || '').toLowerCase();
    const message = String(err?.message || '').toLowerCase();
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-login-credentials')) {
      return txt('Employee ID หรือ Password ไม่ถูกต้อง', 'Employee ID or Password is incorrect');
    }
    if (code.includes('too-many-requests')) {
      return txt('ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่', 'Too many login attempts. Please wait a moment and try again.');
    }
    if (code.includes('network-request-failed') || message.includes('network request failed')) {
      return txt('เชื่อมต่อ Firebase ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 'Could not reach Firebase. Please check your internet connection and try again.');
    }
    if (code.includes('permission-denied') || message.includes('permission')) {
      return txt('เข้าสู่ระบบได้ แต่ไม่มีสิทธิ์อ่านข้อมูลผู้ใช้จาก Firestore', 'Signed in, but the app could not read the user profile from Firestore.');
    }
    return txt('เข้าสู่ระบบไม่สำเร็จ', 'Could not sign in');
  }

  async function finishFirebaseUserBootstrap(user, options = {}) {
    if (!user) return false;
    const fb = window.LAYA_FIREBASE;
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
        setAuthStatus(txt('พบผู้ใช้ใน Authentication แล้ว แต่ยังไม่มีโปรไฟล์ใน Firestore', 'Signed in to Authentication, but no Firestore profile was found yet.'), 'error');
        resetSignedOutState();
        return false;
      }

      const profile = snap.data();
      const normalizedProfile = {
        ...profile,
        full_name: String(profile.full_name || profile.fullName || profile.display_name || profile.displayName || profile.name || user.displayName || '').trim() || String(profile.employee_id || profile.employeeId || user.email || 'User'),
        employee_id: String(profile.employee_id || profile.employeeId || profile.staff_id || profile.staffId || '').trim(),
        role: normalizeRole(profile.role || profile.Role || profile.user_role || profile.userRole || 'staff'),
        department: normalizeDepartmentValue(profile.department_code || profile.department || profile.department_name || profile.departmentName || 'MOD', 'MOD'),
        position: String(profile.position || profile.Position || profile.job_title || profile.jobTitle || '').trim(),
        is_active: profile.is_active === false || profile.isActive === false ? false : true,
      };
      if (normalizedProfile.is_active === false) {
        setAuthStatus(txt('บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อ Admin', 'This account is inactive. Please contact an admin.'), 'error');
        try { await fb.sdk.signOut(fb.auth); } catch (_) {}
        resetSignedOutState();
        return false;
      }
      state.currentUser = { uid: user.uid, password_change_required: false, temporary_password_issued_at: null, temporary_password_issued_by_uid: '', ...profile, ...normalizedProfile };
      hydrateFastDashboardCache();
      renderAll();

      stopIssueSync();
      stopIssueCommentsSync();
      stopTemplatesSync();
      stopChecklistRunsSync();
      stopUsersSync();
      stopUsageLogsSync();
      startTemplatesSync();
      startChecklistRunsSync();
      startIssuesSync();
      startUsersSync();
      startUsageLogsSync();

      // Do not block first dashboard paint while writing last_login_at.
      Promise.resolve().then(() => fb.sdk.updateDoc(userRef, {
        last_login_at: fb.sdk.serverTimestamp(),
        updated_at: fb.sdk.serverTimestamp()
      })).catch(() => {});

      const needsTempPasswordChange = !!profile.password_change_required;
      setAuthStatus(
        needsTempPasswordChange
          ? txt('เข้าสู่ระบบสำเร็จ • กรุณาเปลี่ยนรหัสผ่านชั่วคราวก่อนใช้งานต่อ', 'Signed in. Please change your temporary password before continuing.')
          : txt('เข้าสู่ระบบสำเร็จ', 'Signed in successfully'),
        needsTempPasswordChange ? 'info' : 'success'
      );
      state.ui.didInitialMentionCheck = false;
      state.ui.didDepartmentPendingAlert = false;
      state.ui.alertModalMode = '';
      renderAll();
      if (needsTempPasswordChange) {
        setTimeout(() => openPasswordEditorModal('force'), 120);
      }
      return true;
    } catch (err) {
      console.error(err);
      setAuthStatus(describeFirebaseLoginError(err) || txt('โหลดข้อมูลผู้ใช้จาก Firestore ไม่สำเร็จ', 'Could not load the user profile from Firestore'), 'error');
      resetSignedOutState();
      return false;
    }
  }

  function bootstrapFirebaseAuth() {
    if (!isFirebaseLive() || state.firebaseAuthBound) return;
    state.firebaseAuthBound = true;

    const fb = window.LAYA_FIREBASE;
    fb.sdk.onAuthStateChanged(fb.auth, async (user) => {
      if (!user) {
        resetSignedOutState();
        return;
      }
      await finishFirebaseUserBootstrap(user, { source: 'listener' });
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
      registerPosition: qs('#registerPosition'),
      registerPassword: qs('#registerPassword'),
      registerConfirmPassword: qs('#registerConfirmPassword'),
      registerBtn: qs('#registerBtn'),
      showSignInTab: qs('#showSignInTab'),
      showRegisterTab: qs('#showRegisterTab'),
      signInPane: qs('#signInPane'),
      registerPane: qs('#registerPane'),
      authStatus: qs('#authStatus'),
      demoBox: qs('#demoBox'),
      openSettingsBtn: qs('#openSettingsBtn'),
      topbarAccountBtn: qs('#topbarAccountBtn'),
      topbarAvatar: qs('#topbarAvatar'),
      topbarAvatarImg: qs('#topbarAvatarImg'),
      topbarAvatarInitials: qs('#topbarAvatarInitials'),
      topbarAccountName: qs('#topbarAccountName'),
      topbarAccountMeta: qs('#topbarAccountMeta'),
      accountMenuWrap: qs('#accountMenuWrap'),
      accountMiniMenu: qs('#accountMiniMenu'),
      accountMiniAvatar: qs('#accountMiniAvatar'),
      accountMiniAvatarImg: qs('#accountMiniAvatarImg'),
      accountMiniAvatarInitials: qs('#accountMiniAvatarInitials'),
      accountMenuName: qs('#accountMenuName'),
      accountMenuMeta: qs('#accountMenuMeta'),
      accountMenuRoleBadge: qs('#accountMenuRoleBadge'),
      accountMenuDepartmentBadge: qs('#accountMenuDepartmentBadge'),
      accountMenuOpenTeamMembers: qs('#accountMenuOpenTeamMembers'),
      accountMenuOpenSettings: qs('#accountMenuOpenSettings'),
      accountMenuClearCache: qs('#accountMenuClearCache'),
      accountMenuLogout: qs('#accountMenuLogout'),
      clearCacheBtn: qs('#clearCacheBtn'),
      clearCacheBtnMore: qs('#clearCacheBtnMore'),
      logoutBtn: qs('#logoutBtn'),
      welcomeText: qs('#welcomeText'),
      summaryGrid: qs('#summaryGrid'),
      boardList: qs('#boardList'),
      boardSearch: qs('#boardSearch'),
      boardDateFilter: qs('#boardDateFilter'),
      boardDateClearBtn: qs('#boardDateClearBtn'),
      closedSearch: qs('#closedSearch'),
      closedDateFilter: qs('#closedDateFilter'),
      closedDateClearBtn: qs('#closedDateClearBtn'),
      closedSummaryFromDate: qs('#closedSummaryFromDate'),
      closedSummaryToDate: qs('#closedSummaryToDate'),
      closedSummarySearch: qs('#closedSummarySearch'),
      closedSummaryClearBtn: qs('#closedSummaryClearBtn'),
      closedSummaryTodayBtn: qs('#closedSummaryTodayBtn'),
      closedSummaryBackBtn: qs('#closedSummaryBackBtn'),
      closedSummaryStats: qs('#closedSummaryStats'),
      closedSummaryList: qs('#closedSummaryList'),
      boardFilterChips: qs('#boardFilterChips'),
      closedList: qs('#closedList'),
      openClosedSummaryBtn: qs('#openClosedSummaryBtn'),
      openClosedJobsBtn: qs('#openClosedJobsBtn'),
      openClosedJobsFromMore: qs('#openClosedJobsFromMore'),
      openUsageLogFromMore: qs('#openUsageLogFromMore'),
      openSettingsFromMore: qs('#openSettingsFromMore'),
      backToBoardBtn: qs('#backToBoardBtn'),
      issueTitle: qs('#issueTitle'),
      issueDescription: qs('#issueDescription'),
      issueType: qs('#issueType'),
      issueLocation: qs('#issueLocation'),
      issueDepartment: qs('#issueDepartment'),
      issuePhotoInput: qs('#issuePhotoInput'),
      issuePhotoCameraInput: qs('#issuePhotoCameraInput'),
      issuePhotoGalleryPickBtn: qs('#issuePhotoGalleryPickBtn'),
      issuePhotoCameraPickBtn: qs('#issuePhotoCameraPickBtn'),
      issuePhotoHint: qs('#issuePhotoHint'),
      issuePhotoPreviewGrid: qs('#issuePhotoPreviewGrid'),
      issueCoverPhotoInput: qs('#issueCoverPhotoInput'),
      issueCoverPhotoCameraInput: qs('#issueCoverPhotoCameraInput'),
      issueCoverPhotoGalleryPickBtn: qs('#issueCoverPhotoGalleryPickBtn'),
      issueCoverPhotoCameraPickBtn: qs('#issueCoverPhotoCameraPickBtn'),
      issueCoverPhotoHint: qs('#issueCoverPhotoHint'),
      issueCoverPhotoPreviewGrid: qs('#issueCoverPhotoPreviewGrid'),
      issueVideoInput: qs('#issueVideoInput'),
      issueVideoCameraInput: qs('#issueVideoCameraInput'),
      issueVideoGalleryPickBtn: qs('#issueVideoGalleryPickBtn'),
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
      usageLogList: qs('#usageLogList'),
      logSearch: qs('#logSearch'),
      reloadUsageLogBtn: qs('#reloadUsageLogBtn'),
      exportUsageLogExcelBtn: qs('#exportUsageLogExcelBtn'),
      issueModal: qs('#issueModal'),
      issueModalContent: qs('#issueModalContent'),
      mediaPreviewModal: qs('#mediaPreviewModal'),
      mediaPreviewBody: qs('#mediaPreviewBody'),
      mediaPreviewTitle: qs('#mediaPreviewTitle'),
      mediaPreviewMeta: qs('#mediaPreviewMeta'),
      mediaPreviewDescription: qs('#mediaPreviewDescription'),
      mediaPreviewOpenDetailBtn: qs('#mediaPreviewOpenDetailBtn'),
      mediaPreviewPrevBtn: qs('#mediaPreviewPrevBtn'),
      mediaPreviewNextBtn: qs('#mediaPreviewNextBtn'),
      mediaPreviewCounter: qs('#mediaPreviewCounter'),
      closeMediaPreviewModalBtn: qs('#closeMediaPreviewModalBtn'),
      mentionAlertModal: qs('#mentionAlertModal'),
      mentionAlertModalContent: qs('#mentionAlertModalContent'),
      closeMentionAlertModalBtn: qs('#closeMentionAlertModalBtn'),
      closeIssueModalBtn: qs('#closeIssueModalBtn'),
      exportJsonBtn: qs('#exportJsonBtn'),
      importJsonInput: qs('#importJsonInput'),
      seedDemoBtn: qs('#seedDemoBtn'),
      fabNewIssue: qs('#fabNewIssue'),
      modeBanner: qs('#modeBanner'),
      connectionBadge: qs('#connectionBadge'),
      teamMembersList: qs('#teamMembersList'),
      tempPasswordResultModal: qs('#tempPasswordResultModal'),
      closeTempPasswordResultModalBtn: qs('#closeTempPasswordResultModalBtn'),
      tempPasswordResultName: qs('#tempPasswordResultName'),
      tempPasswordResultValue: qs('#tempPasswordResultValue'),
      tempPasswordResultCopyBtn: qs('#tempPasswordResultCopyBtn'),
      userManagementModal: qs('#userManagementModal'),
      closeUserManagementModalBtn: qs('#closeUserManagementModalBtn'),
      cancelUserManagementBtn: qs('#cancelUserManagementBtn'),
      saveUserManagementBtn: qs('#saveUserManagementBtn'),
      userManagementName: qs('#userManagementName'),
      userManagementEmployeeId: qs('#userManagementEmployeeId'),
      userRoleEdit: qs('#userRoleEdit'),
      userDepartmentEdit: qs('#userDepartmentEdit'),
      userPositionEdit: qs('#userPositionEdit'),
      userActiveEdit: qs('#userActiveEdit'),
      userManagementStatus: qs('#userManagementStatus'),
      settingsAdminToolsPanel: qs('#settingsAdminToolsPanel'),
      openTeamMembersFromSettings: qs('#openTeamMembersFromSettings'),
      applyUserProfilePresetBtn: qs('#applyUserProfilePresetBtn'),
      standardizeDepartmentCodesBtn: qs('#standardizeDepartmentCodesBtn'),
      userProfilePresetStatus: qs('#userProfilePresetStatus'),
      settingsProfileAvatarPreview: qs('#settingsProfileAvatarPreview'),
      settingsProfileAvatarImg: qs('#settingsProfileAvatarImg'),
      settingsProfileInitials: qs('#settingsProfileInitials'),
      settingsProfileNameDisplay: qs('#settingsProfileNameDisplay'),
      settingsProfileMetaText: qs('#settingsProfileMetaText'),
      settingsRoleBadge: qs('#settingsRoleBadge'),
      settingsDepartmentBadge: qs('#settingsDepartmentBadge'),
      settingsAvatarInput: qs('#settingsAvatarInput'),
      settingsAvatarCameraInput: qs('#settingsAvatarCameraInput'),
      settingsAvatarPickBtn: qs('#settingsAvatarPickBtn'),
      settingsAvatarCameraBtn: qs('#settingsAvatarCameraBtn'),
      settingsAvatarRemoveBtn: qs('#settingsAvatarRemoveBtn'),
      settingsEmployeeId: qs('#settingsEmployeeId'),
      settingsRole: qs('#settingsRole'),
      settingsDepartment: qs('#settingsDepartment'),
      settingsPosition: qs('#settingsPosition'),
      settingsFullName: qs('#settingsFullName'),
      settingsFullNameReadout: qs('#settingsFullNameReadout'),
      openFullNameEditorBtn: qs('#openFullNameEditorBtn'),
      fullNameEditorModal: qs('#fullNameEditorModal'),
      closeFullNameEditorModalBtn: qs('#closeFullNameEditorModalBtn'),
      cancelFullNameEditorBtn: qs('#cancelFullNameEditorBtn'),
      saveFullNameEditorBtn: qs('#saveFullNameEditorBtn'),
      fullNameEditorInput: qs('#fullNameEditorInput'),
      settingsCurrentPassword: qs('#settingsCurrentPassword'),
      settingsNewPassword: qs('#settingsNewPassword'),
      settingsConfirmPassword: qs('#settingsConfirmPassword'),
      settingsProfileStatus: qs('#settingsProfileStatus'),
      settingsPasswordStatus: qs('#settingsPasswordStatus'),
      saveProfileSettingsBtn: qs('#saveProfileSettingsBtn'),
      openPasswordEditorBtn: qs('#openPasswordEditorBtn'),
      passwordEditorModal: qs('#passwordEditorModal'),
      passwordEditorTitle: qs('#passwordEditorTitle'),
      passwordEditorMessage: qs('#passwordEditorMessage'),
      passwordEditorCurrentField: qs('#passwordEditorCurrentField'),
      closePasswordEditorModalBtn: qs('#closePasswordEditorModalBtn'),
      cancelPasswordEditorBtn: qs('#cancelPasswordEditorBtn'),
      continuePasswordEditorBtn: qs('#continuePasswordEditorBtn'),
      passwordEditorCurrent: qs('#passwordEditorCurrent'),
      passwordEditorNew: qs('#passwordEditorNew'),
      passwordEditorConfirm: qs('#passwordEditorConfirm'),
      passwordConfirmModal: qs('#passwordConfirmModal'),
      passwordConfirmTitle: qs('#passwordConfirmTitle'),
      passwordConfirmMessage: qs('#passwordConfirmMessage'),
      closePasswordConfirmModalBtn: qs('#closePasswordConfirmModalBtn'),
      passwordConfirmAccount: qs('#passwordConfirmAccount'),
      passwordConfirmLength: qs('#passwordConfirmLength'),
      cancelPasswordChangeBtn: qs('#cancelPasswordChangeBtn'),
      confirmPasswordChangeBtn: qs('#confirmPasswordChangeBtn'),
    });

    populateDepartmentSelects();
  }

  function bindEvents() {
    bindAuthSurfaceControls();


  function bindAuthSurfaceControls() {
    if (!el.loginScreen || state.authSurfaceBound) return;
    state.authSurfaceBound = true;

    const authClickHandler = (event) => {
      const target = event.target.closest('button, [data-lang-btn], .demo-user');
      if (!target || !el.loginScreen.contains(target)) return;
      if (target.id === 'loginBtn') {
        event.preventDefault();
        handleLogin();
        return;
      }
      if (target.id === 'loginClearCacheBtn') {
        event.preventDefault();
        handleClearCache();
        return;
      }
      if (target.id === 'registerBtn') {
        event.preventDefault();
        handleRegister();
        return;
      }
      if (target.id === 'showSignInTab') {
        event.preventDefault();
        showAuthTab('signin');
        return;
      }
      if (target.id === 'showRegisterTab') {
        event.preventDefault();
        showAuthTab('register');
        return;
      }
      if (target.matches('[data-lang-btn]')) {
        event.preventDefault();
        setLanguage(target.dataset.langBtn || 'th');
        return;
      }
      if (target.classList.contains('demo-user')) {
        event.preventDefault();
        if (el.loginEmployeeId) el.loginEmployeeId.value = target.dataset.id || '';
        if (el.loginPassword) el.loginPassword.value = target.dataset.pass || '';
        handleLogin();
      }
    };

    el.loginScreen.addEventListener('click', authClickHandler, true);
    [el.loginEmployeeId, el.loginPassword].forEach((node) => {
      if (!node) return;
      node.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleLogin();
        }
      });
    });
  }
    if (el.openSettingsBtn) el.openSettingsBtn.addEventListener('click', () => switchView('settingsView'));
    if (el.topbarAccountBtn) el.topbarAccountBtn.addEventListener('click', handleToggleAccountMenu);
    if (el.accountMenuOpenTeamMembers) el.accountMenuOpenTeamMembers.addEventListener('click', handleOpenTeamMembersShortcut);
    if (el.accountMenuOpenSettings) el.accountMenuOpenSettings.addEventListener('click', handleOpenSettingsFromAccountMenu);
    if (el.clearCacheBtn) el.clearCacheBtn.addEventListener('click', handleClearCache);
    if (el.clearCacheBtnMore) el.clearCacheBtnMore.addEventListener('click', handleClearCache);
    if (el.accountMenuClearCache) el.accountMenuClearCache.addEventListener('click', handleClearCache);
    if (el.logoutBtn) el.logoutBtn.addEventListener('click', handleLogout);
    if (el.accountMenuLogout) el.accountMenuLogout.addEventListener('click', handleLogout);
    document.addEventListener('click', handleDocumentClickForAccountMenu);
    document.addEventListener('keydown', handleGlobalKeydown);
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-lang-btn]');
      if (!target) return;
      if (el.loginScreen && el.loginScreen.contains(target)) return; // handled by authClickHandler
      event.preventDefault();
      setLanguage(target.dataset.langBtn || 'th');
    });
    if (el.registerRole) el.registerRole.addEventListener('change', syncRegisterRoleDepartment);
    qsa('.nav-link').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
    el.fabNewIssue.addEventListener('click', () => switchView('newIssueView'));
    el.boardSearch.addEventListener('input', (e) => {
      state.ui.boardSearch = e.target.value.trim().toLowerCase();
      renderBoard();
    });
    if (el.boardDateFilter) el.boardDateFilter.addEventListener('change', (e) => {
      state.ui.boardDateFilter = e.target.value || '';
      renderBoard();
    });
    if (el.boardDateClearBtn) el.boardDateClearBtn.addEventListener('click', () => {
      state.ui.boardDateFilter = '';
      if (el.boardDateFilter) el.boardDateFilter.value = '';
      renderBoard();
    });
    if (el.closedSearch) el.closedSearch.addEventListener('input', (e) => {
      state.ui.closedSearch = e.target.value.trim().toLowerCase();
      renderClosedJobs();
    });
    if (el.closedDateFilter) el.closedDateFilter.addEventListener('change', (e) => {
      state.ui.closedDateFilter = e.target.value || '';
      renderClosedJobs();
    });
    if (el.closedDateClearBtn) el.closedDateClearBtn.addEventListener('click', () => {
      state.ui.closedDateFilter = '';
      if (el.closedDateFilter) el.closedDateFilter.value = '';
      renderClosedJobs();
    });
    if (el.closedSummaryFromDate) el.closedSummaryFromDate.addEventListener('change', (e) => {
      state.ui.closedSummaryFromDate = e.target.value || '';
      renderClosedSummary();
    });
    if (el.closedSummaryToDate) el.closedSummaryToDate.addEventListener('change', (e) => {
      state.ui.closedSummaryToDate = e.target.value || '';
      renderClosedSummary();
    });
    if (el.closedSummarySearch) el.closedSummarySearch.addEventListener('input', (e) => {
      state.ui.closedSummarySearch = e.target.value.trim().toLowerCase();
      renderClosedSummary();
    });
    if (el.closedSummaryClearBtn) el.closedSummaryClearBtn.addEventListener('click', () => {
      state.ui.closedSummaryFromDate = '';
      state.ui.closedSummaryToDate = '';
      state.ui.closedSummarySearch = '';
      if (el.closedSummaryFromDate) el.closedSummaryFromDate.value = '';
      if (el.closedSummaryToDate) el.closedSummaryToDate.value = '';
      if (el.closedSummarySearch) el.closedSummarySearch.value = '';
      renderClosedSummary();
    });
    if (el.closedSummaryTodayBtn) el.closedSummaryTodayBtn.addEventListener('click', () => {
      const today = todayInputValue();
      state.ui.closedSummaryFromDate = today;
      state.ui.closedSummaryToDate = today;
      if (el.closedSummaryFromDate) el.closedSummaryFromDate.value = today;
      if (el.closedSummaryToDate) el.closedSummaryToDate.value = today;
      renderClosedSummary();
    });
    if (el.closedSummaryBackBtn) el.closedSummaryBackBtn.addEventListener('click', () => switchView('closedView'));
    if (el.logSearch) el.logSearch.addEventListener('input', (e) => {
      state.ui.logSearch = e.target.value.trim().toLowerCase();
      renderUsageLogs();
    });
    if (el.reloadUsageLogBtn) el.reloadUsageLogBtn.addEventListener('click', () => reloadUsageLogs());
    if (el.exportUsageLogExcelBtn) el.exportUsageLogExcelBtn.addEventListener('click', () => exportUsageLogsToExcel());
    if (el.openClosedJobsBtn) el.openClosedJobsBtn.addEventListener('click', () => switchView('closedView'));
    if (el.openClosedSummaryBtn) el.openClosedSummaryBtn.addEventListener('click', () => switchView('closedSummaryView'));
    if (el.openClosedJobsFromMore) el.openClosedJobsFromMore.addEventListener('click', () => switchView('closedView'));
    if (el.openUsageLogFromMore) el.openUsageLogFromMore.addEventListener('click', () => switchView('logView'));
    if (el.openSettingsFromMore) el.openSettingsFromMore.addEventListener('click', () => switchView('settingsView'));
    if (el.openTeamMembersFromSettings) el.openTeamMembersFromSettings.addEventListener('click', handleOpenTeamMembersShortcut);
    if (el.applyUserProfilePresetBtn) el.applyUserProfilePresetBtn.addEventListener('click', applyHodProfilePreset);
    if (el.standardizeDepartmentCodesBtn) el.standardizeDepartmentCodesBtn.addEventListener('click', applyDepartmentCodeStandardization);
    if (el.backToBoardBtn) el.backToBoardBtn.addEventListener('click', () => switchView('boardView'));
    el.boardFilterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.ui.boardFilter = chip.dataset.filter;
      qsa('.chip', el.boardFilterChips).forEach(c => c.classList.toggle('active', c === chip));
      renderBoard();
    });
    if (el.issuePhotoInput) el.issuePhotoInput.addEventListener('change', handleIssuePhotoPicked);
    if (el.issuePhotoCameraInput) el.issuePhotoCameraInput.addEventListener('change', handleIssuePhotoPicked);
    if (el.issuePhotoGalleryPickBtn) el.issuePhotoGalleryPickBtn.addEventListener('click', () => { if (el.issuePhotoInput) el.issuePhotoInput.value = ''; });
    if (el.issuePhotoCameraPickBtn) el.issuePhotoCameraPickBtn.addEventListener('click', () => { if (el.issuePhotoCameraInput) el.issuePhotoCameraInput.value = ''; });
    if (el.issueCoverPhotoInput) el.issueCoverPhotoInput.addEventListener('change', handleIssueCoverPhotoPicked);
    if (el.issueCoverPhotoCameraInput) el.issueCoverPhotoCameraInput.addEventListener('change', handleIssueCoverPhotoPicked);
    if (el.issueCoverPhotoGalleryPickBtn) el.issueCoverPhotoGalleryPickBtn.addEventListener('click', () => { if (el.issueCoverPhotoInput) el.issueCoverPhotoInput.value = ''; });
    if (el.issueCoverPhotoCameraPickBtn) el.issueCoverPhotoCameraPickBtn.addEventListener('click', () => { if (el.issueCoverPhotoCameraInput) el.issueCoverPhotoCameraInput.value = ''; });
    if (el.issueVideoInput) el.issueVideoInput.addEventListener('change', handleIssueVideoPicked);
    if (el.issueVideoCameraInput) el.issueVideoCameraInput.addEventListener('change', handleIssueVideoPicked);
    if (el.issueVideoGalleryPickBtn) el.issueVideoGalleryPickBtn.addEventListener('click', () => { if (el.issueVideoInput) el.issueVideoInput.value = ''; });
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
    if (el.closeMediaPreviewModalBtn) el.closeMediaPreviewModalBtn.addEventListener('click', closeMediaPreviewModal);
    if (el.mediaPreviewPrevBtn) el.mediaPreviewPrevBtn.addEventListener('click', showPrevMediaPreviewItem);
    if (el.mediaPreviewNextBtn) el.mediaPreviewNextBtn.addEventListener('click', showNextMediaPreviewItem);
    if (el.mediaPreviewBody) {
      el.mediaPreviewBody.addEventListener('touchstart', handleMediaPreviewTouchStart, { passive: true });
      el.mediaPreviewBody.addEventListener('touchend', handleMediaPreviewTouchEnd, { passive: true });
    }
    if (el.mediaPreviewModal) el.mediaPreviewModal.addEventListener('click', (e) => {
      if (e.target.dataset.closeMediaPreviewModal) closeMediaPreviewModal();
    });
    if (el.mediaPreviewOpenDetailBtn) el.mediaPreviewOpenDetailBtn.addEventListener('click', () => {
      const issueId = state.ui.mediaPreviewIssueId;
      closeMediaPreviewModal();
      if (issueId) openIssueModal(issueId);
    });
    if (el.closeMentionAlertModalBtn) el.closeMentionAlertModalBtn.addEventListener('click', () => closeMentionAlertModal());
    if (el.mentionAlertModal) el.mentionAlertModal.addEventListener('click', (e) => {
      if (e.target.dataset.closeMentionModal) closeMentionAlertModal();
    });
    el.exportJsonBtn.addEventListener('click', exportLocalJson);
    el.importJsonInput.addEventListener('change', importLocalJson);
    el.seedDemoBtn.addEventListener('click', () => {
      if (!confirm('Reset demo data?')) return;
      seedDemoData();
      persist();
      renderAll();
    });
    if (el.saveProfileSettingsBtn) el.saveProfileSettingsBtn.addEventListener('click', handleSaveProfileSettings);
    if (el.openFullNameEditorBtn) el.openFullNameEditorBtn.addEventListener('click', openFullNameEditorModal);
    if (el.closeFullNameEditorModalBtn) el.closeFullNameEditorModalBtn.addEventListener('click', () => closeFullNameEditorModal());
    if (el.cancelFullNameEditorBtn) el.cancelFullNameEditorBtn.addEventListener('click', () => closeFullNameEditorModal());
    if (el.saveFullNameEditorBtn) el.saveFullNameEditorBtn.addEventListener('click', saveFullNameFromModal);
    if (el.settingsFullName) el.settingsFullName.addEventListener('input', renderSettingsAvatar);
    if (el.openPasswordEditorBtn) el.openPasswordEditorBtn.addEventListener('click', openPasswordEditorModal);
    if (el.closePasswordEditorModalBtn) el.closePasswordEditorModalBtn.addEventListener('click', () => closePasswordEditorModal());
    if (el.cancelPasswordEditorBtn) el.cancelPasswordEditorBtn.addEventListener('click', () => closePasswordEditorModal());
    if (el.continuePasswordEditorBtn) el.continuePasswordEditorBtn.addEventListener('click', handlePasswordEditorContinue);
    if (el.settingsAvatarInput) el.settingsAvatarInput.addEventListener('change', handleProfileAvatarPicked);
    if (el.settingsAvatarCameraInput) el.settingsAvatarCameraInput.addEventListener('change', handleProfileAvatarPicked);
    if (el.settingsAvatarPickBtn) el.settingsAvatarPickBtn.addEventListener('click', () => { if (el.settingsAvatarInput) el.settingsAvatarInput.value = ''; });
    if (el.settingsAvatarCameraBtn) el.settingsAvatarCameraBtn.addEventListener('click', () => { if (el.settingsAvatarCameraInput) el.settingsAvatarCameraInput.value = ''; });
    if (el.settingsAvatarRemoveBtn) el.settingsAvatarRemoveBtn.addEventListener('click', handleRemoveProfileAvatar);
    if (el.teamMembersList) el.teamMembersList.addEventListener('click', handleTeamMemberListClick);
    if (el.closeUserManagementModalBtn) el.closeUserManagementModalBtn.addEventListener('click', () => closeUserManagementModal());
    if (el.cancelUserManagementBtn) el.cancelUserManagementBtn.addEventListener('click', () => closeUserManagementModal());
    if (el.saveUserManagementBtn) el.saveUserManagementBtn.addEventListener('click', saveUserManagementChanges);
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-user-management-modal]')) closeUserManagementModal();
    });
    if (el.closeTempPasswordResultModalBtn) el.closeTempPasswordResultModalBtn.addEventListener('click', closeTempPasswordResultModal);
    if (el.tempPasswordResultCopyBtn) el.tempPasswordResultCopyBtn.addEventListener('click', copyTempPasswordFromModal);
    if (el.tempPasswordResultModal) {
      el.tempPasswordResultModal.addEventListener('click', event => {
        if (event.target?.matches?.('[data-close-temp-password-modal="true"]')) closeTempPasswordResultModal();
      });
    }
    if (el.closePasswordConfirmModalBtn) el.closePasswordConfirmModalBtn.addEventListener('click', closePasswordConfirmModal);
    if (el.cancelPasswordChangeBtn) el.cancelPasswordChangeBtn.addEventListener('click', closePasswordConfirmModal);
    if (el.confirmPasswordChangeBtn) el.confirmPasswordChangeBtn.addEventListener('click', confirmPasswordChange);
    if (el.passwordConfirmModal) el.passwordConfirmModal.addEventListener('click', (e) => { if (e.target.dataset.closePasswordModal) closePasswordConfirmModal(); });
    if (el.addChecklistTemplateBtn) {
      el.addChecklistTemplateBtn.addEventListener('click', openChecklistTemplateBuilder);
    }
  }

  async function loadTemplates() {
    let loadedTemplates = [];
    try {
      const versionKey = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1';
      const res = await fetch(`./data/checklist_templates.json?v=${encodeURIComponent(versionKey)}`, { cache: 'default' });
      if (!res.ok) throw new Error(`template_fetch_failed_${res.status}`);
      const data = await res.json();
      loadedTemplates = Array.isArray(data?.templates) ? data.templates : [];
    } catch (err) {
      console.error('Failed to load checklist templates', err);
    }

    if (!Array.isArray(loadedTemplates) || !loadedTemplates.length) {
      console.warn('Using embedded fallback checklist templates');
      loadedTemplates = Array.isArray(FALLBACK_CHECKLIST_TEMPLATES) ? safeClone(FALLBACK_CHECKLIST_TEMPLATES) : [];
    }

    state.data.baseTemplates = Array.isArray(loadedTemplates) ? loadedTemplates : [];
    mergeTemplates();
    if (!Array.isArray(state.data.templates) || !state.data.templates.length) {
      state.data.baseTemplates = Array.isArray(FALLBACK_CHECKLIST_TEMPLATES) ? safeClone(FALLBACK_CHECKLIST_TEMPLATES) : [];
      mergeTemplates();
    }
  }

  function mergeTemplates() {
    const map = new Map();
    const baseCodes = new Set();
    (state.data.baseTemplates || []).forEach(t => {
      if (t?.template_code) {
        baseCodes.add(t.template_code);
        map.set(t.template_code, { ...t, _templateScope: 'base' });
      }
    });
    (state.data.customTemplates || []).forEach(t => {
      if (!t?.template_code) return;
      if (baseCodes.has(t.template_code)) return;
      map.set(t.template_code, { ...t, _templateScope: 'custom' });
    });
    state.data.templates = Array.from(map.values()).sort((a, b) => String(a.template_name || '').localeCompare(String(b.template_name || '')));
  }

  function isTemplateHidden(templateCode) {
    return (state.ui.hiddenTemplateCodes || []).includes(templateCode);
  }

  function isBaseTemplate(template) {
    return template?._templateScope === 'base';
  }

  function isCustomTemplate(template) {
    return template?._templateScope === 'custom';
  }

  function canDeleteCustomTemplate(template) {
    if (!isCustomTemplate(template) || !state.currentUser) return false;
    return state.currentUser.role === 'admin' || template.created_by_uid === state.currentUser.uid;
  }

  function setTemplateHidden(templateCode, hidden) {
    const current = new Set(state.ui.hiddenTemplateCodes || []);
    if (hidden) current.add(templateCode);
    else current.delete(templateCode);
    state.ui.hiddenTemplateCodes = Array.from(current);
    saveHiddenTemplateCodes(state.ui.hiddenTemplateCodes);
  }

  function getVisibleTemplates() {
    const templates = state.data.templates || [];
    const visible = templates.filter(template => !isTemplateHidden(template.template_code));
    if (!visible.length && templates.length) {
      const hiddenCodes = state.ui.hiddenTemplateCodes || [];
      if (hiddenCodes.length >= templates.length) {
        state.ui.hiddenTemplateCodes = [];
        saveHiddenTemplateCodes([]);
        return templates;
      }
    }
    return visible;
  }

  function getHiddenTemplates() {
    const visibleCodes = new Set(getVisibleTemplates().map(template => template.template_code));
    return (state.data.templates || []).filter(template => !visibleCodes.has(template.template_code));
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


  function getFastDashboardCacheKey() {
    const uid = state.currentUser?.uid || window.LAYA_FIREBASE?.auth?.currentUser?.uid || 'anonymous';
    return `${APP_KEY}_fast_dashboard_${uid}`;
  }

  function normalizeCachedIssue(issue) {
    if (!issue || typeof issue !== 'object') return null;
    return {
      id: issue.id || '',
      issue_no: issue.issue_no || '',
      title: issue.title || '',
      description: issue.description || '',
      issue_type: issue.issue_type || 'other',
      priority: issue.priority || 'medium',
      status: issue.status || 'open',
      assigned_department: normalizeDepartmentValue(issue.assigned_department, ''),
      location_text: issue.location_text || '',
      reported_by_uid: issue.reported_by_uid || '',
      reported_by_name: issue.reported_by_name || '',
      reported_by_department: normalizeDepartmentValue(issue.reported_by_department, ''),
      closed_by_name: issue.closed_by_name || '',
      comment_count: issue.comment_count || 0,
      cover_thumb_url: issue.cover_thumb_url || '',
      cover_photo_url: issue.cover_photo_url || '',
      before_photos: [],
      before_videos: [],
      after_photos: [],
      after_videos: [],
      created_at: normalizeDateValue(issue.created_at),
      updated_at: normalizeDateValue(issue.updated_at),
      last_activity_at: normalizeDateValue(issue.last_activity_at),
      last_comment_at: normalizeDateValue(issue.last_comment_at),
      closed_at: normalizeDateValue(issue.closed_at),
      comments: [],
      __fromFastCache: true,
    };
  }

  function normalizeCachedChecklistRun(run) {
    if (!run || typeof run !== 'object') return null;
    return {
      id: run.id || '',
      run_no: run.run_no || '',
      template_code: run.template_code || '',
      template_name: run.template_name || '',
      template_name_th: run.template_name_th || '',
      status: run.status || 'submitted',
      inspector_uid: run.inspector_uid || '',
      inspector_name: run.inspector_name || '',
      inspector_department: run.inspector_department || '',
      inspection_date: run.inspection_date || '',
      location_text: run.location_text || '',
      total_items: run.total_items || 0,
      pass_count: run.pass_count || 0,
      fail_count: run.fail_count || 0,
      na_count: run.na_count || 0,
      issue_count: run.issue_count || 0,
      answers: [],
      special_form_entries: [],
      created_at: normalizeDateValue(run.created_at),
      updated_at: normalizeDateValue(run.updated_at),
      submitted_at: normalizeDateValue(run.submitted_at),
      __fromFastCache: true,
    };
  }

  function hydrateFastDashboardCache() {
    if (!state.currentUser || !window.LAYA_FIREBASE_CONFIG_PRESENT) return false;
    try {
      const raw = localStorage.getItem(getFastDashboardCacheKey());
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const savedAt = parsed?.saved_at ? Date.parse(parsed.saved_at) : 0;
      if (!savedAt || Date.now() - savedAt > FAST_DASHBOARD_CACHE_MAX_AGE_MS) {
        localStorage.removeItem(getFastDashboardCacheKey());
        return false;
      }
      const cachedIssues = Array.isArray(parsed.issues) ? parsed.issues.map(normalizeCachedIssue).filter(Boolean) : [];
      const cachedRuns = Array.isArray(parsed.checklistRuns) ? parsed.checklistRuns.map(normalizeCachedChecklistRun).filter(Boolean) : [];
      if (!cachedIssues.length && !cachedRuns.length) return false;
      if (!state.data.issues.length) state.data.issues = cachedIssues;
      if (!state.data.checklistRuns.length) state.data.checklistRuns = cachedRuns;
      state.ui.fastDashboardCacheActive = true;
      state.ui.fastDashboardCacheTime = parsed.saved_at || '';
      return true;
    } catch (err) {
      console.warn('Fast dashboard cache hydrate skipped', err);
      return false;
    }
  }

  function persistFastDashboardCache() {
    if (!state.currentUser || !window.LAYA_FIREBASE_CONFIG_PRESENT) return;
    try {
      const issues = (state.data.issues || [])
        .filter(Boolean)
        .slice(0, PERF_LIMITS.fastCacheIssues)
        .map(normalizeCachedIssue)
        .filter(Boolean);
      const checklistRuns = (state.data.checklistRuns || [])
        .filter(Boolean)
        .slice(0, PERF_LIMITS.fastCacheChecklistRuns)
        .map(normalizeCachedChecklistRun)
        .filter(Boolean);
      localStorage.setItem(getFastDashboardCacheKey(), JSON.stringify({
        saved_at: new Date().toISOString(),
        issues,
        checklistRuns,
      }));
      state.ui.fastDashboardCacheActive = false;
      state.ui.fastDashboardCacheTime = '';
    } catch (err) {
      console.warn('Fast dashboard cache save skipped', err);
    }
  }

  function isIssueSyncLoading() {
    return !!state.currentUser && window.LAYA_FIREBASE_CONFIG_PRESENT && (state.ui.issueSyncStatus === 'idle' || state.ui.issueSyncStatus === 'loading');
  }

  function isBoardDataLoading() {
    const checklistMayLoad = typeof canUseChecklistForRole === 'function' ? canUseChecklistForRole() : true;
    const checklistLoading = checklistMayLoad && !!state.currentUser && window.LAYA_FIREBASE_CONFIG_PRESENT && (state.ui.checklistSyncStatus === 'idle' || state.ui.checklistSyncStatus === 'loading');
    return isIssueSyncLoading() || checklistLoading;
  }
  function persist() {
    // Firebase is the source of truth in production. Do not keep the full board/checklist
    // payload in localStorage because old phones quickly hit the 5MB browser quota,
    // especially when checklist answers temporarily contain image/video previews.
    if (isFirebaseLive()) {
      try { localStorage.removeItem(APP_KEY); } catch (err) { console.warn('Persist cleanup skipped', err); }
      return;
    }

    const payload = buildLocalPersistPayload();

    if (tryPersistPayload(payload)) return;

    console.warn('Persist failed, retrying with compact payload');
    const compact = {
      ...payload,
      data: stripInlinePhotosFromData(payload.data),
    };
    if (tryPersistPayload(compact)) return;

    console.warn('Persist failed again, saving minimum local state only');
    const minimum = {
      currentUser: payload.currentUser || null,
      data: {
        counters: payload.data?.counters || { issue: 0, checklist: 0 },
        customTemplates: Array.isArray(payload.data?.customTemplates) ? payload.data.customTemplates : [],
        issues: [],
        checklistRuns: [],
        activity: [],
        teamMembers: [],
        usageLogs: [],
      }
    };
    if (!tryPersistPayload(minimum)) {
      try { localStorage.removeItem(APP_KEY); } catch (_) {}
    }
  }

  function buildLocalPersistPayload() {
    return {
      currentUser: isFirebaseLive() ? null : state.currentUser,
      data: {
        ...state.data,
        templates: undefined,
        baseTemplates: undefined,
        checklistRuns: sanitizeChecklistRunsForStorage(state.data.checklistRuns || []),
      }
    };
  }

  function tryPersistPayload(payload) {
    try {
      localStorage.setItem(APP_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.warn('Persist payload failed', err);
      return false;
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
      checklistRuns: sanitizeChecklistRunsForStorage(data.checklistRuns || []),
      activity: (data.activity || []).slice(0, 100),
      usageLogs: (data.usageLogs || []).slice(0, 100),
    };
  }

  function sanitizeChecklistRunsForStorage(runs = []) {
    return (Array.isArray(runs) ? runs : []).map(run => ({
      ...run,
      answers: sanitizeChecklistAnswersForStorage(run.answers || []),
    }));
  }

  function sanitizeChecklistAnswersForStorage(answers = []) {
    return (Array.isArray(answers) ? answers : []).map(answer => {
      const source = answer || {};
      const clean = { ...source };
      const media = source.fail_media || {};
      const photoCount = Array.isArray(media.photos) ? media.photos.length : 0;
      const videoCount = media.video ? 1 : 0;
      delete clean.fail_media;
      if (photoCount || videoCount) {
        clean.fail_media_count = { photos: photoCount, videos: videoCount };
      }
      return clean;
    });
  }

  function isInlineDataUrl(value) {
    return typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('data:video/'));
  }

  async function handleLogin() {
    const employeeId = el.loginEmployeeId.value.trim();
    const password = el.loginPassword.value.trim();
    if (!employeeId || !password) {
      setAuthStatus(txt('กรุณาใส่ Employee ID และ Password', 'Please enter Employee ID and Password'), 'error');
      return;
    }

    setAuthStatus(txt('กำลังเตรียมแอพและล้างแคชเก่า...', 'Preparing app and clearing old cache...'), 'info');
    await clearBrowserCachesSilentlyForLogin();

    if (isFirebaseLive()) {
      try {
        setAuthStatus(txt('กำลังเข้าสู่ระบบ...', 'Signing in...'), 'info');
        const fb = window.LAYA_FIREBASE;
        const cred = await fb.sdk.signInWithEmailAndPassword(fb.auth, employeeIdToEmail(employeeId), password);
        const authUser = cred?.user || fb.auth.currentUser;
        if (authUser) {
          const ok = await finishFirebaseUserBootstrap(authUser, { source: 'direct_login' });
          if (!ok) return;
        }
      } catch (err) {
        console.error(err);
        setAuthStatus(describeFirebaseLoginError(err), 'error');
      }
      return;
    }

    if (isFirebaseConfiguredButUnavailable()) {
      setAuthStatus(describeFirebaseUnavailable(), 'error');
      return;
    }

    const user = DEMO_USERS.find(u => u.employee_id === employeeId && u.password === password);
    if (!user) {
      alert(txt('Employee ID หรือ Password ไม่ถูกต้อง', 'Employee ID or Password is incorrect'));
      return;
    }
    state.currentUser = { ...user, department: normalizeDepartmentValue(user.department, 'MOD') };
    recordUsageLogLocal({
      category: 'auth',
      action: 'login',
      title: 'Signed in',
      text: `${user.full_name} signed in`,
      user_uid: user.uid,
      user_name: user.full_name,
      ref_no: user.employee_id,
    });
    persist();
    renderAuthState();
    renderAll();
    queueDepartmentPendingAlertCheck();
    queueMentionAlertCheck();
  }

  async function handleRegister() {
    if (!isFirebaseLive()) {
      setAuthStatus('ต้องเชื่อม Firebase ให้พร้อมก่อนจึงจะสมัครสมาชิกได้', 'error');
      return;
    }

    const employeeId = el.registerEmployeeId.value.trim();
    const fullName = el.registerFullName.value.trim();
    const role = 'staff';
    const department = normalizeDepartmentValue(el.registerDepartment?.value, 'ENG');
    const position = String(el.registerPosition?.value || '').trim() || getRoleName(role);
    const password = el.registerPassword.value.trim();
    const confirmPassword = el.registerConfirmPassword.value.trim();

    if (!employeeId || !fullName || !password || !confirmPassword) {
      setAuthStatus('กรุณากรอกข้อมูลสมัครสมาชิกให้ครบ', 'error');
      return;
    }
    if (!department || !WORK_DEPARTMENT_CODES.includes(department)) {
      setAuthStatus(txt('กรุณาเลือกแผนก', 'Please choose a department'), 'error');
      return;
    }
    if (password.length < 6) {
      setAuthStatus(txt('รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร', 'Password must be at least 6 characters'), 'error');
      return;
    }
    if (password !== confirmPassword) {
      setAuthStatus(txt('Confirm Password ไม่ตรงกัน', 'Confirm Password does not match'), 'error');
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
      recordUsageLog({
        category: 'auth',
        action: 'register',
        title: 'Created account',
        text: `${fullName} created ${getRoleName(role)} account in ${getDepartmentName(department)}`,
        user_uid: cred.user.uid,
        user_name: fullName,
        ref_no: employeeId,
      });

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

  async function handleClearCache() {
    const message = txt(
      'ระบบจะล้างแคชของเว็บ, ซ่อนเทมเพลต, แจ้งเตือนที่เคยอ่าน, ข้อมูล session ชั่วคราว และรีโหลดหน้าใหม่\n\nข้อมูลใน Firebase จะไม่หาย\nข้อมูลโหมด Local Demo จะยังอยู่ ยกเว้นแคชชั่วคราวของหน้าเว็บ',
      'This will clear the web cache, hidden templates, seen mention alerts, temporary session data, and reload the page.\n\nFirebase data will not be deleted.\nLocal demo data will stay, except temporary web cache.'
    );

    if (!window.confirm(message)) return;

    const buttons = [el.clearCacheBtn, el.clearCacheBtnMore].filter(Boolean);
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.textContent = txt('กำลังล้างแคช...', 'Clearing...');
    });

    try {
      try {
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }
      } catch (cacheErr) {
        console.warn('CacheStorage clear failed', cacheErr);
      }

      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
        }
      } catch (swErr) {
        console.warn('Service worker unregister failed', swErr);
      }

      try { sessionStorage.clear(); } catch (_) {}

      try {
        const savedLang = currentLang();
        const localKeys = Object.keys(localStorage || {});
        localKeys.forEach((key) => {
          if (key === LANG_KEY) return;
          if (key === APP_KEY && !isFirebaseLive()) return;
          if (key === APP_KEY || key === HIDDEN_TEMPLATE_KEY || key.startsWith(`${APP_KEY}_mention_seen_`) || key.startsWith('workbox-') || key.startsWith('sw-') || key.startsWith('cache-')) {
            localStorage.removeItem(key);
          }
        });
        saveLanguagePreference(savedLang);
      } catch (storageErr) {
        console.warn('Local storage cleanup failed', storageErr);
      }

      state.ui.hiddenTemplateCodes = [];
      saveHiddenTemplateCodes([]);

      if (el.modeBanner) {
        el.modeBanner.textContent = txt('ล้างแคชแล้ว กำลังรีโหลด...', 'Cache cleared. Reloading...');
      }

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('cache_reset', String(Date.now()));
      window.location.replace(nextUrl.toString());
    } catch (err) {
      console.error(err);
      buttons.forEach(btn => {
        btn.disabled = false;
        btn.textContent = txt('ล้างแคช', 'Clear Cache');
      });
      window.alert(txt('ล้างแคชไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'Failed to clear cache. Please try again.'));
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
    stopUsersSync();
    stopUsageLogsSync();
    state.data.teamMembers = [];
    state.data.usageLogs = [];
    state.ui.didInitialMentionCheck = false;
    state.ui.didDepartmentPendingAlert = false;
    state.ui.alertModalMode = '';
    state.ui.pendingMentionItems = [];
    closeMentionAlertModal(true);
    closePasswordConfirmModal(true);
    persist();
    renderAuthState();
  }

  function renderAuthState() {
    const loggedIn = !!state.currentUser;
    el.loginScreen.classList.toggle('hidden', loggedIn);
    el.appShell.classList.toggle('hidden', !loggedIn);
    if (!loggedIn) {
      closeAccountMiniMenu(true);
      return;
    }
    const teamName = state.currentUser.department ? getDepartmentName(normalizeDepartmentValue(state.currentUser.department, 'MOD')) : 'MOD';
    el.welcomeText.textContent = `${state.currentUser.full_name} • ${teamName} ${txt('ทีม', 'Team')}`;
    renderTopbarAccount();
    renderTeamMembers();
    renderSettingsView();
  }

  function renderTopbarAccount() {
    const user = state.currentUser;
    if (!user) return;
    const fullName = String(user.full_name || txt('บัญชีของฉัน', 'My Account'));
    const employeeId = String(user.employee_id || '-');
    const roleName = getRoleName(user.role || 'staff');
    const departmentName = getDepartmentName(normalizeDepartmentValue(user.department, 'MOD'));
    const avatarUrl = String(user.avatar_url || '');
    const initials = getUserInitials(fullName || 'M');
    if (el.topbarAccountName) el.topbarAccountName.textContent = fullName;
    if (el.topbarAccountMeta) el.topbarAccountMeta.textContent = `${departmentName} ${txt('ทีม', 'Team')}`;
    if (el.accountMenuName) el.accountMenuName.textContent = fullName;
    if (el.accountMenuMeta) el.accountMenuMeta.textContent = `${employeeId} • ${roleName}`;
    if (el.accountMenuRoleBadge) el.accountMenuRoleBadge.textContent = roleName;
    if (el.accountMenuDepartmentBadge) el.accountMenuDepartmentBadge.textContent = departmentName;
    if (el.topbarAvatarInitials) el.topbarAvatarInitials.textContent = initials;
    const newIssueInitials = qs('#newIssueUserInitials');
    const newIssueUserName = qs('#newIssueUserName');
    if (newIssueInitials) newIssueInitials.textContent = initials;
    if (newIssueUserName) newIssueUserName.textContent = fullName.split(' ')[0] || fullName;
    if (el.accountMiniAvatarInitials) el.accountMiniAvatarInitials.textContent = initials;
    const imagePairs = [
      [el.topbarAvatarImg, el.topbarAvatarInitials, el.topbarAvatar],
      [el.accountMiniAvatarImg, el.accountMiniAvatarInitials, el.accountMiniAvatar],
    ];
    imagePairs.forEach(([img, initialsNode, wrap]) => {
      if (!img) return;
      if (avatarUrl) {
        img.src = avatarUrl;
        img.classList.remove('hidden');
        if (initialsNode) initialsNode.classList.add('hidden');
        if (wrap) wrap.classList.add('has-image');
      } else {
        img.removeAttribute('src');
        img.classList.add('hidden');
        if (initialsNode) initialsNode.classList.remove('hidden');
        if (wrap) wrap.classList.remove('has-image');
      }
    });
  }

  function openAccountMiniMenu() {
    state.ui.accountMenuOpen = true;
    if (el.accountMiniMenu) el.accountMiniMenu.classList.remove('hidden');
    if (el.topbarAccountBtn) el.topbarAccountBtn.setAttribute('aria-expanded', 'true');
  }

  function closeAccountMiniMenu(silent = false) {
    state.ui.accountMenuOpen = false;
    if (el.accountMiniMenu) el.accountMiniMenu.classList.add('hidden');
    if (el.topbarAccountBtn) el.topbarAccountBtn.setAttribute('aria-expanded', 'false');
  }

  function handleToggleAccountMenu(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (state.ui.accountMenuOpen) {
      closeAccountMiniMenu(true);
    } else {
      renderTopbarAccount();
      openAccountMiniMenu();
    }
  }

  function handleOpenTeamMembersShortcut() {
    closeAccountMiniMenu();
    switchView('moreView');
    if (el.teamMembersList && typeof el.teamMembersList.scrollIntoView === 'function') {
      setTimeout(() => {
        try {
          el.teamMembersList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) {}
      }, 60);
    }
  }


  function handleOpenSettingsFromAccountMenu() {
    closeAccountMiniMenu(true);
    switchView('settingsView');
  }

  function handleDocumentClickForAccountMenu(event) {
    if (!state.ui.accountMenuOpen) return;
    if (!el.accountMenuWrap) return;
    if (el.accountMenuWrap.contains(event.target)) return;
    closeAccountMiniMenu(true);
  }

  function handleGlobalKeydown(event) {
    if (state.ui.mediaPreviewOpen && event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrevMediaPreviewItem();
      return;
    }
    if (state.ui.mediaPreviewOpen && event.key === 'ArrowRight') {
      event.preventDefault();
      showNextMediaPreviewItem();
      return;
    }
    if (event.key !== 'Escape') return;
    if (state.ui.mediaPreviewOpen) { closeMediaPreviewModal(); return; }
    if (state.ui.accountMenuOpen) closeAccountMiniMenu(true);
  }

  function setSettingsStatus(kind, message = '', type = 'info') {
    const node = kind === 'password' ? el.settingsPasswordStatus : el.settingsProfileStatus;
    if (!node) return;
    if (!message) {
      node.textContent = '';
      node.className = 'settings-status hidden';
      return;
    }
    node.textContent = message;
    node.className = `settings-status ${type}`;
  }

  function getPendingAvatarPreviewUrl() {
    if (state.ui.pendingProfileAvatar && state.ui.pendingProfileAvatar.removed) return '';
    if (state.ui.pendingProfileAvatar?.previewDataUrl) return state.ui.pendingProfileAvatar.previewDataUrl;
    return state.currentUser?.avatar_url || '';
  }

  function renderSettingsAvatar() {
    const previewUrl = getPendingAvatarPreviewUrl();
    const initials = getUserInitials(el.settingsFullNameReadout?.textContent || el.settingsFullName?.value || state.currentUser?.full_name || 'M');
    if (el.settingsProfileInitials) el.settingsProfileInitials.textContent = initials;
    if (el.settingsProfileAvatarImg) {
      if (previewUrl) {
        el.settingsProfileAvatarImg.src = previewUrl;
        el.settingsProfileAvatarImg.classList.remove('hidden');
        if (el.settingsProfileInitials) el.settingsProfileInitials.classList.add('hidden');
        if (el.settingsProfileAvatarPreview) el.settingsProfileAvatarPreview.classList.add('has-image');
      } else {
        el.settingsProfileAvatarImg.removeAttribute('src');
        el.settingsProfileAvatarImg.classList.add('hidden');
        if (el.settingsProfileInitials) el.settingsProfileInitials.classList.remove('hidden');
        if (el.settingsProfileAvatarPreview) el.settingsProfileAvatarPreview.classList.remove('has-image');
      }
    }
    if (el.settingsAvatarRemoveBtn) el.settingsAvatarRemoveBtn.disabled = !previewUrl;
  }


  function openFullNameEditorModal() {
    if (!el.fullNameEditorModal || !state.currentUser) return;
    if (el.fullNameEditorInput) el.fullNameEditorInput.value = String(state.currentUser.full_name || '');
    el.fullNameEditorModal.classList.remove('hidden');
    setTimeout(() => { try { el.fullNameEditorInput?.focus(); el.fullNameEditorInput?.select(); } catch (_) {} }, 30);
  }

  function closeFullNameEditorModal() {
    if (el.fullNameEditorModal) el.fullNameEditorModal.classList.add('hidden');
  }

  async function saveFullNameFromModal() {
    if (!el.fullNameEditorInput) return;
    const nextName = String(el.fullNameEditorInput.value || '').trim();
    if (!nextName) {
      setSettingsStatus('profile', txt('กรุณากรอกชื่อ-นามสกุล', 'Please enter your full name'), 'error');
      return;
    }
    if (el.settingsFullName) el.settingsFullName.value = nextName;
    if (el.settingsFullNameReadout) el.settingsFullNameReadout.textContent = nextName;
    closeFullNameEditorModal();
    await handleSaveProfileSettings();
  }


  function canIssueTemporaryPassword() {
    return canManageUsers() && isFirebaseLive();
  }

  function getIssueTemporaryPasswordFunctionUrl() {
    const cfg = window.LAYA_FIREBASE_CONFIG || {};
    const projectId = cfg.projectId || '';
    if (!projectId) return '';
    const region = 'us-central1';
    return `https://${region}-${projectId}.cloudfunctions.net/issueTemporaryPassword`;
  }

  function closeTempPasswordResultModal() {
    if (!el.tempPasswordResultModal) return;
    el.tempPasswordResultModal.classList.add('hidden');
  }

  async function copyTempPasswordFromModal() {
    const password = String(el.tempPasswordResultValue?.textContent || '').trim();
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      if (el.tempPasswordResultCopyBtn) {
        el.tempPasswordResultCopyBtn.textContent = txt('คัดลอกแล้ว', 'Copied');
        window.setTimeout(() => {
          if (el.tempPasswordResultCopyBtn) el.tempPasswordResultCopyBtn.textContent = txt('คัดลอกรหัส', 'Copy Password');
        }, 1400);
      }
    } catch (err) {
      window.prompt(txt('คัดลอกรหัสชั่วคราว', 'Copy temporary password'), password);
    }
  }

  function openTempPasswordResultModal(fullName, tempPassword) {
    if (!el.tempPasswordResultModal) {
      alert(`${fullName}

${tempPassword}`);
      return;
    }
    if (el.tempPasswordResultName) el.tempPasswordResultName.textContent = fullName || '-';
    if (el.tempPasswordResultValue) el.tempPasswordResultValue.textContent = tempPassword || '-';
    if (el.tempPasswordResultCopyBtn) el.tempPasswordResultCopyBtn.textContent = txt('คัดลอกรหัส', 'Copy Password');
    el.tempPasswordResultModal.classList.remove('hidden');
  }

  async function issueTemporaryPasswordForUser(targetUid) {
    if (!canIssueTemporaryPassword()) {
      alert(txt('เฉพาะผู้ดูแลระบบที่เชื่อม Firebase Live เท่านั้นที่ออกรหัสชั่วคราวได้', 'Only admins in Firebase Live can issue temporary passwords'));
      return;
    }
    const member = getTeamMembers().find(item => item.uid === targetUid);
    if (!member) return;
    const message = txt(`ออกรหัสชั่วคราวให้ ${member.full_name} ?
ผู้ใช้จะต้องเปลี่ยนรหัสผ่านทันทีหลังล็อกอิน`, `Issue a temporary password for ${member.full_name}?
The user will be forced to change it on next sign in.`);
    if (!window.confirm(message)) return;
    try {
      const authUser = window.LAYA_FIREBASE?.auth?.currentUser;
      if (!authUser) throw new Error('not_signed_in');
      const token = await authUser.getIdToken();
      const url = getIssueTemporaryPasswordFunctionUrl();
      if (!url) throw new Error('function_not_ready');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) throw new Error(payload?.message || `http_${res.status}`);
      openTempPasswordResultModal(payload.fullName || member.full_name || '-', payload.tempPassword || '-');
    } catch (err) {
      console.error(err);
      const msg = String(err?.message || err || '');
      let friendly = txt('ออกรหัสชั่วคราวไม่สำเร็จ', 'Failed to issue a temporary password');
      if (msg.includes('forbidden')) friendly = txt('เฉพาะ Admin เท่านั้นที่ออกรหัสชั่วคราวได้', 'Only admins can issue a temporary password');
      else if (msg.includes('function_not_ready') || msg.includes('404')) friendly = txt('ยังไม่ได้ deploy Cloud Function สำหรับรหัสชั่วคราว', 'The temporary password Cloud Function is not deployed yet');
      else if (msg.includes('user_not_found')) friendly = txt('ไม่พบผู้ใช้ปลายทางใน Firestore', 'Target user not found in Firestore');
      else if (msg.includes('target_auth_user_not_found')) friendly = txt('พบรายชื่อพนักงานในระบบ แต่ไม่พบบัญชีล็อกอินของคนนี้ใน Firebase Auth', 'The staff profile exists, but the Firebase Auth login for this user was not found');
      else if (msg.includes('missing_auth') || msg.includes('401')) friendly = txt('เซสชันแอดมินหมดอายุแล้ว กรุณาออกและเข้าสู่ระบบใหม่', 'Your admin session expired. Please sign out and sign in again');
      else if (msg.includes('permission') || msg.includes('insufficient')) friendly = txt('บัญชีนี้ไม่มีสิทธิ์ใช้งานฟังก์ชันรีเซ็ตรหัส', 'This account does not have permission to issue temporary passwords');
      else if (msg.includes('server_error') || msg.includes('500')) friendly = txt('Cloud Function ตอบกลับผิดพลาด • ตรวจสอบว่า deploy functions ล่าสุดแล้ว', 'The Cloud Function returned an error. Please deploy the latest functions');
      alert(friendly + (msg ? `

[debug] ${msg}` : ''));
    }
  }

  function handleTeamMemberListClick(event) {
    const editBtn = event.target.closest('[data-edit-user-management]');
    if (editBtn) {
      openUserManagementModal(editBtn.dataset.editUserManagement || '');
      return;
    }
    const btn = event.target.closest('[data-issue-temp-password]');
    if (!btn) return;
    issueTemporaryPasswordForUser(btn.dataset.issueTempPassword || '');
  }

  function refreshPasswordEditorPresentation() {
    const forceMode = state.ui.passwordEditorMode === 'force';
    if (el.passwordEditorModal) el.passwordEditorModal.classList.toggle('password-editor-force', forceMode);
    if (el.passwordEditorCurrentField) el.passwordEditorCurrentField.classList.toggle('hidden', forceMode);
    if (el.closePasswordEditorModalBtn) el.closePasswordEditorModalBtn.classList.toggle('hidden', forceMode);
    if (el.cancelPasswordEditorBtn) {
      el.cancelPasswordEditorBtn.classList.toggle('hidden', forceMode);
      el.cancelPasswordEditorBtn.disabled = forceMode;
    }
    if (el.passwordEditorTitle) el.passwordEditorTitle.textContent = forceMode ? txt('ตั้งรหัสผ่านใหม่', 'Set a New Password') : txt('เปลี่ยนรหัสผ่าน', 'Change Password');
    if (el.passwordEditorMessage) el.passwordEditorMessage.textContent = forceMode ? txt('รหัสนี้เป็นรหัสชั่วคราวจากผู้ดูแลระบบ กรุณาตั้งรหัสใหม่ก่อนใช้งานต่อ', 'This is a temporary password issued by an admin. Please set a new password before continuing.') : txt('กรอกรหัสผ่านเดิมและรหัสผ่านใหม่ในหน้าต่างนี้', 'Enter your current password and a new password in this popup.');
    if (el.continuePasswordEditorBtn) el.continuePasswordEditorBtn.textContent = forceMode ? txt('บันทึกรหัสผ่านใหม่', 'Save New Password') : txt('ตรวจสอบก่อนยืนยัน', 'Review Before Confirm');
  }

  function isTemporaryPasswordChangeRequired() {
    return !!state.currentUser?.password_change_required;
  }

  
function openPasswordEditorModal(mode = 'normal') {
    if (!el.passwordEditorModal) return;
    state.ui.passwordEditorMode = mode === 'force' ? 'force' : 'normal';
    ['passwordEditorCurrent','passwordEditorNew','passwordEditorConfirm'].forEach(key => { if (el[key]) el[key].value = ''; });
    refreshPasswordEditorPresentation();
    el.passwordEditorModal.classList.remove('hidden');
    setTimeout(() => { try { (state.ui.passwordEditorMode === 'force' ? el.passwordEditorNew : el.passwordEditorCurrent)?.focus(); } catch (_) {} }, 30);
  }

  function closePasswordEditorModal(force = false) {
    if (!force && state.ui.passwordEditorMode === 'force') return;
    if (el.passwordEditorModal) el.passwordEditorModal.classList.add('hidden');
    ['passwordEditorCurrent','passwordEditorNew','passwordEditorConfirm'].forEach(key => { if (el[key]) el[key].value = ''; });
    if (!isTemporaryPasswordChangeRequired() || force) state.ui.passwordEditorMode = 'normal';
    refreshPasswordEditorPresentation();
  }

  function handlePasswordEditorContinue() {
    const forceMode = state.ui.passwordEditorMode === 'force';
    if (el.settingsCurrentPassword) el.settingsCurrentPassword.value = forceMode ? '__TEMP_PASSWORD__' : String(el.passwordEditorCurrent?.value || '');
    if (el.settingsNewPassword) el.settingsNewPassword.value = String(el.passwordEditorNew?.value || '');
    if (el.settingsConfirmPassword) el.settingsConfirmPassword.value = String(el.passwordEditorConfirm?.value || '');
    closePasswordEditorModal(forceMode);
    handleSavePasswordSettings();
  }

  function clearSettingsPasswordInputs() {
    ['settingsCurrentPassword', 'settingsNewPassword', 'settingsConfirmPassword'].forEach(key => {
      const node = el[key];
      if (!node) return;
      node.value = '';
      node.setAttribute('value', '');
      node.autocomplete = node.id === 'settingsCurrentPassword' ? 'current-password' : 'new-password';
      node.setAttribute('readonly', 'readonly');
    });
  }

  function setFieldValue(node, value, options = {}) {
    if (!node) return;
    const finalValue = value == null || value === '' ? '-' : String(value);
    const tag = String(node.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (!options.preserveActive || document.activeElement !== node) {
        node.value = finalValue === '-' && options.allowEmpty ? '' : finalValue;
      }
      return;
    }
    node.textContent = finalValue;
    node.dataset.value = finalValue === '-' ? '' : finalValue;
  }

  function hardenSettingsPasswordInputs() {
    ['settingsCurrentPassword', 'settingsNewPassword', 'settingsConfirmPassword'].forEach(key => {
      const node = el[key];
      if (!node || node.dataset.hardened === '1') return;
      node.dataset.hardened = '1';
      const unlock = () => node.removeAttribute('readonly');
      node.addEventListener('focus', unlock);
      node.addEventListener('touchstart', unlock, { passive: true });
      node.addEventListener('mousedown', unlock);
      node.addEventListener('blur', () => {
        if (!node.value) node.setAttribute('readonly', 'readonly');
      });
    });
  }

  function enforceSettingsFieldValues(options = {}) {
    if (!state.currentUser) return;
    const preserveActive = options.preserveActive !== false;
    const fullName = state.currentUser.full_name || '';
    const employeeId = state.currentUser.employee_id || '';
    const roleName = getRoleName(state.currentUser.role || 'staff');
    const departmentName = getDepartmentName(normalizeDepartmentValue(state.currentUser.department, 'MOD'));
    const positionName = state.currentUser.position || '-';
    setFieldValue(el.settingsEmployeeId, employeeId);
    setFieldValue(el.settingsRole, roleName);
    setFieldValue(el.settingsDepartment, departmentName);
    setFieldValue(el.settingsPosition, positionName);
    setFieldValue(el.settingsFullName, fullName, { preserveActive, allowEmpty: true });
    setFieldValue(el.settingsFullNameReadout, fullName, { preserveActive, allowEmpty: true });
    if (el.settingsProfileNameDisplay) el.settingsProfileNameDisplay.textContent = fullName || '-';
    if (el.settingsProfileMetaText) el.settingsProfileMetaText.textContent = `${employeeId || '-'} • ${roleName} • ${positionName}`;
    if (el.settingsRoleBadge) el.settingsRoleBadge.textContent = roleName;
    if (el.settingsDepartmentBadge) el.settingsDepartmentBadge.textContent = departmentName;
    clearSettingsPasswordInputs();
    hardenSettingsPasswordInputs();
  }


function renderSettingsView() {
  refreshPasswordEditorPresentation();
  if (!state.currentUser) return;
  const canManageTeam = canManageUsers();
  if (el.settingsAdminToolsPanel) el.settingsAdminToolsPanel.classList.toggle('hidden', !canManageTeam);
  if (el.accountMenuOpenTeamMembers) el.accountMenuOpenTeamMembers.classList.toggle('hidden', !canManageTeam);
  enforceSettingsFieldValues();
  renderSettingsAvatar();
  setTimeout(() => {
    if (state.ui.activeView === 'settingsView') {
      enforceSettingsFieldValues();
      renderSettingsAvatar();
    }
  }, 80);
  setTimeout(() => {
    if (state.ui.activeView === 'settingsView') {
      enforceSettingsFieldValues();
      renderSettingsAvatar();
    }
  }, 300);
}

async function handleProfileAvatarPicked(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const optimized = await optimizeIssuePhoto(file);
    state.ui.pendingProfileAvatar = {
      previewDataUrl: optimized.previewDataUrl || optimized.fullDataUrl,
      fullDataUrl: optimized.fullDataUrl,
      thumbDataUrl: optimized.thumbDataUrl,
      mimeType: 'image/jpeg',
      originalBytes: file.size || 0,
      removed: false,
    };
    renderSettingsAvatar();
    setSettingsStatus('profile', txt('เลือกรูปโปรไฟล์แล้ว กดบันทึกโปรไฟล์เพื่ออัปเดต', 'Profile photo selected. Tap Save Profile to update.'), 'info');
  } catch (err) {
    console.error(err);
    setSettingsStatus('profile', txt('เลือกรูปโปรไฟล์ไม่สำเร็จ', 'Could not process the selected profile photo'), 'error');
  } finally {
    if (event.target) event.target.value = '';
  }
}

function handleRemoveProfileAvatar() {
  state.ui.pendingProfileAvatar = { removed: true, previewDataUrl: '', fullDataUrl: '', thumbDataUrl: '', mimeType: 'image/jpeg' };
  renderSettingsAvatar();
  setSettingsStatus('profile', txt('เลือกลบรูปโปรไฟล์แล้ว กดบันทึกโปรไฟล์เพื่อยืนยัน', 'Profile photo removal is ready. Tap Save Profile to confirm.'), 'info');
}

async function uploadProfileAvatarAsset(uid, avatar) {
  const fb = window.LAYA_FIREBASE;
  if (!fb?.ready || !fb.storage || !fb.sdk?.storageRef || !fb.sdk?.uploadString || !fb.sdk?.getDownloadURL) throw new Error('storage_not_ready');
  const ts = Date.now();
  const storagePath = `profile_photos/${uid}/avatar_${ts}.jpg`;
  const avatarRef = fb.sdk.storageRef(fb.storage, storagePath);
  await fb.sdk.uploadString(avatarRef, avatar.fullDataUrl, 'data_url', {
    contentType: avatar.mimeType || 'image/jpeg',
    cacheControl: 'public,max-age=3600'
  });
  const avatarUrl = await fb.sdk.getDownloadURL(avatarRef);
  return { avatarUrl, storagePath };
}

async function handleSaveProfileSettings() {
  if (!state.currentUser) return;
  const fullName = String(el.settingsFullName?.value || '').trim();
  const avatarDraft = state.ui.pendingProfileAvatar;
  const currentName = String(state.currentUser.full_name || '').trim();
  const currentAvatarUrl = String(state.currentUser.avatar_url || '');
  const nameChanged = !!fullName && fullName !== currentName;
  const avatarChanged = !!avatarDraft;
  if (!fullName) {
    setSettingsStatus('profile', txt('กรุณากรอกชื่อ-นามสกุล', 'Please enter your full name'), 'error');
    return;
  }
  if (!nameChanged && !avatarChanged) {
    setSettingsStatus('profile', txt('ยังไม่มีการเปลี่ยนแปลงโปรไฟล์', 'No profile changes detected'), 'info');
    return;
  }
  try {
    setSettingsStatus('profile', txt('กำลังบันทึกโปรไฟล์...', 'Saving profile...'), 'info');
    let nextAvatarUrl = currentAvatarUrl;
    let nextAvatarPath = String(state.currentUser.avatar_storage_path || '');
    let oldAvatarPath = nextAvatarPath;
    if (avatarDraft?.removed) {
      nextAvatarUrl = '';
      nextAvatarPath = '';
    } else if (avatarDraft?.fullDataUrl) {
      if (isFirebaseLive()) {
        const uploaded = await uploadProfileAvatarAsset(state.currentUser.uid, avatarDraft);
        nextAvatarUrl = uploaded.avatarUrl;
        nextAvatarPath = uploaded.storagePath;
      } else {
        nextAvatarUrl = avatarDraft.previewDataUrl || avatarDraft.fullDataUrl || '';
        nextAvatarPath = '';
      }
    }

    if (isFirebaseLive()) {
      const fb = window.LAYA_FIREBASE;
      const userRef = fb.sdk.doc(fb.db, 'users', state.currentUser.uid);
      await fb.sdk.updateDoc(userRef, {
        full_name: fullName,
        avatar_url: nextAvatarUrl,
        avatar_storage_path: nextAvatarPath,
        updated_at: fb.sdk.serverTimestamp(),
      });
      if (oldAvatarPath && oldAvatarPath !== nextAvatarPath && fb.sdk?.deleteObject && fb.sdk?.storageRef && fb.storage) {
        try {
          await fb.sdk.deleteObject(fb.sdk.storageRef(fb.storage, oldAvatarPath));
        } catch (deleteErr) {
          console.warn('Failed to delete previous avatar asset', deleteErr);
        }
      }
    }
    const oldName = state.currentUser.full_name || '';
    state.currentUser.full_name = fullName;
    state.currentUser.avatar_url = nextAvatarUrl;
    state.currentUser.avatar_storage_path = nextAvatarPath;
    state.data.teamMembers = (state.data.teamMembers || []).map(member => member.uid === state.currentUser.uid ? { ...member, full_name: fullName, avatar_url: nextAvatarUrl, avatar_storage_path: nextAvatarPath } : member);
    state.ui.pendingProfileAvatar = null;
    persist();
    renderAll();
    setSettingsStatus('profile', txt('บันทึกโปรไฟล์เรียบร้อยแล้ว', 'Profile updated successfully'), 'success');
    try {
      recordUsageLog({
        category: 'account',
        action: 'profile_update',
        title: txt('อัปเดตโปรไฟล์', 'Updated profile'),
        text: txt(`${fullName} อัปเดตโปรไฟล์${nameChanged ? ` จาก ${oldName || '-'}` : ''}${avatarChanged ? ' และเปลี่ยนรูปโปรไฟล์' : ''}`, `${fullName} updated the profile${nameChanged ? ` from ${oldName || '-'}` : ''}${avatarChanged ? ' and changed the profile photo' : ''}`),
        user_uid: state.currentUser.uid,
        user_name: fullName,
        ref_no: state.currentUser.employee_id || '',
      });
    } catch (_) {}
  } catch (err) {
    console.error(err);
    setSettingsStatus('profile', txt('บันทึกโปรไฟล์ไม่สำเร็จ', 'Failed to update profile'), 'error');
  }
}

async function handleSavePasswordSettings() {
  if (!state.currentUser) return;
  const forceMode = state.ui.passwordEditorMode === 'force' || isTemporaryPasswordChangeRequired();
  const currentPassword = String(el.settingsCurrentPassword?.value || '').trim();
  const newPassword = String(el.settingsNewPassword?.value || '').trim();
  const confirmPassword = String(el.settingsConfirmPassword?.value || '').trim();
  if ((!forceMode && !currentPassword) || !newPassword || !confirmPassword) {
    setSettingsStatus('password', txt('กรุณากรอกรหัสผ่านให้ครบทุกช่อง', 'Please fill in all password fields'), 'error');
    return;
  }
  if (newPassword.length < 6) {
    setSettingsStatus('password', txt('รหัสผ่านใหม่ต้องอย่างน้อย 6 ตัวอักษร', 'New password must be at least 6 characters'), 'error');
    return;
  }
  if (newPassword !== confirmPassword) {
    setSettingsStatus('password', txt('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน', 'New password confirmation does not match'), 'error');
    return;
  }
  if (!isFirebaseLive()) {
    setSettingsStatus('password', txt('การเปลี่ยนรหัสผ่านใช้ได้เมื่อเชื่อม Firebase Live', 'Password change is available in Firebase Live mode'), 'error');
    return;
  }
  state.ui.passwordChangeDraft = { currentPassword, newPassword, forceMode };
  openPasswordConfirmModal();
}

function openPasswordConfirmModal() {
  if (!el.passwordConfirmModal || !state.currentUser || !state.ui.passwordChangeDraft) return;
  const forceMode = !!state.ui.passwordChangeDraft.forceMode || isTemporaryPasswordChangeRequired();
  if (el.passwordConfirmAccount) el.passwordConfirmAccount.textContent = `${state.currentUser.full_name || '-'} (${state.currentUser.employee_id || '-'})`;
  if (el.passwordConfirmLength) el.passwordConfirmLength.textContent = `${String(state.ui.passwordChangeDraft.newPassword || '').length} ${txt('ตัวอักษร', 'characters')}`;
  if (el.passwordConfirmTitle) el.passwordConfirmTitle.textContent = forceMode ? txt('ยืนยันรหัสผ่านใหม่', 'Confirm new password') : txt('ยืนยันการเปลี่ยนรหัสผ่าน', 'Confirm password change');
  if (el.passwordConfirmMessage) el.passwordConfirmMessage.textContent = forceMode ? txt('หลังยืนยัน ระบบจะบันทึกรหัสใหม่และปลดสถานะรหัสชั่วคราวทันที', 'After confirmation, the app will save your new password and clear the temporary-password status immediately.') : txt('ระบบจะอัปเดตรหัสผ่านใหม่ทันทีหลังยืนยัน', 'Your password will be updated immediately after confirmation.');
  if (el.cancelPasswordChangeBtn) {
    el.cancelPasswordChangeBtn.classList.toggle('hidden', forceMode);
    el.cancelPasswordChangeBtn.disabled = forceMode;
  }
  if (el.closePasswordConfirmModalBtn) el.closePasswordConfirmModalBtn.classList.toggle('hidden', forceMode);
  el.passwordConfirmModal.classList.remove('hidden');
}

function closePasswordConfirmModal(force = false) {
  if (!force && (state.ui.passwordChangeBusy || isTemporaryPasswordChangeRequired())) return;
  if (el.passwordConfirmModal) el.passwordConfirmModal.classList.add('hidden');
  if (el.cancelPasswordChangeBtn) {
    el.cancelPasswordChangeBtn.classList.remove('hidden');
    el.cancelPasswordChangeBtn.disabled = false;
  }
  if (el.closePasswordConfirmModalBtn) el.closePasswordConfirmModalBtn.classList.remove('hidden');
  if (!state.ui.passwordChangeBusy) state.ui.passwordChangeDraft = null;
  if (el.confirmPasswordChangeBtn) el.confirmPasswordChangeBtn.disabled = false;
}

async function confirmPasswordChange() {
  if (!state.currentUser || !state.ui.passwordChangeDraft || !isFirebaseLive()) return;
  try {
    state.ui.passwordChangeBusy = true;
    if (el.confirmPasswordChangeBtn) {
      el.confirmPasswordChangeBtn.disabled = true;
      el.confirmPasswordChangeBtn.textContent = txt('กำลังเปลี่ยนรหัสผ่าน...', 'Changing password...');
    }
    setSettingsStatus('password', txt('กำลังเปลี่ยนรหัสผ่าน...', 'Changing password...'), 'info');
    const fb = window.LAYA_FIREBASE;
    const authUser = fb.auth.currentUser;
    if (!authUser) throw new Error('not_signed_in');
    const forceMode = !!state.ui.passwordChangeDraft.forceMode || isTemporaryPasswordChangeRequired();
    if (!forceMode) {
      const email = authUser.email || employeeIdToEmail(state.currentUser.employee_id || '');
      const credential = fb.sdk.EmailAuthProvider.credential(email, state.ui.passwordChangeDraft.currentPassword);
      await fb.sdk.reauthenticateWithCredential(authUser, credential);
    }
    await fb.sdk.updatePassword(authUser, state.ui.passwordChangeDraft.newPassword);
    try {
      await fb.sdk.updateDoc(fb.sdk.doc(fb.db, 'users', state.currentUser.uid), {
        password_change_required: false,
        temporary_password_issued_at: null,
        temporary_password_issued_by_uid: '',
        updated_at: fb.sdk.serverTimestamp(),
      });
    } catch (profileErr) {
      console.warn('Failed to clear temporary password flags', profileErr);
    }
    state.currentUser.password_change_required = false;
    state.currentUser.temporary_password_issued_at = null;
    state.currentUser.temporary_password_issued_by_uid = '';
    clearSettingsPasswordInputs();
    setSettingsStatus('password', forceMode ? txt('ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว', 'Your new password has been saved') : txt('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', 'Password updated successfully'), 'success');
    try {
      recordUsageLog({
        category: 'account',
        action: forceMode ? 'password_update_after_temp' : 'password_update',
        title: forceMode ? txt('ตั้งรหัสผ่านใหม่', 'Set a new password') : txt('เปลี่ยนรหัสผ่าน', 'Changed password'),
        text: forceMode ? txt(`${state.currentUser.full_name} เปลี่ยนจากรหัสชั่วคราวเป็นรหัสใหม่แล้ว`, `${state.currentUser.full_name} replaced the temporary password with a new password`) : txt(`${state.currentUser.full_name} เปลี่ยนรหัสผ่านแล้ว`, `${state.currentUser.full_name} changed password`),
        user_uid: state.currentUser.uid,
        user_name: state.currentUser.full_name,
        ref_no: state.currentUser.employee_id || '',
      });
    } catch (_) {}
    state.ui.passwordChangeDraft = null;
    state.ui.passwordEditorMode = 'normal';
    closePasswordConfirmModal(true);
    closePasswordEditorModal(true);
    renderSettingsView();
  } catch (err) {
    console.error(err);
    const code = String(err?.code || err?.message || '');
    let message = txt('เปลี่ยนรหัสผ่านไม่สำเร็จ', 'Failed to change password');
    if (code.includes('wrong-password') || code.includes('invalid-credential')) message = txt('รหัสผ่านปัจจุบันไม่ถูกต้อง', 'Current password is incorrect');
    else if (code.includes('too-many-requests')) message = txt('ลองใหม่อีกครั้งในภายหลัง', 'Please try again later');
    else if (code.includes('requires-recent-login')) message = txt('กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน', 'Please sign out and sign in again before changing password');
    setSettingsStatus('password', message, 'error');
    if (isTemporaryPasswordChangeRequired()) {
      setTimeout(() => openPasswordEditorModal('force'), 120);
    }
  } finally {
    state.ui.passwordChangeBusy = false;
    if (el.confirmPasswordChangeBtn) {
      el.confirmPasswordChangeBtn.disabled = false;
      el.confirmPasswordChangeBtn.textContent = txt('ยืนยันเปลี่ยนรหัสผ่าน', 'Confirm password change');
    }
  }
}

function switchView(viewId) {

    state.ui.activeView = viewId;
    closeAccountMiniMenu(true);
    if (viewId === 'activityView') viewId = 'logView';
    if (viewId === 'newIssueView') {
      if (!canCreateIssueForRole()) {
        setAuthStatus(txt('บัญชีนี้ถูกปิดใช้งาน จึงไม่สามารถเปิด Issue ใหม่ได้', 'This account is inactive and cannot create new issues.'), 'info');
        viewId = 'boardView';
      } else {
        clearIssueForm();
      }
    }
    qsa('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
    qsa('.nav-link').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
    if (viewId === 'boardView') renderBoard();
    if (viewId === 'activityView') renderActivity();
    if (viewId === 'logView') renderUsageLogs();
    if (viewId === 'checklistView') renderTemplateCards();
    if (viewId === 'closedView') renderClosedJobs();
    if (viewId === 'closedSummaryView') renderClosedSummary();
    if (viewId === 'settingsView') renderSettingsView();
    if (viewId === 'moreView') renderTeamMembers();
  }

  function renderAll() {
    renderAuthState();
    if (!state.currentUser) return;
    renderSummary();
    renderBoard();
    renderTemplateCards();
    renderActivity();
    renderUsageLogs();
    renderClosedJobs();
    renderClosedSummary();
    renderTeamMembers();
    renderSettingsView();
    switchView(state.ui.activeView);
  }

  function renderSummary() {
    const loading = isIssueSyncLoading() && !state.data.issues.length;
    const cachedUpdating = state.ui.fastDashboardCacheActive && isIssueSyncLoading() && state.data.issues.length;
    const visibleIssues = loading ? [] : getVisibleIssuesForCurrentUser().filter(i => i.issue_type !== 'checklist_submission');
    const openCount = visibleIssues.filter(i => i.status === 'open').length;
    const progressCount = visibleIssues.filter(i => i.status === 'in_progress').length;
    const criticalCount = visibleIssues.filter(i => i.priority === 'critical' && i.status !== 'closed').length;
    const closedTodayCount = visibleIssues.filter(i => i.status === 'closed' && isToday(i.closed_at || i.updated_at)).length;
    const loadingHint = txt('กำลังโหลดข้อมูลงาน...', 'Loading work data...');
    const cacheHint = txt('แสดงข้อมูลล่าสุดที่จำไว้ • กำลังอัปเดต', 'Showing cached data • Updating');

    const cards = loading ? [
      { label: txt('เปิดวันนี้', 'Open Today'), value: '…', hint: loadingHint, loading: true },
      { label: txt('กำลังดำเนินการ', 'In Progress'), value: '…', hint: loadingHint, loading: true },
      { label: txt('เร่งด่วนมาก', 'Critical'), value: '…', hint: loadingHint, loading: true },
      { label: txt('ปิดวันนี้', 'Closed Today'), value: '…', hint: loadingHint, loading: true },
    ] : [
      { label: txt('เปิดวันนี้', 'Open Today'), value: openCount, hint: cachedUpdating ? cacheHint : txt('ยังต้องตามต่อ', 'Still needs follow-up') },
      { label: txt('กำลังดำเนินการ', 'In Progress'), value: progressCount, hint: cachedUpdating ? cacheHint : txt('กำลังดำเนินการ', 'Work in progress') },
      { label: txt('เร่งด่วนมาก', 'Critical'), value: criticalCount, hint: cachedUpdating ? cacheHint : txt('ต้องเร่งตรวจ', 'Needs urgent attention') },
      { label: txt('ปิดวันนี้', 'Closed Today'), value: closedTodayCount, hint: cachedUpdating ? cacheHint : txt('ปิดงานวันนี้', 'Closed today') },
    ];

    el.summaryGrid.innerHTML = cards.map(card => `
      <article class="summary-card${card.loading ? ' is-loading' : ''}">
        <div class="summary-label">${escapeHtml(card.label)}</div>
        <div class="summary-value${card.loading ? ' loading-dots' : ''}">${card.value}</div>
        <div class="summary-hint">${escapeHtml(card.hint)}</div>
      </article>
    `).join('');
  }
  function renderClosedJobs() {
    if (!el.closedList) return;
    const closedItems = getClosedBoardItemsForCurrentUser();

    if (!closedItems.length) {
      el.closedList.innerHTML = `<div class="empty-state">${txt('ยังไม่มีงานหรือเช็กลิสต์ที่ย้ายมาเก็บแล้ว', 'No closed jobs or archived checklist cards yet')}</div>`;
      return;
    }

    el.closedList.innerHTML = closedItems.map(item => {
      if (item.closed_type === 'checklist_run') {
        const hiddenLabel = item.status === 'archived' ? txt('ปิดแล้ว', 'Closed') : txt('ย้ายอัตโนมัติ', 'Auto moved');
        return `
          <article class="issue-card issue-tone-closed checklist-board-card">
            <div class="issue-thumb placeholder checklist-placeholder">DONE</div>
            <div>
              <div class="issue-title-row">
                <div>
                  <div class="issue-title">${txt('ส่งเช็กลิสต์แล้ว:', 'Checklist submitted:')} ${escapeHtml(runTemplateLabel(item))}</div>
                  <div class="meta-row">
                    <span>${escapeHtml(item.location_text || '-')}</span>
                    <span>•</span>
                    <span>${formatDateTime(item.submitted_at || item.created_at)}</span>
                  </div>
                </div>
                <div class="issue-badges">
                  <div class="status-pill status-closed">${hiddenLabel}</div>
                  <div class="priority-pill priority-low">${txt('เช็กลิสต์', 'Checklist')}</div>
                </div>
              </div>
              <div class="issue-desc">${escapeHtml(`${runTemplateLabel(item)} • ${item.pass_count || 0} ${txt('ผ่าน', 'pass')} • ${item.fail_count || 0} ${txt('ไม่ผ่าน', 'fail')} • ${item.na_count || 0} N/A${item.issue_count ? ` • ${item.issue_count} ${txt('รายการ', 'issue')}` : ''}`)}</div>
              <div class="meta-row">
                <span>${escapeHtml(item.run_no || item.id)}</span>
                <span>•</span>
                <span>${txt('ผู้ตรวจ', 'Inspector')} ${escapeHtml(item.inspector_name || '-')}</span>
              </div>
              <div class="issue-actions">
                <button class="mini-btn" data-open-checklist-run="${item.id}">${txt('เปิดสรุป', 'Open Summary')}</button>
                <button class="mini-btn" data-unarchive-checklist-run="${item.id}">${txt('เปิดกลับ', 'Reopen')}</button>
              </div>
            </div>
          </article>
        `;
      }

      const issue = item;
      const deptName = getDepartmentName(normalizeDepartmentValue(issue.assigned_department, 'ENG'));
      const { thumb, full: fullCover, hasVideo, videoPreviewUrl } = getIssueCoverMedia(issue);
      const thumbHtml = thumb
        ? `<button type="button" class="issue-thumb-trigger media-open-immediate" data-open-issue-thumb="${issue.id}" aria-label="${txt('ดูรูปใหญ่', 'Open media preview')}"><div class="issue-thumb-wrap">${thumb ? `<img class="issue-thumb" src="${thumb}" alt="Closed issue media" />` : ''}${hasVideo ? '<span class="media-badge">VIDEO</span>' : ''}</div></button>`
        : videoPreviewUrl
          ? `<button type="button" class="issue-thumb-trigger media-open-immediate" data-open-issue-thumb="${issue.id}" aria-label="${txt('ดูรูปใหญ่', 'Open media preview')}"><div class="issue-thumb-wrap"><video class="issue-thumb" src="${videoPreviewUrl}" muted playsinline preload="metadata"></video><span class="media-badge">VIDEO</span></div></button>`
          : `<button type="button" class="issue-thumb-trigger media-open-immediate" data-open-issue-thumb="${issue.id}" aria-label="${txt('ดูรูปใหญ่', 'Open media preview')}"><div class="issue-thumb placeholder">DONE</div></button>`;
      const closedMeta = issue.closed_at ? `<span>•</span><span>${txt('ปิดเมื่อ', 'Closed')} ${formatDateTime(issue.closed_at)}</span>` : '';
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
                <div class="status-pill status-closed">${txt('ปิดแล้ว', 'Closed')}</div>
              </div>
            </div>
            <div class="issue-desc">${escapeHtml(issue.description || '')}</div>
            <div class="meta-row">
              <span>${escapeHtml(issue.issue_no || issue.id)}</span>
              <span>•</span>
              <span>${txt('ปิดโดย', 'Closed by')} ${escapeHtml(issue.closed_by_name || '-')}</span>
            </div>
            <div class="issue-actions">
              <button class="mini-btn" data-open-issue="${issue.id}">${txt('เปิดรายละเอียด', 'Open Detail')}</button>
              ${canWorkIssue(issue) ? `<button class="mini-btn" data-status-action="open" data-issue-id="${issue.id}">${txt('เปิดกลับ', 'Reopen')}</button>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    qsa('[data-open-issue]', el.closedList).forEach(btn => btn.addEventListener('click', () => openIssueModal(btn.dataset.openIssue)));
    qsa('[data-open-issue-thumb]', el.closedList).forEach(btn => btn.addEventListener('click', () => openIssueMediaPreview(btn.dataset.openIssueThumb)));
    qsa('[data-status-action]', el.closedList).forEach(btn => btn.addEventListener('click', () => {
      updateIssueStatus(btn.dataset.issueId, btn.dataset.statusAction);
    }));
    qsa('[data-open-checklist-run]', el.closedList).forEach(btn => btn.addEventListener('click', () => openChecklistRunSummary(btn.dataset.openChecklistRun)));
    qsa('[data-unarchive-checklist-run]', el.closedList).forEach(btn => btn.addEventListener('click', () => unarchiveChecklistRun(btn.dataset.unarchiveChecklistRun)));
  }


  function renderClosedSummary() {
    if (!el.closedSummaryStats || !el.closedSummaryList) return;
    const issues = getClosedSummaryIssuesForCurrentUser();
    const stats = buildClosedSummaryStats(issues);

    el.closedSummaryStats.innerHTML = `
      <article class="closed-summary-stat-card">
        <div class="summary-label">${txt('งานปิดทั้งหมด', 'Total Closed')}</div>
        <div class="summary-value">${stats.total}</div>
        <div class="summary-hint">${escapeHtml(getClosedSummaryRangeLabel())}</div>
      </article>
      <article class="closed-summary-stat-card">
        <div class="summary-label">${txt('ปิดภายในวันเดียว', 'Same-day Closed')}</div>
        <div class="summary-value">${stats.sameDay}</div>
        <div class="summary-hint">${txt('จากวันที่สร้างถึงวันที่ปิด', 'Created date to closed date')}</div>
      </article>
      <article class="closed-summary-stat-card">
        <div class="summary-label">${txt('เวลาปิดเฉลี่ย', 'Average Closing Time')}</div>
        <div class="summary-value">${escapeHtml(stats.averageCloseTime)}</div>
        <div class="summary-hint">${txt('คำนวณจาก created_at ถึง closed_at', 'Calculated from created_at to closed_at')}</div>
      </article>
      <article class="closed-summary-stat-card">
        <div class="summary-label">${txt('มีรูปหลังส่งงาน', 'With After Evidence')}</div>
        <div class="summary-value">${stats.withAfter}</div>
        <div class="summary-hint">${txt('งานที่มีรูป/วิดีโอหลังแก้ไข', 'Jobs with after photos/videos')}</div>
      </article>
    `;

    if (!issues.length) {
      el.closedSummaryList.innerHTML = `<div class="empty-state">${txt('ไม่พบงานปิดในช่วงวันที่ที่เลือก', 'No closed jobs found in the selected date range')}</div>`;
      return;
    }

    el.closedSummaryList.innerHTML = `
      <div class="closed-summary-breakdown">
        <div class="closed-summary-breakdown-box">
          <h4>${txt('แยกตามแผนก', 'By Department')}</h4>
          <div>${renderClosedSummaryBreakdown(stats.byDept)}</div>
        </div>
        <div class="closed-summary-breakdown-box">
          <h4>${txt('แยกตาม Priority', 'By Priority')}</h4>
          <div>${renderClosedSummaryBreakdown(stats.byPriority, true)}</div>
        </div>
      </div>
      <div class="closed-summary-result-head">
        <strong>${txt('รายการงานที่ปิดจบ', 'Closed job list')}</strong>
        <span>${issues.length} ${txt('รายการ', 'items')}</span>
      </div>
      ${issues.map(issue => renderClosedSummaryIssueCard(issue)).join('')}
    `;

    qsa('[data-summary-open-issue]', el.closedSummaryList).forEach(btn => btn.addEventListener('click', () => openIssueModal(btn.dataset.summaryOpenIssue)));
    qsa('[data-open-closed-summary-media]', el.closedSummaryList).forEach(btn => btn.addEventListener('click', () => {
      openClosedSummaryMediaPreview(btn.dataset.openClosedSummaryMedia, btn.dataset.summaryMediaPhase || 'all', Number(btn.dataset.summaryMediaIndex || 0));
    }));
  }

  function getClosedSummaryIssuesForCurrentUser() {
    if (!state.currentUser) return [];
    const search = state.ui.closedSummarySearch;
    const fromDate = state.ui.closedSummaryFromDate;
    const toDate = state.ui.closedSummaryToDate;
    return getVisibleIssuesForCurrentUser()
      .filter(issue => issue.status === 'closed' && issue.issue_type !== 'checklist_submission')
      .filter(issue => {
        const closedKey = toDateKey(getIssueFilterDate(issue, 'closed'));
        const dateMatch = isDateKeyInRange(closedKey, fromDate, toDate);
        const deptName = getDepartmentName(normalizeDepartmentValue(issue.assigned_department, ''));
        const hay = [issue.issue_no, issue.title, issue.description, issue.location_text, issue.assigned_department, deptName, issue.closed_by_name, issue.reported_by_name].join(' ').toLowerCase();
        const searchMatch = !search || hay.includes(search);
        return dateMatch && searchMatch;
      })
      .sort((a, b) => new Date(b.closed_at || b.updated_at || b.created_at || 0) - new Date(a.closed_at || a.updated_at || a.created_at || 0));
  }

  function isDateKeyInRange(dateKey, fromDate = '', toDate = '') {
    if (!dateKey) return false;
    const start = fromDate || '';
    const end = toDate || '';
    if (start && dateKey < start) return false;
    if (end && dateKey > end) return false;
    return true;
  }

  function getClosedSummaryRangeLabel() {
    const fromDate = state.ui.closedSummaryFromDate;
    const toDate = state.ui.closedSummaryToDate;
    if (fromDate && toDate) return `${txt('ช่วง', 'Range')} ${fromDate} → ${toDate}`;
    if (fromDate) return `${txt('ตั้งแต่', 'From')} ${fromDate}`;
    if (toDate) return `${txt('ถึง', 'Until')} ${toDate}`;
    return txt('ทุกวันที่มีข้อมูล', 'All available dates');
  }

  function buildClosedSummaryStats(issues = []) {
    const byDept = {};
    const byPriority = {};
    let sameDay = 0;
    let withAfter = 0;
    let totalCloseMs = 0;
    let closeMsCount = 0;

    issues.forEach(issue => {
      const dept = getDepartmentName(normalizeDepartmentValue(issue.assigned_department, '')) || '-';
      byDept[dept] = (byDept[dept] || 0) + 1;
      const priority = translatePriority(issue.priority || 'medium');
      byPriority[priority] = (byPriority[priority] || 0) + 1;
      const createdKey = toDateKey(issue.created_at);
      const closedKey = toDateKey(issue.closed_at || issue.updated_at);
      if (createdKey && closedKey && createdKey === closedKey) sameDay += 1;
      const afterCount = countIssueMedia(issue, 'after');
      if (afterCount > 0) withAfter += 1;
      const created = issue.created_at ? new Date(issue.created_at) : null;
      const closed = issue.closed_at ? new Date(issue.closed_at) : (issue.updated_at ? new Date(issue.updated_at) : null);
      if (created && closed && !Number.isNaN(created.getTime()) && !Number.isNaN(closed.getTime()) && closed >= created) {
        totalCloseMs += closed - created;
        closeMsCount += 1;
      }
    });

    return {
      total: issues.length,
      byDept,
      byPriority,
      sameDay,
      withAfter,
      averageCloseTime: closeMsCount ? formatDurationShort(totalCloseMs / closeMsCount) : '-',
    };
  }

  function renderClosedSummaryBreakdown(map = {}, priorityMode = false) {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return `<div class="muted">-</div>`;
    return entries.map(([label, count]) => `
      <div class="closed-summary-breakdown-row">
        <span>${escapeHtml(label)}</span>
        <strong>${count}</strong>
      </div>
    `).join('');
  }

  function countIssueMedia(issue = {}, phase = 'all') {
    const items = getIssueMediaItems(issue);
    if (phase === 'all') return items.length;
    return items.filter(item => item.phase === phase).length;
  }

  function getIssueMediaThumbs(issue = {}, phase = 'before', max = 3) {
    return getIssueMediaItems(issue).filter(item => item.phase === phase).slice(0, max);
  }

  function renderClosedSummaryMediaStrip(issue, phase = 'before') {
    const items = getIssueMediaThumbs(issue, phase, 4);
    const total = countIssueMedia(issue, phase);
    const title = phase === 'after' ? txt('หลังแก้ไข', 'After') : txt('ก่อนแก้ไข', 'Before');
    if (!items.length) {
      return `
        <div class="closed-summary-media-group empty">
          <div class="closed-summary-media-title">${title}</div>
          <div class="closed-summary-no-media">${txt('ไม่มีรูป', 'No media')}</div>
        </div>
      `;
    }
    return `
      <div class="closed-summary-media-group">
        <div class="closed-summary-media-title">${title} <span>${total}</span></div>
        <div class="closed-summary-thumbs">
          ${items.map((item, index) => `
            <button type="button" class="closed-summary-thumb" data-open-closed-summary-media="${escapeHtml(issue.id)}" data-summary-media-phase="${phase}" data-summary-media-index="${index}" aria-label="${escapeHtml(title)} ${index + 1}">
              ${item.type === 'video'
                ? `<span class="closed-summary-video-badge">VIDEO</span><video src="${escapeHtml(item.src)}" ${item.poster ? `poster="${escapeHtml(item.poster)}"` : ''} muted playsinline preload="metadata"></video>`
                : `<img src="${escapeHtml(item.thumb || item.src)}" alt="${escapeHtml(title)} ${index + 1}" />`}
            </button>
          `).join('')}
        </div>
        <button type="button" class="mini-btn closed-summary-view-media" data-open-closed-summary-media="${escapeHtml(issue.id)}" data-summary-media-phase="${phase}" data-summary-media-index="0">${txt('ดูทั้งหมด', 'View All')}</button>
      </div>
    `;
  }

  function renderClosedSummaryIssueCard(issue) {
    const deptName = getDepartmentName(normalizeDepartmentValue(issue.assigned_department, '')) || '-';
    const closedAt = issue.closed_at || issue.updated_at || issue.created_at;
    const createdAt = issue.created_at || '';
    const closeTime = getIssueCloseDuration(issue);
    return `
      <article class="closed-summary-card issue-tone-closed">
        <div class="closed-summary-card-top">
          <div>
            <div class="closed-summary-issue-no">${escapeHtml(issue.issue_no || issue.id || '-')}</div>
            <h4>${escapeHtml(issue.title || '-')}</h4>
            <div class="closed-summary-meta">
              <span>${escapeHtml(deptName)}</span>
              <span>•</span>
              <span>${escapeHtml(issue.location_text || '-')}</span>
              <span>•</span>
              <span>${escapeHtml(translatePriority(issue.priority || 'medium'))}</span>
            </div>
          </div>
          <div class="closed-summary-closed-chip">${txt('ปิดแล้ว', 'Closed')}</div>
        </div>
        ${issue.description ? `<div class="closed-summary-desc">${escapeHtml(issue.description)}</div>` : ''}
        <div class="closed-summary-info-grid">
          <div><span>${txt('เปิดงาน', 'Created')}</span><strong>${formatDateTime(createdAt)}</strong></div>
          <div><span>${txt('ปิดงาน', 'Closed')}</span><strong>${formatDateTime(closedAt)}</strong></div>
          <div><span>${txt('ใช้เวลา', 'Duration')}</span><strong>${escapeHtml(closeTime)}</strong></div>
          <div><span>${txt('ปิดโดย', 'Closed by')}</span><strong>${escapeHtml(issue.closed_by_name || '-')}</strong></div>
        </div>
        <div class="closed-summary-media-compare">
          ${renderClosedSummaryMediaStrip(issue, 'before')}
          ${renderClosedSummaryMediaStrip(issue, 'after')}
        </div>
        <div class="issue-actions closed-summary-actions">
          <button class="mini-btn" data-summary-open-issue="${escapeHtml(issue.id)}">${txt('เปิดรายละเอียด', 'Open Detail')}</button>
          <button class="mini-btn" data-open-closed-summary-media="${escapeHtml(issue.id)}" data-summary-media-phase="all" data-summary-media-index="0">${txt('ดูรูปก่อน/หลังทั้งหมด', 'View all before/after media')}</button>
        </div>
      </article>
    `;
  }

  function openClosedSummaryMediaPreview(issueId, phase = 'all', startIndex = 0) {
    const issue = state.data.issues.find(i => String(i.id) === String(issueId));
    if (!issue) return;
    let items = getIssueMediaItems(issue);
    if (phase && phase !== 'all') items = items.filter(item => item.phase === phase);
    if (!items.length) {
      openIssueModal(issueId);
      return;
    }
    const phaseLabel = phase === 'before' ? txt('ก่อนแก้ไข', 'Before') : (phase === 'after' ? txt('หลังแก้ไข', 'After') : txt('รูปก่อน/หลังทั้งหมด', 'All before/after media'));
    openMediaPreviewModal({
      items,
      startIndex: Number.isFinite(startIndex) ? startIndex : 0,
      issueId: issue.id,
      title: `${phaseLabel}: ${issue.title || issue.issue_no || ''}`,
      meta: `${issue.issue_no || issue.id || '-'} • ${getDepartmentName(normalizeDepartmentValue(issue.assigned_department, ''))} • ${formatDateTime(issue.closed_at || issue.updated_at)}`,
      description: issue.description || ''
    });
  }

  function getIssueCloseDuration(issue = {}) {
    const created = issue.created_at ? new Date(issue.created_at) : null;
    const closed = issue.closed_at ? new Date(issue.closed_at) : (issue.updated_at ? new Date(issue.updated_at) : null);
    if (!created || !closed || Number.isNaN(created.getTime()) || Number.isNaN(closed.getTime()) || closed < created) return '-';
    return formatDurationShort(closed - created);
  }

  function formatDurationShort(ms) {
    if (!Number.isFinite(ms) || ms < 0) return '-';
    const totalMinutes = Math.round(ms / 60000);
    if (totalMinutes < 60) return `${Math.max(1, totalMinutes)} ${txt('นาที', 'min')}`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return minutes ? `${hours} ${txt('ชม.', 'h')} ${minutes} ${txt('นาที', 'm')}` : `${hours} ${txt('ชม.', 'h')}`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours ? `${days} ${txt('วัน', 'd')} ${remainHours} ${txt('ชม.', 'h')}` : `${days} ${txt('วัน', 'd')}`;
  }

  function renderBoard() {
    if (state.ui.boardFilter === 'closed') state.ui.boardFilter = 'all';
    const boardItems = getBoardFeedItems();

    if (!boardItems.length && isBoardDataLoading()) {
      el.boardList.innerHTML = `<div class="empty-state board-loading-state"><span class="spinner-dot"></span>${txt('กำลังโหลดข้อมูลงาน...', 'Loading work data...')}</div>`;
      return;
    }

    if (!boardItems.length) {
      el.boardList.innerHTML = `<div class="empty-state">${txt('ยังไม่มีรายการในมุมมองนี้', 'No items in this view')}</div>`;
      return;
    }

    el.boardList.innerHTML = boardItems.map(item => {
      if (item.board_type === 'checklist_run') {
        return renderChecklistBoardCard(item);
      }
      const issue = item;
      const deptName = getDepartmentName(normalizeDepartmentValue(issue.assigned_department, 'ENG'));
      const { thumb, full: fullCover, hasVideo, photoCount, videoCount, videoPreviewUrl } = getIssueCoverMedia(issue);
      const priority = issue.priority || 'medium';
      const status = issue.status || 'open';
      const stripClass = status === 'closed' ? 'done' : priority;
      const mediaSummary = [];
      mediaSummary.push(`💬 ${issue.comment_count || 0}`);
      if (photoCount > 0) mediaSummary.push(`📷 ${photoCount}`);
      if (videoCount > 0) mediaSummary.push(`🎥 ${videoCount}`);
      const thumbInner = thumb
        ? `<img src="${thumb}" alt="Issue photo" />`
        : videoPreviewUrl
          ? `<video src="${videoPreviewUrl}" muted playsinline preload="metadata"></video>`
          : `<div class="laya-board-thumb-placeholder">${hasVideo ? 'VIDEO' : (issue.issue_type === 'checklist_submission' ? 'CHECK' : 'NO PHOTO')}</div>`;
      const thumbHtml = `<button type="button" class="laya-board-thumb-trigger issue-thumb-trigger media-open-immediate" data-open-issue-thumb="${issue.id}" aria-label="${txt('ดูรูปใหญ่', 'Open media preview')}"><div class="laya-board-thumb">${thumbInner}${hasVideo ? '<span class="media-badge">VIDEO</span>' : ''}</div></button>`;
      const statusLabel = translateStatus(status);
      const priorityLabel = translatePriority(priority);
      return `
        <article class="issue-card laya-board-card ${getIssueCardToneClass(issue)} laya-board-priority-${priority}" data-board-card-open="${issue.id}">
          <div class="laya-card-strip strip-${stripClass}"></div>
          <div class="laya-board-card-body">
            <div class="laya-board-title-row">
              <div class="laya-board-title-area">
                <div class="laya-board-title">${escapeHtml(issue.title)}</div>
                <div class="laya-board-meta">
                  <span class="laya-meta-dept">${escapeHtml(deptName)}</span>
                  <span class="laya-meta-dot"></span>
                  <span>${escapeHtml(issue.location_text || '-')}</span>
                  <span class="laya-meta-dot"></span>
                  <span>${formatDateTime(issue.created_at)}</span>
                </div>
              </div>
              ${thumbHtml}
            </div>
            <div class="laya-board-tags">
              ${issue.issue_type === 'checklist_submission'
                ? `<span class="laya-board-tag laya-status-closed">${txt('เช็กลิสต์', 'Checklist')}</span>`
                : `<span class="laya-board-tag laya-status-${status}">${escapeHtml(statusLabel)}</span><span class="laya-board-tag laya-priority-${priority}">${escapeHtml(priorityLabel)}</span>`}
            </div>
            <div class="laya-board-desc">${escapeHtml(issue.description || '')}</div>
            <div class="laya-board-footer">
              <div class="laya-board-info">
                <div class="laya-board-footer-meta">
                  <span>${mediaSummary.join(' • ')}</span>
                  <span class="laya-meta-dot"></span>
                  <span>${txt('แจ้งโดย', 'Reported by')} ${escapeHtml(issue.reported_by_name || '-')}</span>
                </div>
                <div class="laya-board-id">${escapeHtml(issue.issue_no || issue.id)}</div>
              </div>
              <div class="issue-actions laya-board-actions">
                <button class="mini-btn" data-open-issue="${issue.id}">${txt('ดูรายละเอียด', 'Open Detail')}</button>
                ${renderQuickStatusButtons(issue)}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    qsa('[data-board-card-open]', el.boardList).forEach(card => card.addEventListener('click', (event) => {
      if (event.target.closest('button, a, input, select, textarea, label')) return;
      openIssueModal(card.dataset.boardCardOpen);
    }));
    qsa('[data-board-checklist-open]', el.boardList).forEach(card => card.addEventListener('click', (event) => {
      if (event.target.closest('button, a, input, select, textarea, label')) return;
      openChecklistRunSummary(card.dataset.boardChecklistOpen);
    }));
    qsa('[data-open-issue]', el.boardList).forEach(btn => btn.addEventListener('click', () => openIssueModal(btn.dataset.openIssue)));
    qsa('[data-open-issue-thumb]', el.boardList).forEach(btn => btn.addEventListener('click', () => openIssueMediaPreview(btn.dataset.openIssueThumb)));
    qsa('[data-status-action]', el.boardList).forEach(btn => btn.addEventListener('click', () => {
      updateIssueStatus(btn.dataset.issueId, btn.dataset.statusAction);
    }));
    qsa('[data-open-checklist-run]', el.boardList).forEach(btn => btn.addEventListener('click', () => openChecklistRunSummary(btn.dataset.openChecklistRun)));
    qsa('[data-archive-checklist-run]', el.boardList).forEach(btn => btn.addEventListener('click', () => archiveChecklistRun(btn.dataset.archiveChecklistRun)));
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
    if (issue.status === 'open') buttons.push(`<button class="mini-btn" data-status-action="in_progress" data-issue-id="${issue.id}">${txt('เริ่มงาน', 'Start Work')}</button>`);
    if (issue.status !== 'closed') buttons.push(`<button class="mini-btn" data-status-action="closed" data-issue-id="${issue.id}">${txt('ปิดงาน', 'Close')}</button>`);
    if (issue.status === 'closed') buttons.push(`<button class="mini-btn" data-status-action="open" data-issue-id="${issue.id}">${txt('เปิดกลับ', 'Reopen')}</button>`);
    return buttons.join('');
  }

  function renderChecklistBoardCard(run) {
    const failCount = run.fail_count || 0;
    const issueCount = run.issue_count || 0;
    const desc = `${runTemplateLabel(run)} • ${run.pass_count || 0} ${txt('ผ่าน', 'pass')} • ${failCount} ${txt('ไม่ผ่าน', 'fail')} • ${run.na_count || 0} N/A${issueCount ? ` • ${issueCount} ${txt('รายการ', 'issue')}` : ''}`;
    const statusText = txt('ส่งแล้ว', 'Submitted');
    return `
      <article class="issue-card laya-board-card laya-board-checklist-card issue-tone-closed" data-board-checklist-open="${run.id}">
        <div class="laya-card-strip strip-checklist"></div>
        <div class="laya-board-card-body">
          <div class="laya-board-title-row">
            <div class="laya-board-title-area">
              <div class="laya-board-title">📋 ${txt('ส่งเช็กลิสต์แล้ว:', 'Checklist submitted:')} ${escapeHtml(runTemplateLabel(run))}</div>
              <div class="laya-board-meta">
                <span class="laya-meta-dept">${txt('Checklist', 'Checklist')}</span>
                <span class="laya-meta-dot"></span>
                <span>${escapeHtml(run.location_text || '-')}</span>
                <span class="laya-meta-dot"></span>
                <span>${formatDateTime(run.submitted_at || run.created_at)}</span>
              </div>
            </div>
            <button type="button" class="laya-board-thumb-trigger" data-open-checklist-run="${run.id}" aria-label="${txt('เปิดสรุปเช็กลิสต์', 'Open checklist summary')}">
              <div class="laya-board-thumb"><div class="laya-board-thumb-placeholder">DONE</div></div>
            </button>
          </div>
          <div class="laya-board-tags">
            <span class="laya-board-tag laya-status-closed">✅ ${escapeHtml(statusText)}</span>
            <span class="laya-board-tag laya-priority-low">${txt('เช็กลิสต์', 'Checklist')}</span>
          </div>
          <div class="laya-board-desc">${escapeHtml(desc)}</div>
          <div class="laya-board-footer">
            <div class="laya-board-info">
              <div class="laya-board-footer-meta">
                <span>${txt('ผู้ตรวจ', 'Inspector')} ${escapeHtml(run.inspector_name || '-')}</span>
                <span class="laya-meta-dot"></span>
                <span>${issueCount || 0} ${txt('Issue', 'Issue')}</span>
              </div>
              <div class="laya-board-id">${escapeHtml(run.run_no || run.id)}</div>
            </div>
            <div class="issue-actions laya-board-actions">
              <button class="mini-btn" data-open-checklist-run="${run.id}">${txt('เปิดสรุป', 'Open Summary')}</button>
              <button class="mini-btn" data-archive-checklist-run="${run.id}">${txt('ปิดการ์ด', 'Close')}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function getBoardFeedItems() {
    const issueItems = dedupeChecklistIssuesForBoard(applyBoardFilters(getVisibleIssuesForCurrentUser()).sort(sortIssues));
    const checklistItems = getVisibleChecklistRunsForBoard();
    return [...issueItems, ...checklistItems].sort(sortBoardItems);
  }

  function getVisibleChecklistRunsForBoard() {
    if (!state.currentUser) return [];
    const filter = state.ui.boardFilter;
    const search = state.ui.boardSearch;
    if (!(filter === 'all' || filter === 'mine')) return [];
    let runs = [...(state.data.checklistRuns || [])].filter(isChecklistRunVisibleOnBoard);
    if (filter === 'mine') {
      runs = runs.filter(run => (run.inspector_department || 'MOD') === state.currentUser.department);
    }
    if (search) {
      runs = runs.filter(run => [run.template_name, run.template_name_th, run.location_text, run.run_no, run.inspector_name].join(' ').toLowerCase().includes(search));
    }
    runs = runs.filter(run => matchesDateFilter(getChecklistRunFilterDate(run, 'board'), state.ui.boardDateFilter));
    runs = dedupeChecklistRunsForBoard(runs);
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
    state.ui.openChecklistRunId = runId;
    state.ui.openIssueId = null;
    const answerHtml = (run.answers || []).map(ans => `
      <div class="comment-item">
        <div class="comment-meta">${escapeHtml(runSectionLabel(ans) || '')}</div>
        <div><strong>${escapeHtml(runItemLabel(ans) || '')}</strong></div>
        <div class="meta-row"><span>${escapeHtml((ans.response || '').toUpperCase())}</span>${ans.create_issue ? `<span>•</span><span>${txt('สร้าง Issue แล้ว', 'Issue created')}</span>` : ''}</div>
        ${ans.note ? `<div>${escapeHtml(ans.note)}</div>` : ''}
      </div>
    `).join('');
    const specialFormHtml = (run.special_form_entries || []).map(entry => `
      <div class="comment-item">
        <div class="comment-meta">${escapeHtml(runSectionLabel(entry) || '')}</div>
        <div>${escapeHtml(entry.value || '')}</div>
      </div>
    `).join('');
    el.issueModalContent.innerHTML = `
      <div class="issue-detail-grid">
        <div>
          <div class="panel glass inner-panel">
            <div class="panel-header"><h3>${escapeHtml(runTemplateLabel(run))}</h3></div>
            <div class="detail-meta">
              <div><strong>${txt('เลขที่รอบตรวจ', 'Run No')}:</strong> ${escapeHtml(run.run_no || run.id)}</div>
              <div><strong>${txt('ผู้ตรวจ', 'Inspector')}:</strong> ${escapeHtml(run.inspector_name || '-')}</div>
              <div><strong>${txt('ตำแหน่ง', 'Location')}:</strong> ${escapeHtml(run.location_text || '-')}</div>
              <div><strong>${txt('วันที่', 'Date')}:</strong> ${formatDateTime(run.submitted_at || run.created_at)}</div>
              <div><strong>${txt('ผลลัพธ์', 'Result')}:</strong> ${run.pass_count || 0} ${txt('ผ่าน', 'pass')} • ${run.fail_count || 0} ${txt('ไม่ผ่าน', 'fail')} • ${run.na_count || 0} N/A</div>
            </div>
          </div>
        </div>
        <div>
          <div class="panel glass inner-panel">
            <div class="panel-header"><h3>${txt('คำตอบเช็กลิสต์', 'Checklist Answers')}</h3></div>
            <div class="comments-list">${answerHtml || `<div class="empty-state">${txt('ยังไม่มีคำตอบ', 'No answers')}</div>`}</div>
          </div>
          <div class="panel glass inner-panel" style="margin-top:12px;">
            <div class="panel-header"><h3>${txt('ฟอร์มพิเศษ', 'Special Forms')}</h3></div>
            <div class="comments-list">${specialFormHtml || `<div class="empty-state">${txt('ยังไม่มีข้อมูลฟอร์มพิเศษ', 'No special form entries')}</div>`}</div>
          </div>
        </div>
      </div>
    `;
    el.issueModal.classList.remove('hidden');
  }

  function renderIssuePhotoPreviewGrid(items = []) {
    if (!el.issuePhotoPreviewGrid) return;
    if (!items.length) {
      el.issuePhotoPreviewGrid.innerHTML = '';
      el.issuePhotoPreviewGrid.classList.add('hidden');
      return;
    }
    el.issuePhotoPreviewGrid.innerHTML = items.map((item, index) => `
      <div class="photo-preview-card">
        <img src="${escapeHtml(item.previewDataUrl || item.thumbDataUrl || item.fullDataUrl || '')}" alt="Issue photo ${index + 1}" />
        <div class="photo-preview-badge">รูป ${index + 1}</div>
      </div>
    `).join('');
    el.issuePhotoPreviewGrid.classList.remove('hidden');
  }


  function setIssueCoverHint(message, tone = '') {
    if (!el.issueCoverPhotoHint) return;
    el.issueCoverPhotoHint.textContent = message;
    el.issueCoverPhotoHint.classList.remove('error', 'success');
    if (tone) el.issueCoverPhotoHint.classList.add(tone);
  }

  function renderIssueCoverPreview(item = null) {
    if (!el.issueCoverPhotoPreviewGrid) return;
    if (!item) {
      el.issueCoverPhotoPreviewGrid.innerHTML = '';
      el.issueCoverPhotoPreviewGrid.classList.add('hidden');
      return;
    }
    el.issueCoverPhotoPreviewGrid.innerHTML = `
      <div class="photo-preview-card">
        <img src="${escapeHtml(item.previewDataUrl || item.thumbDataUrl || item.fullDataUrl || '')}" alt="Issue cover" />
        <div class="photo-preview-badge cover-badge">${txt('COVER', 'COVER')}</div>
      </div>
    `;
    el.issueCoverPhotoPreviewGrid.classList.remove('hidden');
  }

  async function handleIssueCoverPhotoPicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!file.type || !file.type.startsWith('image/')) {
        throw new Error('invalid_file_type');
      }
      setIssueCoverHint(txt('กำลังเตรียมภาพ Cover…', 'Preparing cover image...'), '');
      const optimized = await optimizeIssuePhoto(file);
      state.ui.pendingIssueCoverPhoto = optimized;
      if (event?.target) event.target.value = '';
      if (el.issueCoverPhotoInput) el.issueCoverPhotoInput.value = '';
      if (el.issueCoverPhotoCameraInput) el.issueCoverPhotoCameraInput.value = '';
      renderIssueCoverPreview(optimized);
      setIssueCoverHint(txt(`ตั้งภาพ Cover แล้ว • ${formatBytes(optimized.originalBytes || 0)} → ${formatBytes(optimized.fullBytes || 0)}`, `Cover image ready • ${formatBytes(optimized.originalBytes || 0)} → ${formatBytes(optimized.fullBytes || 0)}`), 'success');
    } catch (err) {
      console.error('Issue cover process failed', err);
      if (event?.target) event.target.value = '';
      if (el.issueCoverPhotoInput) el.issueCoverPhotoInput.value = '';
      if (el.issueCoverPhotoCameraInput) el.issueCoverPhotoCameraInput.value = '';
      renderIssueCoverPreview(null);
      state.ui.pendingIssueCoverPhoto = null;
      const msg = err?.message === 'invalid_file_type'
        ? txt('มีไฟล์ที่ไม่ใช่รูปภาพสำหรับ Cover', 'Selected file is not an image for cover')
        : txt('เลือกรูป Cover ไม่สำเร็จ ลองใช้ JPG/PNG แล้วลองอีกครั้ง', 'Could not prepare cover image. Please try JPG/PNG again.');
      setIssueCoverHint(msg, 'error');
      alert(msg);
    }
  }

  function getIssueCoverMedia(issue = {}) {
    const beforePhotos = Array.isArray(issue.before_photos) ? issue.before_photos.filter(Boolean) : [];
    const beforeVideos = Array.isArray(issue.before_videos) ? issue.before_videos.filter(Boolean) : [];
    const afterPhotos = Array.isArray(issue.after_photos) ? issue.after_photos.filter(Boolean) : [];
    const afterVideos = Array.isArray(issue.after_videos) ? issue.after_videos.filter(Boolean) : [];

    const firstPhoto = beforePhotos[0] || afterPhotos[0] || null;
    const firstVideo = beforeVideos[0] || afterVideos[0] || null;
    const thumb = issue.cover_thumb_url || issue.cover_photo_url || firstPhoto?.thumb_url || firstPhoto?.url || firstVideo?.thumb_url || firstVideo?.poster_url || '';
    const full = issue.cover_photo_url || firstPhoto?.url || firstVideo?.poster_url || firstVideo?.url || thumb || '';
    const hasVideo = beforeVideos.length > 0 || afterVideos.length > 0;
    const photoCount = beforePhotos.length + afterPhotos.length;
    const videoCount = beforeVideos.length + afterVideos.length;
    const videoPreviewUrl = firstVideo?.url || '';
    return { thumb, full, hasVideo, photoCount, videoCount, videoPreviewUrl };
  }


  function getIssuePrimaryMedia(issue = {}) {
    const beforePhotos = Array.isArray(issue.before_photos) ? issue.before_photos.filter(Boolean) : [];
    const beforeVideos = Array.isArray(issue.before_videos) ? issue.before_videos.filter(Boolean) : [];
    const afterPhotos = Array.isArray(issue.after_photos) ? issue.after_photos.filter(Boolean) : [];
    const afterVideos = Array.isArray(issue.after_videos) ? issue.after_videos.filter(Boolean) : [];
    const firstPhoto = beforePhotos[0] || afterPhotos[0] || null;
    const firstVideo = beforeVideos[0] || afterVideos[0] || null;
    if (firstPhoto?.url || issue.cover_photo_url) {
      return {
        type: 'image',
        src: issue.cover_photo_url || firstPhoto?.url || firstPhoto?.thumb_url || '',
        poster: '',
      };
    }
    if (firstVideo?.url) {
      return {
        type: 'video',
        src: firstVideo.url,
        poster: firstVideo.poster_url || firstVideo.thumb_url || '',
      };
    }
    return null;
  }

  function getIssueMediaItems(issue) {
    const items = [];
    const pushPhotoGroup = (list = [], phase = 'before') => {
      list.filter(Boolean).forEach((photo, index) => {
        const src = photo.url || photo.fullDataUrl || photo.previewDataUrl || photo.thumb_url || photo.thumbDataUrl || '';
        if (!src) return;
        items.push({
          type: 'image',
          src,
          poster: '',
          thumb: photo.thumb_url || photo.thumbDataUrl || photo.url || src || '',
          phase,
          index,
          label: phase === 'after' ? txt('หลักฐานรูป', 'After photo') : txt('รูปแจ้งงาน', 'Before photo')
        });
      });
    };
    const pushVideoGroup = (list = [], phase = 'before') => {
      list.filter(Boolean).forEach((video, index) => {
        const src = video.url || video.preview_url || '';
        if (!src) return;
        items.push({
          type: 'video',
          src,
          poster: video.poster_url || video.thumb_url || '',
          thumb: video.poster_url || video.thumb_url || '',
          phase,
          index,
          label: phase === 'after' ? txt('หลักฐานวิดีโอ', 'After video') : txt('วิดีโอแจ้งงาน', 'Before video')
        });
      });
    };
    pushPhotoGroup(Array.isArray(issue.before_photos) ? issue.before_photos : [], 'before');
    pushVideoGroup(Array.isArray(issue.before_videos) ? issue.before_videos : [], 'before');
    pushPhotoGroup(Array.isArray(issue.after_photos) ? issue.after_photos : [], 'after');
    pushVideoGroup(Array.isArray(issue.after_videos) ? issue.after_videos : [], 'after');
    return items;
  }

  function openIssueMediaPreview(issueId) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue) return;
    const items = getIssueMediaItems(issue);
    if (!items.length) {
      const media = getIssuePrimaryMedia(issue);
      if (!media?.src) {
        openIssueModal(issueId);
        return;
      }
      items.push({ type: media.type, src: media.src, poster: media.poster || '', thumb: media.poster || media.src || '', phase: 'before', index: 0, label: media.type === 'video' ? txt('วิดีโอ', 'Video') : txt('รูป', 'Photo') });
    }
    openMediaPreviewModal({
      items,
      startIndex: 0,
      issueId: issue.id,
      title: issue.title || txt('ดูสื่อ', 'Media preview'),
      meta: `${getDepartmentName(normalizeDepartmentValue(issue.assigned_department, 'ENG'))} • ${issue.location_text || '-'} • ${formatDateTime(issue.created_at)}`,
      description: issue.description || ''
    });
  }

  function renderMediaPreviewItem() {
    if (!el.mediaPreviewBody) return;
    const items = Array.isArray(state.ui.mediaPreviewItems) ? state.ui.mediaPreviewItems : [];
    if (!items.length) {
      el.mediaPreviewBody.innerHTML = '';
      if (el.mediaPreviewCounter) el.mediaPreviewCounter.textContent = '0 / 0';
      if (el.mediaPreviewPrevBtn) el.mediaPreviewPrevBtn.disabled = true;
      if (el.mediaPreviewNextBtn) el.mediaPreviewNextBtn.disabled = true;
      return;
    }
    const current = items[state.ui.mediaPreviewIndex] || items[0];
    const itemLabel = current.label ? ` • ${current.label} ${current.index + 1}` : '';
    if (el.mediaPreviewCounter) el.mediaPreviewCounter.textContent = `${state.ui.mediaPreviewIndex + 1} / ${items.length}${itemLabel}`;
    if (el.mediaPreviewPrevBtn) el.mediaPreviewPrevBtn.disabled = items.length <= 1;
    if (el.mediaPreviewNextBtn) el.mediaPreviewNextBtn.disabled = items.length <= 1;
    if (current.type === 'video') {
      el.mediaPreviewBody.innerHTML = `<video src="${escapeHtml(current.src)}" ${current.poster ? `poster="${escapeHtml(current.poster)}"` : ''} controls autoplay playsinline preload="metadata"></video>`;
    } else {
      el.mediaPreviewBody.innerHTML = `<img src="${escapeHtml(current.src)}" alt="${escapeHtml(current.label || 'Preview')}" />`;
    }
  }

  function setMediaPreviewIndex(nextIndex = 0) {
    const items = Array.isArray(state.ui.mediaPreviewItems) ? state.ui.mediaPreviewItems : [];
    if (!items.length) return;
    const total = items.length;
    state.ui.mediaPreviewIndex = ((nextIndex % total) + total) % total;
    renderMediaPreviewItem();
  }

  function showPrevMediaPreviewItem() {
    if (!state.ui.mediaPreviewOpen) return;
    setMediaPreviewIndex(state.ui.mediaPreviewIndex - 1);
  }

  function showNextMediaPreviewItem() {
    if (!state.ui.mediaPreviewOpen) return;
    setMediaPreviewIndex(state.ui.mediaPreviewIndex + 1);
  }

  function handleMediaPreviewTouchStart(event) {
    const touch = event.touches?.[0];
    state.ui.mediaPreviewTouchStartX = touch ? touch.clientX : 0;
  }

  function handleMediaPreviewTouchEnd(event) {
    const touch = event.changedTouches?.[0];
    if (!touch || !state.ui.mediaPreviewTouchStartX) return;
    const deltaX = touch.clientX - state.ui.mediaPreviewTouchStartX;
    state.ui.mediaPreviewTouchStartX = 0;
    if (Math.abs(deltaX) < 50) return;
    if (deltaX < 0) showNextMediaPreviewItem();
    else showPrevMediaPreviewItem();
  }

  function openMediaPreviewModal({ items = [], startIndex = 0, type = 'image', src = '', poster = '', issueId = '', title = '', meta = '', description = '' } = {}) {
    if (!el.mediaPreviewModal || !el.mediaPreviewBody) return;
    const normalizedItems = Array.isArray(items) && items.length
      ? items.filter(item => item && item.src)
      : (src ? [{ type, src, poster, thumb: poster || src, phase: 'before', index: 0, label: type === 'video' ? txt('วิดีโอ', 'Video') : txt('รูป', 'Photo') }] : []);
    if (!normalizedItems.length) return;
    state.ui.mediaPreviewOpen = true;
    state.ui.mediaPreviewIssueId = issueId || null;
    state.ui.mediaPreviewItems = normalizedItems;
    state.ui.mediaPreviewIndex = 0;
    if (el.mediaPreviewTitle) el.mediaPreviewTitle.textContent = title || txt('ดูรูปขนาดใหญ่', 'Large preview');
    if (el.mediaPreviewMeta) el.mediaPreviewMeta.textContent = meta || '';
    if (el.mediaPreviewDescription) {
      el.mediaPreviewDescription.textContent = description || '';
      el.mediaPreviewDescription.classList.toggle('hidden', !description);
    }
    if (el.mediaPreviewOpenDetailBtn) el.mediaPreviewOpenDetailBtn.classList.toggle('hidden', !issueId);
    setMediaPreviewIndex(startIndex);
    el.mediaPreviewModal.classList.remove('hidden');
  }

  function closeMediaPreviewModal() {
    state.ui.mediaPreviewOpen = false;
    state.ui.mediaPreviewIssueId = null;
    state.ui.mediaPreviewItems = [];
    state.ui.mediaPreviewIndex = 0;
    state.ui.mediaPreviewTouchStartX = 0;
    if (el.mediaPreviewBody) el.mediaPreviewBody.innerHTML = '';
    if (el.mediaPreviewCounter) el.mediaPreviewCounter.textContent = '1 / 1';
    if (el.mediaPreviewDescription) {
      el.mediaPreviewDescription.textContent = '';
      el.mediaPreviewDescription.classList.add('hidden');
    }
    if (el.mediaPreviewModal) el.mediaPreviewModal.classList.add('hidden');
  }

  async function handleIssuePhotoPicked(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setIssuePhotoHint(`กำลังย่อรูป 0/${files.length}...`, '');
      const optimizedItems = [];
      let originalTotal = 0;
      let compressedTotal = 0;
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (!file.type || !file.type.startsWith('image/')) {
          throw new Error('invalid_file_type');
        }
        setIssuePhotoHint(`กำลังย่อรูป ${i + 1}/${files.length}...`, '');
        const optimized = await optimizeIssuePhoto(file);
        optimizedItems.push(optimized);
        originalTotal += optimized.originalBytes || 0;
        compressedTotal += optimized.fullBytes || 0;
      }
      state.ui.pendingIssuePhotos = optimizedItems;
      event.target.value = '';
      renderIssuePhotoPreviewGrid(optimizedItems);
      setIssuePhotoHint(
        `เลือกรูปแล้ว ${optimizedItems.length} รูป • รวม ${formatBytes(originalTotal)} → ${formatBytes(compressedTotal)}`,
        'success'
      );
    } catch (err) {
      console.error('Issue photo process failed', err);
      if (event?.target) event.target.value = '';
      if (el.issuePhotoInput) el.issuePhotoInput.value = '';
      if (el.issuePhotoCameraInput) el.issuePhotoCameraInput.value = '';
      renderIssuePhotoPreviewGrid([]);
      state.ui.pendingIssuePhotos = [];
      const msg = err?.message === 'invalid_file_type'
        ? 'มีไฟล์ที่ไม่ใช่รูปภาพ'
        : 'เลือกรูปไม่สำเร็จ ลองใช้รูป JPG/PNG แล้วลองอีกครั้ง';
      setIssuePhotoHint(msg, 'error');
      alert(msg);
    }
  }

  function isAcceptedVideoFile(file) {
    if (!file) return false;
    const mime = String(file.type || '').toLowerCase();
    if (mime.startsWith('video/')) return true;
    const name = String(file.name || '').toLowerCase();
    return ['.mp4', '.mov', '.m4v', '.3gp', '.webm'].some(ext => name.endsWith(ext));
  }

  function getVideoSizeErrorText() {
    return txt(`วิดีโอต้องไม่เกิน ${MAX_VIDEO_UPLOAD_MB} MB`, `Video must be ${MAX_VIDEO_UPLOAD_MB} MB or smaller`);
  }

  async function handleIssueVideoPicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIssueVideoHint('กำลังเตรียมวิดีโอสำหรับอัปโหลด…', '');
      if (!isAcceptedVideoFile(file)) {
        throw new Error('invalid_video_type');
      }
      if ((file.size || 0) > MAX_VIDEO_UPLOAD_BYTES) {
        throw new Error('video_too_large');
      }
      const prepared = await prepareIssueVideo(file);
      event.target.value = '';
      revokeIssueVideoPreview();
      state.ui.pendingIssueVideo = prepared;
      const hasCurrentPhotoFile = Boolean(el.issuePhotoInput?.files?.length || state.ui.pendingIssuePhotos?.length);
      if (!hasCurrentPhotoFile) {
        state.ui.pendingIssuePhotos = [];
        renderIssuePhotoPreviewGrid([]);
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
      if (event?.target) event.target.value = '';
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
          ? getVideoSizeErrorText()
          : txt(`เลือกวิดีโอไม่สำเร็จ ลองไฟล์ MP4/MOV ที่ขนาดไม่เกิน ${MAX_VIDEO_UPLOAD_MB} MB`, `Could not select the video. Try MP4/MOV up to ${MAX_VIDEO_UPLOAD_MB} MB`);
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
    renderIssuePhotoPreviewGrid([]);
    state.ui.pendingIssuePhotos = [];
    if (el.issueCoverPhotoInput) el.issueCoverPhotoInput.value = '';
    if (el.issueCoverPhotoCameraInput) el.issueCoverPhotoCameraInput.value = '';
    renderIssueCoverPreview(null);
    state.ui.pendingIssueCoverPhoto = null;
    if (el.issueVideoInput) el.issueVideoInput.value = '';
    revokeIssueVideoPreview();
    state.ui.pendingIssueVideo = null;
    if (el.issueVideoPreview) {
      el.issueVideoPreview.pause();
      el.issueVideoPreview.removeAttribute('src');
      el.issueVideoPreview.classList.add('hidden');
    }
    setIssuePhotoHint('แนะนำรูปไม่เกิน 10 MB ต่อรูป • เลือกได้หลายรูป • ระบบจะย่อรูปก่อนบันทึกทุกครั้ง');
    setIssueVideoHint(`รองรับวิดีโอไม่เกิน ${MAX_VIDEO_UPLOAD_MB} MB • แนะนำ MP4/MOV • อัปตรงเข้า Storage ก่อน แล้วสร้าง preview ทีหลังอัตโนมัติ`);
    state.ui.newIssuePriority = 'medium';
    qsa('.segment', el.prioritySegment).forEach(seg => seg.classList.toggle('active', seg.dataset.value === 'medium'));
  }

  async function saveIssueFromForm() {
    if (!canCreateIssueForRole()) {
      alert(txt('บัญชีนี้ถูกปิดใช้งาน จึงไม่สามารถเปิด Issue ใหม่ได้', 'This account is inactive and cannot create new issues.'));
      return;
    }
    const title = el.issueTitle.value.trim();
    const description = el.issueDescription.value.trim();
    const issueType = el.issueType.value;
    const location = el.issueLocation.value.trim();
    const assignedDepartment = normalizeDepartmentValue(el.issueDepartment.value, 'ENG');
    const priority = state.ui.newIssuePriority;
    const pendingPhotos = Array.isArray(state.ui.pendingIssuePhotos) ? state.ui.pendingIssuePhotos : [];
    const pendingVideo = state.ui.pendingIssueVideo;
    const pendingCoverPhoto = state.ui.pendingIssueCoverPhoto;
    const beforePhotoItems = pendingCoverPhoto
      ? [
          { url: pendingCoverPhoto.fullDataUrl, thumb_url: pendingCoverPhoto.thumbDataUrl },
          ...pendingPhotos.map(photo => ({ url: photo.fullDataUrl, thumb_url: photo.thumbDataUrl }))
        ]
      : pendingPhotos.map(photo => ({ url: photo.fullDataUrl, thumb_url: photo.thumbDataUrl }));

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
        before_photos: beforePhotoItems,
        before_videos: pendingVideo ? [{
          file: pendingVideo.file,
          preview_url: pendingVideo.previewUrl,
          poster_url: pendingVideo.posterDataUrl,
          thumb_url: pendingVideo.thumbDataUrl,
          mime_type: pendingVideo.mimeType,
          original_name: pendingVideo.fileName,
          size: pendingVideo.originalBytes,
          preview_status: pendingVideo.posterDataUrl ? 'ready' : 'pending',
          compression_status: 'pending',
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
      el.saveIssueBtn.textContent = txt('💾 บันทึกปัญหา', '💾 Save Issue');
    }
  }

  async function createIssue(payload) {
    if (payload?.dedupe_key) {
      const existing = findActiveIssueByDedupeKey(payload.dedupe_key);
      if (existing) {
        await recordChecklistDuplicateIssueHit(existing, payload);
        return existing;
      }
    }
    if (isFirebaseLive()) {
      return createIssueFirebase(payload);
    }
    return createIssueLocal(payload);
  }

  function normalizeDedupePart(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'blank';
  }

  function buildChecklistIssueDedupeKey(templateCode, inspectionDate, locationText, itemCode, itemText = '') {
    const dateKey = toDateKey(inspectionDate || new Date().toISOString()) || toDateKey(new Date());
    return [
      'checklist',
      normalizeDedupePart(templateCode),
      normalizeDedupePart(dateKey),
      normalizeDedupePart(locationText || 'all_area'),
      normalizeDedupePart(itemCode || itemText)
    ].join('__');
  }

  function getChecklistIssueDedupeKey(issue) {
    if (!issue || issue.source_type !== 'checklist') return '';
    if (issue.dedupe_key) return issue.dedupe_key;
    return buildChecklistIssueDedupeKey(
      issue.source_checklist_template_code || 'legacy',
      issue.dedupe_date || issue.created_at || issue.updated_at,
      issue.location_text || '',
      issue.source_checklist_answer_id || '',
      issue.title || ''
    );
  }

  function findActiveIssueByDedupeKey(dedupeKey) {
    if (!dedupeKey) return null;
    return (state.data.issues || []).find(issue =>
      issue.source_type === 'checklist' &&
      issue.status !== 'closed' &&
      getChecklistIssueDedupeKey(issue) === dedupeKey
    ) || null;
  }

  function dedupeChecklistIssuesForBoard(issues) {
    const seen = new Set();
    return (issues || []).filter(issue => {
      const key = getChecklistIssueDedupeKey(issue);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getChecklistRunDedupeKey(run) {
    if (!run) return '';
    return buildChecklistIssueDedupeKey(
      run.template_code || run.template_name || 'checklist',
      run.inspection_date || run.submitted_at || run.created_at,
      run.location_text || '',
      'run_card',
      run.template_name || ''
    );
  }

  function dedupeChecklistRunsForBoard(runs) {
    const seen = new Set();
    return (runs || []).filter(run => {
      const key = getChecklistRunDedupeKey(run);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function recordChecklistDuplicateIssueHit(existingIssue, payload) {
    const now = new Date().toISOString();
    if (!existingIssue) return null;

    if (isFirebaseLive()) {
      const fb = window.LAYA_FIREBASE;
      const sdk = fb.sdk;
      const issueId = existingIssue.id || existingIssue;
      await sdk.runTransaction(fb.db, async (tx) => {
        const issueRef = sdk.doc(fb.db, 'issues', issueId);
        const snap = await tx.get(issueRef);
        if (!snap.exists()) return;
        const liveIssue = { id: snap.id, ...snap.data() };
        if (liveIssue.status === 'closed') return;
        const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
        tx.update(issueRef, {
          updated_at: sdk.serverTimestamp(),
          last_activity_at: sdk.serverTimestamp(),
          activity_count: sdk.increment(1),
        });
        tx.set(activityRef, {
          action: 'duplicate_checklist_fail_skipped',
          note: payload?.source_checklist_run_id
            ? `Duplicate checklist fail skipped from run ${payload.source_checklist_run_id}`
            : 'Duplicate checklist fail skipped',
          by_uid: state.currentUser.uid,
          by_name: state.currentUser.full_name,
          by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
          created_at: sdk.serverTimestamp(),
        });
      });
      return issueId;
    }

    existingIssue.updated_at = now;
    existingIssue.last_activity_at = now;
    existingIssue.activity_count = (Number(existingIssue.activity_count) || 0) + 1;
    addActivity({
      type: 'issue',
      title: existingIssue.title,
      text: `${state.currentUser.full_name} submitted the same failed checklist item again; existing issue kept`,
      created_at: now,
    });
    persist();
    return existingIssue;
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
      source_checklist_template_code: payload.source_checklist_template_code || '',
      dedupe_key: payload.dedupe_key || '',
      dedupe_date: payload.dedupe_date || '',
      title: payload.title,
      description: payload.description || '',
      issue_type: payload.issue_type || 'other',
      priority: payload.priority || 'medium',
      status: payload.status || 'open',
      assigned_department: normalizeDepartmentValue(payload.assigned_department, 'ENG'),
      assigned_to_uid: '',
      assigned_to_name: '',
      location_text: payload.location_text || '',
      reported_by_uid: state.currentUser.uid,
      reported_by_name: state.currentUser.full_name,
      reported_by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
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
    recordUsageLogLocal({
      category: 'issue',
      action: 'create_issue',
      title: issue.title,
      text: `${state.currentUser.full_name} created ${issue.issue_no}`,
      issue_id: issue.id,
      ref_no: issue.issue_no,
    });
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
    const guardRef = payload.dedupe_key ? sdk.doc(fb.db, 'issue_dedupe', payload.dedupe_key) : null;

    if (guardRef) {
      const guardSnap = await sdk.getDoc(guardRef);
      const guardedIssueId = guardSnap.exists() ? (guardSnap.data().issue_id || '') : '';
      if (guardedIssueId) {
        const guardedIssueSnap = await sdk.getDoc(sdk.doc(fb.db, 'issues', guardedIssueId));
        if (guardedIssueSnap.exists() && guardedIssueSnap.data().status !== 'closed') {
          return recordChecklistDuplicateIssueHit({ id: guardedIssueId, ...guardedIssueSnap.data() }, payload);
        }
      }
    }

    const uploadedBeforePhotos = await prepareIssuePhotosForFirebase(issueRef.id, payload.before_photos || []);
    const uploadedBeforeVideos = await prepareIssueVideosForFirebase(issueRef.id, payload.before_videos || []);

    let createdIssueNo = '';
    let duplicateIssueId = '';
    await sdk.runTransaction(fb.db, async (tx) => {
      if (guardRef) {
        const guardSnap = await tx.get(guardRef);
        const guardedIssueId = guardSnap.exists() ? (guardSnap.data().issue_id || '') : '';
        if (guardedIssueId) {
          const guardedIssueRef = sdk.doc(fb.db, 'issues', guardedIssueId);
          const guardedIssueSnap = await tx.get(guardedIssueRef);
          if (guardedIssueSnap.exists() && guardedIssueSnap.data().status !== 'closed') {
            const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${guardedIssueId}/activity`));
            tx.update(guardedIssueRef, {
              updated_at: sdk.serverTimestamp(),
              last_activity_at: sdk.serverTimestamp(),
              activity_count: sdk.increment(1),
            });
            tx.set(activityRef, {
              action: 'duplicate_checklist_fail_skipped',
              note: payload.source_checklist_run_id
                ? `Duplicate checklist fail skipped from run ${payload.source_checklist_run_id}`
                : 'Duplicate checklist fail skipped',
              by_uid: state.currentUser.uid,
              by_name: state.currentUser.full_name,
              by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
              created_at: sdk.serverTimestamp(),
            });
            duplicateIssueId = guardedIssueId;
            return;
          }
        }
      }

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
      createdIssueNo = issueNo;
      const beforePhotos = Array.isArray(uploadedBeforePhotos) ? uploadedBeforePhotos : [];
      const beforeVideos = Array.isArray(uploadedBeforeVideos) ? uploadedBeforeVideos : [];

      tx.set(issueRef, {
        issue_no: issueNo,
        source_type: payload.source_type || 'manual',
        source_checklist_run_id: payload.source_checklist_run_id || '',
        source_checklist_answer_id: payload.source_checklist_answer_id || '',
        source_checklist_template_code: payload.source_checklist_template_code || '',
        dedupe_key: payload.dedupe_key || '',
        dedupe_date: payload.dedupe_date || '',
        title: payload.title,
        description: payload.description || '',
        issue_type: payload.issue_type || 'other',
        priority: payload.priority || 'medium',
        status: 'open',
        assigned_department: normalizeDepartmentValue(payload.assigned_department, 'ENG'),
        assigned_to_uid: '',
        assigned_to_name: '',
        location_text: payload.location_text || '',
        building: '',
        floor: '',
        room_no: '',
        reported_by_uid: state.currentUser.uid,
        reported_by_name: state.currentUser.full_name,
        reported_by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
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
        by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
        created_at: sdk.serverTimestamp(),
      });

      if (guardRef) {
        tx.set(guardRef, {
          issue_id: issueRef.id,
          issue_no: issueNo,
          dedupe_key: payload.dedupe_key,
          template_code: payload.source_checklist_template_code || '',
          item_code: payload.source_checklist_answer_id || '',
          inspection_date: payload.dedupe_date || '',
          location_text: payload.location_text || '',
          updated_at: sdk.serverTimestamp(),
          created_at: sdk.serverTimestamp(),
        });
      }
    });

    if (duplicateIssueId) return duplicateIssueId;

    recordUsageLog({
      category: 'issue',
      action: 'create_issue',
      title: payload.title,
      text: `${state.currentUser.full_name} created ${createdIssueNo || issueRef.id}`,
      issue_id: issueRef.id,
      ref_no: createdIssueNo || issueRef.id,
    });
    if (Array.isArray(payload.before_videos) && payload.before_videos[0]?.file && Array.isArray(uploadedBeforeVideos) && uploadedBeforeVideos[0]?.storage_path) {
      queueIssueVideoPreviewBackfill({
        issueId: issueRef.id,
        phase: 'before',
        file: payload.before_videos[0].file,
        videoMeta: uploadedBeforeVideos[0]
      });
    }
    return issueRef.id;
  }

  async function prepareIssuePhotosForFirebase(issueId, beforePhotos) {
    if (!Array.isArray(beforePhotos) || beforePhotos.length === 0) return [];
    if (!isFirebaseLive()) return beforePhotos;

    const uploadedItems = [];
    for (let i = 0; i < beforePhotos.length; i += 1) {
      const item = beforePhotos[i] || {};
      const fullDataUrl = item.url || '';
      const thumbDataUrl = item.thumb_url || fullDataUrl;
      if (!fullDataUrl) continue;

      const uploaded = await uploadIssuePhotoSet({
        issueId,
        fullDataUrl,
        thumbDataUrl,
        mimeType: 'image/jpeg'
      });

      uploadedItems.push({
        url: uploaded.fullUrl,
        thumb_url: uploaded.thumbUrl,
        storage_path: uploaded.fullPath,
        thumb_storage_path: uploaded.thumbPath,
        uploaded_at: new Date().toISOString(),
      });
    }

    return uploadedItems;
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
      preview_status: uploaded.posterUrl || uploaded.thumbUrl ? 'ready' : 'pending',
      compression_status: 'pending',
    }];
  }


  async function uploadIssueVideoPreviewAssets({ issueId, phase = 'before', ts = Date.now(), posterDataUrl = '', thumbDataUrl = '' }) {
    const fb = window.LAYA_FIREBASE;
    if (!fb?.ready || !fb.storage || !fb.sdk?.storageRef || !fb.sdk?.uploadString || !fb.sdk?.getDownloadURL) {
      throw new Error('storage_not_ready');
    }
    const uid = fb.auth.currentUser?.uid;
    if (!uid) throw new Error('not_signed_in');

    let posterUrl = '';
    let thumbUrl = '';
    let posterPath = '';
    let thumbPath = '';

    if (posterDataUrl) {
      posterPath = `issue_videos/${uid}/${issueId}/${phase}/poster_${ts}.jpg`;
      const posterRef = fb.sdk.storageRef(fb.storage, posterPath);
      await fb.sdk.uploadString(posterRef, posterDataUrl, 'data_url', { contentType: 'image/jpeg', cacheControl: 'public,max-age=3600' });
      posterUrl = await fb.sdk.getDownloadURL(posterRef);
    }

    if (thumbDataUrl) {
      thumbPath = `issue_videos/${uid}/${issueId}/${phase}/thumb_${ts}.jpg`;
      const thumbRef = fb.sdk.storageRef(fb.storage, thumbPath);
      await fb.sdk.uploadString(thumbRef, thumbDataUrl, 'data_url', { contentType: 'image/jpeg', cacheControl: 'public,max-age=3600' });
      thumbUrl = await fb.sdk.getDownloadURL(thumbRef);
    }

    return { posterUrl, posterPath, thumbUrl, thumbPath };
  }

  function queueIssueVideoPreviewBackfill({ issueId, phase = 'before', file = null, videoMeta = null }) {
    if (!isFirebaseLive() || !issueId || !file || !videoMeta?.storage_path) return;
    window.setTimeout(() => {
      backfillIssueVideoPreview({ issueId, phase, file, videoMeta }).catch(err => {
        console.warn('issue video preview backfill failed', err);
      });
    }, 50);
  }

  async function backfillIssueVideoPreview({ issueId, phase = 'before', file, videoMeta }) {
    const fb = window.LAYA_FIREBASE;
    const sdk = fb?.sdk;
    if (!fb?.ready || !sdk?.doc || !sdk?.getDoc || !sdk?.updateDoc || !file || !videoMeta?.storage_path) return;

    let poster;
    try {
      poster = await extractVideoPoster(file);
    } catch (err) {
      console.warn('deferred video poster generation failed', err);
      return;
    }
    if (!poster?.posterDataUrl && !poster?.thumbDataUrl) return;

    const assets = await uploadIssueVideoPreviewAssets({
      issueId,
      phase,
      ts: Date.now(),
      posterDataUrl: poster.posterDataUrl || '',
      thumbDataUrl: poster.thumbDataUrl || poster.posterDataUrl || ''
    });

    const issueRef = sdk.doc(fb.db, 'issues', issueId);
    const snap = await sdk.getDoc(issueRef);
    if (!snap.exists()) return;
    const data = snap.data() || {};
    const fieldName = phase === 'after' ? 'after_videos' : 'before_videos';
    const videos = Array.isArray(data[fieldName]) ? [...data[fieldName]] : [];
    const idx = videos.findIndex(item => item?.storage_path === videoMeta.storage_path || item?.url === videoMeta.url);
    if (idx < 0) return;

    videos[idx] = {
      ...videos[idx],
      poster_url: assets.posterUrl || videos[idx].poster_url || '',
      thumb_url: assets.thumbUrl || assets.posterUrl || videos[idx].thumb_url || videos[idx].poster_url || '',
      poster_storage_path: assets.posterPath || videos[idx].poster_storage_path || '',
      thumb_storage_path: assets.thumbPath || videos[idx].thumb_storage_path || '',
      preview_status: 'ready',
      preview_generated_at: new Date().toISOString(),
      compression_status: 'pending'
    };

    const patch = {
      [fieldName]: videos,
      updated_at: sdk.serverTimestamp(),
    };
    if (!data.cover_photo_url && phase === 'before' && (assets.posterUrl || assets.thumbUrl)) {
      patch.cover_photo_url = assets.posterUrl || assets.thumbUrl || '';
      patch.cover_thumb_url = assets.thumbUrl || assets.posterUrl || '';
    }
    await sdk.updateDoc(issueRef, patch);

    const localIssue = state.data.issues.find(item => item.id === issueId);
    if (localIssue) {
      localIssue[fieldName] = videos;
      if (!localIssue.cover_photo_url && phase === 'before') {
        localIssue.cover_photo_url = patch.cover_photo_url || localIssue.cover_photo_url || '';
        localIssue.cover_thumb_url = patch.cover_thumb_url || localIssue.cover_thumb_url || '';
      }
      renderAll();
    }
  }

  async function uploadIssueVideoSet({ issueId, file, mimeType = 'video/mp4', fileName = 'video.mp4', posterDataUrl = '', thumbDataUrl = '', phase = 'before' }) {
    const fb = window.LAYA_FIREBASE;
    if (!fb?.ready || !fb.storage || !fb.sdk?.storageRef || !fb.sdk?.uploadBytes || !fb.sdk?.getDownloadURL) {
      throw new Error('storage_not_ready');
    }

    const uid = fb.auth.currentUser?.uid;
    if (!uid) throw new Error('not_signed_in');

    const ts = Date.now();
    const ext = getFileExtension(fileName, mimeType);
    const videoPath = `issue_videos/${uid}/${issueId}/${phase}/video_${ts}.${ext}`;
    const videoRef = fb.sdk.storageRef(fb.storage, videoPath);
    await fb.sdk.uploadBytes(videoRef, file, { contentType: mimeType, cacheControl: 'public,max-age=3600' });
    const videoUrl = await fb.sdk.getDownloadURL(videoRef);

    let posterUrl = '';
    let thumbUrl = '';
    let posterPath = '';
    let thumbPath = '';
    if (posterDataUrl || thumbDataUrl) {
      const assets = await uploadIssueVideoPreviewAssets({ issueId, phase, ts, posterDataUrl, thumbDataUrl });
      posterUrl = assets.posterUrl;
      thumbUrl = assets.thumbUrl;
      posterPath = assets.posterPath;
      thumbPath = assets.thumbPath;
    }

    return { videoUrl, videoPath, posterUrl, posterPath, thumbUrl, thumbPath };
  }

  async function uploadIssuePhotoSet({ issueId, fullDataUrl, thumbDataUrl, mimeType = 'image/jpeg', phase = 'before' }) {
    const fb = window.LAYA_FIREBASE;
    if (!fb?.ready || !fb.storage || !fb.sdk?.storageRef || !fb.sdk?.uploadString || !fb.sdk?.getDownloadURL) {
      throw new Error('storage_not_ready');
    }

    const uid = fb.auth.currentUser?.uid;
    if (!uid) throw new Error('not_signed_in');

    const ts = Date.now();
    const fullPath = `issue_photos/${uid}/${issueId}/${phase}/full_${ts}.jpg`;
    const thumbPath = `issue_photos/${uid}/${issueId}/${phase}/thumb_${ts}.jpg`;

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
    if ((!state.data.templates || !state.data.templates.length) && Array.isArray(FALLBACK_CHECKLIST_TEMPLATES) && FALLBACK_CHECKLIST_TEMPLATES.length) {
      state.data.baseTemplates = safeClone(FALLBACK_CHECKLIST_TEMPLATES);
      mergeTemplates();
    }
    const visibleTemplates = getVisibleTemplates();
    const hiddenTemplates = getHiddenTemplates();

    if (!visibleTemplates.length) {
      el.templateCards.innerHTML = `
        <div class="empty-state">
          ${txt('ยังไม่พบ checklist template', 'No checklist template found')}
          ${hiddenTemplates.length ? `<div class="muted" style="margin-top:8px;">${txt(`มีเช็กลิสต์ที่ซ่อนอยู่ ${hiddenTemplates.length} รายการด้านล่าง`, `${hiddenTemplates.length} hidden checklist(s) listed below`)}</div>` : ''}
        </div>`;
    } else {
      el.templateCards.innerHTML = visibleTemplates.map(template => {
        const itemCount = template.sections?.reduce((sum, sec) => sum + (sec.item_count || sec.items?.length || 0), 0) || 0;
        const actionBtn = isCustomTemplate(template) && canDeleteCustomTemplate(template)
          ? `<button class="btn btn-ghost btn-soft-danger" data-template-delete="${template.template_code}">${txt('ลบ', 'Delete')}</button>`
          : isBaseTemplate(template)
            ? `<button class="btn btn-ghost" data-template-hide="${template.template_code}">${txt('ซ่อน', 'Hide')}</button>`
            : '';
        return `
          <article class="template-card">
            <div>
              <div class="eyebrow">${txt('เทมเพลตเช็กลิสต์', 'CHECKLIST TEMPLATE')}</div>
              <h4>${escapeHtml(templateLabel(template))}</h4>
              <div class="template-meta">${template.sections?.length || 0} ${txt('ส่วน', 'sections')} • ${itemCount} ${txt('ข้อ', 'items')}</div>
            </div>
            <div class="muted">${escapeHtml(template.source_sheet || '')}</div>
            <div class="template-actions">
              <button class="btn btn-primary" data-template-open="${template.template_code}">${txt('เปิดเช็กลิสต์', 'Open Checklist')}</button>
              ${actionBtn}
            </div>
          </article>
        `;
      }).join('');
    }

    if (hiddenTemplates.length) {
      el.templateCards.innerHTML += `
        <section class="hidden-templates-box">
          <div class="panel-header panel-header-split">
            <div>
              <h3>${txt('เช็กลิสต์ที่ซ่อน', 'Hidden Checklists')}</h3>
              <p class="muted">${txt('เทมเพลตหลักที่ซ่อนจะยังอยู่ในระบบ และกดแสดงกลับได้', 'Hidden base templates remain in the system and can be restored anytime.')}</p>
            </div>
            <button class="btn btn-ghost" data-template-restore-all>${txt('แสดงทั้งหมดกลับ', 'Restore all')}</button>
          </div>
          <div class="hidden-template-list">
            ${hiddenTemplates.map(template => `
              <div class="hidden-template-item">
                <div>
                  <strong>${escapeHtml(templateLabel(template))}</strong>
                  <div class="muted">${escapeHtml(template.source_sheet || '')}</div>
                </div>
                <button class="btn btn-ghost" data-template-unhide="${template.template_code}">${txt('แสดงกลับ', 'Restore')}</button>
              </div>`).join('')}
          </div>
        </section>`;
    }

    qsa('[data-template-open]', el.templateCards).forEach(btn => btn.addEventListener('click', () => openChecklistRun(btn.dataset.templateOpen)));
    qsa('[data-template-hide]', el.templateCards).forEach(btn => btn.addEventListener('click', () => hideBaseTemplate(btn.dataset.templateHide)));
    qsa('[data-template-unhide]', el.templateCards).forEach(btn => btn.addEventListener('click', () => restoreHiddenTemplate(btn.dataset.templateUnhide)));
    qsa('[data-template-delete]', el.templateCards).forEach(btn => btn.addEventListener('click', () => deleteCustomTemplate(btn.dataset.templateDelete)));
    qsa('[data-template-restore-all]', el.templateCards).forEach(btn => btn.addEventListener('click', restoreAllHiddenTemplates));
  }

  async function hideBaseTemplate(templateCode) {
    const template = state.data.templates.find(t => t.template_code === templateCode);
    if (!template || !isBaseTemplate(template)) return;
    if (!confirm(txt(`ซ่อนเช็กลิสต์ "${templateLabel(template)}" ใช่ไหม?`, `Hide checklist "${templateLabel(template)}"?`))) return;
    setTemplateHidden(templateCode, true);
    if (state.ui.selectedTemplateCode === templateCode) {
      el.checklistRunPanel.classList.add('hidden');
      state.ui.selectedTemplateCode = null;
    }
    renderTemplateCards();
    setAuthStatus(txt('ซ่อน checklist แล้ว', 'Checklist hidden'), 'success');
  }

  function restoreHiddenTemplate(templateCode) {
    setTemplateHidden(templateCode, false);
    renderTemplateCards();
    setAuthStatus(txt('แสดง checklist กลับแล้ว', 'Checklist restored'), 'success');
  }

  function restoreAllHiddenTemplates() {
    state.ui.hiddenTemplateCodes = [];
    saveHiddenTemplateCodes([]);
    renderTemplateCards();
    setAuthStatus(txt('แสดง checklist ทั้งหมดกลับแล้ว', 'All checklists restored'), 'success');
  }

  async function deleteCustomTemplate(templateCode) {
    const template = state.data.templates.find(t => t.template_code === templateCode);
    if (!template || !isCustomTemplate(template) || !canDeleteCustomTemplate(template)) return;
    if (!confirm(txt(`ลบเช็กลิสต์ที่สร้างเอง "${templateLabel(template)}" ใช่ไหม?`, `Delete custom checklist "${templateLabel(template)}"?`))) return;

    try {
      if (isFirebaseLive()) {
        const fb = window.LAYA_FIREBASE;
        await fb.sdk.deleteDoc(fb.sdk.doc(fb.db, 'checklist_templates', templateCode));
      } else {
        state.data.customTemplates = (state.data.customTemplates || []).filter(t => t.template_code !== templateCode);
        mergeTemplates();
        persist();
        renderTemplateCards();
      }
      addActivity({ type: 'checklist_template_delete', title: templateLabel(template), text: txt(`${state.currentUser?.full_name || 'User'} ลบ checklist template`, `${state.currentUser?.full_name || 'User'} deleted a checklist template`), created_at: new Date().toISOString() });
      setAuthStatus(txt('ลบ checklist แล้ว', 'Checklist deleted'), 'success');
    } catch (err) {
      console.error('delete checklist template failed', err);
      alert(friendlyIssueError(err));
    }
  }

  function openChecklistRun(templateCode) {
    state.ui.selectedTemplateCode = templateCode;
    const template = state.data.templates.find(t => t.template_code === templateCode);
    if (!template) return;

    const runId = `draft_${cryptoRandom()}`;
    state.ui.checklistFailMedia = {};
    const html = `
      <div class="panel-header">
        <h3>${escapeHtml(templateLabel(template))}</h3>
        <p class="muted">${txt('บันทึกผลตรวจ แล้วสร้าง issue เฉพาะข้อที่ไม่ผ่านและต้อง follow up', 'Record the inspection result and create issues only for failed items that need follow-up.')}</p>
      </div>
      <div class="checklist-run-head">
        <div>
          <label>${txt('ตำแหน่ง', 'Location')}</label>
          <input id="runLocation" type="text" placeholder="${txt('เช่น Main Resort / Public Area', 'e.g. Main Resort / Public Area')}" />
        </div>
        <div>
          <label>${txt('วันที่', 'Date')}</label>
          <input id="runDate" type="date" value="${todayInputValue()}" />
        </div>
      </div>
      <div id="checklistSections"></div>
      <div class="sticky-actions">
        <button class="btn btn-primary" id="submitChecklistBtn">${txt('ส่งเช็กลิสต์', 'Submit Checklist')}</button>
        <button class="btn btn-ghost" id="hideChecklistBtn">${txt('ซ่อน', 'Hide')}</button>
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
        <section class="section-card section-card-special" data-section-code="${escapeHtml(section.section_code || '')}">
          <div class="section-head">
            <h4>${escapeHtml(sectionLabel(section))}</h4>
            <span class="muted">${txt('ฟอร์มพิเศษ', 'Special form')}</span>
          </div>
          <div class="section-body">
            <label class="special-form-label">${txt('รายละเอียด', 'Details')}</label>
            <textarea class="special-form-textarea" data-special-form-input rows="5" placeholder="${txt('พิมพ์ข้อมูลในส่วนนี้ได้เลย', 'Type details here')}"></textarea>
          </div>
        </section>
      `;
    }
    return `
      <section class="section-card" data-section-code="${section.section_code}">
        <div class="section-head">
          <h4>${escapeHtml(sectionLabel(section))}</h4>
          <span class="muted">${items.length} ${txt('ข้อ', 'items')}</span>
        </div>
        <div class="section-body">
          ${items.map(item => `
            <div class="item-card" data-item-code="${item.item_code}">
              <div class="item-text">${escapeHtml(itemLabel(item))}</div>
              <div class="item-controls">
                <div class="inline-options" data-response-group>
                  <button class="option-btn pass" type="button" data-response="pass">${txt('ผ่าน', 'Pass')}</button>
                  <button class="option-btn fail" type="button" data-response="fail">${txt('ไม่ผ่าน', 'Fail')}</button>
                  <button class="option-btn na" type="button" data-response="na">N/A</button>
                </div>
                <textarea data-note rows="2" placeholder="${txt('หมายเหตุ (ไม่บังคับ)', 'Note (optional)')}"></textarea>
                <div class="fail-extra hidden" data-fail-extra>
                  <select data-fail-dept>${renderDepartmentOptions()}</select>
                  <select data-fail-priority>
                    ${PRIORITIES.map(p => `<option value="${p}" ${p === 'medium' ? 'selected' : ''}>${labelize(p)}</option>`).join('')}
                  </select>
                </div>
                <label class="check-row hidden" data-create-issue-row>
                  <input type="checkbox" data-create-issue />
                  <span>${txt('สร้าง Issue หากข้อนี้ไม่ผ่าน', 'Create issue if this item fails')}</span>
                </label>
                <div class="checklist-fail-media hidden" data-fail-media-block>
                  <div class="muted checklist-fail-media-title">${txt('แนบสื่อสำหรับ Issue ของข้อนี้', 'Attach media for this issue')}</div>
                  <input type="file" accept="image/*" multiple class="visually-hidden-file" data-fail-photo-input />
                  <input type="file" accept="image/*" capture="environment" class="visually-hidden-file" data-fail-photo-camera-input />
                  <input type="file" accept="video/*" class="visually-hidden-file" data-fail-video-input />
                  <input type="file" accept="video/*" capture="environment" class="visually-hidden-file" data-fail-video-camera-input />
                  <div class="photo-action-row checklist-media-actions">
                    <label class="btn btn-secondary photo-pick-label" role="button" tabindex="0" data-fail-photo-gallery-label>${txt('เลือกรูป', 'Choose Photo')}</label>
                    <label class="btn btn-ghost photo-pick-label" role="button" tabindex="0" data-fail-photo-camera-label>${txt('ถ่ายรูป', 'Take Photo')}</label>
                    <label class="btn btn-secondary photo-pick-label" role="button" tabindex="0" data-fail-video-gallery-label>${txt('เลือกวิดีโอ', 'Choose Video')}</label>
                    <label class="btn btn-ghost photo-pick-label" role="button" tabindex="0" data-fail-video-camera-label>${txt('ถ่ายวิดีโอ', 'Record Video')}</label>
                  </div>
                  <div class="muted checklist-fail-media-hint" data-fail-media-hint>${txt('แนบได้หลายรูป และวิดีโอ 1 ไฟล์สำหรับ Issue ของข้อนี้', 'Attach multiple photos and 1 video for this issue')}</div>
                  <div class="photo-preview-wrap">
                    <div class="photo-preview-grid hidden" data-fail-photo-preview-grid></div>
                    <video class="photo-preview hidden" data-fail-video-preview controls playsinline preload="metadata"></video>
                  </div>
                </div>
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
        const failMediaBlock = qs('[data-fail-media-block]', itemCard);
        const isFail = btn.dataset.response === 'fail';
        if (failExtra) failExtra.classList.toggle('hidden', !isFail);
        if (createIssueRow) createIssueRow.classList.toggle('hidden', !isFail);
        if (failMediaBlock) failMediaBlock.classList.toggle('hidden', !isFail);
        if (!isFail) {
          const check = qs('[data-create-issue]', itemCard);
          if (check) check.checked = false;
          clearChecklistFailMedia(itemCard.dataset.itemCode, itemCard);
        }
      });
    });
    bindChecklistMediaEvents(host);
  }

  function getChecklistFailMediaState(itemCode) {
    if (!itemCode) return { photos: [], video: null };
    const found = state.ui.checklistFailMedia?.[itemCode];
    return found ? { photos: Array.isArray(found.photos) ? found.photos : [], video: found.video || null } : { photos: [], video: null };
  }

  function setChecklistFailMediaState(itemCode, nextState) {
    if (!itemCode) return;
    state.ui.checklistFailMedia = state.ui.checklistFailMedia || {};
    const current = getChecklistFailMediaState(itemCode);
    state.ui.checklistFailMedia[itemCode] = {
      ...current,
      ...nextState,
      photos: Array.isArray(nextState?.photos) ? nextState.photos : (Array.isArray(current.photos) ? current.photos : []),
      video: nextState && Object.prototype.hasOwnProperty.call(nextState, 'video') ? nextState.video : (current.video || null),
    };
  }

  function revokeChecklistFailVideoPreview(video) {
    const url = video?.previewUrl;
    if (url && String(url).startsWith('blob:')) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
  }

  function renderChecklistFailMediaPreview(itemCard) {
    if (!itemCard) return;
    const itemCode = itemCard.dataset.itemCode;
    const media = getChecklistFailMediaState(itemCode);
    const grid = qs('[data-fail-photo-preview-grid]', itemCard);
    const videoEl = qs('[data-fail-video-preview]', itemCard);
    const hint = qs('[data-fail-media-hint]', itemCard);
    if (grid) {
      if (!media.photos.length) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
      } else {
        grid.innerHTML = media.photos.map((item, index) => `
          <div class="photo-preview-card">
            <img src="${escapeHtml(item.previewDataUrl || item.thumbDataUrl || item.fullDataUrl || '')}" alt="Checklist photo ${index + 1}" />
            <div class="photo-preview-badge">${txt('รูป', 'Photo')} ${index + 1}</div>
          </div>
        `).join('');
        grid.classList.remove('hidden');
      }
    }
    if (videoEl) {
      if (media.video?.previewUrl) {
        videoEl.src = media.video.previewUrl;
        videoEl.classList.remove('hidden');
        try { videoEl.load(); } catch (_) {}
      } else {
        try { videoEl.pause(); } catch (_) {}
        videoEl.removeAttribute('src');
        videoEl.classList.add('hidden');
      }
    }
    if (hint) {
      const photoCount = media.photos.length;
      const hasVideo = !!media.video;
      hint.textContent = photoCount || hasVideo
        ? txt(`แนบแล้ว ${photoCount} รูป${hasVideo ? ' • 1 วิดีโอ' : ''}`, `${photoCount} photo${photoCount === 1 ? '' : 's'} attached${hasVideo ? ' • 1 video' : ''}`)
        : txt('แนบได้หลายรูป และวิดีโอ 1 ไฟล์สำหรับ Issue ของข้อนี้', 'Attach multiple photos and 1 video for this issue');
      hint.classList.remove('error');
    }
  }

  function clearChecklistFailMedia(itemCode, itemCard = null) {
    if (!itemCode) return;
    const current = getChecklistFailMediaState(itemCode);
    revokeChecklistFailVideoPreview(current.video);
    if (state.ui.checklistFailMedia && state.ui.checklistFailMedia[itemCode]) {
      delete state.ui.checklistFailMedia[itemCode];
    }
    const card = itemCard || qsa('.item-card', el.checklistRunPanel).find(node => node.dataset.itemCode === itemCode);
    if (card) {
      qsa('[data-fail-photo-input],[data-fail-photo-camera-input],[data-fail-video-input],[data-fail-video-camera-input]', card).forEach(input => { input.value = ''; });
      renderChecklistFailMediaPreview(card);
    }
  }

  function bindChecklistMediaEvents(host) {
    qsa('.item-card', host).forEach(itemCard => {
      const itemCode = itemCard.dataset.itemCode || '';
      const photoInput = qs('[data-fail-photo-input]', itemCard);
      const photoCameraInput = qs('[data-fail-photo-camera-input]', itemCard);
      const videoInput = qs('[data-fail-video-input]', itemCard);
      const videoCameraInput = qs('[data-fail-video-camera-input]', itemCard);
      const galleryLabel = qs('[data-fail-photo-gallery-label]', itemCard);
      const cameraLabel = qs('[data-fail-photo-camera-label]', itemCard);
      const videoGalleryLabel = qs('[data-fail-video-gallery-label]', itemCard);
      const videoCameraLabel = qs('[data-fail-video-camera-label]', itemCard);
      if (photoInput && galleryLabel) galleryLabel.setAttribute('for', `failPhoto_${itemCode}`), photoInput.id = `failPhoto_${itemCode}`;
      if (photoCameraInput && cameraLabel) cameraLabel.setAttribute('for', `failPhotoCam_${itemCode}`), photoCameraInput.id = `failPhotoCam_${itemCode}`;
      if (videoInput && videoGalleryLabel) videoGalleryLabel.setAttribute('for', `failVideo_${itemCode}`), videoInput.id = `failVideo_${itemCode}`;
      if (videoCameraInput && videoCameraLabel) videoCameraLabel.setAttribute('for', `failVideoCam_${itemCode}`), videoCameraInput.id = `failVideoCam_${itemCode}`;
      [photoInput, photoCameraInput, videoInput, videoCameraInput].filter(Boolean).forEach(input => input.addEventListener('click', () => { input.value = ''; }));
      if (photoInput) photoInput.addEventListener('change', (event) => handleChecklistFailPhotoPicked(itemCode, itemCard, event));
      if (photoCameraInput) photoCameraInput.addEventListener('change', (event) => handleChecklistFailPhotoPicked(itemCode, itemCard, event));
      if (videoInput) videoInput.addEventListener('change', (event) => handleChecklistFailVideoPicked(itemCode, itemCard, event));
      if (videoCameraInput) videoCameraInput.addEventListener('change', (event) => handleChecklistFailVideoPicked(itemCode, itemCard, event));
      renderChecklistFailMediaPreview(itemCard);
    });
  }

  async function handleChecklistFailPhotoPicked(itemCode, itemCard, event) {
    const files = Array.from(event?.target?.files || []);
    if (event?.target) event.target.value = '';
    if (!files.length) return;
    const hint = qs('[data-fail-media-hint]', itemCard);
    try {
      const optimizedItems = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (!file.type || !file.type.startsWith('image/')) throw new Error('invalid_file_type');
        if (hint) hint.textContent = txt(`กำลังเตรียมรูป ${i + 1}/${files.length}...`, `Preparing image ${i + 1}/${files.length}...`);
        const optimized = await optimizeIssuePhoto(file);
        optimizedItems.push(optimized);
      }
      const current = getChecklistFailMediaState(itemCode);
      setChecklistFailMediaState(itemCode, { photos: [...current.photos, ...optimizedItems] });
      renderChecklistFailMediaPreview(itemCard);
    } catch (err) {
      console.error('checklist fail photo failed', err);
      if (hint) {
        hint.textContent = txt('แนบรูปไม่สำเร็จ ลองใช้ JPG/PNG', 'Could not attach image. Try JPG/PNG');
        hint.classList.add('error');
      }
      alert(txt('แนบรูปไม่สำเร็จ', 'Could not attach photo'));
    }
  }

  async function handleChecklistFailVideoPicked(itemCode, itemCard, event) {
    const file = event?.target?.files?.[0];
    if (event?.target) event.target.value = '';
    if (!file) return;
    const hint = qs('[data-fail-media-hint]', itemCard);
    try {
      if (!isAcceptedVideoFile(file)) throw new Error('invalid_video_type');
      if ((file.size || 0) > MAX_VIDEO_UPLOAD_BYTES) throw new Error('video_too_large');
      if (hint) hint.textContent = txt('กำลังเตรียมวิดีโอ...', 'Preparing video...');
      const prepared = await prepareIssueVideo(file);
      const current = getChecklistFailMediaState(itemCode);
      revokeChecklistFailVideoPreview(current.video);
      setChecklistFailMediaState(itemCode, { video: prepared });
      renderChecklistFailMediaPreview(itemCard);
    } catch (err) {
      console.error('checklist fail video failed', err);
      if (hint) {
        hint.textContent = err?.message === 'video_too_large'
          ? getVideoSizeErrorText()
          : txt(`แนบวิดีโอไม่สำเร็จ ลองใช้ MP4/MOV ที่ขนาดไม่เกิน ${MAX_VIDEO_UPLOAD_MB} MB`, `Could not attach video. Try MP4/MOV up to ${MAX_VIDEO_UPLOAD_MB} MB`);
        hint.classList.add('error');
      }
      alert(txt('แนบวิดีโอไม่สำเร็จ', 'Could not attach video'));
    }
  }

  async function submitChecklistRun(template, runId) {
    const location = qs('#runLocation', el.checklistRunPanel).value.trim();
    const inspectionDate = qs('#runDate', el.checklistRunPanel).value;
    const itemCards = qsa('.item-card', el.checklistRunPanel);
    const answers = [];
    const specialFormEntries = [];

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
      const failMedia = getChecklistFailMediaState(itemCode);
      if (!response) return;
      const templateSection = (template.sections || []).find(sec => sec.section_code === sectionCode) || null;
      const templateItem = (templateSection?.items || []).find(it => it.item_code === itemCode) || null;
      answers.push({
        item_code: itemCode,
        section_code: sectionCode,
        section_title: templateSection?.section_title || sectionTitle,
        section_title_th: templateSection?.section_title_th || templateSection?.section_title || sectionTitle,
        item_text: templateItem?.item_text || itemText,
        item_text_th: templateItem?.item_text_th || templateItem?.item_text || itemText,
        response,
        note,
        create_issue: createIssue && response === 'fail',
        fail_department: failDept,
        fail_priority: failPriority,
        fail_media: { photos: Array.isArray(failMedia.photos) ? failMedia.photos : [], video: failMedia.video || null },
      });
    });

    qsa('[data-special-form-input]', el.checklistRunPanel).forEach(input => {
      const value = input.value.trim();
      if (!value) return;
      const sectionCard = input.closest('.section-card');
      const sectionCode = sectionCard?.dataset.sectionCode || '';
      const templateSection = (template.sections || []).find(sec => sec.section_code === sectionCode) || null;
      specialFormEntries.push({
        section_code: sectionCode,
        section_title: templateSection?.section_title || qs('h4', sectionCard)?.textContent || '',
        section_title_th: templateSection?.section_title_th || templateSection?.section_title || qs('h4', sectionCard)?.textContent || '',
        value,
      });
    });

    if (!answers.length && !specialFormEntries.length) return alert(txt('กรุณากรอก checklist หรือ special form อย่างน้อย 1 ส่วน', 'Please fill in at least one checklist answer or special form section'));

    const submitBtn = qs('#submitChecklistBtn', el.checklistRunPanel);
    if (submitBtn?.dataset.submitting === '1') return;
    if (submitBtn) {
      submitBtn.dataset.submitting = '1';
      submitBtn.disabled = true;
      submitBtn.textContent = txt('กำลังส่ง...', 'Submitting...');
    }

    const baseRun = {
      id: runId,
      run_no: buildChecklistRunNo((state.data.counters.checklist || 0) + 1, inspectionDate),
      template_code: template.template_code,
      template_name: template.template_name,
      template_name_th: template.template_name_th || template.template_name,
      inspector_uid: state.currentUser.uid,
      inspector_name: state.currentUser.full_name,
      inspector_department: state.currentUser.department,
      inspection_date: inspectionDate,
      location_text: location,
      status: 'submitted',
      answers,
      special_form_entries: specialFormEntries,
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
          source_checklist_template_code: template.template_code || '',
          dedupe_key: buildChecklistIssueDedupeKey(template.template_code, inspectionDate, location || templateLabel(template), a.item_code, a.item_text),
          dedupe_date: inspectionDate,
          title: a.item_text,
          description: a.note || txt(`สร้างจากข้อที่ไม่ผ่าน: ${a.item_text}`, `Created from checklist fail: ${a.item_text}`),
          issue_type: 'other',
          priority: a.fail_priority,
          assigned_department: a.fail_department,
          location_text: location || templateLabel(template),
          before_photos: (a.fail_media?.photos || []).map(photo => ({ url: photo.fullDataUrl, thumb_url: photo.thumbDataUrl })),
          before_videos: a.fail_media?.video ? [{
            file: a.fail_media.video.file,
            preview_url: a.fail_media.video.previewUrl,
            poster_url: a.fail_media.video.posterDataUrl,
            thumb_url: a.fail_media.video.thumbDataUrl,
            mime_type: a.fail_media.video.mimeType,
            original_name: a.fail_media.video.fileName,
            size: a.fail_media.video.originalBytes,
          }] : [],
        });
      }
      addActivity({
        type: 'checklist',
        title: templateLabel(template),
        text: txt(`${state.currentUser.full_name} ส่ง ${run.run_no}${issueAnswers.length ? ` และสร้าง ${issueAnswers.length} issue` : ''}`, `${state.currentUser.full_name} submitted ${run.run_no}${issueAnswers.length ? ` and created ${issueAnswers.length} issues` : ''}`),
        created_at: new Date().toISOString(),
      });
      recordUsageLog({
        category: 'checklist',
        action: 'submit_checklist',
        title: templateLabel(template),
        text: txt(`${state.currentUser.full_name} ส่ง ${run.run_no}${issueAnswers.length ? ` และสร้าง ${issueAnswers.length} issue` : ''}`, `${state.currentUser.full_name} submitted ${run.run_no}${issueAnswers.length ? ` and created ${issueAnswers.length} issues` : ''}`),
        checklist_run_id: run.id,
        ref_no: run.run_no,
      });

      state.ui.checklistFailMedia = {};
      persist();
      renderAll();
      el.checklistRunPanel.classList.add('hidden');
      switchView('boardView');
      setAuthStatus(txt('ส่ง checklist แล้ว และขึ้นบน Board แล้ว', 'Checklist submitted and posted to the board'), 'success');
    } catch (err) {
      console.error('submit checklist failed', err);
      alert(friendlyIssueError(err));
    } finally {
      if (submitBtn) {
        submitBtn.dataset.submitting = '0';
        submitBtn.disabled = false;
        submitBtn.textContent = txt('ส่งเช็กลิสต์', 'Submit Checklist');
      }
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


  async function archiveChecklistRun(runId) {
    const run = (state.data.checklistRuns || []).find(item => item.id === runId);
    if (!run) return;
    try {
      if (isFirebaseLive()) {
        const fb = window.LAYA_FIREBASE;
        await fb.sdk.updateDoc(fb.sdk.doc(fb.db, 'checklist_runs', runId), {
          status: 'archived',
          updated_at: fb.sdk.serverTimestamp(),
        });
      } else {
        run.status = 'archived';
        run.updated_at = new Date().toISOString();
        persist();
      }
      const localRun = (state.data.checklistRuns || []).find(item => item.id === runId);
      if (localRun) {
        localRun.status = 'archived';
        localRun.updated_at = new Date().toISOString();
      }
      renderAll();
      recordUsageLog({
        category: 'checklist',
        action: 'archive_checklist',
        title: run.template_name || 'Checklist',
        text: `${state.currentUser.full_name} moved ${run.run_no || run.id} to history`,
        checklist_run_id: runId,
        ref_no: run.run_no || runId,
      });
      setAuthStatus(txt('ย้าย checklist ออกจาก Board แล้ว', 'Checklist card moved out of the board'), 'success');
    } catch (err) {
      console.error('archive checklist run failed', err);
      alert('ปิด checklist ไม่สำเร็จ');
    }
  }

  async function unarchiveChecklistRun(runId) {
    const run = (state.data.checklistRuns || []).find(item => item.id === runId);
    if (!run) return;
    try {
      if (isFirebaseLive()) {
        const fb = window.LAYA_FIREBASE;
        await fb.sdk.updateDoc(fb.sdk.doc(fb.db, 'checklist_runs', runId), {
          status: 'submitted',
          updated_at: fb.sdk.serverTimestamp(),
        });
      } else {
        run.status = 'submitted';
        run.updated_at = new Date().toISOString();
        persist();
      }
      const localRun = (state.data.checklistRuns || []).find(item => item.id === runId);
      if (localRun) {
        localRun.status = 'submitted';
        localRun.updated_at = new Date().toISOString();
      }
      renderAll();
      recordUsageLog({
        category: 'checklist',
        action: 'reopen_checklist',
        title: run.template_name || 'Checklist',
        text: `${state.currentUser.full_name} reopened ${run.run_no || run.id}`,
        checklist_run_id: runId,
        ref_no: run.run_no || runId,
      });
      setAuthStatus('นำ checklist กลับมาแสดงแล้ว', 'success');
    } catch (err) {
      console.error('unarchive checklist run failed', err);
      alert('นำ checklist กลับมาไม่สำเร็จ');
    }
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
        source: 'checklist',
        answers: sanitizeChecklistAnswersForStorage(run.answers || []),
        special_form_entries: Array.isArray(run.special_form_entries) ? run.special_form_entries : [],
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
      answers: sanitizeChecklistAnswersForStorage(run.answers || []),
    };
  }

  function openIssueModal(issueId) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue) return;
    if (!canViewIssue(issue)) {
      alert(txt('คุณไม่มีสิทธิ์เปิดดูงานนี้', 'You do not have permission to view this issue.'));
      return;
    }
    state.ui.openIssueId = issueId;
    state.ui.openChecklistRunId = null;
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

    const afterPhotoCount = Array.isArray(issue.after_photos) ? issue.after_photos.length : 0;
    const afterVideoCount = Array.isArray(issue.after_videos) ? issue.after_videos.length : 0;

    el.issueModalContent.innerHTML = `
      <div class="issue-detail-grid">
        <div>
          ${renderIssueMediaBlock(issue)}
        </div>
        <div>
          <div class="detail-head">
            <h3>${escapeHtml(issue.title)}</h3>
            <div class="inline-options">
              <span class="priority-pill priority-${issue.priority}">${translatePriority(issue.priority)}</span>
              <span class="status-pill status-${issue.status}">${translateStatus(issue.status)}</span>
              <span class="status-pill status-open">${escapeHtml(getDepartmentName(normalizeDepartmentValue(issue.assigned_department, 'ENG')))}</span>
            </div>
          </div>
          <div class="detail-meta">
            <div><strong>${txt('ตำแหน่ง', 'Location')}:</strong> ${escapeHtml(issue.location_text || '-')}</div>
            <div><strong>${txt('เลขที่ Issue', 'Issue No')}:</strong> ${escapeHtml(issue.issue_no || issue.id)}</div>
            <div><strong>${txt('แจ้งโดย', 'Reported by')}:</strong> ${escapeHtml(issue.reported_by_name || '-')}</div>
            <div><strong>${txt('สร้างเมื่อ', 'Created')}:</strong> ${formatDateTime(issue.created_at)}</div>
            <div><strong>${txt('สื่อที่แนบ', 'Media')}:</strong> ${(issue.before_photos?.length || 0)} ${txt('รูป', 'photo')} / ${(issue.before_videos?.length || 0)} ${txt('วิดีโอ', 'video')}</div>
            <div><strong>${txt('หลักฐานส่งงาน', 'Evidence')}:</strong> ${afterPhotoCount} ${txt('รูป', 'photo')} / ${afterVideoCount} ${txt('วิดีโอ', 'video')}</div>
          </div>
          <div class="muted">${escapeHtml(issue.description || '')}</div>

          <div class="action-row">
            ${canWorkIssue(issue) && issue.status === 'open' ? `<button class="btn btn-secondary" data-detail-status="in_progress">${txt('เริ่มงาน', 'Start Work')}</button>` : ''}
            ${canWorkIssue(issue) && issue.status !== 'closed' ? `<button class="btn btn-primary" data-detail-status="closed">${txt('ปิดงาน', 'Close Job')}</button>` : ''}
            ${canWorkIssue(issue) && issue.status === 'closed' ? `<button class="btn btn-secondary" data-detail-status="open">${txt('เปิดกลับ', 'Reopen')}</button>` : ''}
            ${canWorkIssue(issue) && issue.status !== 'waiting' && issue.status !== 'closed' ? `<button class="btn btn-ghost" data-detail-status="waiting">${txt('รอ', 'Waiting')}</button>` : ''}
            ${canWorkIssue(issue) && issue.status === 'waiting' ? `<button class="btn btn-ghost" data-detail-status="in_progress">${txt('ทำต่อ', 'Resume')}</button>` : ''}
          </div>

          ${canManageIssue(issue) ? `
            <div class="evidence-box">
              <div class="evidence-box-head">
                <strong>${txt('หลักฐานส่งงาน', 'Completion evidence')}</strong>
                <span class="muted">${txt('เพิ่มรูปหรือวิดีโอก่อนปิดงานได้', 'Add photos or videos before closing the job')}</span>
              </div>
              <input id="detailEvidencePhotoInput" type="file" accept="image/*" multiple class="visually-hidden-file" />
              <input id="detailEvidencePhotoCameraInput" type="file" accept="image/*" capture="environment" class="visually-hidden-file" />
              <input id="detailEvidenceVideoInput" type="file" accept="video/*" class="visually-hidden-file" />
              <input id="detailEvidenceVideoCameraInput" type="file" accept="video/*" capture="environment" class="visually-hidden-file" />
              <div class="action-row compact-wrap evidence-actions">
                <label for="detailEvidencePhotoInput" class="btn btn-secondary photo-pick-label" role="button" tabindex="0">${txt('เลือกรูป', 'Choose Photo')}</label>
                <label for="detailEvidencePhotoCameraInput" class="btn btn-ghost photo-pick-label" role="button" tabindex="0">${txt('ถ่ายรูป', 'Take Photo')}</label>
                <label for="detailEvidenceVideoInput" class="btn btn-secondary photo-pick-label" role="button" tabindex="0">${txt('เลือกวิดีโอ', 'Choose Video')}</label>
                <label for="detailEvidenceVideoCameraInput" class="btn btn-ghost photo-pick-label" role="button" tabindex="0">${txt('ถ่ายวิดีโอ', 'Record Video')}</label>
              </div>
              <div id="detailEvidenceStatus" class="detail-evidence-status muted">${txt('หลักฐานที่อัปแล้วจะแสดงด้านซ้ายทันที • เลือกรูปได้หลายรูป', 'Uploaded evidence will appear on the left immediately • Multiple images allowed')}</div>
            </div>
          ` : ''}

          ${canCommentIssue(issue) ? `
            <div class="comment-box">
              <textarea id="detailCommentText" rows="3" placeholder="${txt('พิมพ์คอมเมนต์ หรือพิมพ์ @ ตามด้วยชื่อเพื่อสั่งงาน', 'Type a comment, or use @name to mention a team member')}"></textarea>
              <div id="detailMentionBox" class="mention-box hidden"></div>
              <div class="muted mention-hint">${txt('พิมพ์ @ แล้วระบบจะแนะนำชื่อสมาชิกทีมให้', 'Type @ and the system will suggest team members')}</div>
              <div class="action-row">
                <button class="btn btn-secondary" id="addCommentBtn">${txt('เพิ่มคอมเมนต์', 'Add Comment')}</button>
              </div>
            </div>
          ` : ''}

          <div class="comment-list">
            ${comments.length ? comments.map(comment => `
              <div class="comment-item ${comment.type === 'system' ? 'system-comment' : ''}">
                <div class="comment-meta">${escapeHtml(comment.by_name || comment.type || 'System')} • ${formatDateTime(comment.created_at)}</div>
                <div>${escapeHtml(comment.message || '')}</div>
              </div>
            `).join('') : `<div class="empty-state">${txt('ยังไม่มีคอมเมนต์', 'No comments yet')}</div>`}
          </div>
        </div>
      </div>
    `;

    qsa('[data-detail-status]', el.issueModalContent).forEach(btn => btn.addEventListener('click', () => updateIssueStatus(issue.id, btn.dataset.detailStatus)));
    qsa('[data-set-cover-photo]', el.issueModalContent).forEach(btn => btn.addEventListener('click', async () => {
      await setIssueCover(btn.dataset.issueId, btn.dataset.setCoverPhoto || '', btn.dataset.setCoverThumb || '');
    }));
    qsa('[data-remove-after-photo-index]', el.issueModalContent).forEach(btn => btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.removeAfterPhotoIndex || -1);
      if (!Number.isInteger(idx) || idx < 0) return;
      await removeIssueEvidencePhoto(issue.id, idx);
    }));
    qsa('[data-remove-after-video-index]', el.issueModalContent).forEach(btn => btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.removeAfterVideoIndex || -1);
      if (!Number.isInteger(idx) || idx < 0) return;
      await removeIssueEvidenceVideo(issue.id, idx);
    }));

    const evidenceInputs = [
      ['#detailEvidencePhotoInput', 'photo'],
      ['#detailEvidencePhotoCameraInput', 'photo'],
      ['#detailEvidenceVideoInput', 'video'],
      ['#detailEvidenceVideoCameraInput', 'video'],
    ];
    evidenceInputs.forEach(([selector, kind]) => {
      const input = qs(selector, el.issueModalContent);
      if (!input) return;
      input.addEventListener('click', () => { input.value = ''; });
      input.addEventListener('change', (event) => handleDetailEvidencePicked(issue.id, kind, event));
    });

    setupCommentMentions(issue.id);

    const addCommentBtn = qs('#addCommentBtn', el.issueModalContent);
    if (addCommentBtn) {
      addCommentBtn.addEventListener('click', async () => {
        const input = qs('#detailCommentText', el.issueModalContent);
        const message = input.value.trim();
        if (!message) return;
        const mentions = extractMentionNames(message);
        await addIssueComment(issue.id, message, mentions);
        if (!isFirebaseLive()) openIssueModal(issue.id);
      });
    }
  }

  function renderIssueMediaBlock(issue) {
    const beforePhotos = Array.isArray(issue.before_photos) ? issue.before_photos.filter(Boolean) : [];
    const beforeVideos = Array.isArray(issue.before_videos) ? issue.before_videos.filter(Boolean) : [];
    const afterPhotos = Array.isArray(issue.after_photos) ? issue.after_photos.filter(Boolean) : [];
    const afterVideos = Array.isArray(issue.after_videos) ? issue.after_videos.filter(Boolean) : [];

    const renderMediaCards = (photos = [], videos = [], phase = 'before') => {
      const cards = [];
      if (photos.length) {
        cards.push(...photos.map((photo, index) => {
          const photoUrl = photo.url || photo.thumb_url || issue.cover_photo_url || '';
          const isCover = Boolean(issue.cover_photo_url && photoUrl && issue.cover_photo_url === photoUrl) || (!issue.cover_photo_url && index === 0 && phase === 'before');
          const actionButtons = [];
          if (phase === 'before' && canWorkIssue(issue)) {
            actionButtons.push(`<button class="mini-btn" data-set-cover-photo="${escapeHtml(photo.url || '')}" data-set-cover-thumb="${escapeHtml(photo.thumb_url || photo.url || '')}" data-issue-id="${issue.id}">${txt('ตั้งเป็น Cover', 'Set as Cover')}</button>`);
          }
          if (phase === 'after' && canWorkIssue(issue)) {
            actionButtons.push(`<button class="mini-btn danger" data-remove-after-photo-index="${index}" data-issue-id="${issue.id}">${txt('ลบรูปนี้', 'Delete photo')}</button>`);
          }
          return `
          <div class="issue-media-card ${isCover ? 'is-cover' : ''}">
            <img class="issue-hero" src="${photoUrl}" alt="Issue image ${index + 1}" />
            ${actionButtons.length ? `<div class="issue-media-actions">${actionButtons.join('')}</div>` : ''}
          </div>
        `;
        }));
      }
      if (videos.length) {
        cards.push(...videos.map((video, index) => {
          const isCover = Boolean(issue.cover_photo_url && video.poster_url && issue.cover_photo_url === video.poster_url);
          const actionButtons = [];
          if (phase === 'before' && canWorkIssue(issue) && video.poster_url) {
            actionButtons.push(`<button class="mini-btn" data-set-cover-photo="${escapeHtml(video.poster_url || '')}" data-set-cover-thumb="${escapeHtml(video.thumb_url || video.poster_url || '')}" data-issue-id="${issue.id}">${txt('ใช้ Poster เป็น Cover', 'Use poster as Cover')}</button>`);
          }
          if (phase === 'after' && canWorkIssue(issue)) {
            actionButtons.push(`<button class="mini-btn danger" data-remove-after-video-index="${index}" data-issue-id="${issue.id}">${txt('ลบวิดีโอนี้', 'Delete video')}</button>`);
          }
          return `
          <div class="issue-media-card ${isCover ? 'is-cover' : ''}">
            <div class="issue-media-label">${txt('วิดีโอ', 'Video')} ${index + 1}</div>
            <video class="issue-video" src="${video.url || ''}" ${video.poster_url ? `poster="${video.poster_url}"` : ''} controls playsinline preload="metadata"></video>
            ${actionButtons.length ? `<div class="issue-media-actions">${actionButtons.join('')}</div>` : ''}
          </div>
        `;
        }));
      }
      return cards;
    };

    const beforeCards = renderMediaCards(beforePhotos, beforeVideos, 'before');
    const afterCards = renderMediaCards(afterPhotos, afterVideos, 'after');

    if (!beforeCards.length && !afterCards.length) {
      return `<div class="issue-hero placeholder issue-thumb">${txt('ไม่มีสื่อ', 'NO MEDIA')}</div>`;
    }

    const sections = [];
    if (beforeCards.length) {
      sections.push(`
        <div class="issue-media-section">
          <div class="issue-media-section-title">${txt('สื่อที่แนบตอนแจ้ง', 'Reported media')}</div>
          <div class="issue-media-stack">${beforeCards.join('')}</div>
        </div>
      `);
    }
    if (afterCards.length) {
      sections.push(`
        <div class="issue-media-section">
          <div class="issue-media-section-title success">${txt('หลักฐานส่งงาน', 'Completion evidence')}</div>
          <div class="issue-media-stack">${afterCards.join('')}</div>
        </div>
      `);
    }

    return sections.join('');
  }

  function closeIssueModal() {
    state.ui.openIssueId = null;
    state.ui.openChecklistRunId = null;
    stopIssueCommentsSync();
    el.issueModal.classList.add('hidden');
  }


  function getDepartmentPendingIssuesForAlert() {
    if (!state.currentUser) return [];
    const myDept = getCurrentUserDeptCode();
    if (!myDept) return [];
    return (state.data.issues || [])
      .filter(issue => issue && issue.issue_type !== 'checklist_submission')
      .filter(issue => normalizeDepartmentValue(issue.assigned_department, '') === myDept)
      .filter(issue => String(issue.status || 'open') !== 'closed')
      .sort((a, b) => new Date(b.last_activity_at || b.updated_at || b.created_at || 0) - new Date(a.last_activity_at || a.updated_at || a.created_at || 0));
  }

  function getDepartmentPendingCounts(issues = []) {
    const open = issues.filter(issue => (issue.status || 'open') === 'open').length;
    const inProgress = issues.filter(issue => issue.status === 'in_progress').length;
    const waiting = issues.filter(issue => issue.status === 'waiting').length;
    const urgent = issues.filter(issue => issue.status !== 'closed' && ['high', 'critical'].includes(issue.priority)).length;
    return { total: issues.length, open, inProgress, waiting, urgent };
  }

  function closeAlertModalAndOpenIssue(issueId) {
    closeMentionAlertModal(true);
    if (!issueId) return;
    switchView('boardView');
    window.setTimeout(() => openIssueModal(issueId), 80);
  }

  function showDepartmentPendingAlertModal(issues = []) {
    if (!el.mentionAlertModal || !el.mentionAlertModalContent || !issues.length || !state.currentUser) return false;
    const deptCode = getCurrentUserDeptCode();
    const deptName = getDepartmentName(deptCode);
    const counts = getDepartmentPendingCounts(issues);
    const latestIssues = issues.slice(0, 5);
    state.ui.didDepartmentPendingAlert = true;
    state.ui.pendingMentionItems = [];
    state.ui.alertModalMode = 'department_pending';
    state.ui.mentionModalOpen = true;

    el.mentionAlertModalContent.innerHTML = `
      <div class="panel-header mention-alert-header dept-pending-header">
        <div>
          <h3>${txt('มีงานค้างในแผนกของคุณ', 'Pending work in your department')}</h3>
          <p class="muted">${escapeHtml(deptName)} • ${txt('ระบบแจ้งเตือนเมื่อเข้าแอพ', 'App entry alert')}</p>
        </div>
      </div>
      <div class="dept-pending-total">
        <div class="dept-pending-total-number">${counts.total}</div>
        <div>
          <div class="dept-pending-total-label">${txt('งานค้างทั้งหมด', 'Total pending jobs')}</div>
          <div class="muted">${txt('นับเฉพาะงานที่ Assign เข้าแผนกของคุณ และยังไม่ Closed', 'Only jobs assigned to your department that are not closed')}</div>
        </div>
      </div>
      <div class="dept-pending-count-grid">
        <div class="dept-pending-count-card"><strong>${counts.open}</strong><span>${txt('เปิดใหม่', 'Open')}</span></div>
        <div class="dept-pending-count-card"><strong>${counts.inProgress}</strong><span>${txt('กำลังทำ', 'In Progress')}</span></div>
        <div class="dept-pending-count-card"><strong>${counts.waiting}</strong><span>${txt('รอ', 'Waiting')}</span></div>
        <div class="dept-pending-count-card urgent"><strong>${counts.urgent}</strong><span>${txt('High/Critical', 'High/Critical')}</span></div>
      </div>
      <div class="mention-alert-list dept-pending-list">
        ${latestIssues.map(issue => `
          <button type="button" class="mention-alert-item dept-pending-item" data-open-dept-pending-issue="${escapeHtml(issue.id || '')}">
            <div class="mention-alert-item-top">
              <span class="mention-alert-issue-no">${escapeHtml(issue.issue_no || issue.id || 'Issue')}</span>
              <span class="mention-alert-time">${escapeHtml(formatDateTime(issue.last_activity_at || issue.updated_at || issue.created_at) || '-')}</span>
            </div>
            <div class="mention-alert-title">${escapeHtml(issue.title || txt('ไม่มีหัวข้อ', 'Untitled'))}</div>
            <div class="mention-alert-meta">${escapeHtml(issue.location_text || '-')} • ${escapeHtml(translateStatus(issue.status || 'open'))} • ${escapeHtml(translatePriority(issue.priority || 'medium'))}</div>
            <div class="mention-alert-message">${escapeHtml(issue.description || '')}</div>
          </button>
        `).join('')}
      </div>
      ${issues.length > latestIssues.length ? `<p class="dept-pending-more muted">${txt(`แสดงล่าสุด ${latestIssues.length} งาน จากทั้งหมด ${issues.length} งาน`, `Showing latest ${latestIssues.length} of ${issues.length} jobs`)}</p>` : ''}
      <div class="sticky-actions mention-alert-actions dept-pending-actions">
        <button type="button" class="btn btn-secondary" id="deptPendingDismissBtn">${txt('รับทราบ', 'Got it')}</button>
        <button type="button" class="btn btn-primary" id="deptPendingOpenBoardBtn">${txt('เปิดบอร์ดงาน', 'Open board')}</button>
      </div>
    `;

    qsa('[data-open-dept-pending-issue]', el.mentionAlertModalContent).forEach(btn => btn.addEventListener('click', () => {
      closeAlertModalAndOpenIssue(btn.dataset.openDeptPendingIssue || btn.getAttribute('data-open-dept-pending-issue') || '');
    }));
    const dismissBtn = qs('#deptPendingDismissBtn', el.mentionAlertModalContent);
    if (dismissBtn) dismissBtn.addEventListener('click', () => closeMentionAlertModal());
    const openBoardBtn = qs('#deptPendingOpenBoardBtn', el.mentionAlertModalContent);
    if (openBoardBtn) openBoardBtn.addEventListener('click', () => {
      closeMentionAlertModal(true);
      state.ui.boardFilter = 'all';
      switchView('boardView');
      renderBoard();
    });
    el.mentionAlertModal.classList.remove('hidden');
    return true;
  }

  function checkDepartmentPendingAlertOnLogin() {
    if (!state.currentUser || state.ui.didDepartmentPendingAlert || state.ui.mentionModalOpen) return false;
    const pendingIssues = getDepartmentPendingIssuesForAlert();
    if (!pendingIssues.length) {
      state.ui.didDepartmentPendingAlert = true;
      queueMentionAlertCheck();
      return false;
    }
    const shown = showDepartmentPendingAlertModal(pendingIssues);
    if (!shown) {
      state.ui.didDepartmentPendingAlert = true;
      queueMentionAlertCheck();
    }
    return shown;
  }

  function queueDepartmentPendingAlertCheck() {
    if (!state.currentUser || state.ui.didDepartmentPendingAlert) return;
    window.setTimeout(() => { checkDepartmentPendingAlertOnLogin(); }, 450);
  }


  function getMentionSeenKey() {
    return state.currentUser?.uid ? `${APP_KEY}_mention_seen_${state.currentUser.uid}` : `${APP_KEY}_mention_seen_demo`;
  }

  function getSeenMentionIds() {
    try {
      const raw = localStorage.getItem(getMentionSeenKey());
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveSeenMentionIds(ids = []) {
    try {
      const trimmed = Array.from(new Set(ids)).slice(-400);
      localStorage.setItem(getMentionSeenKey(), JSON.stringify(trimmed));
    } catch (_) {}
  }

  function mentionEntryId(item) {
    return `${item.issue_id || 'issue'}:${item.comment_id || item.created_at || cryptoRandom()}`;
  }

  function closeMentionAlertModal(silent = false) {
    if (!el.mentionAlertModal) return;
    const previousMode = state.ui.alertModalMode || '';
    if (!silent && Array.isArray(state.ui.pendingMentionItems) && state.ui.pendingMentionItems.length) {
      const seen = getSeenMentionIds();
      saveSeenMentionIds([...seen, ...state.ui.pendingMentionItems.map(mentionEntryId)]);
    }
    state.ui.pendingMentionItems = [];
    state.ui.mentionModalOpen = false;
    state.ui.alertModalMode = '';
    el.mentionAlertModal.classList.add('hidden');
    if (el.mentionAlertModalContent) el.mentionAlertModalContent.innerHTML = '';
    if (previousMode === 'department_pending') {
      window.setTimeout(() => queueMentionAlertCheck(), 250);
    }
  }

  function showMentionAlertModal(items = []) {
    if (!el.mentionAlertModal || !el.mentionAlertModalContent || !items.length) return;
    state.ui.pendingMentionItems = items;
    state.ui.alertModalMode = 'mentions';
    state.ui.mentionModalOpen = true;
    el.mentionAlertModalContent.innerHTML = `
      <div class="panel-header mention-alert-header">
        <div>
          <h3>${txt('มีคนแท็กชื่อคุณ', 'You were mentioned')}</h3>
          <p class="muted">${txt('ตรวจสอบว่าใครแท็กคุณไว้ใน Issue ไหนบ้าง', 'See which issues mention your name')}</p>
        </div>
      </div>
      <div class="mention-alert-list">
        ${items.map(item => `
          <button type="button" class="mention-alert-item" data-open-mentioned-issue="${escapeHtml(item.issue_id || '')}">
            <div class="mention-alert-item-top">
              <span class="mention-alert-issue-no">${escapeHtml(item.issue_no || item.issue_id || 'Issue')}</span>
              <span class="mention-alert-time">${escapeHtml(formatDateTime(item.created_at) || '-')}</span>
            </div>
            <div class="mention-alert-title">${escapeHtml(item.issue_title || item.issue_id || txt('Issue ที่ถูกแท็ก', 'Mentioned issue'))}</div>
            <div class="mention-alert-meta">${escapeHtml(item.by_name || '-')} • ${escapeHtml(getDepartmentName(normalizeDepartmentValue(item.by_department, 'MOD')))}</div>
            <div class="mention-alert-message">${escapeHtml(item.message || '')}</div>
          </button>
        `).join('')}
      </div>
      <div class="sticky-actions mention-alert-actions">
        <button type="button" class="btn btn-primary" id="mentionAlertDoneBtn">${txt('รับทราบ', 'Got it')}</button>
      </div>
    `;
    qsa('[data-open-mentioned-issue]', el.mentionAlertModalContent).forEach(btn => btn.addEventListener('click', () => {
      const issueId = btn.dataset.openMentionedIssue || btn.dataset.openMentionedissue || btn.getAttribute('data-open-mentioned-issue') || '';
      closeMentionAlertModal();
      if (!issueId) return;
      switchView('boardView');
      openIssueModal(issueId);
    }));
    const doneBtn = qs('#mentionAlertDoneBtn', el.mentionAlertModalContent);
    if (doneBtn) doneBtn.addEventListener('click', () => closeMentionAlertModal());
    el.mentionAlertModal.classList.remove('hidden');
  }

  async function fetchMentionAlerts() {
    if (!state.currentUser) return [];
    if (isFirebaseLive() && window.LAYA_FIREBASE?.sdk?.collectionGroup && window.LAYA_FIREBASE?.sdk?.getDocs) {
      const fb = window.LAYA_FIREBASE;
      const sdk = fb.sdk;
      const constraints = [
        sdk.collectionGroup(fb.db, 'comments'),
        sdk.where('mentions', 'array-contains', state.currentUser.full_name)
      ];
      if (sdk.limit) constraints.push(sdk.limit(PERF_LIMITS.mentionAlerts));
      const q = sdk.query(...constraints);
      const snap = await sdk.getDocs(q);
      return snap.docs.map(docSnap => {
        const data = docSnap.data() || {};
        const issueId = docSnap.ref?.parent?.parent?.id || '';
        const issue = (state.data.issues || []).find(item => item.id === issueId);
        return {
          comment_id: docSnap.id,
          issue_id: issueId,
          issue_no: issue?.issue_no || issueId,
          issue_title: issue?.title || '',
          by_uid: data.by_uid || '',
          by_name: data.by_name || '',
          by_department: data.by_department || '',
          message: data.message || '',
          created_at: normalizeDateValue(data.created_at),
        };
      }).filter(item => item.by_uid !== state.currentUser.uid)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return (state.data.issues || []).flatMap(issue =>
      (Array.isArray(issue.comments) ? issue.comments : [])
        .filter(comment => Array.isArray(comment.mentions) && comment.mentions.includes(state.currentUser.full_name))
        .filter(comment => comment.by_uid !== state.currentUser.uid)
        .map(comment => ({
          comment_id: comment.id,
          issue_id: issue.id,
          issue_no: issue.issue_no || issue.id,
          issue_title: issue.title || '',
          by_uid: comment.by_uid || '',
          by_name: comment.by_name || '',
          by_department: comment.by_department || '',
          message: comment.message || '',
          created_at: comment.created_at || '',
        }))
    ).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  async function checkMentionAlertsOnLogin() {
    if (!state.currentUser || state.ui.mentionModalOpen) return;
    try {
      const items = await fetchMentionAlerts();
      if (!items.length) return;
      const seenIds = new Set(getSeenMentionIds());
      const unseen = items.filter(item => !seenIds.has(mentionEntryId(item))).slice(0, 12);
      if (unseen.length) showMentionAlertModal(unseen);
    } catch (err) {
      console.error('mention alert check failed', err);
    }
  }

  function queueMentionAlertCheck() {
    if (!state.currentUser || state.ui.didInitialMentionCheck) return;
    if (!state.ui.didDepartmentPendingAlert) return;
    if (state.ui.mentionModalOpen && state.ui.alertModalMode === 'department_pending') return;
    state.ui.didInitialMentionCheck = true;
    window.setTimeout(() => { checkMentionAlertsOnLogin(); }, 700);
  }

  async function handleDetailEvidencePicked(issueId, kind, event) {
    const input = event.target;
    const files = Array.from(input?.files || []);
    input.value = '';
    if (!files.length) return;
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) return;
    if (state.ui.pendingEvidenceBusy) return alert('กำลังอัปหลักฐาน กรุณารอสักครู่');

    const statusEl = qs('#detailEvidenceStatus', el.issueModalContent);
    const setStatus = (message) => { if (statusEl) statusEl.textContent = message; };

    try {
      state.ui.pendingEvidenceBusy = true;
      if (kind === 'photo') {
        for (let i = 0; i < files.length; i += 1) {
          setStatus(`กำลังย่อและอัปรูปหลักฐาน ${i + 1}/${files.length}...`);
          await addIssueEvidencePhoto(issueId, files[i]);
        }
        setStatus(`เพิ่มรูปหลักฐานเรียบร้อย ${files.length} รูป`);
      } else {
        for (let i = 0; i < files.length; i += 1) {
          setStatus(`กำลังเตรียมและอัปวิดีโอหลักฐาน ${i + 1}/${files.length}...`);
          await addIssueEvidenceVideo(issueId, files[i]);
        }
        setStatus(`เพิ่มวิดีโอหลักฐานเรียบร้อย ${files.length} ไฟล์`);
      }
      if (!isFirebaseLive()) openIssueModal(issueId);
    } catch (err) {
      console.error('detail evidence upload failed', err);
      setStatus('อัปหลักฐานไม่สำเร็จ');
      alert(kind === 'photo' ? friendlyPhotoError(err) : friendlyVideoError(err));
    } finally {
      state.ui.pendingEvidenceBusy = false;
    }
  }

  async function addIssueEvidencePhoto(issueId, file) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) throw new Error('permission_denied');

    const fullDataUrl = await fileToOptimizedDataUrl(file, { targetBytes: 260 * 1024 });
    const thumbDataUrl = await fileToDataUrl(file, 520, 0.64);
    const nowIso = new Date().toISOString();

    if (!isFirebaseLive()) {
      issue.after_photos = Array.isArray(issue.after_photos) ? issue.after_photos : [];
      issue.after_photos.push({
        url: fullDataUrl,
        thumb_url: thumbDataUrl,
        uploaded_at: nowIso,
      });
      issue.updated_at = nowIso;
      issue.last_activity_at = nowIso;
      issue.activity_count = Number(issue.activity_count || 0) + 1;
      recordUsageLogLocal({
        category: 'evidence',
        action: 'add_evidence_photo',
        title: issue.title,
        text: `${state.currentUser.full_name} added completion photo to ${issue.issue_no || issueId}`,
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
      });
      persist();
      renderAll();
      return;
    }

    const uploaded = await uploadIssuePhotoSet({
      issueId,
      fullDataUrl,
      thumbDataUrl,
      mimeType: 'image/jpeg',
      phase: 'after'
    });

    const evidence = {
      url: uploaded.fullUrl,
      thumb_url: uploaded.thumbUrl,
      storage_path: uploaded.fullPath,
      thumb_storage_path: uploaded.thumbPath,
      uploaded_at: nowIso,
    };

    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    await sdk.runTransaction(fb.db, async (tx) => {
      const issueRef = sdk.doc(fb.db, 'issues', issueId);
      const snap = await tx.get(issueRef);
      if (!snap.exists()) throw new Error('issue_not_found');
      const liveIssue = { id: snap.id, ...snap.data() };
      if (!canWorkIssue(liveIssue)) throw new Error('permission_denied');
      const nextAfterPhotos = Array.isArray(liveIssue.after_photos) ? [...liveIssue.after_photos, evidence] : [evidence];
      const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
      tx.update(issueRef, {
        after_photos: nextAfterPhotos,
        updated_at: sdk.serverTimestamp(),
        last_activity_at: sdk.serverTimestamp(),
        activity_count: sdk.increment(1),
      });
      tx.set(activityRef, {
        action: 'photo_added',
        note: 'Added completion evidence photo',
        by_uid: state.currentUser.uid,
        by_name: state.currentUser.full_name,
        by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
        created_at: sdk.serverTimestamp(),
      });
    });
    recordUsageLog({
      category: 'evidence',
      action: 'add_evidence_photo',
      title: issue.title,
      text: `${state.currentUser.full_name} added completion photo to ${issue.issue_no || issueId}`,
      issue_id: issueId,
      ref_no: issue.issue_no || issueId,
    });
  }

  async function addIssueEvidenceVideo(issueId, file) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) throw new Error('permission_denied');

    if (!isAcceptedVideoFile(file)) throw new Error('invalid_video_type');
    if ((file.size || 0) > MAX_VIDEO_UPLOAD_BYTES) throw new Error('video_too_large');

    const prepared = await prepareIssueVideo(file);
    const nowIso = new Date().toISOString();

    if (!isFirebaseLive()) {
      issue.after_videos = Array.isArray(issue.after_videos) ? issue.after_videos : [];
      issue.after_videos.push({
        url: prepared.previewUrl,
        poster_url: prepared.posterDataUrl,
        thumb_url: prepared.thumbDataUrl || prepared.posterDataUrl,
        mime_type: prepared.mimeType,
        original_name: prepared.fileName,
        size: prepared.originalBytes,
        uploaded_at: nowIso,
        preview_status: prepared.posterDataUrl ? 'ready' : 'pending',
        compression_status: 'pending',
      });
      issue.updated_at = nowIso;
      issue.last_activity_at = nowIso;
      issue.activity_count = Number(issue.activity_count || 0) + 1;
      recordUsageLogLocal({
        category: 'evidence',
        action: 'add_evidence_video',
        title: issue.title,
        text: `${state.currentUser.full_name} added completion video to ${issue.issue_no || issueId}`,
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
      });
      persist();
      renderAll();
      return;
    }

    const uploaded = await uploadIssueVideoSet({
      issueId,
      file: prepared.file,
      mimeType: prepared.mimeType,
      fileName: prepared.fileName,
      posterDataUrl: prepared.posterDataUrl || '',
      thumbDataUrl: prepared.thumbDataUrl || prepared.posterDataUrl || '',
      phase: 'after'
    });

    const evidence = {
      url: uploaded.videoUrl,
      poster_url: uploaded.posterUrl,
      thumb_url: uploaded.thumbUrl || uploaded.posterUrl,
      storage_path: uploaded.videoPath,
      poster_storage_path: uploaded.posterPath,
      thumb_storage_path: uploaded.thumbPath,
      mime_type: prepared.mimeType,
      original_name: prepared.fileName,
      size: prepared.originalBytes,
      uploaded_at: nowIso,
      preview_status: uploaded.posterUrl || uploaded.thumbUrl ? 'ready' : 'pending',
      compression_status: 'pending',
    };

    try { if (prepared.previewUrl) URL.revokeObjectURL(prepared.previewUrl); } catch (_) {}

    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    await sdk.runTransaction(fb.db, async (tx) => {
      const issueRef = sdk.doc(fb.db, 'issues', issueId);
      const snap = await tx.get(issueRef);
      if (!snap.exists()) throw new Error('issue_not_found');
      const liveIssue = { id: snap.id, ...snap.data() };
      if (!canWorkIssue(liveIssue)) throw new Error('permission_denied');
      const nextAfterVideos = Array.isArray(liveIssue.after_videos) ? [...liveIssue.after_videos, evidence] : [evidence];
      const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
      tx.update(issueRef, {
        after_videos: nextAfterVideos,
        updated_at: sdk.serverTimestamp(),
        last_activity_at: sdk.serverTimestamp(),
        activity_count: sdk.increment(1),
      });
      tx.set(activityRef, {
        action: 'video_added',
        note: 'Added completion evidence video',
        by_uid: state.currentUser.uid,
        by_name: state.currentUser.full_name,
        by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
        created_at: sdk.serverTimestamp(),
      });
    });
    recordUsageLog({
      category: 'evidence',
      action: 'add_evidence_video',
      title: issue.title,
      text: `${state.currentUser.full_name} added completion video to ${issue.issue_no || issueId}`,
      issue_id: issueId,
      ref_no: issue.issue_no || issueId,
    });
    queueIssueVideoPreviewBackfill({
      issueId,
      phase: 'after',
      file: prepared.file,
      videoMeta: evidence
    });
  }

  async function deleteStoragePaths(paths = []) {
    const uniquePaths = [...new Set((Array.isArray(paths) ? paths : []).filter(Boolean))];
    if (!uniquePaths.length) return;
    const fb = window.LAYA_FIREBASE;
    if (!fb?.ready || !fb.storage || !fb.sdk?.storageRef || !fb.sdk?.deleteObject) return;
    await Promise.all(uniquePaths.map(async (storagePath) => {
      try {
        const ref = fb.sdk.storageRef(fb.storage, storagePath);
        await fb.sdk.deleteObject(ref);
      } catch (err) {
        console.warn('storage delete skipped', storagePath, err?.message || err);
      }
    }));
  }

  async function removeIssueEvidencePhoto(issueId, index) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) return;
    const photos = Array.isArray(issue.after_photos) ? issue.after_photos.filter(Boolean) : [];
    if (index < 0 || index >= photos.length) return;
    const target = photos[index] || {};
    if (!window.confirm(txt('ลบรูปหลักฐานนี้ใช่ไหม', 'Delete this evidence photo?'))) return;

    const nowIso = new Date().toISOString();
    if (!isFirebaseLive()) {
      issue.after_photos = photos.filter((_, idx) => idx !== index);
      issue.updated_at = nowIso;
      issue.last_activity_at = nowIso;
      issue.activity_count = Number(issue.activity_count || 0) + 1;
      recordUsageLogLocal({
        category: 'evidence',
        action: 'delete_evidence_photo',
        title: issue.title,
        text: `${state.currentUser.full_name} removed completion photo from ${issue.issue_no || issueId}`,
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
      });
      persist();
      renderAll();
      openIssueModal(issueId);
      return;
    }

    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    await sdk.runTransaction(fb.db, async (tx) => {
      const issueRef = sdk.doc(fb.db, 'issues', issueId);
      const snap = await tx.get(issueRef);
      if (!snap.exists()) throw new Error('issue_not_found');
      const liveIssue = { id: snap.id, ...snap.data() };
      if (!canWorkIssue(liveIssue)) throw new Error('permission_denied');
      const livePhotos = Array.isArray(liveIssue.after_photos) ? liveIssue.after_photos.filter(Boolean) : [];
      if (index < 0 || index >= livePhotos.length) throw new Error('evidence_not_found');
      const nextAfterPhotos = livePhotos.filter((_, idx) => idx !== index);
      const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
      tx.update(issueRef, {
        after_photos: nextAfterPhotos,
        updated_at: sdk.serverTimestamp(),
        last_activity_at: sdk.serverTimestamp(),
        activity_count: sdk.increment(1),
      });
      tx.set(activityRef, {
        action: 'photo_deleted',
        note: 'Deleted completion evidence photo',
        by_uid: state.currentUser.uid,
        by_name: state.currentUser.full_name,
        by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
        created_at: sdk.serverTimestamp(),
      });
    });
    await deleteStoragePaths([target.storage_path, target.thumb_storage_path]);
    recordUsageLog({
      category: 'evidence',
      action: 'delete_evidence_photo',
      title: issue.title,
      text: `${state.currentUser.full_name} removed completion photo from ${issue.issue_no || issueId}`,
      issue_id: issueId,
      ref_no: issue.issue_no || issueId,
    });
  }

  async function removeIssueEvidenceVideo(issueId, index) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) return;
    const videos = Array.isArray(issue.after_videos) ? issue.after_videos.filter(Boolean) : [];
    if (index < 0 || index >= videos.length) return;
    const target = videos[index] || {};
    if (!window.confirm(txt('ลบวิดีโอหลักฐานนี้ใช่ไหม', 'Delete this evidence video?'))) return;

    const nowIso = new Date().toISOString();
    if (!isFirebaseLive()) {
      issue.after_videos = videos.filter((_, idx) => idx !== index);
      issue.updated_at = nowIso;
      issue.last_activity_at = nowIso;
      issue.activity_count = Number(issue.activity_count || 0) + 1;
      recordUsageLogLocal({
        category: 'evidence',
        action: 'delete_evidence_video',
        title: issue.title,
        text: `${state.currentUser.full_name} removed completion video from ${issue.issue_no || issueId}`,
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
      });
      persist();
      renderAll();
      openIssueModal(issueId);
      return;
    }

    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    await sdk.runTransaction(fb.db, async (tx) => {
      const issueRef = sdk.doc(fb.db, 'issues', issueId);
      const snap = await tx.get(issueRef);
      if (!snap.exists()) throw new Error('issue_not_found');
      const liveIssue = { id: snap.id, ...snap.data() };
      if (!canWorkIssue(liveIssue)) throw new Error('permission_denied');
      const liveVideos = Array.isArray(liveIssue.after_videos) ? liveIssue.after_videos.filter(Boolean) : [];
      if (index < 0 || index >= liveVideos.length) throw new Error('evidence_not_found');
      const nextAfterVideos = liveVideos.filter((_, idx) => idx !== index);
      const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
      tx.update(issueRef, {
        after_videos: nextAfterVideos,
        updated_at: sdk.serverTimestamp(),
        last_activity_at: sdk.serverTimestamp(),
        activity_count: sdk.increment(1),
      });
      tx.set(activityRef, {
        action: 'video_deleted',
        note: 'Deleted completion evidence video',
        by_uid: state.currentUser.uid,
        by_name: state.currentUser.full_name,
        by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
        created_at: sdk.serverTimestamp(),
      });
    });
    await deleteStoragePaths([target.storage_path, target.poster_storage_path, target.thumb_storage_path]);
    recordUsageLog({
      category: 'evidence',
      action: 'delete_evidence_video',
      title: issue.title,
      text: `${state.currentUser.full_name} removed completion video from ${issue.issue_no || issueId}`,
      issue_id: issueId,
      ref_no: issue.issue_no || issueId,
    });
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

      addSystemComment(issue, txt(`เปลี่ยนสถานะจาก ${labelize(fromStatus)} เป็น ${labelize(toStatus)}`, `Status changed from ${labelize(fromStatus)} to ${labelize(toStatus)}`));
      addActivity({
        type: 'issue',
        title: issue.title,
        text: txt(`${state.currentUser.full_name} เปลี่ยนสถานะเป็น ${translateStatus(toStatus)}`, `${state.currentUser.full_name} changed status to ${translateStatus(toStatus)}`),
        created_at: new Date().toISOString(),
      });

      recordUsageLogLocal({
        category: 'issue',
        action: toStatus === 'closed' ? 'close_issue' : (toStatus === 'open' && fromStatus === 'closed' ? 'reopen_issue' : 'change_status'),
        title: issue.title,
        text: txt(`${state.currentUser.full_name} เปลี่ยน ${issue.issue_no || issueId} จาก ${labelize(fromStatus)} เป็น ${labelize(toStatus)}`, `${state.currentUser.full_name} changed ${issue.issue_no || issueId} from ${labelize(fromStatus)} to ${labelize(toStatus)}`),
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
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
          by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
          created_at: sdk.serverTimestamp(),
        });
      });
      if (state.ui.openIssueId === issueId) openIssueModal(issueId);
    } catch (err) {
      console.error('update status failed', err);
      alert(friendlyIssueError(err));
    }
  }

  async function setIssueCover(issueId, coverUrl, coverThumbUrl = '') {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canWorkIssue(issue)) return;
    const nextCoverUrl = coverUrl || '';
    const nextCoverThumb = coverThumbUrl || coverUrl || '';

    if (!isFirebaseLive()) {
      issue.cover_photo_url = nextCoverUrl;
      issue.cover_thumb_url = nextCoverThumb;
      issue.updated_at = new Date().toISOString();
      issue.last_activity_at = issue.updated_at;
      addActivity({
        type: 'issue',
        title: issue.title,
        text: txt(`${state.currentUser.full_name} ตั้งภาพปกให้ ${issue.issue_no || issueId}`, `${state.currentUser.full_name} set cover photo for ${issue.issue_no || issueId}`),
        created_at: issue.updated_at,
      });
      recordUsageLogLocal({
        category: 'issue',
        action: 'set_cover',
        title: issue.title,
        text: txt(`${state.currentUser.full_name} ตั้งภาพปกให้ ${issue.issue_no || issueId}`, `${state.currentUser.full_name} set cover photo for ${issue.issue_no || issueId}`),
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
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
        const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
        tx.update(issueRef, {
          cover_photo_url: nextCoverUrl,
          cover_thumb_url: nextCoverThumb,
          updated_at: sdk.serverTimestamp(),
          last_activity_at: sdk.serverTimestamp(),
          activity_count: sdk.increment(1),
        });
        tx.set(activityRef, {
          action: 'cover_updated',
          note: 'Updated issue cover photo',
          by_uid: state.currentUser.uid,
          by_name: state.currentUser.full_name,
          by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
          created_at: sdk.serverTimestamp(),
        });
      });
      recordUsageLog({
        category: 'issue',
        action: 'set_cover',
        title: issue.title,
        text: txt(`${state.currentUser.full_name} ตั้งภาพปกให้ ${issue.issue_no || issueId}`, `${state.currentUser.full_name} set cover photo for ${issue.issue_no || issueId}`),
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
      });
      if (state.ui.openIssueId === issueId) openIssueModal(issueId);
    } catch (err) {
      console.error('set issue cover failed', err);
      alert(friendlyIssueError(err));
    }
  }

  async function addIssueComment(issueId, message, mentions = []) {
    const issue = state.data.issues.find(i => i.id === issueId);
    if (!issue || !canCommentIssue(issue)) return;

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
        mentions,
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

      recordUsageLogLocal({
        category: 'comment',
        action: 'add_comment',
        title: issue.title,
        text: `${state.currentUser.full_name}: ${message.slice(0, 120)}`,
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
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
        if (!canCommentIssue(liveIssue)) throw new Error('permission_denied');

        const commentRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/comments`));
        const activityRef = sdk.doc(sdk.collection(fb.db, `issues/${issueId}/activity`));
        tx.set(commentRef, {
          type: 'user',
          message,
          by_uid: state.currentUser.uid,
          by_name: state.currentUser.full_name,
          by_role: state.currentUser.role,
          by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
          mentions,
          photos: [],
          created_at: sdk.serverTimestamp(),
        });
        tx.set(activityRef, {
          action: 'comment_added',
          note: message,
          by_uid: state.currentUser.uid,
          by_name: state.currentUser.full_name,
          by_department: normalizeDepartmentValue(state.currentUser.department, 'MOD'),
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
      recordUsageLog({
        category: 'comment',
        action: 'add_comment',
        title: issue.title,
        text: `${state.currentUser.full_name}: ${message.slice(0, 120)}`,
        issue_id: issueId,
        ref_no: issue.issue_no || issueId,
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
      by_name: txt('ระบบ', 'System'),
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
    if (!canUseChecklistForRole()) {
      // v109: Staff/Department users do not load checklist_runs.
      // Mark checklist sync as ready so the Board does not stay stuck on "Loading work data...".
      state.ui.checklistSyncStatus = 'ready';
      state.data.checklistRuns = [];
      renderBoard();
      return;
    }
    stopChecklistRunsSync();
    state.ui.checklistSyncStatus = 'loading';
    renderBoard();
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const constraints = [sdk.collection(fb.db, 'checklist_runs')];
    if (sdk.orderBy) constraints.push(sdk.orderBy('submitted_at', 'desc'));
    if (sdk.limit) constraints.push(sdk.limit(PERF_LIMITS.checklistRuns));
    const q = sdk.query(...constraints);
    state.firebaseChecklistRunsUnsub = sdk.onSnapshot(q, (snap) => {
      state.ui.checklistSyncStatus = 'ready';
      state.data.checklistRuns = snap.docs.map(normalizeChecklistRunDoc).sort((a, b) => new Date(b.submitted_at || b.created_at || 0) - new Date(a.submitted_at || a.created_at || 0));
      persistFastDashboardCache();
      renderBoard();
    }, (err) => {
      state.ui.checklistSyncStatus = 'error';
      console.error('checklist runs sync failed', err);
    });
  }

  function startIssuesSync() {
    if (!isFirebaseLive() || !state.currentUser) return;
    stopIssueSync();
    state.ui.issueSyncStatus = 'loading';
    renderSummary();
    renderBoard();
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;

    function finishIssueSnapshot(listA = [], listB = []) {
      const byId = new Map();
      [...listA, ...listB].forEach(issue => {
        if (issue && issue.id) byId.set(issue.id, issue);
      });
      state.ui.issueSyncStatus = 'ready';
      state.data.issues = Array.from(byId.values())
        .sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
      persistFastDashboardCache();
      renderAll();
      queueDepartmentPendingAlertCheck();
      queueMentionAlertCheck();
      if (state.ui.openIssueId) {
        const liveIssue = state.data.issues.find(i => i.id === state.ui.openIssueId);
        if (!liveIssue) closeIssueModal();
        else renderIssueModalContent(liveIssue);
      }
    }

    function handleIssueSnapshotError(err) {
      state.ui.issueSyncStatus = 'error';
      console.error('issues onSnapshot failed', err);
      setAuthStatus('อ่าน Issue จาก Firestore ไม่สำเร็จ', 'error');
      renderSummary();
      renderBoard();
    }

    if (!canManageAllWork() && sdk.where) {
      // v97: Staff/Supervisor ต้องเห็นทั้งงานของแผนกตัวเอง และงานที่ตัวเองเป็นผู้แจ้ง
      // จึงใช้ 2 realtime queries แล้ว merge ตาม issue id แทนการโหลดเฉพาะ assigned_department อย่างเดียว
      let deptIssues = [];
      let reporterIssues = [];
      let deptReady = false;
      let reporterReady = false;

      const deptConstraints = [
        sdk.collection(fb.db, 'issues'),
        sdk.where('assigned_department', '==', state.currentUser.department || '')
      ];
      const reporterConstraints = [
        sdk.collection(fb.db, 'issues'),
        sdk.where('reported_by_uid', '==', state.currentUser.uid || '')
      ];
      if (sdk.limit) {
        deptConstraints.push(sdk.limit(PERF_LIMITS.issues));
        reporterConstraints.push(sdk.limit(PERF_LIMITS.issues));
      }

      const deptUnsub = sdk.onSnapshot(sdk.query(...deptConstraints), (snap) => {
        deptReady = true;
        deptIssues = snap.docs.map(normalizeIssueDoc);
        if (deptReady && reporterReady) finishIssueSnapshot(deptIssues, reporterIssues);
      }, handleIssueSnapshotError);

      const reporterUnsub = sdk.onSnapshot(sdk.query(...reporterConstraints), (snap) => {
        reporterReady = true;
        reporterIssues = snap.docs.map(normalizeIssueDoc);
        if (deptReady && reporterReady) finishIssueSnapshot(deptIssues, reporterIssues);
      }, handleIssueSnapshotError);

      state.firebaseIssuesUnsub = () => {
        try { deptUnsub(); } catch (_) {}
        try { reporterUnsub(); } catch (_) {}
      };
      return;
    }

    const constraints = [sdk.collection(fb.db, 'issues')];
    if (sdk.orderBy) constraints.push(sdk.orderBy('created_at', 'desc'));
    if (sdk.limit) constraints.push(sdk.limit(PERF_LIMITS.issues));
    const q = sdk.query(...constraints);

    state.firebaseIssuesUnsub = sdk.onSnapshot(q, (snap) => {
      finishIssueSnapshot(snap.docs.map(normalizeIssueDoc));
    }, handleIssueSnapshotError);
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
    const before_photos = Array.isArray(data.before_photos) ? data.before_photos : [];
    const before_videos = Array.isArray(data.before_videos) ? data.before_videos : [];
    return {
      id: docSnap.id,
      ...data,
      cover_photo_url: data.cover_photo_url || before_photos[0]?.url || before_videos[0]?.poster_url || (Array.isArray(data.after_photos) ? data.after_photos[0]?.url : '') || (Array.isArray(data.after_videos) ? data.after_videos[0]?.poster_url : '') || '',
      cover_thumb_url: data.cover_thumb_url || before_photos[0]?.thumb_url || before_photos[0]?.url || before_videos[0]?.thumb_url || before_videos[0]?.poster_url || (Array.isArray(data.after_photos) ? data.after_photos[0]?.thumb_url : '') || (Array.isArray(data.after_photos) ? data.after_photos[0]?.url : '') || (Array.isArray(data.after_videos) ? data.after_videos[0]?.thumb_url : '') || (Array.isArray(data.after_videos) ? data.after_videos[0]?.poster_url : '') || '',
      before_photos,
      before_videos,
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
      special_form_entries: Array.isArray(data.special_form_entries) ? data.special_form_entries : [],
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
      return 'ยังบันทึกงานไม่ได้: Firestore ยังปฏิเสธสิทธิ์ กรุณาอัปเดต Firestore Rules เป็นชุดล่าสุดแล้วกด Publish จากนั้นกด Clear Cache และ Login ใหม่';
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


  function startUsersSync() {
    if (!isFirebaseLive() || !state.currentUser) {
      state.data.teamMembers = DEMO_USERS.map(user => ({
        uid: user.uid,
        employee_id: user.employee_id,
        full_name: user.full_name,
        role: normalizeRole(user.role),
        department: normalizeDepartmentValue(user.department, 'MOD'),
        position: user.position || getRoleName(user.role),
        is_active: true,
      }));
      renderTeamMembers();
      return;
    }
    stopUsersSync();
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const constraints = [sdk.collection(fb.db, 'users')];
    if (!canManageUsers() && sdk.where) {
      constraints.push(sdk.where('department', '==', normalizeDepartmentValue(state.currentUser.department, '')));
    }
    const q = sdk.query(...constraints);
    state.firebaseUsersUnsub = sdk.onSnapshot(q, (snap) => {
      state.data.teamMembers = snap.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() }))
        .filter(user => user.is_active !== false)
        .sort((a, b) => String(a.full_name || a.fullName || a.displayName || '').localeCompare(String(b.full_name || b.fullName || b.displayName || ''), 'th'));
      renderTeamMembers();
    }, (err) => {
      console.error('users onSnapshot failed', err);
    });
  }

  function stopUsersSync() {
    if (typeof state.firebaseUsersUnsub === 'function') {
      try { state.firebaseUsersUnsub(); } catch (_) {}
    }
    state.firebaseUsersUnsub = null;
  }

  function getTeamMembers() {
    if (Array.isArray(state.data.teamMembers) && state.data.teamMembers.length) return state.data.teamMembers;
    return DEMO_USERS.map(user => ({
      uid: user.uid,
      employee_id: user.employee_id,
      full_name: user.full_name,
      role: normalizeRole(user.role),
      department: normalizeDepartmentValue(user.department, 'MOD'),
      position: user.position || getRoleName(user.role),
      is_active: true,
    }));
  }


  function stopUsageLogsSync() {
    if (typeof state.firebaseUsageLogsUnsub === 'function') {
      try { state.firebaseUsageLogsUnsub(); } catch (_) {}
    }
    state.firebaseUsageLogsUnsub = null;
  }

  function startUsageLogsSync() {
    if (!state.currentUser) return;
    if (!isFirebaseLive()) {
      renderUsageLogs();
      return;
    }
    stopUsageLogsSync();
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const constraints = [sdk.collection(fb.db, 'usage_logs'), sdk.orderBy('created_at', 'desc')];
    if (sdk.limit) constraints.push(sdk.limit(PERF_LIMITS.usageLogs));
    const q = sdk.query(...constraints);
    state.firebaseUsageLogsUnsub = sdk.onSnapshot(q, (snap) => {
      state.data.usageLogs = snap.docs.map(normalizeUsageLogDoc).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      if (state.ui.activeView === 'logView') renderUsageLogs();
      if (state.ui.activeView === 'activityView') renderActivity();
    }, (err) => {
      console.error('usage logs onSnapshot failed', err);
    });
  }

  function normalizeUsageLogDoc(docSnap) {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      created_at: normalizeDateValue(data.created_at),
    };
  }

  
function humanizeLogAction(action) {
  const map = {
    login: txt('เข้าสู่ระบบ', 'Signed in'),
    register: txt('สร้างบัญชี', 'Created account'),
    create_issue: txt('สร้าง issue', 'Created issue'),
    submit_checklist: txt('ส่งเช็กลิสต์', 'Submitted checklist'),
    archive_checklist: txt('ปิดการ์ดเช็กลิสต์', 'Closed checklist card'),
    reopen_checklist: txt('เปิดการ์ดเช็กลิสต์กลับ', 'Reopened checklist card'),
    close_issue: txt('ปิด issue', 'Closed issue'),
    reopen_issue: txt('เปิด issue กลับ', 'Reopened issue'),
    change_status: txt('เปลี่ยนสถานะ', 'Changed status'),
    add_comment: txt('เพิ่มคอมเมนต์', 'Added comment'),
    add_evidence_photo: txt('เพิ่มรูปหลักฐาน', 'Added evidence photo'),
    delete_evidence_photo: txt('ลบรูปหลักฐาน', 'Deleted evidence photo'),
    cover_updated: txt('เปลี่ยนภาพปก', 'Updated cover photo'),
    add_evidence_video: txt('เพิ่มวิดีโอหลักฐาน', 'Added evidence video'),
    delete_evidence_video: txt('ลบวิดีโอหลักฐาน', 'Deleted evidence video'),
  };
  return map[action] || labelize(String(action || 'log').replace(/_/g, ' '));
}



  function getFilteredUsageLogs() {
    const search = state.ui.logSearch || '';
    return [...(state.data.usageLogs || [])]
      .filter(item => {
        const hay = [item.title, item.text, item.user_name, item.ref_no, item.action, item.category].join(' ').toLowerCase();
        return !search || hay.includes(search);
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  async function exportUsageLogsToExcel() {
    const rows = getFilteredUsageLogs();
    if (!rows.length) {
      alert(txt('ยังไม่มี usage log สำหรับ export', 'No usage log available for export'));
      return;
    }

    if (!window.XLSX) {
      try {
        setAuthStatus(txt('กำลังโหลดระบบ Export Excel...', 'Loading Excel export...'), 'info');
        await loadXlsxLibrary();
      } catch (err) {
        console.error('xlsx lazy load failed', err);
        alert(txt('โหลดระบบ Export Excel ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 'Excel export could not be loaded. Please check the internet connection and try again.'));
        return;
      }
    }

    const exportRows = rows.map((item, index) => ({
      [txt('ลำดับ', 'No.')]: index + 1,
      [txt('วันเวลา', 'Date Time')]: formatDateTime(item.created_at),
      [txt('การกระทำ', 'Action')]: humanizeLogAction(item.action),
      [txt('หมวด', 'Category')]: item.category || '',
      [txt('หัวข้อ', 'Title')]: item.title || humanizeLogAction(item.action),
      [txt('รายละเอียด', 'Detail')]: item.text || '',
      [txt('เลขอ้างอิง', 'Reference No')]: item.ref_no || '',
      [txt('Issue ID', 'Issue ID')]: item.issue_id || '',
      [txt('Checklist Run ID', 'Checklist Run ID')]: item.checklist_run_id || '',
      [txt('ผู้ใช้', 'User')]: item.user_name || '',
      [txt('User UID', 'User UID')]: item.user_uid || '',
      [txt('เวลาแบบดิบ', 'Raw Timestamp')]: item.created_at || '',
    }));

    const ws = window.XLSX.utils.json_to_sheet(exportRows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 16 },
      { wch: 28 },
      { wch: 48 },
      { wch: 20 },
      { wch: 24 },
      { wch: 24 },
      { wch: 22 },
      { wch: 28 },
      { wch: 24 },
    ];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, txt('บันทึกการใช้งาน', 'Usage Log'));
    const stamp = new Date();
    const y = stamp.getFullYear();
    const m = String(stamp.getMonth() + 1).padStart(2, '0');
    const d = String(stamp.getDate()).padStart(2, '0');
    const hh = String(stamp.getHours()).padStart(2, '0');
    const mm = String(stamp.getMinutes()).padStart(2, '0');
    window.XLSX.writeFile(wb, `usage_logs_${y}${m}${d}_${hh}${mm}.xlsx`);
  }


  function loadXlsxLibrary() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxLoadPromise) return xlsxLoadPromise;
    xlsxLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-laya-xlsx-loader="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.XLSX), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.async = true;
      script.defer = true;
      script.dataset.layaXlsxLoader = 'true';
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('xlsx_not_available'));
      script.onerror = () => reject(new Error('xlsx_script_failed'));
      document.head.appendChild(script);
    });
    return xlsxLoadPromise;
  }


  function renderUsageLogs() {
    if (!el.usageLogList) return;
    const items = getFilteredUsageLogs();

    if (!items.length) {
      el.usageLogList.innerHTML = `<div class="empty-state">${txt('ยังไม่มี usage log', 'No usage logs yet')}</div>`;
      return;
    }

    el.usageLogList.innerHTML = items.map(item => `
      <div class="activity-item">
        <div class="comment-meta">${formatDateTime(item.created_at)} • ${escapeHtml(item.user_name || '-')} • ${escapeHtml(humanizeLogAction(item.action))}</div>
        <div><strong>${escapeHtml(item.title || humanizeLogAction(item.action))}</strong></div>
        <div>${escapeHtml(item.text || '')}</div>
        <div class="muted">${escapeHtml([item.ref_no || '', item.category ? `• ${item.category}` : ''].filter(Boolean).join(' '))}</div>
      </div>
    `).join('');
  }

  function recordUsageLogLocal(entry = {}) {
    const item = {
      id: cryptoRandom(),
      category: entry.category || 'general',
      action: entry.action || 'event',
      title: entry.title || humanizeLogAction(entry.action || 'event'),
      text: entry.text || '',
      issue_id: entry.issue_id || '',
      checklist_run_id: entry.checklist_run_id || '',
      ref_no: entry.ref_no || '',
      user_uid: entry.user_uid || state.currentUser?.uid || '',
      user_name: entry.user_name || state.currentUser?.full_name || '',
      created_at: entry.created_at || new Date().toISOString(),
    };
    state.data.usageLogs = [item, ...(state.data.usageLogs || [])].slice(0, 500);
    if (state.ui.activeView === 'logView') renderUsageLogs();
    if (state.ui.activeView === 'activityView') renderActivity();
    return item;
  }

  async function recordUsageLogFirebase(entry = {}) {
    if (!isFirebaseLive()) return;
    const fb = window.LAYA_FIREBASE;
    const sdk = fb.sdk;
    const ref = sdk.doc(sdk.collection(fb.db, 'usage_logs'));
    try {
      await sdk.setDoc(ref, {
        category: entry.category || 'general',
        action: entry.action || 'event',
        title: entry.title || humanizeLogAction(entry.action || 'event'),
        text: entry.text || '',
        issue_id: entry.issue_id || '',
        checklist_run_id: entry.checklist_run_id || '',
        ref_no: entry.ref_no || '',
        user_uid: entry.user_uid || state.currentUser?.uid || '',
        user_name: entry.user_name || state.currentUser?.full_name || '',
        created_at: sdk.serverTimestamp(),
      });
    } catch (err) {
      console.warn('record usage log failed', err);
    }
  }

  function recordUsageLog(entry = {}) {
    if (isFirebaseLive()) return recordUsageLogFirebase(entry);
    recordUsageLogLocal(entry);
    return Promise.resolve();
  }

  function reloadUsageLogs() {
    if (isFirebaseLive()) {
      startUsageLogsSync();
      setAuthStatus(txt('โหลด usage log ล่าสุดแล้ว', 'Latest usage logs loaded'), 'success');
      return;
    }
    renderUsageLogs();
    setAuthStatus(txt('โหลด usage log จากข้อมูลในเครื่องแล้ว', 'Loaded usage logs from local data'), 'success');
  }

  function setUserProfilePresetStatus(message = '', type = 'info') {
    if (!el.userProfilePresetStatus) return;
    if (!message) {
      el.userProfilePresetStatus.className = 'settings-status hidden';
      el.userProfilePresetStatus.textContent = '';
      return;
    }
    el.userProfilePresetStatus.className = `settings-status ${type}`;
    el.userProfilePresetStatus.textContent = message;
  }

  function normalizeEmployeeId(value) {
    return String(value || '').trim();
  }

  function buildHodProfileUpdate(employeeId, preset) {
    const fullName = String(preset.full_name || '').trim();
    const position = String(preset.position || '').trim();
    const department = normalizeDepartmentValue(preset.department, 'ENG');
    const role = normalizeRole(preset.role || 'staff');
    return {
      employee_id: employeeId,
      employeeId,
      full_name: fullName,
      fullName,
      display_name: fullName,
      displayName: fullName,
      role,
      department: normalizeDepartmentValue(department, 'ENG'),
      position,
      is_active: preset.is_active !== false,
    };
  }

  function getDepartmentEnglishName(code) {
    const dept = getDepartmentMeta(code);
    return dept ? (dept.name || dept.code || code || '') : (code || '');
  }

  function shouldUsePresetDepartment(currentCode, employeeId) {
    // v99: ถ้าบัญชี HOD เดิมยังเป็น MOD/ว่าง ให้ใช้ preset ที่เราสรุปไว้แทน
    // เพื่อให้ปุ่มจัดมาตรฐานทำงานจริงแม้ข้อมูลใน Firestore เคยเก็บเป็น MOD ทั้งหมด
    if (!employeeId || !HOD_PROFILE_PRESET[employeeId]) return false;
    return !currentCode || currentCode === 'MOD';
  }

  async function getRawUserRecordsForDepartmentStandardization() {
    if (isFirebaseLive()) {
      const fb = window.LAYA_FIREBASE;
      const snap = await fb.sdk.getDocs(fb.sdk.collection(fb.db, 'users'));
      return snap.docs.map(docSnap => ({ uid: docSnap.id, data: docSnap.data() || {} }));
    }
    return getTeamMembers().map(member => ({ uid: member.uid, data: { ...member } }));
  }

  async function applyDepartmentCodeStandardization() {
    if (!canManageUsers()) {
      setUserProfilePresetStatus(txt('เฉพาะ Admin เท่านั้นที่จัดมาตรฐาน Department ได้', 'Only Admin can standardize departments.'), 'error');
      setAuthStatus(txt('เฉพาะ Admin เท่านั้นที่จัดมาตรฐาน Department ได้', 'Only Admin can standardize departments.'), 'error');
      return;
    }

    const btn = el.standardizeDepartmentCodesBtn;
    const originalText = btn ? btn.textContent : '';

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = txt('กำลังตรวจ Department...', 'Checking departments...');
      }

      setUserProfilePresetStatus(txt('กำลังอ่านข้อมูลผู้ใช้จาก Firebase...', 'Reading users from Firebase...'), 'info');
      setAuthStatus(txt('กำลังอ่านข้อมูลผู้ใช้จาก Firebase...', 'Reading users from Firebase...'), 'info');

      const rawRecords = await getRawUserRecordsForDepartmentStandardization();
      const updates = rawRecords
        .map(record => {
          const data = record.data || {};
          const employeeId = normalizeEmployeeId(data.employee_id || data.employeeId || data.staff_id || data.staffId);
          const currentRaw = String(data.department || '').trim();
          const currentCode = normalizeDepartmentValue(currentRaw, '');
          const preset = employeeId ? HOD_PROFILE_PRESET[employeeId] : null;
          const presetCode = preset?.department ? normalizeDepartmentValue(preset.department, '') : '';
          const targetCode = shouldUsePresetDepartment(currentCode, employeeId) ? presetCode : currentCode;
          const targetName = getDepartmentEnglishName(targetCode);
          const hasCodeField = String(data.department_code || '').trim() === targetCode;
          const hasNameField = String(data.department_name || '').trim() === targetName;
          const isSkipped = HOD_PROFILE_SKIPPED_EMPLOYEE_IDS.includes(employeeId);
          const needsUpdate = !!targetCode
            && USER_DEPARTMENT_CODES.includes(targetCode)
            && !isSkipped
            && (currentRaw !== targetCode || !hasCodeField || !hasNameField);
          return { record, data, employeeId, currentRaw, currentCode, targetCode, targetName, needsUpdate };
        })
        .filter(item => item.needsUpdate);

      if (!updates.length) {
        const message = txt(
          'ตรวจแล้ว: ไม่มีรายการที่ต้องแก้ Department Code ตอนนี้ ถ้ารายชื่อยังไม่เปลี่ยน ให้กดปุ่ม “อัปเดตชื่อ/ตำแหน่ง/แผนก HOD” ก่อน',
          'Checked: no department-code updates are needed now. If profiles still look unchanged, run “Update HOD profiles” first.'
        );
        setUserProfilePresetStatus(message, 'success');
        setAuthStatus(message, 'success');
        return;
      }

      const preview = updates.slice(0, 10).map(item => {
        const name = item.data.full_name || item.data.fullName || item.data.displayName || item.employeeId || item.record.uid || '-';
        return `${item.employeeId || item.record.uid}: ${name} • ${item.currentRaw || '-'} → ${item.targetCode} (${item.targetName})`;
      }).join('\n');
      const more = updates.length > 10 ? '\n...' : '';
      const confirmText = txt(
        'ระบบจะอัปเดต Department Code ใน Firebase ' + updates.length + ' บัญชี\n' + preview + more + '\n\nระบบจะไม่แตะ ID 24174, 32052, 25000, 25285, 26432\nดำเนินการต่อหรือไม่?',
        'This will update Firebase department codes for ' + updates.length + ' users.\n' + preview + more + '\n\nIDs 24174, 32052, 25000, 25285, and 26432 will not be touched.\nContinue?'
      );
      if (!confirm(confirmText)) {
        setUserProfilePresetStatus(txt('ยกเลิกการจัดมาตรฐาน Department', 'Department standardization cancelled'), 'info');
        setAuthStatus(txt('ยกเลิกการจัดมาตรฐาน Department', 'Department standardization cancelled'), 'info');
        return;
      }

      setUserProfilePresetStatus(txt('กำลังจัดมาตรฐาน Department ใน Firebase...', 'Standardizing departments in Firebase...'), 'info');
      setAuthStatus(txt('กำลังจัดมาตรฐาน Department ใน Firebase...', 'Standardizing departments in Firebase...'), 'info');

      if (isFirebaseLive()) {
        const fb = window.LAYA_FIREBASE;
        await Promise.all(updates.map(({ record, currentRaw, targetCode, targetName }) => fb.sdk.updateDoc(
          fb.sdk.doc(fb.db, 'users', record.uid),
          {
            department: targetCode,
            department_code: targetCode,
            department_name: targetName,
            department_previous_value: currentRaw || '',
            department_standardized_at: fb.sdk.serverTimestamp(),
            department_standardized_by_uid: state.currentUser?.uid || '',
            department_standardized_version: APP_VERSION,
            updated_at: fb.sdk.serverTimestamp(),
          }
        )));
      }

      const updateByUid = new Map(updates.map(({ record, targetCode, targetName }) => [String(record.uid || ''), { department: targetCode, department_code: targetCode, department_name: targetName }]));
      state.data.teamMembers = (state.data.teamMembers || []).map(member => {
        const patch = updateByUid.get(String(member.uid || ''));
        return patch ? { ...member, ...patch } : member;
      });
      const currentUid = String(state.currentUser?.uid || '');
      if (updateByUid.has(currentUid)) {
        state.currentUser = { ...state.currentUser, ...updateByUid.get(currentUid) };
        persist();
      }
      renderAll();

      const message = txt('จัดมาตรฐาน Department สำเร็จ ' + updates.length + ' บัญชี', 'Standardized departments for ' + updates.length + ' users');
      setUserProfilePresetStatus(message, 'success');
      setAuthStatus(message, 'success');

      recordUsageLog({
        category: 'admin',
        action: 'standardize_department_codes',
        title: 'Standardized user department codes',
        text: 'Standardized ' + updates.length + ' user departments to canonical codes',
        user_uid: state.currentUser?.uid || '',
        user_name: state.currentUser?.full_name || '',
        ref_no: 'v99',
      });
    } catch (err) {
      console.error('department standardization failed', err);
      const message = txt(
        'จัดมาตรฐาน Department ไม่สำเร็จ: ตรวจสอบว่า login เป็น Admin และ Firestore rules อนุญาตให้ Admin update users',
        'Department standardization failed: make sure you are logged in as Admin and Firestore rules allow Admin to update users.'
      );
      setUserProfilePresetStatus(message, 'error');
      setAuthStatus(message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText || txt('จัดมาตรฐาน Department Code + เพิ่ม IT', 'Standardize Department Codes + IT');
      }
    }
  }

  async function applyHodProfilePreset() {
    if (!canManageUsers()) {
      setUserProfilePresetStatus(txt('เฉพาะ Admin เท่านั้นที่อัปเดตชุดข้อมูลนี้ได้', 'Only Admin can apply this update.'), 'error');
      return;
    }
    const members = getTeamMembers();
    const matched = members
      .map(member => {
        const employeeId = normalizeEmployeeId(member.employee_id || member.employeeId);
        return { member, employeeId, preset: HOD_PROFILE_PRESET[employeeId] || null };
      })
      .filter(item => item.employeeId && item.preset && item.member?.uid);

    const skippedStillUnchanged = HOD_PROFILE_SKIPPED_EMPLOYEE_IDS.filter(id => members.some(member => normalizeEmployeeId(member.employee_id || member.employeeId) === id));

    if (!matched.length) {
      setUserProfilePresetStatus(txt('ไม่พบ Employee ID ที่ตรงกับชุดข้อมูล HOD ในรายการผู้ใช้', 'No matching Employee IDs were found in the user list.'), 'error');
      return;
    }

    const confirmText = txt(
      `ระบบจะอัปเดตชื่อ ตำแหน่ง แผนก และ Role จำนวน ${matched.length} บัญชี\nโดยจะคงค่าเดิมของ ID: ${HOD_PROFILE_SKIPPED_EMPLOYEE_IDS.join(', ')}\nต้องการดำเนินการต่อหรือไม่?`,
      `This will update name, position, department, and role for ${matched.length} accounts.\nIDs kept unchanged: ${HOD_PROFILE_SKIPPED_EMPLOYEE_IDS.join(', ')}\nContinue?`
    );
    if (!confirm(confirmText)) return;

    try {
      setUserProfilePresetStatus(txt('กำลังอัปเดตข้อมูลผู้ใช้งาน...', 'Updating user profiles...'), 'info');
      if (isFirebaseLive()) {
        const fb = window.LAYA_FIREBASE;
        await Promise.all(matched.map(({ member, employeeId, preset }) => fb.sdk.updateDoc(
          fb.sdk.doc(fb.db, 'users', member.uid),
          {
            ...buildHodProfileUpdate(employeeId, preset),
            updated_at: fb.sdk.serverTimestamp(),
            profile_bulk_updated_at: fb.sdk.serverTimestamp(),
            profile_bulk_updated_by_uid: state.currentUser?.uid || '',
            profile_bulk_update_version: APP_VERSION,
          }
        )));
      }

      const updateById = new Map(matched.map(({ employeeId, preset }) => [employeeId, buildHodProfileUpdate(employeeId, preset)]));
      state.data.teamMembers = (state.data.teamMembers || []).map(member => {
        const employeeId = normalizeEmployeeId(member.employee_id || member.employeeId);
        const patch = updateById.get(employeeId);
        return patch ? { ...member, ...patch } : member;
      });
      const currentEmployeeId = normalizeEmployeeId(state.currentUser?.employee_id || state.currentUser?.employeeId);
      if (currentEmployeeId && updateById.has(currentEmployeeId)) {
        state.currentUser = { ...state.currentUser, ...updateById.get(currentEmployeeId) };
        persist();
      }
      renderAll();
      const unchangedText = skippedStillUnchanged.length ? ` • ${txt('คงค่าเดิม', 'Unchanged')}: ${skippedStillUnchanged.join(', ')}` : '';
      setUserProfilePresetStatus(txt(`อัปเดตสำเร็จ ${matched.length} บัญชี${unchangedText}`, `Updated ${matched.length} accounts${unchangedText}`), 'success');
      recordUsageLog({
        category: 'admin',
        action: 'bulk_update_user_profiles',
        title: 'Updated HOD user profiles',
        text: `Updated ${matched.length} HOD profiles. Unchanged IDs: ${HOD_PROFILE_SKIPPED_EMPLOYEE_IDS.join(', ')}`,
        user_uid: state.currentUser?.uid || '',
        user_name: state.currentUser?.full_name || '',
        ref_no: 'v93',
      });
    } catch (err) {
      console.error('bulk profile preset update failed', err);
      setUserProfilePresetStatus(txt('อัปเดตไม่สำเร็จ ตรวจสอบว่าใช้บัญชี Admin และ Firestore rules ถูกต้อง', 'Update failed. Check Admin permission and Firestore rules.'), 'error');
    }
  }

  function renderTeamMembers() {
    if (!el.teamMembersList) return;
    const members = getTeamMembers();
    if (!members.length) {
      el.teamMembersList.innerHTML = `<div class="empty-state">${txt('ยังไม่มีรายชื่อผู้ใช้', 'No team members yet')}</div>`;
      return;
    }
    const canIssue = canIssueTemporaryPassword();
    const canEditUsers = canManageUsers();
    const currentUid = String(state.currentUser?.uid || '');
    el.teamMembersList.innerHTML = members.map(member => {
      const memberUid = String(member.uid || '');
      const displayName = member.full_name || member.fullName || member.displayName || member.display_name || '-';
      const roleCode = normalizeRole(member.role);
      const roleName = getRoleName(roleCode);
      const deptName = getDepartmentName(normalizeDepartmentValue(member.department, 'MOD'));
      const position = member.position || roleName;
      const mustChange = Boolean(member.password_change_required || member.require_password_change);
      const hasTemp = Boolean(member.temporary_password_issued_at || member.temp_password_active);
      const inactive = member.is_active === false;
      const badges = [
        `<span class="team-member-status status-role">${escapeHtml(roleName)}</span>`,
        `<span class="team-member-status status-dept">${escapeHtml(deptName)}</span>`,
        inactive ? `<span class="team-member-status status-danger">${txt('ปิดใช้งาน', 'Inactive')}</span>` : '',
        mustChange ? `<span class="team-member-status status-warning">${txt('ต้องเปลี่ยนรหัส', 'Must change password')}</span>` : '',
        hasTemp ? `<span class="team-member-status status-info">${txt('มีรหัสชั่วคราว', 'Temporary password')}</span>` : '',
      ].filter(Boolean).join('');
      const editAction = canEditUsers && memberUid
        ? `<button type="button" class="btn btn-secondary btn-sm team-member-edit-btn" data-edit-user-management="${escapeHtml(memberUid)}">${txt('แก้สิทธิ์', 'Edit')}</button>`
        : '';
      const tempAction = canIssue && memberUid && memberUid !== currentUid
        ? `<button type="button" class="btn btn-primary btn-sm team-member-temp-btn" data-issue-temp-password="${escapeHtml(memberUid)}">${txt('ตั้งรหัสชั่วคราว', 'Issue Temp Password')}</button>`
        : '';
      const action = [editAction, tempAction].filter(Boolean).join('');
      return `
      <div class="team-member-item${inactive ? ' is-inactive' : ''}">
        <div class="team-member-avatar">${member.avatar_url ? `<img src="${escapeHtml(member.avatar_url)}" alt="${escapeHtml(displayName || 'User')}" />` : escapeHtml(getUserInitials(displayName || '?'))}</div>
        <div class="team-member-main">
          <div class="team-member-name">${escapeHtml(displayName)}</div>
          <div class="team-member-meta">${escapeHtml(member.employee_id || member.employeeId || '')} • ${escapeHtml(position)}</div>
          <div class="team-member-badges">${badges}</div>
        </div>
        ${action ? `<div class="team-member-actions">${action}</div>` : ''}
      </div>
    `;
    }).join('');
  }

  function populateUserManagementSelects(member = {}) {
    if (el.userRoleEdit) {
      el.userRoleEdit.innerHTML = ROLES.map(role => `<option value="${escapeHtml(role.code)}">${escapeHtml(currentLang() === 'en' ? role.name : role.name_th)}</option>`).join('');
      el.userRoleEdit.value = normalizeRole(member.role);
    }
    if (el.userDepartmentEdit) {
      el.userDepartmentEdit.innerHTML = renderDepartmentOptions(USER_DEPARTMENT_CODES);
      const dept = normalizeDepartmentValue(member.department, 'ENG');
      el.userDepartmentEdit.value = USER_DEPARTMENT_CODES.includes(dept) ? dept : 'ENG';
    }
    if (el.userPositionEdit) el.userPositionEdit.value = member.position || getRoleName(member.role || 'staff');
    if (el.userActiveEdit) el.userActiveEdit.value = member.is_active === false ? 'false' : 'true';
  }

  function setUserManagementStatus(message = '', type = 'info') {
    if (!el.userManagementStatus) return;
    if (!message) {
      el.userManagementStatus.className = 'settings-status hidden';
      el.userManagementStatus.textContent = '';
      return;
    }
    el.userManagementStatus.className = `settings-status ${type}`;
    el.userManagementStatus.textContent = message;
  }

  function openUserManagementModal(uid) {
    if (!canManageUsers() || !el.userManagementModal) return;
    const member = getTeamMembers().find(item => String(item.uid || '') === String(uid || ''));
    if (!member) return;
    state.ui.editingUserUid = String(member.uid || '');
    if (el.userManagementName) el.userManagementName.textContent = member.full_name || '-';
    if (el.userManagementEmployeeId) el.userManagementEmployeeId.textContent = `${member.employee_id || '-'} • ${getRoleName(member.role)} • ${getDepartmentName(normalizeDepartmentValue(member.department, 'MOD'))}`;
    populateUserManagementSelects(member);
    setUserManagementStatus('', 'info');
    el.userManagementModal.classList.remove('hidden');
  }

  function closeUserManagementModal(force = false) {
    if (el.userManagementModal) el.userManagementModal.classList.add('hidden');
    state.ui.editingUserUid = '';
    setUserManagementStatus('', 'info');
  }

  async function saveUserManagementChanges() {
    if (!canManageUsers()) return;
    const uid = String(state.ui.editingUserUid || '');
    const member = getTeamMembers().find(item => String(item.uid || '') === uid);
    if (!uid || !member) return;
    const nextRole = normalizeRole(el.userRoleEdit?.value || 'staff');
    const nextDepartment = normalizeDepartmentValue(el.userDepartmentEdit?.value, 'ENG');
    const nextPosition = String(el.userPositionEdit?.value || '').trim() || getRoleName(nextRole);
    const nextActive = String(el.userActiveEdit?.value || 'true') === 'true';
    if (!USER_DEPARTMENT_CODES.includes(nextDepartment)) {
      setUserManagementStatus(txt('กรุณาเลือกแผนกให้ถูกต้อง', 'Please choose a valid department'), 'error');
      return;
    }
    if (uid === String(state.currentUser?.uid || '') && nextRole !== 'admin') {
      setUserManagementStatus(txt('ไม่ควรลดสิทธิ์ Admin ของบัญชีที่กำลังใช้งานอยู่', 'Do not remove Admin from your current account'), 'error');
      return;
    }
    try {
      setUserManagementStatus(txt('กำลังบันทึกสิทธิ์...', 'Saving user permission...'), 'info');
      if (isFirebaseLive()) {
        const fb = window.LAYA_FIREBASE;
        await fb.sdk.updateDoc(fb.sdk.doc(fb.db, 'users', uid), {
          role: nextRole,
          department: nextDepartment,
          position: nextPosition,
          is_active: nextActive,
          updated_at: fb.sdk.serverTimestamp(),
        });
      }
      state.data.teamMembers = (state.data.teamMembers || []).map(item => String(item.uid || '') === uid ? { ...item, role: nextRole, department: nextDepartment, position: nextPosition, is_active: nextActive } : item);
      if (uid === String(state.currentUser?.uid || '')) {
        state.currentUser.role = nextRole;
        state.currentUser.department = nextDepartment;
        state.currentUser.position = nextPosition;
        state.currentUser.is_active = nextActive;
      }
      renderAll();
      setUserManagementStatus(txt('บันทึกสิทธิ์เรียบร้อยแล้ว', 'User permission updated'), 'success');
      setTimeout(() => closeUserManagementModal(), 450);
    } catch (err) {
      console.error('save user management failed', err);
      setUserManagementStatus(txt('บันทึกสิทธิ์ไม่สำเร็จ ตรวจสอบ Firestore rules', 'Could not update user permission. Check Firestore rules.'), 'error');
    }
  }

  function getMentionContext(text, caretPos) {
    const value = String(text || '');
    const cursor = typeof caretPos === 'number' ? caretPos : value.length;
    const before = value.slice(0, cursor);
    const atIndex = before.lastIndexOf('@');
    if (atIndex < 0) return null;
    const prefix = before.slice(atIndex + 1);
    if (prefix.includes('\n')) return null;
    if (/\s/.test(prefix)) return null;
    if (atIndex > 0 && /\S/.test(before.charAt(atIndex - 1))) return null;
    return { start: atIndex, end: cursor, query: prefix.trim().toLowerCase() };
  }

  function extractMentionNames(message) {
    const text = String(message || '');
    const members = getTeamMembers();
    return members
      .filter(member => member.full_name && text.toLowerCase().includes(`@${member.full_name.toLowerCase()}`))
      .map(member => member.full_name);
  }

  function setupCommentMentions(issueId) {
    const input = qs('#detailCommentText', el.issueModalContent);
    const box = qs('#detailMentionBox', el.issueModalContent);
    if (!input || !box) return;

    const refresh = () => {
      const ctx = getMentionContext(input.value, input.selectionStart);
      if (!ctx) {
        box.innerHTML = '';
        box.classList.add('hidden');
        return;
      }
      const members = getTeamMembers().filter(member => {
        const name = String(member.full_name || '').toLowerCase();
        return !ctx.query || name.includes(ctx.query);
      }).slice(0, 6);
      if (!members.length) {
        box.innerHTML = '';
        box.classList.add('hidden');
        return;
      }
      box.innerHTML = members.map(member => `
        <button type="button" class="mention-option" data-mention-name="${escapeHtml(member.full_name || '')}">
          <span class="mention-option-name">${escapeHtml(member.full_name || '')}</span>
          <span class="mention-option-meta">MOD</span>
        </button>
      `).join('');
      box.classList.remove('hidden');

      qsa('.mention-option', box).forEach(btn => btn.addEventListener('click', () => {
        const name = btn.dataset.mentionName || '';
        const current = getMentionContext(input.value, input.selectionStart);
        if (!current) return;
        const prefix = input.value.slice(0, current.start);
        const suffix = input.value.slice(current.end);
        input.value = `${prefix}@${name} ${suffix}`;
        const caret = (prefix + `@${name} `).length;
        input.focus();
        input.setSelectionRange(caret, caret);
        box.classList.add('hidden');
      }));
    };

    input.addEventListener('input', refresh);
    input.addEventListener('click', refresh);
    input.addEventListener('keyup', refresh);
    input.addEventListener('blur', () => setTimeout(() => box.classList.add('hidden'), 120));
    input.addEventListener('focus', refresh);
  }

  function getActivityFeedItems() {
    const localItems = Array.isArray(state.data.activity) ? state.data.activity : [];
    const usageItems = Array.isArray(state.data.usageLogs)
      ? state.data.usageLogs.map(item => ({
          id: item.id || cryptoRandom(),
          title: item.title || humanizeLogAction(item.action || 'event'),
          text: [item.text || '', [item.user_name || '', item.ref_no || ''].filter(Boolean).join(' • ')].filter(Boolean).join(' • '),
          created_at: item.created_at || '',
          source: 'usage_log',
          action: item.action || 'event',
          category: item.category || 'general',
        }))
      : [];

    const merged = [...usageItems, ...localItems]
      .filter(item => item && (item.title || item.text || item.created_at))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const seen = new Set();
    return merged.filter(item => {
      const key = [item.source || 'local', item.created_at || '', item.title || '', item.text || ''].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 200);
  }

  function renderActivity() {
    const items = getActivityFeedItems();
    if (!items.length) {
      el.activityList.innerHTML = `<div class="empty-state">${txt('ยังไม่มีกิจกรรม', 'No activity yet')}</div>`;
      return;
    }
    el.activityList.innerHTML = items.map(item => `
      <div class="activity-item">
        <div class="comment-meta">${formatDateTime(item.created_at)}</div>
        <div><strong>${escapeHtml(item.title || item.type || txt('กิจกรรม', 'Activity'))}</strong></div>
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
    if (canManageAllWork()) return [...state.data.issues];
    const myDept = normalizeDepartmentValue(state.currentUser.department, '');
    return [...state.data.issues].filter(issue => normalizeDepartmentValue(issue.assigned_department, '') === myDept || String(issue.reported_by_uid || '') === String(state.currentUser.uid || ''));
  }

  function toDateKey(value) {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function matchesDateFilter(value, selectedDate) {
    if (!selectedDate) return true;
    return toDateKey(value) === selectedDate;
  }

  function getIssueFilterDate(issue, mode = 'board') {
    if (!issue) return '';
    if (mode === 'closed') return issue.closed_at || issue.updated_at || issue.created_at || '';
    return issue.created_at || issue.updated_at || '';
  }

  function getChecklistRunFilterDate(run, mode = 'board') {
    if (!run) return '';
    if (mode === 'closed') return run.inspection_date || run.submitted_at || run.updated_at || run.created_at || '';
    return run.inspection_date || run.submitted_at || run.created_at || '';
  }

  function getCurrentUserDeptCode() {
    return normalizeDepartmentValue(state.currentUser?.department, '');
  }

  function isIssueReporter(issue) {
    return !!(state.currentUser && issue && String(issue.reported_by_uid || '') === String(state.currentUser.uid || ''));
  }

  function isIssueAssignedToMyDepartment(issue) {
    if (!state.currentUser || !issue) return false;
    const myDept = getCurrentUserDeptCode();
    const issueDept = normalizeDepartmentValue(issue.assigned_department, '');
    return !!(myDept && issueDept && myDept === issueDept);
  }

  function canViewIssue(issue) {
    return !!(state.currentUser && issue && (canManageAllWork() || isIssueAssignedToMyDepartment(issue) || isIssueReporter(issue)));
  }

  function canCommentIssue(issue) {
    // Reporter can follow up on their own issue even when it is assigned to another department.
    // Managing/closing/evidence actions are still reserved for the assigned department or privileged roles.
    return canViewIssue(issue);
  }

  function canManageIssue(issue) {
    // Admin / Manager / MOD can work every issue.
    // Staff / Supervisor can work only issues assigned to their own department.
    // Position is display-only and must not grant permissions.
    return !!(state.currentUser && issue && (canManageAllWork() || isIssueAssignedToMyDepartment(issue)));
  }

  function canWorkIssue(issue) {
    // Backward-compatible alias used by older buttons: work means status/evidence/cover management.
    return canManageIssue(issue);
  }

  function applyBoardFilters(issues) {
    return issues.filter(issue => {
      const filter = state.ui.boardFilter;
      const search = state.ui.boardSearch;
      const openOnly = issue.status !== 'closed';
      const statusMatch = filter === 'all' ? openOnly : issue.status === filter;
      const hay = [issue.title, issue.description, issue.location_text, issue.assigned_department, issue.issue_no].join(' ').toLowerCase();
      const searchMatch = !search || hay.includes(search);
      const dateMatch = matchesDateFilter(getIssueFilterDate(issue, 'board'), state.ui.boardDateFilter);
      return statusMatch && searchMatch && dateMatch;
    });
  }

  function getClosedIssuesForCurrentUser() {
    if (!state.currentUser) return [];
    const search = state.ui.closedSearch;
    return getVisibleIssuesForCurrentUser()
      .filter(issue => issue.status === 'closed')
      .filter(issue => {
        const hay = [issue.title, issue.description, issue.location_text, issue.assigned_department, issue.issue_no, issue.closed_by_name].join(' ').toLowerCase();
        const searchMatch = !search || hay.includes(search);
        const dateMatch = matchesDateFilter(getIssueFilterDate(issue, 'closed'), state.ui.closedDateFilter);
        return searchMatch && dateMatch;
      })
      .sort((a, b) => new Date(b.closed_at || b.updated_at || b.created_at) - new Date(a.closed_at || a.updated_at || a.created_at));
  }

  function isChecklistRunVisibleOnBoard(run) {
    if (!run || run.status !== 'submitted') return false;
    const base = run.inspection_date ? new Date(`${run.inspection_date}T00:00:00`) : new Date(run.submitted_at || run.created_at || Date.now());
    const now = new Date();
    return base.getFullYear() === now.getFullYear() && base.getMonth() === now.getMonth() && base.getDate() === now.getDate();
  }

  function getClosedChecklistRunsForCurrentUser() {
    if (!state.currentUser) return [];
    const search = state.ui.closedSearch;
    return [...(state.data.checklistRuns || [])]
      .filter(run => run.status === 'archived' || (run.status === 'submitted' && !isChecklistRunVisibleOnBoard(run)))
      .filter(run => {
        const hay = [run.template_name, run.location_text, run.run_no, run.inspector_name].join(' ').toLowerCase();
        const searchMatch = !search || hay.includes(search);
        const dateMatch = matchesDateFilter(getChecklistRunFilterDate(run, 'closed'), state.ui.closedDateFilter);
        return searchMatch && dateMatch;
      })
      .map(run => ({ ...run, closed_type: 'checklist_run' }))
      .sort((a, b) => new Date(b.updated_at || b.submitted_at || b.created_at || 0) - new Date(a.updated_at || a.submitted_at || a.created_at || 0));
  }

  function getClosedBoardItemsForCurrentUser() {
    return [...getClosedIssuesForCurrentUser(), ...getClosedChecklistRunsForCurrentUser()]
      .sort((a, b) => new Date((b.closed_at || b.updated_at || b.submitted_at || b.created_at || 0)) - new Date((a.closed_at || a.updated_at || a.submitted_at || a.created_at || 0)));
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
      addActivity({ type: 'checklist_template', title: templateName, text: txt(`${state.currentUser.full_name} เพิ่ม checklist template`, `${state.currentUser.full_name} added checklist template`), created_at: new Date().toISOString() });
      el.checklistTemplateBuilder.classList.add('hidden');
      setAuthStatus('บันทึก checklist template แล้ว', 'success');
    } catch (err) {
      console.error('save checklist template failed', err);
      alert(friendlyIssueError(err));
    }
  }

  function refreshLanguageSensitiveDynamicUI() {
    if (el.checklistRunPanel && !el.checklistRunPanel.classList.contains('hidden')) {
      const template = (state.data.templates || []).find(t => t.template_code === state.ui.selectedTemplateCode);
      const panel = el.checklistRunPanel;
      if (template) {
        const heading = qs('.panel-header h3', panel);
        const subtitle = qs('.panel-header p', panel);
        const runLocation = qs('#runLocation', panel);
        const labels = qsa('.checklist-run-head label', panel);
        const submitBtn = qs('#submitChecklistBtn', panel);
        const hideBtn = qs('#hideChecklistBtn', panel);
        if (heading) heading.textContent = templateLabel(template);
        if (subtitle) subtitle.textContent = txt('บันทึกผลตรวจ แล้วสร้าง issue เฉพาะข้อที่ไม่ผ่านและต้อง follow up', 'Record the inspection result and create issues only for failed items that need follow-up.');
        if (labels[0]) labels[0].textContent = txt('ตำแหน่ง', 'Location');
        if (labels[1]) labels[1].textContent = txt('วันที่', 'Date');
        if (runLocation) runLocation.placeholder = txt('เช่น Main Resort / Public Area', 'e.g. Main Resort / Public Area');
        if (submitBtn) submitBtn.textContent = txt('ส่งเช็กลิสต์', 'Submit Checklist');
        if (hideBtn) hideBtn.textContent = txt('ซ่อน', 'Hide');

        qsa('.section-card', panel).forEach(sectionCard => {
          const sectionCode = sectionCard.dataset.sectionCode || '';
          const section = (template.sections || []).find(sec => sec.section_code === sectionCode);
          if (!section) return;
          const h4 = qs('h4', sectionCard);
          const muted = qs('.section-head .muted', sectionCard);
          if (h4) h4.textContent = sectionLabel(section);
          if (muted) muted.textContent = (section.items || []).length ? `${(section.items || []).length} ${txt('ข้อ', 'items')}` : txt('ฟอร์มพิเศษ', 'Special form');
          const specialInput = qs('[data-special-form-input]', sectionCard);
          if (specialInput) specialInput.placeholder = txt('พิมพ์ข้อมูลในส่วนนี้ได้เลย', 'Type details here');

          qsa('.item-card', sectionCard).forEach(itemCard => {
            const itemCode = itemCard.dataset.itemCode || '';
            const item = (section.items || []).find(it => it.item_code === itemCode);
            const itemText = qs('.item-text', itemCard);
            const optionButtons = qsa('.option-btn', itemCard);
            const note = qs('[data-note]', itemCard);
            const createIssueText = qs('[data-create-issue-row] span', itemCard);
            const mediaTitle = qs('[data-fail-media-block] .checklist-fail-media-title', itemCard);
            const mediaHint = qs('[data-fail-media-hint]', itemCard);
            const mediaLabels = qsa('[data-fail-media-block] .photo-pick-label', itemCard);
            if (item && itemText) itemText.textContent = itemLabel(item);
            if (optionButtons[0]) optionButtons[0].textContent = txt('ผ่าน', 'Pass');
            if (optionButtons[1]) optionButtons[1].textContent = txt('ไม่ผ่าน', 'Fail');
            if (optionButtons[2]) optionButtons[2].textContent = 'N/A';
            if (note) note.placeholder = txt('หมายเหตุ (ไม่บังคับ)', 'Note (optional)');
            if (createIssueText) createIssueText.textContent = txt('สร้าง Issue หากข้อนี้ไม่ผ่าน', 'Create issue if this item fails');
            if (mediaTitle) mediaTitle.textContent = txt('แนบสื่อสำหรับ Issue ของข้อนี้', 'Attach media for this issue');
            if (mediaLabels[0]) mediaLabels[0].textContent = txt('เลือกรูป', 'Choose Photo');
            if (mediaLabels[1]) mediaLabels[1].textContent = txt('ถ่ายรูป', 'Take Photo');
            if (mediaLabels[2]) mediaLabels[2].textContent = txt('เลือกวิดีโอ', 'Choose Video');
            if (mediaLabels[3]) mediaLabels[3].textContent = txt('ถ่ายวิดีโอ', 'Record Video');
            if (mediaHint && !getChecklistFailMediaState(itemCode).photos.length && !getChecklistFailMediaState(itemCode).video) {
              mediaHint.textContent = txt('แนบได้หลายรูป และวิดีโอ 1 ไฟล์สำหรับ Issue ของข้อนี้', 'Attach multiple photos and 1 video for this issue');
            }
          });
        });
      }

      qsa('[data-fail-dept]', el.checklistRunPanel).forEach(select => {
        const currentValue = select.value;
        select.innerHTML = renderDepartmentOptions();
        if (currentValue && qs(`option[value="${currentValue}"]`, select)) {
          select.value = currentValue;
        }
      });

      qsa('[data-fail-priority]', el.checklistRunPanel).forEach(select => {
        const currentValue = select.value || 'medium';
        select.innerHTML = PRIORITIES.map(p => `<option value="${p}" ${p === currentValue ? 'selected' : ''}>${translatePriority(p)}</option>`).join('');
        select.value = currentValue;
      });
    }
  }

  function populateDepartmentSelects() {
    const issueHtml = renderDepartmentOptions();
    if (el.issueDepartment) {
      const currentValue = el.issueDepartment.value;
      el.issueDepartment.innerHTML = issueHtml;
      if (currentValue && qs(`option[value="${currentValue}"]`, el.issueDepartment)) {
        el.issueDepartment.value = currentValue;
      }
    }
    syncRegisterRoleDepartment();
    refreshLanguageSensitiveDynamicUI();
  }

  function renderDepartmentOptions(allowedCodes = WORK_DEPARTMENT_CODES) {
    const codes = Array.isArray(allowedCodes) && allowedCodes.length ? allowedCodes : WORK_DEPARTMENT_CODES;
    const list = DEPARTMENTS.filter(dept => codes.includes(dept.code));
    return list.map(dept => `<option value="${dept.code}">${departmentLabel(dept)}</option>`).join('');
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
            by_name: txt('ระบบ', 'System'),
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
      addActivity({ type: 'seed', title: issue.title, text: txt(`${reporter.full_name} สร้าง ${issue.issue_no}`, `${reporter.full_name} created ${issue.issue_no}`), created_at: createdAt });
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
          alert(txt('นำเข้าข้อมูลเรียบร้อย', 'Import complete'));
        }
      } catch (err) {
        alert(txt('ไฟล์ JSON ไม่ถูกต้อง', 'Invalid JSON file'));
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
    return {
      file,
      fileName: file.name || 'video.mp4',
      mimeType: file.type || 'video/mp4',
      originalBytes: file.size || 0,
      previewUrl,
      posterDataUrl: '',
      thumbDataUrl: '',
      posterBytes: 0,
      previewPending: true,
      compressionPending: true,
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
    return new Intl.DateTimeFormat(currentLang() === 'en' ? 'en-GB' : 'th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
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
