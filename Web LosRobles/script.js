const header = document.querySelector('.site-header');
const progress = document.querySelector('.scroll-progress');
const heroMedia = document.querySelector('.hero-media');
const lakeBannerMedia = document.querySelector('.lake-banner-media');
const reveals = document.querySelectorAll('.reveal');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const carouselTrack = document.querySelector('.carousel-track');
const toneSections = Array.from(document.querySelectorAll('[data-header-tone]'));
const reserveModal = document.querySelector('.reserve-modal');
const reserveDialog = document.querySelector('.reserve-dialog');
const reserveForm = document.querySelector('#reserve-form');
const reserveSuccess = document.querySelector('#reserve-success');
const reserveStatusBackButtons = document.querySelectorAll('[data-reserve-status-back="true"]');
const dateModeInputs = document.querySelectorAll('input[name="date_mode"]');
const reserveDateInputs = document.querySelectorAll('input[name="date_mode"], input[name="flex_window"], input[name="flex_month"]');
const cookieBanner = document.querySelector('#cookie-banner');
const cookieChoiceButtons = document.querySelectorAll('[data-cookie-choice]');
const openCookieBannerButtons = document.querySelectorAll('[data-open-cookie-banner="true"]');
const mapFrame = document.querySelector('.footer-map-frame iframe');
const mapPlaceholder = document.querySelector('[data-map-placeholder="true"]');
const calendarGrid = document.querySelector('#calendar-grid');
const calendarRangeLabel = document.querySelector('[data-selected-range="true"]');
const arrivalInput = document.querySelector('#arrival_date');
const departureInput = document.querySelector('#departure_date');
const reserveTotal = document.querySelector('[data-reserve-total="true"]');
const reserveSummaryTotal = document.querySelector('[data-reserve-summary-total="true"]');
const reserveSummaryLines = document.querySelector('[data-reserve-summary-lines="true"]');
const reserveFormView = document.querySelector('[data-reserve-view="form"]');
const reserveSummaryView = document.querySelector('[data-reserve-view="summary"]');
const reserveSummaryOpenButtons = document.querySelectorAll('[data-open-reserve-summary="true"]');
const reserveSummaryCloseButtons = document.querySelectorAll('[data-close-reserve-summary="true"]');
const reserveRequiredWarning = document.querySelector('[data-reserve-required-warning="true"]');
const reservePricedInputs = document.querySelectorAll('[data-price]');
const counterActions = document.querySelectorAll('[data-counter-action]');
const vehicleQuantityActions = document.querySelectorAll('[data-vehicle-quantity]');
const reserveSubmitButton = document.querySelector('.reserve-submit');

const COOKIE_STORAGE_KEY = 'losrobles_cookie_choice_v1';
const CALENDAR_MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CALENDAR_DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const RESERVE_FORM_ENDPOINT = '/api/reserva';
const RESERVE_PRICES = {
  adults: 8.9,
  children: 6.5,
  pets: 3.7,
};
const VEHICLE_LABELS = {
  tienda: 'Tienda',
  moto: 'Moto',
  coche: 'Coche',
  furgo: 'Furgo',
  camper: 'Camper',
  caravana: 'Caravana',
};

let carouselOffset = 0;
let carouselLastTime = 0;
let carouselFrame = 0;
let carouselLoopDistance = 0;
let calendarVisibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedStartDate = null;
let selectedEndDate = null;
let appInitialized = false;

function updateHeaderTone() {
  if (!header || toneSections.length === 0) return;
  const probeY = Math.min(window.innerHeight - 1, Math.max(0, header.offsetHeight * 0.65));
  const probeX = Math.max(0, Math.round(window.innerWidth * 0.5));
  const element = document.elementFromPoint(probeX, probeY);
  const section = element?.closest('[data-header-tone]');
  const tone = section?.getAttribute('data-header-tone') ?? 'dark';
  header.dataset.tone = tone;
}

