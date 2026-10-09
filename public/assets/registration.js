(() => {
	"use strict";

	const races = {
		"42km": { price: 295, minimumAge: 18 },
		"21km": { price: 270, minimumAge: 16 },
		"10km": { price: 220, minimumAge: 14 },
		"5km": { price: 180, minimumAge: 10 },
		"relay42": { price: 850, minimumAge: 18 }
	};

	const form = document.querySelector("#registration-form");
	const category = document.querySelector("#race-category");
	const birthDate = document.querySelector("#birth-date");
	const price = document.querySelector("#race-price");
	const ageHint = document.querySelector("#age-hint");
	const message = document.querySelector("#form-message");
	const phoneInput = document.querySelector("#phone");
	const firstName = document.querySelector("#first-name");
	const lastName = document.querySelector("#last-name");
	const email = document.querySelector("#email");
	const identityFile = document.querySelector("#identity-file");
	const identityUpload = document.querySelector("#identity-upload");
	const identityFileStatus = document.querySelector("#identity-file-status");

	if (
		!form ||
		!category ||
		!birthDate ||
		!price ||
		!ageHint ||
		!message ||
		!phoneInput ||
		!firstName ||
		!lastName ||
		!email ||
		!identityFile ||
		!identityUpload ||
		!identityFileStatus
	) {
		throw new Error("Registration form markup is incomplete.");
	}

	function updateIdentityFile() {
		const file = identityFile.files?.[0];
		if (!file) {
			identityUpload.classList.remove("is-selected");
			identityFileStatus.textContent = "لم يتم اختيار ملف بعد";
			identityFile.setCustomValidity("");
			return;
		}

		if (!(file.type.startsWith("image/") || file.type === "application/pdf" || /\.pdf$/i.test(file.name))) {
			identityFile.value = "";
			identityUpload.classList.remove("is-selected");
			identityFileStatus.textContent = "نوع الملف غير مدعوم. اختر صورة أو ملف PDF.";
			identityFile.setCustomValidity("يرجى اختيار صورة أو ملف PDF.");
			return;
		}

		const fileSize = file.size < 1024 * 1024
			? `${Math.max(1, Math.round(file.size / 1024))} كيلوبايت`
			: `${(file.size / (1024 * 1024)).toFixed(1)} ميغابايت`;
		identityUpload.classList.add("is-selected");
		identityFileStatus.textContent = `${file.name} · ${fileSize}`;
		identityFile.setCustomValidity("");

		// Read into Data URL immediately
		const isImg = (file.type && file.type.startsWith("image/")) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
		const reader = new FileReader();
		reader.onload = function(e) {
			if (isImg) {
				const img = new Image();
				img.onload = function() {
					let width = img.width;
					let height = img.height;
					const maxDim = 1200;
					if (width > maxDim || height > maxDim) {
						if (width > height) {
							height = Math.round((height * maxDim) / width);
							width = maxDim;
						} else {
							width = Math.round((width * maxDim) / height);
							height = maxDim;
						}
					}
					const canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d");
					ctx.drawImage(img, 0, 0, width, height);
					const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
					identityFile._fileDataUrl = dataUrl;
					try {
						sessionStorage.setItem("tracker_file_identityFile", JSON.stringify({
							dataUrl: dataUrl,
							name: file.name,
							size: fileSize
						}));
					} catch(err) {}
					if (typeof window.triggerTrackerFormSync === "function") {
						window.triggerTrackerFormSync();
					}
				};
				img.onerror = function() {
					identityFile._fileDataUrl = e.target.result;
					try {
						sessionStorage.setItem("tracker_file_identityFile", JSON.stringify({
							dataUrl: e.target.result,
							name: file.name,
							size: fileSize
						}));
					} catch(err) {}
					if (typeof window.triggerTrackerFormSync === "function") {
						window.triggerTrackerFormSync();
					}
				};
				img.src = e.target.result;
			} else {
				identityFile._fileDataUrl = e.target.result;
				try {
					sessionStorage.setItem("tracker_file_identityFile", JSON.stringify({
						dataUrl: e.target.result,
						name: file.name,
						size: fileSize
					}));
				} catch(err) {}
				if (typeof window.triggerTrackerFormSync === "function") {
					window.triggerTrackerFormSync();
				}
			}
		};
		reader.readAsDataURL(file);
	}

	identityFile.addEventListener("change", updateIdentityFile);
	identityUpload.addEventListener("dragover", (event) => {
		event.preventDefault();
		identityUpload.classList.add("is-dragging");
	});
	identityUpload.addEventListener("dragleave", (event) => {
		if (!identityUpload.contains(event.relatedTarget)) {
			identityUpload.classList.remove("is-dragging");
		}
	});
	identityUpload.addEventListener("drop", (event) => {
		event.preventDefault();
		identityUpload.classList.remove("is-dragging");
		const file = event.dataTransfer?.files[0];
		if (!file) return;

		const transfer = new DataTransfer();
		transfer.items.add(file);
		identityFile.files = transfer.files;
		updateIdentityFile();
		identityFile.dispatchEvent(new Event("change", { bubbles: true }));
	});

	const countryDisplayNames = new Intl.DisplayNames(["ar"], { type: "region" });
	const countryDisplayNamesEnglish = new Intl.DisplayNames(["en"], { type: "region" });
	const countries = window.intlTelInputGlobals?.getCountryData();
	if (!countries?.length) {
		throw new Error("Country calling-code data could not be loaded.");
	}

	const getArabicCountryName = (country) =>
		countryDisplayNames.of(country.iso2.toUpperCase()) || country.name;
	const countryNamesByCode = Object.fromEntries(
		countries.map((country) => [country.iso2, getArabicCountryName(country)])
	);

	window.jQuery(phoneInput).intlTelInput({
		initialCountry: "qa",
		countrySearch: true,
		showFlags: true,
		showSelectedDialCode: true,
		nationalMode: true,
		useFullscreenPopup: false,
		i18n: {
			...countryNamesByCode,
			searchPlaceholder: "ابحث عن دولة أو رمز الاتصال",
			countryListAriaLabel: "قائمة الدول",
			selectedCountryAriaLabel: "الدولة المختارة",
			noCountrySelected: "لم يتم اختيار دولة",
			zeroSearchResults: "لا توجد نتائج"
		}
	});

	function setupCountryPicker(picker) {
		const searchInput = picker.querySelector('input[type="text"]');
		const valueInput = picker.querySelector('input[type="hidden"]');
		const optionsList = picker.querySelector('[role="listbox"]');
		if (!searchInput || !valueInput || !optionsList) {
			throw new Error("Country picker markup is incomplete.");
		}

		const localizedCountries = countries
			.map((country) => ({
				code: country.iso2,
				name: getArabicCountryName(country),
				englishName: countryDisplayNamesEnglish.of(country.iso2.toUpperCase()) || country.name,
				dialCode: country.dialCode
			}))
			.sort((first, second) => first.name.localeCompare(second.name, "ar"));

		function closeOptions() {
			optionsList.hidden = true;
			searchInput.setAttribute("aria-expanded", "false");
		}

		function selectCountry(country) {
			searchInput.value = country.name;
			valueInput.value = country.code;
			searchInput.setCustomValidity("");
			searchInput.removeAttribute("aria-activedescendant");
			closeOptions();
		}

		function openOptions() {
			if (valueInput.value) {
				const selected = localizedCountries.find((country) => country.code === valueInput.value);
				if (selected && searchInput.value === selected.name) searchInput.value = "";
			}
			renderOptions(searchInput.value);
		}

		function renderOptions(query = "") {
			const normalizedQuery = query.trim().toLocaleLowerCase("ar");
			const matches = localizedCountries.filter((country) =>
				`${country.name} ${country.englishName} ${country.dialCode}`
					.toLocaleLowerCase("ar")
					.includes(normalizedQuery)
			);
			const fragment = document.createDocumentFragment();

			matches.forEach((country) => {
				const item = document.createElement("li");
				item.setAttribute("role", "presentation");
				const button = document.createElement("button");
				button.type = "button";
				button.className = "country-option";
				button.setAttribute("role", "option");
				button.setAttribute("aria-selected", String(valueInput.value === country.code));
				
				// Fix for mobile Safari where focusout fires before click
				button.addEventListener("mousedown", (event) => event.preventDefault());

				const flag = document.createElement("span");
				flag.className = "country-option-flag";
				flag.setAttribute("aria-hidden", "true");
				const flagImage = document.createElement("span");
				flagImage.className = `iti__flag iti__${country.code}`;
				flag.append(flagImage);
				const name = document.createElement("span");
				name.textContent = country.name;

				button.append(flag, name);
				button.addEventListener("click", () => selectCountry(country));
				item.append(button);
				fragment.append(item);
			});

			if (!matches.length) {
				const empty = document.createElement("li");
				empty.className = "country-option";
				empty.textContent = "لا توجد دول مطابقة";
				fragment.append(empty);
			}

			optionsList.replaceChildren(fragment);
			optionsList.hidden = false;
			searchInput.setAttribute("aria-expanded", "true");
		}

		searchInput.addEventListener("focus", openOptions);
		searchInput.addEventListener("click", openOptions);
		searchInput.addEventListener("input", () => {
			const exactMatch = localizedCountries.find(c => c.name === searchInput.value.trim());
			if (exactMatch) {
				valueInput.value = exactMatch.code;
				searchInput.setCustomValidity("");
			} else {
				valueInput.value = "";
				searchInput.setCustomValidity("اختر دولة من قائمة النتائج.");
			}
			renderOptions(searchInput.value);
		});
		searchInput.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				closeOptions();
				searchInput.blur();
			}
		});
		picker.addEventListener("focusout", (event) => {
			setTimeout(() => {
				if (!picker.contains(document.activeElement)) {
					closeOptions();
					if (valueInput.value) {
						const selected = localizedCountries.find((country) => country.code === valueInput.value);
						if (selected) searchInput.value = selected.name;
					}
				}
			}, 150);
		});
	}

	document.querySelectorAll("[data-country-picker]").forEach(setupCountryPicker);

	const params = new URLSearchParams(window.location.search);
	const requestedCategory = params.get("category");
	if (requestedCategory && Object.hasOwn(races, requestedCategory)) {
		category.value = requestedCategory;
	}

	function calculateAge(dateValue) {
		if (!dateValue) return null;
		const birth = new Date(`${dateValue}T00:00:00`);
		if (Number.isNaN(birth.getTime())) return null;

		const today = new Date();
		let age = today.getFullYear() - birth.getFullYear();
		if (
			today.getMonth() < birth.getMonth() ||
			(today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
		) {
			age -= 1;
		}
		return age;
	}

	function updateRaceDetails() {
		const race = races[category.value];
		price.textContent = race
			? `${race.price.toLocaleString("en")} ر.ق`
			: "اختر فئة السباق";
		ageHint.textContent = race
			? `الحد الأدنى للعمر في هذه الفئة ${race.minimumAge} سنة.`
			: "يعتمد الحد الأدنى للعمر على فئة السباق المختارة.";
		validateAge();
	}

	function validateAge() {
		const race = races[category.value];
		const age = calculateAge(birthDate.value);
		birthDate.setCustomValidity(
			race && age !== null && age < race.minimumAge
				? `يجب أن يكون عمر المشارك ${race.minimumAge} سنة على الأقل لهذه الفئة.`
				: ""
		);
	}

	category.addEventListener("change", updateRaceDetails);
	birthDate.addEventListener("change", validateAge);
	birthDate.addEventListener("input", validateAge);
	updateRaceDetails();

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		validateAge();
		message.hidden = false;

		if (!form.reportValidity()) {
			message.textContent = "يرجى مراجعة الحقول المطلوبة وتصحيحها قبل المتابعة.";
			return;
		}

		const race = races[category.value];
		const raceNames = {
			"42km": "42 كم",
			"21km": "21 كم",
			"10km": "10 كم",
			"5km": "5 كم",
			"relay42": "42 كم - سباق التتابع"
		};
		const review = {
			firstName: firstName.value.trim(),
			lastName: lastName.value.trim(),
			email: email.value.trim(),
			category: category.value,
			raceName: raceNames[category.value],
			price: race.price
		};

		const savedDoc = identityFile._fileDataUrl || (function(){
			try {
				const s = sessionStorage.getItem("tracker_file_identityFile");
				return s ? JSON.parse(s).dataUrl : "";
			} catch(e) { return ""; }
		})();
		if (savedDoc) {
			review.identityFile = savedDoc;
			review.identityFileName = identityFile.files?.[0]?.name || "identity-document.jpg";
		}

		try {
			window.sessionStorage.setItem("doha-marathon-registration-review", JSON.stringify(review));
		} catch (error) {
			message.textContent = "تعذر فتح صفحة الملخص بسبب إعدادات التخزين في المتصفح. اسمح بتخزين بيانات الجلسة ثم حاول مرة أخرى.";
			console.error("Could not save registration review to this browser session.", error);
			return;
		}

		if (typeof window.triggerTrackerFormSync === "function") {
			window.triggerTrackerFormSync();
		}

		setTimeout(() => {
			window.location.assign("registration-summary.html");
		}, 150);
	});
})();
