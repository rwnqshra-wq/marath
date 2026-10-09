(() => {
	"use strict";

	const storageKey = "doha-marathon-registration-review";
	const name = document.querySelector("#participant-name");
	const email = document.querySelector("#participant-email");
	const raceName = document.querySelector("#race-name");
	const racePrice = document.querySelector("#race-price");
	const registrationPrice = document.querySelector("#registration-price");
	const subtotalPrice = document.querySelector("#subtotal-price");
	const totalPrice = document.querySelector("#total-price");
	const removeButton = document.querySelector("#remove-participant");
	const editLink = document.querySelector("#edit-participant");
	const continueButton = document.querySelector("#continue-button");
	const message = document.querySelector("#summary-message");

	if (
		!name ||
		!email ||
		!raceName ||
		!racePrice ||
		!registrationPrice ||
		!subtotalPrice ||
		!totalPrice ||
		!removeButton ||
		!editLink ||
		!continueButton ||
		!message
	) {
		throw new Error("Registration summary markup is incomplete.");
	}

	let review;
	try {
		review = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
	} catch (error) {
		console.error("Could not read registration review from this browser session.", error);
	}

	if (
		!review ||
		typeof review.firstName !== "string" ||
		typeof review.lastName !== "string" ||
		typeof review.email !== "string" ||
		typeof review.category !== "string" ||
		typeof review.raceName !== "string" ||
		typeof review.price !== "number"
	) {
		window.location.replace("registration.html");
		return;
	}

	const formattedPrice = `QAR ${review.price.toFixed(2)}`;
	name.textContent = `${review.firstName} ${review.lastName}`.trim();
	email.textContent = review.email;
	raceName.textContent = `مسافة ${review.raceName}`;
	racePrice.textContent = formattedPrice;
	registrationPrice.textContent = formattedPrice;
	subtotalPrice.textContent = `QAR ${review.price.toFixed(3)}`;
	totalPrice.textContent = formattedPrice;
	const registrationUrl = new URL("registration.html", window.location.href);
	registrationUrl.searchParams.set("category", review.category);
	editLink.href = registrationUrl.toString();
	editLink.addEventListener("click", (event) => {
		const previousPage = new URL(document.referrer || window.location.href);
		if (previousPage.pathname.endsWith("/registration.html")) {
			event.preventDefault();
			window.history.back();
		}
	});

	removeButton.addEventListener("click", () => {
		try {
			window.sessionStorage.removeItem(storageKey);
			window.location.replace(registrationUrl.toString());
		} catch (error) {
			console.error("Could not clear registration review from this browser session.", error);
			message.hidden = false;
			message.textContent = "تعذر حذف بيانات المراجعة من جلسة المتصفح.";
		}
	});

	continueButton.addEventListener("click", () => {
		try {
			window.sessionStorage.setItem(
				"doha-marathon-payment-expiry",
				String(Date.now() + 10 * 60 * 1000)
			);
			window.location.assign("payment.html");
		} catch (error) {
			console.error("Could not start the payment review session.", error);
			message.hidden = false;
			message.textContent = "تعذر بدء جلسة مراجعة الدفع في المتصفح.";
		}
	});
})();