function updateScrollState() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progressWidth = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  if (progress) progress.style.width = `${progressWidth}%`;
  if (header) header.classList.toggle('scrolled', scrollTop > 24);
  updateHeaderTone();

  if (heroMedia) {
    const offset = Math.min(scrollTop * 0.08, 42);
    heroMedia.style.transform = `scale(1.02) translateY(${offset}px)`;
  }

  if (lakeBannerMedia) {
    const offset = Math.min(scrollTop * 0.14, 92);
    lakeBannerMedia.style.transform = `scale(1.1) translateY(${offset}px)`;
  }
}

function updateCarouselLoop() {
  if (!carouselTrack) return;
  const firstGroup = carouselTrack.querySelector('.carousel-group');
  if (!firstGroup) return;
  carouselLoopDistance = firstGroup.getBoundingClientRect().width;
}

function stepCarousel(timestamp) {
  if (!carouselTrack || !carouselLoopDistance) {
    carouselFrame = window.requestAnimationFrame(stepCarousel);
    return;
  }

  if (!carouselLastTime) carouselLastTime = timestamp;
  const delta = timestamp - carouselLastTime;
  carouselLastTime = timestamp;

  const speed = 18;
  carouselOffset -= (speed * delta) / 1000;

  while (Math.abs(carouselOffset) >= carouselLoopDistance) {
    const firstGroup = carouselTrack.firstElementChild;
    if (!firstGroup) break;
    carouselTrack.appendChild(firstGroup);
    carouselOffset += carouselLoopDistance;
  }

  carouselTrack.style.transform = `translateX(${carouselOffset}px)`;
  carouselFrame = window.requestAnimationFrame(stepCarousel);
}

function startCarouselLoop() {
  if (!carouselTrack) return;
  if (carouselFrame) window.cancelAnimationFrame(carouselFrame);
  carouselOffset = 0;
  carouselLastTime = 0;
  carouselTrack.style.transform = 'translateX(0)';
  updateCarouselLoop();
  carouselFrame = window.requestAnimationFrame(stepCarousel);
}

function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;
  updateScrollState();
  startCarouselLoop();
  setDateMode(document.querySelector('input[name="date_mode"]:checked')?.value ?? 'exact');
  renderCalendar();
  applyCookieChoice(getStoredCookieChoice());
  syncReserveFormState();
}

function setDateMode(mode) {
  document.querySelectorAll('[data-date-panel]').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.datePanel === mode);
  });
}

function formatEuro(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

function getCounterInput(name) {
  return reserveForm?.querySelector(`input[name="${name}"]`);
}

function getVehicleQuantity(input) {
  const card = input.closest('.vehicle-card');
  const count = Number(card?.querySelector('[data-vehicle-count="true"]')?.textContent || 1);
  return Math.max(1, count);
}

function setVehicleQuantity(card, quantity) {
  const count = card?.querySelector('[data-vehicle-count="true"]');
  if (count) count.textContent = String(Math.max(1, quantity));
}

function getReserveFieldValue(selector) {
  return reserveForm?.querySelector(selector)?.value.trim() || '';
}

function getReserveDateSummary() {
  if (!reserveForm) return 'Sin fechas seleccionadas';

  const dateMode = reserveForm.querySelector('input[name="date_mode"]:checked')?.value ?? 'exact';

  if (dateMode === 'exact') {
    return `${arrivalInput?.value || 'Sin llegada'} -> ${departureInput?.value || 'Sin salida'}`;
  }

  const flexWindow = reserveForm.querySelector('input[name="flex_window"]:checked')?.nextElementSibling?.textContent || 'Sin duración';
  const flexMonth = reserveForm.querySelector('input[name="flex_month"]:checked')?.nextElementSibling?.textContent || 'Sin mes';
  return `${flexWindow} · ${flexMonth}`;
}

function getReserveDayCount() {
  if (!reserveForm) return 1;

  const dateMode = reserveForm.querySelector('input[name="date_mode"]:checked')?.value ?? 'exact';

  if (dateMode === 'exact') {
    if (!selectedStartDate || !selectedEndDate) return 1;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.round((selectedEndDate - selectedStartDate) / msPerDay));
  }

  const flexWindow = reserveForm.querySelector('input[name="flex_window"]:checked')?.value;
  const flexibleDays = {
    finde: 2,
    semana: 7,
    quincena: 15,
    mes: 30,
  };

  return flexibleDays[flexWindow] || 1;
}

