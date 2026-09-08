// Eén centraal aansluitpunt voor de later te bevestigen intake- en bookingprovider.
// Activeer booking pas wanneer beide URLs betrouwbaar zijn ingericht.
const NUVORO_CONFIG = Object.freeze({
  intakeEndpoint: "",
  bookingUrl: ""
});

document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const siteHeader = document.querySelector(".site-header");
const navigation = document.querySelector("#main-navigation");

if (menuButton && siteHeader && navigation) {
  const setMenuOpen = (open, restoreFocus = false) => {
    siteHeader.classList.toggle("menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "Sluiten" : "Menu";
    if (restoreFocus) menuButton.focus();
  };

  menuButton.addEventListener("click", () => setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true"));
  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") setMenuOpen(false, true);
  });
  siteHeader.addEventListener("focusout", (event) => {
    if (!siteHeader.contains(event.relatedTarget)) setMenuOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!siteHeader.contains(event.target)) setMenuOpen(false);
  });
  window.matchMedia("(min-width: 801px)").addEventListener("change", (event) => {
    if (event.matches) setMenuOpen(false);
  });
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const revealItems = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const livingProcess = document.querySelector("[data-living-process]");
if (livingProcess) {
  const stateButtons = livingProcess.querySelectorAll("[data-process-state]");
  const statePanels = livingProcess.querySelectorAll("[data-state-panel]");
  stateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetState = button.dataset.processState;
      stateButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      statePanels.forEach((panel) => { panel.hidden = panel.dataset.statePanel !== targetState; });
    });
  });
}

const validationMessage = (field) => {
  if (field.validity.typeMismatch) return "Vul een geldig zakelijk e-mailadres in.";
  if (field.validity.rangeUnderflow || field.validity.badInput) return "Vul een positief aantal uren in.";
  return "Vul dit veld in.";
};

const showFieldValidation = (field) => {
  const error = document.getElementById(`${field.id}-error`);
  const invalid = !field.validity.valid;
  field.setAttribute("aria-invalid", String(invalid));
  if (error) {
    error.textContent = invalid ? validationMessage(field) : "";
    error.hidden = !invalid;
  }
  return !invalid;
};

const contactForm = document.querySelector("#contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => event.preventDefault());
  contactForm.querySelectorAll("[required]").forEach((field) => {
    field.addEventListener("blur", () => showFieldValidation(field));
    field.addEventListener("invalid", () => showFieldValidation(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") showFieldValidation(field);
    });
  });
}

const processScanForm = document.querySelector("#process-scan-form");
if (processScanForm) {
  const panels = [...processScanForm.querySelectorAll("[data-scan-step]")];
  const progressItems = [...document.querySelectorAll(".scan-progress li")];
  const counter = document.querySelector("[data-step-counter]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const bookingButton = processScanForm.querySelector("[data-booking-button]");
  const bookingStatus = processScanForm.querySelector("[data-booking-status]");
  let currentStep = 1;

  const bookingReady = Boolean(NUVORO_CONFIG.intakeEndpoint && NUVORO_CONFIG.bookingUrl);
  bookingButton.disabled = !bookingReady;
  if (bookingReady) bookingStatus.textContent = "Na verzending ga je direct door naar de beschikbare afspraakmomenten.";

  const setStep = (step) => {
    currentStep = Math.min(Math.max(step, 1), panels.length);
    panels.forEach((panel) => { panel.hidden = Number(panel.dataset.scanStep) !== currentStep; });
    progressItems.forEach((item, index) => {
      if (index + 1 === currentStep) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      item.classList.toggle("is-complete", index + 1 < currentStep);
    });
    counter.textContent = `${String(currentStep).padStart(2, "0")} / ${String(panels.length).padStart(2, "0")}`;
    progressFill.style.width = `${(currentStep / panels.length) * 100}%`;
    const heading = panels[currentStep - 1].querySelector("h2");
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    document.querySelector(".scan-workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validatePanel = (panel) => {
    const requiredFields = [...panel.querySelectorAll("[required]")];
    const valid = requiredFields.map(showFieldValidation).every(Boolean);
    if (!valid) requiredFields.find((field) => !field.validity.valid)?.focus();
    return valid;
  };

  const getScanData = () => {
    const data = new FormData(processScanForm);
    return {
      name: String(data.get("name") || "").trim(),
      company: String(data.get("company") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      problem: String(data.get("problem") || "").trim(),
      currentProcess: String(data.get("currentProcess") || "").trim(),
      hoursPerWeek: String(data.get("hoursPerWeek") || "").trim(),
      category: String(data.get("category") || "Niet opgegeven"),
      painPoints: data.getAll("painPoints").map(String),
      systems: String(data.get("systems") || "").trim()
    };
  };

  const renderSummary = () => {
    const data = getScanData();
    const summary = {
      problem: data.problem,
      currentProcess: data.currentProcess,
      hoursPerWeek: data.hoursPerWeek,
      category: data.category,
      painPoints: data.painPoints.length ? data.painPoints.join(" · ") : "Niet opgegeven",
      systems: data.systems || "Niet opgegeven",
      contact: `${data.name} · ${data.company}\n${data.email}${data.phone ? ` · ${data.phone}` : ""}`
    };
    Object.entries(summary).forEach(([key, value]) => {
      const target = processScanForm.querySelector(`[data-summary="${key}"]`);
      if (target) target.textContent = value;
    });
  };

  processScanForm.querySelectorAll("[required]").forEach((field) => {
    field.addEventListener("blur", () => showFieldValidation(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") showFieldValidation(field);
    });
  });

  processScanForm.querySelectorAll("[data-scan-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = panels[currentStep - 1];
      if (!validatePanel(panel)) return;
      if (currentStep === 3) renderSummary();
      setStep(currentStep + 1);
    });
  });
  processScanForm.querySelectorAll("[data-scan-back]").forEach((button) => button.addEventListener("click", () => setStep(currentStep - 1)));

  processScanForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!bookingReady) return;

    bookingButton.disabled = true;
    bookingStatus.textContent = "Je Process Snapshot wordt veilig klaargezet voor de afspraak…";
    try {
      const response = await fetch(NUVORO_CONFIG.intakeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getScanData())
      });
      if (!response.ok) throw new Error("Intake kon niet worden opgeslagen.");
      const result = await response.json().catch(() => ({}));
      window.location.assign(result.bookingUrl || NUVORO_CONFIG.bookingUrl);
    } catch (error) {
      bookingStatus.textContent = "Verzenden is niet gelukt. Je invoer staat nog op deze pagina; probeer het later opnieuw.";
      bookingButton.disabled = false;
    }
  });
}
