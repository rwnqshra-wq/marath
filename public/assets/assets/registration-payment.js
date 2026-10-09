(() => {
	"use strict";

	const reviewKey = "doha-marathon-registration-review";
	const expiryKey = "doha-marathon-payment-expiry";
	const paymentTotal = document.querySelector("#payment-total");
	const countdown = document.querySelector("#session-countdown");
	const paymentForm = document.querySelector("#payment-form");
	const payButton = document.querySelector("#pay-button");
	const termsCheckbox = document.querySelector("#terms-accepted");
	const message = document.querySelector("#payment-message");

	if (!paymentTotal || !countdown || !paymentForm || !payButton || !termsCheckbox || !message) {
		throw new Error("Payment page markup is incomplete.");
	}

	let review;
	let expiry;
	try {
		review = JSON.parse(window.sessionStorage.getItem(reviewKey) || "null");
		const savedExpiry = Number(window.sessionStorage.getItem(expiryKey));
		expiry = Number.isFinite(savedExpiry) && savedExpiry > 0
			? savedExpiry
			: Date.now() + 10 * 60 * 1000;
		window.sessionStorage.setItem(expiryKey, String(expiry));
	} catch (error) {
		console.error("Could not read the local payment session.", error);
		window.location.replace("registration-summary.html");
		return;
	}

	if (!review || typeof review.price !== "number" || !Number.isFinite(review.price)) {
		window.location.replace("registration-summary.html");
		return;
	}

	const formattedPrice = `QAR ${review.price.toFixed(2)}`;
	paymentTotal.textContent = formattedPrice;
	payButton.textContent = `يدفع ${formattedPrice}`;

	const hasPaymentSelection = () =>
		Boolean(paymentForm.querySelector('input[name="payment-method"]:checked'));

	const updatePayButton = () => {
		payButton.disabled = Date.now() >= expiry || !hasPaymentSelection() || !termsCheckbox.checked;
	};

	const updateCountdown = () => {
		const remainingSeconds = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
		const minutes = Math.floor(remainingSeconds / 60);
		const seconds = remainingSeconds % 60;
		countdown.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
		updatePayButton();

		if (remainingSeconds === 0) {
			message.hidden = false;
			message.textContent = "انتهت صلاحية جلسة الدفع. ارجع إلى الملخص لبدء جلسة جديدة.";
			return false;
		}

		return true;
	};

	updateCountdown();
	const timerId = window.setInterval(() => {
		if (!updateCountdown()) {
			window.clearInterval(timerId);
		}
	}, 1000);

	paymentForm.addEventListener("change", () => {
		updatePayButton();
		message.hidden = true;

		if (paymentForm.querySelector('input[name="payment-method"]:checked')?.value === "cards") {
			window.location.assign("payment-card.html");
		}
	});

	paymentForm.addEventListener("submit", (event) => {
		event.preventDefault();
		message.hidden = false;

		if (Date.now() >= expiry) {
			updateCountdown();
			return;
		}

		if (!paymentForm.querySelector('input[name="payment-method"]:checked')) {
			message.textContent = "يرجى اختيار طريقة دفع للمتابعة.";
			return;
		}

		if (!termsCheckbox.checked) {
			message.textContent = "يرجى الإقرار بقراءة الشروط والأحكام وقبولها.";
			return;
		}

		window.location.assign("qpy.html");
	});
})();