function getReserveInfoItems() {
  if (!reserveForm) return [];

  const items = [
    { label: 'Nombre', value: getReserveFieldValue('input[name="full_name"]') },
    { label: 'Email', value: getReserveFieldValue('input[name="email"]') },
    { label: 'Teléfono', value: getReserveFieldValue('input[name="phone"]') },
    { label: 'Comentario', value: getReserveFieldValue('textarea[name="notes"]') },
    { label: 'Fechas', value: `${getReserveDateSummary()} · ${getReserveDayCount()} día${getReserveDayCount() === 1 ? '' : 's'}`, variant: 'date' },
  ];

  return items.filter((item) => item.value);
}

function getReserveLineItems() {
  if (!reserveForm) return [];

  const adults = Number(getCounterInput('adults')?.value || 0);
  const children = Number(getCounterInput('children')?.value || 0);
  const pets = Number(getCounterInput('pets')?.value || 0);
  const days = getReserveDayCount();
  const lines = [];

  if (adults > 0) {
    lines.push({ label: 'Adultos', detail: `${adults} x ${formatEuro(RESERVE_PRICES.adults)} x ${days} día${days === 1 ? '' : 's'}`, amount: adults * RESERVE_PRICES.adults * days });
  }

  if (children > 0) {
    lines.push({ label: 'Niños (3-8)', detail: `${children} x ${formatEuro(RESERVE_PRICES.children)} x ${days} día${days === 1 ? '' : 's'}`, amount: children * RESERVE_PRICES.children * days });
  }

  if (pets > 0) {
    lines.push({ label: 'Mascotas', detail: `${pets} x ${formatEuro(RESERVE_PRICES.pets)} x ${days} día${days === 1 ? '' : 's'}`, amount: pets * RESERVE_PRICES.pets * days });
  }

  reserveForm.querySelectorAll('input[name="vehicle_items"]:checked').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    const dailyAmount = Number(input.dataset.price || 0);
    const quantity = getVehicleQuantity(input);
    lines.push({
      label: VEHICLE_LABELS[input.value] || input.value,
      detail: `${quantity} x ${formatEuro(dailyAmount)} x ${days} día${days === 1 ? '' : 's'}`,
      amount: quantity * dailyAmount * days,
    });
  });

  const waterElectricity = reserveForm.querySelector('input[name="water_electricity"]');
  if (waterElectricity instanceof HTMLInputElement && waterElectricity.checked) {
    const dailyAmount = Number(waterElectricity.dataset.price || 0);
    lines.push({ label: 'Acceso a Agua y Luz', detail: `${formatEuro(dailyAmount)} x ${days} día${days === 1 ? '' : 's'}`, amount: dailyAmount * days, variant: 'utility' });
  }

  return lines;
}

function getReserveTotalValue() {
  return getReserveLineItems().reduce((sum, line) => sum + line.amount, 0);
}

function updateReserveSummary() {
  const lines = getReserveLineItems();
  const infoItems = getReserveInfoItems();

  if (reserveSummaryLines) {
    const infoHtml = infoItems.map((item) => `
      <div class="reserve-summary-line reserve-summary-line-info ${item.variant === 'date' ? 'reserve-summary-line-date' : ''}">
        <span>${escapeHtml(item.label)}<small>${escapeHtml(item.value)}</small></span>
      </div>
    `).join('');

    const priceHtml = lines.map((line) => `
      <div class="reserve-summary-line ${line.variant === 'utility' ? 'reserve-summary-line-utility' : ''}">
        <span>${escapeHtml(line.label)}<small>${escapeHtml(line.detail)}</small></span>
        <strong>${formatEuro(line.amount)}</strong>
      </div>
    `).join('');

    reserveSummaryLines.innerHTML = infoHtml + priceHtml;
  }

  const total = formatEuro(getReserveTotalValue());
  if (reserveSummaryTotal) reserveSummaryTotal.textContent = total;
}

