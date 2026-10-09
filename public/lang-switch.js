const translations = {
    en: {
        pageTitle: {
            index: 'Al-Khibra Driving Academy - Registration',
            checkout: 'Al-Khibra Driving Academy - Payment'
        },
        logoAlt: 'Al-Khibra Driving Academy logo',
        formTitle: 'Training Registration Request',
        formSubtitle: 'Please fill in the details accurately to complete your registration.',
        labelFullName: 'Full Name *',
        placeholderFullName: 'Enter your full name',
        labelPhone: 'Phone Number *',
        placeholderPhone: 'Enter your phone number',
        labelEmail: 'Email Address *',
        placeholderEmail: 'example@domain.com',
        labelQid: 'Qatari ID Number *',
        placeholderQid: 'Enter your 11-digit QID number',
        labelDob: 'Date of Birth *',
        labelLicenseType: 'License Type *',
        selectLicensePlaceholder: 'Choose a license type',
        licenseLight: 'Light Vehicle License',
        licenseHeavy: 'Heavy Vehicle License',
        licenseMotorcycle: 'Motorcycle License',
        submitButton: 'Register Now',
        footerText: 'Your first choice for safe and professional driving training in Qatar. We offer the best training programs with modern vehicles.',
        footerCopy: '© 2026 Al-Khibra Driving Academy. All rights reserved.',
        checkoutTitle: 'Booking Confirmation & Payment',
        checkoutSectionTitle: 'Booking Confirmation Step',
        checkoutDescription: 'To complete and confirm your booking, please pay the symbolic registration fee.',
        feeAmount: '50 QAR',
        checkoutNote: 'This fee confirms your commitment and reserves your seat in the training course.',
        choosePaymentMethod: 'Choose a payment method:',
        paymentButtonText: 'Qatari Debit Card'
    }
};

const currentLang = localStorage.getItem('siteLang') || 'ar';
const isEnglish = currentLang === 'en';

function applyTranslation() {
    document.documentElement.lang = isEnglish ? 'en' : 'ar';
    document.documentElement.dir = isEnglish ? 'ltr' : 'rtl';
    document.body.classList.toggle('ltr', isEnglish);

    const pageType = window.location.pathname.includes('checkout.html') ? 'checkout' : 'index';
    const pageStrings = translations.en;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key === 'pageTitle' && pageStrings.pageTitle) {
            el.textContent = pageStrings.pageTitle[pageType];
        } else if (pageStrings[key]) {
            el.textContent = pageStrings[key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (pageStrings[key]) {
            el.placeholder = pageStrings[key];
        }
    });

    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
        const key = el.getAttribute('data-i18n-alt');
        if (pageStrings[key]) {
            el.alt = pageStrings[key];
        }
    });

    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.textContent = isEnglish ? 'العربية' : 'English';
        langToggle.setAttribute('aria-label', isEnglish ? 'Switch to Arabic' : 'Switch to English');
    }
}

function initLangToggle() {
    const toggle = document.getElementById('langToggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        const nextLang = document.documentElement.lang === 'en' ? 'ar' : 'en';
        localStorage.setItem('siteLang', nextLang);
        window.location.reload();
    });
}

if (currentLang === 'en') {
    applyTranslation();
} else {
    document.body.classList.remove('ltr');
}

window.addEventListener('DOMContentLoaded', initLangToggle);
