(() => {
	"use strict";

	const reviewKey = "doha-marathon-registration-review";
	const expiryKey = "doha-marathon-payment-expiry";
	const review = JSON.parse(window.sessionStorage.getItem(reviewKey) || "null");
	const expiry = Number(window.sessionStorage.getItem(expiryKey));
	const paymentTotal = document.querySelector("#verify-payment-total");
	const verifyForm = document.querySelector("#verify-form");
	const verifyOtp = document.querySelector("#verify-otp");
	const verifyButton = document.querySelector("#verify-button");
	const message = document.querySelector("#verify-form-message");

	if (!paymentTotal || !verifyForm || !verifyOtp || !verifyButton || !message) {
		throw new Error("Verification markup is incomplete.");
	}

	if (!review || typeof review.price !== "number" || !Number.isFinite(review.price) || !Number.isFinite(expiry)) {
		window.location.replace("registration-summary.html");
		return;
	}

	paymentTotal.textContent = `ر.ق ${review.price.toFixed(2)}`;

	const updateButtonText = () => {
		verifyButton.textContent = `تأكيد ر.ق ${review.price.toFixed(2)}`;
	};

	const isFormValid = () => {
		const otp = verifyOtp.value.replace(/\D/g, "");
		const valid = otp.length >= 4 && otp.length <= 6 && Date.now() < expiry;

		verifyOtp.classList.toggle("is-invalid", otp.length > 0 && (otp.length < 4 || otp.length > 6));
		verifyOtp.setAttribute("aria-invalid", String(otp.length > 0 && (otp.length < 4 || otp.length > 6)));
		verifyButton.disabled = !valid;
		return valid;
	};

	verifyOtp.addEventListener("input", () => {
		verifyOtp.value = verifyOtp.value.replace(/\D/g, "").slice(0, 6);
		isFormValid();
	});

	const remaining = Math.max(0, expiry - Date.now());
	window.setTimeout(() => {
		verifyButton.disabled = true;
		message.hidden = false;
		message.textContent = "انتهت صلاحية جلسة الدفع. ارجع إلى ملخص التسجيل لبدء جلسة جديدة.";
	}, remaining);

	updateButtonText();
	isFormValid();

	verifyForm.addEventListener("submit", (event) => {
		event.preventDefault();
		if (!isFormValid()) {
			message.hidden = false;
			message.textContent = "يرجى إدخال رمز تحقق صحيح (4-6 أرقام).";
			return;
		}

		message.hidden = false;
		message.style.color = "#2e7d32";
		message.textContent = "تم التحقق بنجاح. جاري توجيهك...";
		verifyForm.reset();
		verifyButton.disabled = true;
		isFormValid();

		setTimeout(() => {
			window.location.replace("payment-success.html");
		}, 1500);
	});
})();