function setReserveSummaryView(isSummaryOpen) {
  if (reserveFormView) reserveFormView.hidden = isSummaryOpen;
  if (reserveSummaryView) reserveSummaryView.hidden = !isSummaryOpen;
  reserveDialog?.classList.toggle('is-summary-open', isSummaryOpen);
  if (isSummaryOpen) updateReserveSummary();
  updateReserveActionPosition();
}

function updateReserveTotal() {
  const total = formatEuro(getReserveTotalValue());
  if (reserveTotal) reserveTotal.textContent = total;
  if (reserveSummaryTotal) reserveSummaryTotal.textContent = total;
  if (reserveSummaryView && !reserveSummaryView.hidden) updateReserveSummary();
}

function updateCounter(target, direction) {
  const input = getCounterInput(target);
  if (!input) return;

  const min = Number(input.min || 0);
  const max = Number(input.max || 99);
  const currentValue = Number(input.value || 0);
  const nextValue = Math.min(max, Math.max(min, currentValue + direction));

  input.value = String(nextValue);
  updateReserveTotal();
}

function syncReserveFormState() {
  updateReserveTotal();
}

function getCheckedValues(name) {
  return Array.from(reserveForm?.querySelectorAll(`input[name="${name}"]:checked`) || []).map((input) => {
    if (name === 'vehicle_items' && input instanceof HTMLInputElement) {
      const quantity = getVehicleQuantity(input);
      const label = VEHICLE_LABELS[input.value] || input.value;
      return quantity > 1 ? `${label} x ${quantity}` : label;
    }

    return input.value;
  });
}

function buildReservationSummary() {
  if (!reserveForm) return '';

  const adults = Number(getCounterInput('adults')?.value || 0);
  const children = Number(getCounterInput('children')?.value || 0);
  const pets = Number(getCounterInput('pets')?.value || 0);

  const selectedVehicles = getCheckedValues('vehicle_items')
    .map((value) => VEHICLE_LABELS[value] || value)
    .join(', ') || 'Sin seleccionar';

  const hasWaterElectricity = reserveForm.querySelector('input[name="water_electricity"]')?.checked ? 'Sí' : 'No';
  const notes = reserveForm.querySelector('textarea[name="notes"]')?.value.trim() || 'Sin comentarios';

  return [
    'Solicitud de reserva',
    `Nombre: ${reserveForm.querySelector('input[name="full_name"]')?.value.trim() || ''}`,
    `Email: ${reserveForm.querySelector('input[name="email"]')?.value.trim() || ''}`,
    `Teléfono: ${reserveForm.querySelector('input[name="phone"]')?.value.trim() || 'No indicado'}`,
    `Adultos: ${adults}`,
    `Niños (3-8): ${children}`,
    `Mascotas: ${pets}`,
    `Vehículos / elementos: ${selectedVehicles}`,
    `Agua y luz: ${hasWaterElectricity}`,
    `Fechas: ${getReserveDateSummary()}`,
    `Días facturados: ${getReserveDayCount()}`,
    `Total estimado: ${reserveTotal?.textContent || ''}`,
    `Comentarios: ${notes}`,
  ].join('\n');
}

