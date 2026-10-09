(() => {
	"use strict";

	const raceCategories = [
		{ pattern: /سباق التتابع/, value: "relay42" },
		{ pattern: /42/, value: "42km" },
		{ pattern: /21/, value: "21km" },
		{ pattern: /10/, value: "10km" },
		{ pattern: /5/, value: "5km" }
	];

	document.querySelectorAll("a").forEach((link) => {
		if (!/سجل\s*الآن/.test(link.textContent || "")) return;

		const registrationUrl = new URL("registration.html", window.location.href);
		const raceName =
			link.querySelector(".elementor-slide-heading")?.textContent ||
			link.closest(".swiper-slide")?.querySelector(".elementor-slide-heading")?.textContent ||
			"";
		const race = raceCategories.find((item) => item.pattern.test(raceName));
		if (race) registrationUrl.searchParams.set("category", race.value);
		link.href = registrationUrl.toString();
	});
})();
