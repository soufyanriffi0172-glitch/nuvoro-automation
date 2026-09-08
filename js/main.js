// Progressive enhancement: navigation and the year work without a framework.
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
  menuButton.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });
  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false, true);
    }
  });
  // A disclosure, not a modal: tabbing onward closes the menu naturally.
  siteHeader.addEventListener("focusout", (event) => {
    if (!siteHeader.contains(event.relatedTarget)) setMenuOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!siteHeader.contains(event.target)) setMenuOpen(false);
  });
  window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) setMenuOpen(false);
  });
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const contactForm = document.querySelector("#contact-form");
if (contactForm) {
  // No endpoint is configured. Never imply delivery, reset input or send a request.
  contactForm.addEventListener("submit", (event) => event.preventDefault());
  contactForm.querySelectorAll("[required]").forEach((field) => {
    const error = document.getElementById(`${field.id}-error`);
    if (!error) return;
    const showValidation = () => {
      const invalid = !field.validity.valid;
      field.setAttribute("aria-invalid", String(invalid));
      error.textContent = invalid
        ? (field.validity.typeMismatch ? "Vul een geldig e-mailadres in." : "Vul dit veld in.")
        : "";
      error.hidden = !invalid;
    };
    field.addEventListener("blur", showValidation);
    field.addEventListener("invalid", showValidation);
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") showValidation();
    });
  });
}