function buildSpanishSubmissionData() {
  const formData = new FormData();
  if (!reserveForm) return formData;

  const fullName = reserveForm.querySelector('input[name="full_name"]')?.value.trim() || 'Solicitud web';
  const email = reserveForm.querySelector('input[name="email"]')?.value.trim() || '';
  const phone = reserveForm.querySelector('input[name="phone"]')?.value.trim();
  const notes = reserveForm.querySelector('textarea[name="notes"]')?.value.trim();
  const dateMode = reserveForm.querySelector('input[name="date_mode"]:checked')?.value ?? 'exact';
  const adults = Number(getCounterInput('adults')?.value || 0);
  const children = Number(getCounterInput('children')?.value || 0);
  const pets = Number(getCounterInput('pets')?.value || 0);
  const selectedVehicles = getCheckedValues('vehicle_items')
    .map((value) => VEHICLE_LABELS[value] || value)
    .join(', ') || 'Sin seleccionar';
  const hasWaterElectricity = reserveForm.querySelector('input[name="water_electricity"]')?.checked ? 'Sí' : 'No';
  const contactLines = [
    `Nombre: ${fullName}`,
    `Email: ${email}`,
  ];
  const dateLines = [
    `Tipo de fechas: ${dateMode === 'exact' ? 'Fechas exactas' : 'Fechas flexibles'}`,
    `Detalle: ${getReserveDateSummary()}`,
  ];
  const selectionLines = [
    `Adultos: ${adults}`,
    `Niños (3-8): ${children}`,
    `Mascotas: ${pets}`,
    `Vehículos / elementos: ${selectedVehicles}`,
    `Acceso a agua y luz: ${hasWaterElectricity}`,
  ];

  if (phone) contactLines.push(`Teléfono: ${phone}`);
  if (notes) selectionLines.push(`Comentarios: ${notes}`);

  formData.append('_subject', `Nueva solicitud de reserva · ${fullName}`);
  formData.append('_template', 'box');
  formData.append('_captcha', 'false');
  formData.append('_replyto', email);
  formData.append('Contacto:', contactLines.join('\n'));
  formData.append('Fechas:', dateLines.join('\n'));
  formData.append('Selecciones:', selectionLines.join('\n'));
  formData.append('Facturación:', [
    `Días facturados: ${getReserveDayCount()}`,
    `Precio total: ${reserveTotal?.textContent || formatEuro(getReserveTotalValue())}`,
  ].join('\n'));

  return formData;
}

function setReserveFeedback(message, isError = false) {
  if (!reserveSuccess) return;
  reserveSuccess.textContent = message;
  reserveSuccess.hidden = false;
  reserveSuccess.classList.toggle('is-error', isError);
}

function getRequiredContactInputs() {
  return [
    reserveForm?.querySelector('input[name="full_name"]'),
    reserveForm?.querySelector('input[name="email"]'),
  ].filter(Boolean);
}

function clearReserveRequiredFeedback() {
  getRequiredContactInputs().forEach((input) => {
    input.classList.remove('is-required-missing');
  });
  reserveDialog?.classList.remove('has-required-warning');
  if (reserveRequiredWarning) reserveRequiredWarning.hidden = true;
  if (reserveSuccess?.classList.contains('is-error')) {
    reserveSuccess.hidden = true;
    reserveSuccess.classList.remove('is-error');
  }
}

function getMissingRequiredContactFields() {
  const nameInput = reserveForm?.querySelector('input[name="full_name"]');
  const emailInput = reserveForm?.querySelector('input[name="email"]');
  const missingFields = [];

  if (nameInput?.validity.valueMissing) {
    missingFields.push({ input: nameInput, label: 'nombre', reason: 'missing' });
  }

  if (emailInput?.validity.valueMissing) {
    missingFields.push({ input: emailInput, label: 'email', reason: 'missing' });
  } else if (emailInput && !emailInput.validity.valid) {
    missingFields.push({ input: emailInput, label: 'email', reason: 'invalid-email' });
  }

  return missingFields;
}

function getReserveValidationMessage(fields) {
  const missingLabels = fields
    .filter((field) => field.reason === 'missing')
    .map((field) => field.label);
  const hasInvalidEmail = fields.some((field) => field.reason === 'invalid-email');

  if (missingLabels.length && hasInvalidEmail) {
    return `Para continuar tienes que completar ${missingLabels.join(' y ')} y escribir un email válido.`;
  }

  if (hasInvalidEmail) {
    return 'El email no es correcto. Revisa que incluya @ y un dominio válido.';
  }

  return `Para enviar la solicitud tienes que completar ${missingLabels.join(' y ')}.`;
}

