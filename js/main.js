document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const siteHeader = document.querySelector('.site-header');
const navigation = document.querySelector('#main-navigation');
if (menuButton && siteHeader && navigation) {
  const setMenuOpen = (open, restoreFocus = false) => {
    siteHeader.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.firstChild.textContent = open ? 'Sluiten ' : 'Menu ';
    menuButton.querySelector('span').textContent = open ? '×' : '☰';
    if (restoreFocus) menuButton.focus();
  };
  menuButton.addEventListener('click', () => setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenuOpen(false, true);
  });
  siteHeader.addEventListener('focusout', (event) => {
    if (!siteHeader.contains(event.relatedTarget)) setMenuOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!siteHeader.contains(event.target)) setMenuOpen(false);
  });
  window.matchMedia('(min-width: 851px)').addEventListener('change', (event) => {
    if (event.matches) setMenuOpen(false);
  });
}

document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const lens = document.querySelector('[data-process-lens]');
if (lens) {
  const tabs = [...lens.querySelectorAll('[data-lens]')];
  const panels = [...lens.querySelectorAll('[data-lens-panel]')];
  const selectTab = (tab, focus = false) => {
    lens.dataset.active = tab.dataset.lens;
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel.dataset.lensPanel !== tab.dataset.lens; });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  });
}

const form = document.querySelector('#process-scan-form');
if (form) {
  const endpoint = 'https://soufyanriffi.app.n8n.cloud/webhook/nuvoro-process-scan';
  const calLink = 'soufyan-riffi-ptzlxn/procesgesprek';
  const button = form.querySelector('[data-booking-button]');
  const status = form.querySelector('[data-booking-status]');
  const booking = form.querySelector('#cal-booking');
  const fallback = form.querySelector('#cal-fallback');
  const required = [...form.querySelectorAll('[required]')];
  let sent = false;

  const validate = (field) => {
    const invalid = !field.validity.valid || !field.value.trim();
    const error = document.getElementById(`${field.id}-error`);
    field.setAttribute('aria-invalid', String(invalid));
    if (error) {
      error.textContent = invalid ? (field.validity.typeMismatch ? 'Vul een geldig e-mailadres in.' : 'Vul dit veld in.') : '';
      error.hidden = !invalid;
    }
    return !invalid;
  };
  required.forEach((field) => {
    field.addEventListener('blur', () => validate(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
    });
  });

  const loadCal = () => new Promise((resolve, reject) => {
    if (window.Cal) { resolve(window.Cal); return; }
    const script = document.createElement('script');
    script.src = 'https://app.cal.com/embed/embed.js';
    script.onload = () => resolve(window.Cal);
    script.onerror = () => reject(new Error('cal'));
    document.head.append(script);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sent) return;
    const valid = required.map(validate).every(Boolean);
    if (!valid) { required.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus(); return; }
    const data = new FormData(form);
    const intake = Object.fromEntries(data.entries());
    const scanId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    // Preserve the existing n8n field names where they still describe Module 1 answers.
    const payload = { name: intake.name, company: intake.company, email: intake.email, phone: intake.phone || '', problem: intake.reason, currentProcess: intake.process, expectation: intake.expectation, role: intake.role, hoursPerWeek: '', category: '', painPoints: [], systems: '', scanId, website: '' };
    button.disabled = true;
    status.textContent = 'Je voorbereiding wordt verzonden…';
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('intake');
      sent = true;
      button.hidden = true;
      status.textContent = 'Verzonden. De afspraakplanner wordt geladen…';
    } catch {
      button.disabled = false;
      status.textContent = 'Verzenden is niet gelukt. Je invoer blijft op deze pagina; probeer het opnieuw.';
      return;
    }
    try {
      const Cal = await loadCal();
      if (typeof Cal !== 'function') throw new Error('cal');
      Cal('init', 'nuvoro', { origin: 'https://app.cal.com' });
      booking.hidden = false;
      Cal.ns.nuvoro('inline', { elementOrSelector: '#cal-booking', calLink, config: {
        name: payload.name, email: payload.email,
        'metadata[scanId]': scanId, 'metadata[company]': payload.company,
        'metadata[phone]': payload.phone, 'metadata[process]': payload.currentProcess.slice(0, 480)
      } });
      status.textContent = 'Kies hieronder een moment voor je procesgesprek.';
    } catch {
      booking.hidden = true;
      fallback.hidden = false;
      status.textContent = 'Je voorbereiding is ontvangen. De ingesloten afspraakplanner kon niet laden; open de planner via de link hieronder.';
    }
  });
}
