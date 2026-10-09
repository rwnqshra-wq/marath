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
})();