function showReserveValidationFeedback() {
  if (!reserveForm) return false;

  const missingFields = getMissingRequiredContactFields();

  getRequiredContactInputs().forEach((input) => {
    input.classList.toggle('is-required-missing', !input.validity.valid);
  });

  if (!missingFields.length) {
    clearReserveRequiredFeedback();
    return true;
  }

  setReserveFeedback(getReserveValidationMessage(missingFields), true);
  reserveDialog?.classList.toggle('has-required-warning', missingFields.length > 0);
  if (reserveRequiredWarning) {
    reserveRequiredWarning.textContent = missingFields.some((field) => field.reason === 'invalid-email')
      ? 'Revise el email'
      : 'Rellene los campos obligatorios';
    reserveRequiredWarning.hidden = missingFields.length === 0;
  }
  missingFields[0]?.input?.focus();

  return missingFields.length === 0;
}

function setReserveStatus(status) {
  if (!reserveDialog) return;
  const statusView = reserveDialog.querySelector('.reserve-status-view');
  const isIdle = status === 'idle';

  reserveDialog.classList.toggle('is-sending', status === 'sending');
  reserveDialog.classList.toggle('is-sent', status === 'sent');
  reserveDialog.classList.toggle('is-send-error', status === 'error');

  if (statusView) {
    statusView.hidden = isIdle;
    statusView.setAttribute('aria-hidden', isIdle ? 'true' : 'false');
  }
}

function updateReserveActionPosition() {
  if (!reserveModal || !reserveDialog || !reserveModal.classList.contains('is-open')) return;

  window.requestAnimationFrame(() => {
    const isMobileLayout = window.matchMedia('(max-width: 640px)').matches;
    if (isMobileLayout) {
      document.documentElement.style.removeProperty('--reserve-actions-bottom');
      return;
    }

    const dialogRect = reserveDialog.getBoundingClientRect();
    const actionHeight = reserveDialog.classList.contains('is-summary-open') ? 64 : 50;
    const actionGap = 18;
    const bottom = Math.max(14, window.innerHeight - dialogRect.bottom - actionGap - actionHeight);
    document.documentElement.style.setProperty('--reserve-actions-bottom', `${bottom}px`);
  });
}

function resetReserveFormUi(options = {}) {
  reserveForm?.reset();
  document.querySelectorAll('.vehicle-card').forEach((card) => setVehicleQuantity(card, 1));
  const adultsInput = getCounterInput('adults');
  const childrenInput = getCounterInput('children');
  const petsInput = getCounterInput('pets');
  if (adultsInput) adultsInput.value = '1';
  if (childrenInput) childrenInput.value = '0';
  if (petsInput) petsInput.value = '0';
  selectedStartDate = null;
  selectedEndDate = null;
  calendarVisibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  setDateMode('exact');
  renderCalendar();
  if (!options.keepStatus) setReserveSummaryView(false);
  syncReserveFormState();
}

function openReserveModal() {
  if (!reserveModal) return;
  reserveSuccess?.setAttribute('hidden', 'hidden');
  clearReserveRequiredFeedback();
  setReserveStatus('idle');
  setReserveSummaryView(false);
  reserveModal.classList.add('is-open');
  reserveModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  updateReserveActionPosition();
}

function closeReserveModal() {
  if (!reserveModal) return;
  reserveModal.classList.remove('is-open');
  reserveModal.setAttribute('aria-hidden', 'true');
  setReserveSummaryView(false);
  setReserveStatus('idle');
  clearReserveRequiredFeedback();
  document.body.classList.remove('modal-open');
  document.documentElement.style.removeProperty('--reserve-actions-bottom');
}

function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function sameDate(a, b) {
  return a && b && a.toDateString() === b.toDateString();
}

function isDateBetween(date, start, end) {
  if (!start || !end) return false;
  return date > start && date < end;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function updateSelectedRangeLabel() {
  if (!calendarRangeLabel) return;
  if (selectedStartDate && selectedEndDate) {
    calendarRangeLabel.textContent = `${formatLongDate(selectedStartDate)} - ${formatLongDate(selectedEndDate)}`;
  } else if (selectedStartDate) {
    calendarRangeLabel.textContent = `${formatLongDate(selectedStartDate)} - Elige salida`;
  } else {
    calendarRangeLabel.textContent = 'Selecciona llegada y salida';
  }

  if (arrivalInput) arrivalInput.value = selectedStartDate ? toIsoDate(selectedStartDate) : '';
  if (departureInput) departureInput.value = selectedEndDate ? toIsoDate(selectedEndDate) : '';
}

function renderMonth(monthDate) {
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysMarkup = '';

  for (let i = 0; i < leadingBlanks; i += 1) {
    daysMarkup += '<div class="calendar-day-empty" aria-hidden="true"></div>';
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const isDisabled = date < today;
    const classes = ['calendar-day'];
    if (sameDate(date, selectedStartDate)) classes.push('is-start');
    if (sameDate(date, selectedEndDate)) classes.push('is-end');
    if (sameDate(date, today)) classes.push('is-today');
    if (isDateBetween(date, selectedStartDate, selectedEndDate)) classes.push('is-in-range');
    if (isDisabled) classes.push('is-disabled');

    daysMarkup += `
      <button
        class="${classes.join(' ')}"
        type="button"
        data-calendar-date="${toIsoDate(date)}"
        ${isDisabled ? 'disabled' : ''}
      >
        ${day}
      </button>
    `;
  }

  return `
    <div class="calendar-month">
      <div class="calendar-month-header">${CALENDAR_MONTH_NAMES[month]} ${year}</div>
      <div class="calendar-weekdays">
        ${CALENDAR_DAY_NAMES.map((dayName) => `<span>${dayName}</span>`).join('')}
      </div>
      <div class="calendar-days">
        ${daysMarkup}
      </div>
    </div>
  `;
}

function renderCalendar() {
  if (!calendarGrid) return;
  calendarGrid.innerHTML = renderMonth(calendarVisibleMonth);
  updateSelectedRangeLabel();
}

function onCalendarDateClick(dateValue) {
  const clickedDate = new Date(`${dateValue}T00:00:00`);

  if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
    selectedStartDate = clickedDate;
    selectedEndDate = null;
  } else if (clickedDate < selectedStartDate) {
    selectedStartDate = clickedDate;
  } else if (clickedDate.toDateString() === selectedStartDate.toDateString()) {
    selectedEndDate = clickedDate;
  } else {
    selectedEndDate = clickedDate;
  }

  renderCalendar();
  updateReserveTotal();
}

function getStoredCookieChoice() {
  try {
    return window.localStorage.getItem(COOKIE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeCookieChoice(choice) {
  try {
    window.localStorage.setItem(COOKIE_STORAGE_KEY, choice);
  } catch {
    return null;
  }
  return choice;
}

function applyCookieChoice(choice) {
  const hasOptionalConsent = choice === 'accept-all';

  if (mapFrame && mapPlaceholder) {
    if (hasOptionalConsent) {
      if (!mapFrame.src) {
        mapFrame.src = mapFrame.dataset.mapSrc || '';
      }
      mapFrame.hidden = false;
      mapFrame.style.display = 'block';
      mapPlaceholder.hidden = true;
      mapPlaceholder.style.display = 'none';
    } else {
      mapFrame.hidden = true;
      mapFrame.style.display = 'none';
      mapPlaceholder.hidden = false;
      mapPlaceholder.style.display = 'grid';
    }
  }

  if (cookieBanner) {
    cookieBanner.classList.toggle('is-visible', !choice);
  }
}

function openCookieBanner() {
  cookieBanner?.classList.add('is-visible');
}

function closeCookieBanner() {
  cookieBanner?.classList.remove('is-visible');
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.14 });

reveals.forEach((item) => {
  if (!item.classList.contains('visible')) observer.observe(item);
});

menuToggle?.addEventListener('click', () => {
  const open = nav?.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(Boolean(open)));
});

document.querySelectorAll('.site-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    nav?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

document.querySelectorAll('[data-open-reserve="true"]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openReserveModal();
  });
});

document.querySelectorAll('[data-close-reserve="true"]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    closeReserveModal();
  });
});

reserveSummaryOpenButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    if (event.target.closest('.reserve-cart-edit')) {
      clearReserveRequiredFeedback();
      setReserveSummaryView(false);
      return;
    }

    if (reserveDialog?.classList.contains('is-summary-open')) {
      reserveForm?.requestSubmit();
      return;
    }

    if (!showReserveValidationFeedback()) {
      setReserveSummaryView(false);
      return;
    }

    clearReserveRequiredFeedback();
    setReserveSummaryView(!reserveDialog?.classList.contains('is-summary-open'));
  });
});

reserveSummaryCloseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setReserveSummaryView(false);
  });
});

reserveStatusBackButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setReserveStatus('idle');
    setReserveSummaryView(true);
  });
});

dateModeInputs.forEach((input) => {
  input.addEventListener('change', (event) => {
    setDateMode(event.target.value);
  });
});

reserveDateInputs.forEach((input) => {
  input.addEventListener('change', updateReserveTotal);
});

calendarGrid?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-calendar-date]');
  if (!button) return;
  onCalendarDateClick(button.dataset.calendarDate);
});

document.querySelectorAll('[data-calendar-nav]').forEach((button) => {
  button.addEventListener('click', () => {
    const direction = button.dataset.calendarNav === 'next' ? 1 : -1;
    calendarVisibleMonth = new Date(calendarVisibleMonth.getFullYear(), calendarVisibleMonth.getMonth() + direction, 1);
    renderCalendar();
  });
});

cookieChoiceButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const choice = button.dataset.cookieChoice;
    storeCookieChoice(choice);
    applyCookieChoice(choice);
    closeCookieBanner();
  });
});

openCookieBannerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    openCookieBanner();
  });
});

counterActions.forEach((button) => {
  button.addEventListener('click', () => {
    const direction = button.dataset.counterAction === 'increase' ? 1 : -1;
    updateCounter(button.dataset.counterTarget, direction);
  });
});

reservePricedInputs.forEach((input) => {
  input.addEventListener('change', () => {
    if (input.name === 'vehicle_items' && input instanceof HTMLInputElement && input.checked) {
      setVehicleQuantity(input.closest('.vehicle-card'), getVehicleQuantity(input));
    }

    updateReserveTotal();
  });
});

vehicleQuantityActions.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const card = button.closest('.vehicle-card');
    const input = card?.querySelector('input[name="vehicle_items"]');
    const count = card?.querySelector('[data-vehicle-count="true"]');
    if (!(input instanceof HTMLInputElement) || !count) return;

    input.checked = true;
    const currentValue = Number(count.textContent || 1);
    const direction = button.dataset.vehicleQuantity === 'increase' ? 1 : -1;
    setVehicleQuantity(card, Math.max(1, currentValue + direction));
    updateReserveTotal();
  });
});

getRequiredContactInputs().forEach((input) => {
  input.addEventListener('input', () => {
    clearReserveRequiredFeedback();
  });
});

reserveForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!reserveForm) return;

  if (!reserveForm.checkValidity()) {
    setReserveSummaryView(false);
    showReserveValidationFeedback();
    reserveForm.reportValidity();
    return;
  }

  clearReserveRequiredFeedback();
  const formData = buildSpanishSubmissionData();

  reserveSubmitButton?.setAttribute('disabled', 'disabled');
  setReserveStatus('sending');

  fetch(RESERVE_FORM_ENDPOINT, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === 'false') {
        throw new Error(data.message || 'No se pudo enviar la solicitud.');
      }

      resetReserveFormUi({ keepStatus: true });
      setReserveStatus('sent');
    })
    .catch(() => {
      setReserveStatus('error');
    })
    .finally(() => {
      reserveSubmitButton?.removeAttribute('disabled');
    });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeReserveModal();
    closeCookieBanner();
  }
});

window.addEventListener('scroll', updateScrollState, { passive: true });
window.addEventListener('resize', updateScrollState);
window.addEventListener('resize', startCarouselLoop);
window.addEventListener('resize', updateReserveActionPosition);
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

window.addEventListener('load', () => {
  initializeApp();
  updateCarouselLoop();
});
