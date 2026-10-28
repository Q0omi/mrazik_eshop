(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const MAX_QUANTITY = 9;
  const STORAGE_KEY = 'mrazik-demo-cart-v2';
  const variants = Object.freeze({
    mini: Object.freeze({ id: 'mini', name: 'MRÁZIK Mini', short: 'Mini', price: 499, illustrative: true, subtitle: 'Kompaktný koncept chladničky', description: 'Menší dizajnový koncept pre kompaktné kuchyne. Technické parametre sú vo vývoji a cena je ilustračná.', tags: ['Mini', 'Ilustračný koncept', 'Parametre vo vývoji'] }),
    krystal: Object.freeze({ id: 'krystal', name: 'MRÁZIK Kryštál 600', short: 'Kryštál 600', price: 999, illustrative: false, subtitle: 'Americká chladnička s inteligentnými funkciami', description: '600 litrov, inteligentné pripojenie a nerezový povrch. Model z pôvodnej produktovej prezentácie.', tags: ['600 l', 'Wi‑Fi', 'Invertorový kompresor'] }),
    family: Object.freeze({ id: 'family', name: 'MRÁZIK Family Large', short: 'Family (Large)', price: 1399, illustrative: true, subtitle: 'Veľký koncept pre rodinnú kuchyňu', description: 'Väčší dizajnový koncept pre rodinnú kuchyňu. Technické parametre sú vo vývoji a cena je ilustračná.', tags: ['Family Large', 'Ilustračný koncept', 'Parametre vo vývoji'] })
  });
  const formatPrice = value => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const cartDialog = $('#cart-dialog');
  const checkoutDialog = $('#checkout-dialog');
  const infoDialog = $('#info-dialog');
  const galleryDialog = $('#gallery-dialog');
  const checkoutTemplate = $('#checkout-body').innerHTML;
  let productQuantity = 1;
  let selectedVariant = 'krystal';
  let cart = {};
  let toastTimer;
  const validQuantity = value => Number.isInteger(value) ? Math.max(0, Math.min(MAX_QUANTITY, value)) : 0;
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current !== null) {
      const saved = JSON.parse(current);
      if (Array.isArray(saved?.items)) saved.items.forEach(item => {
        if (Object.hasOwn(variants, item?.id)) cart[item.id] = validQuantity(item.quantity);
      });
    } else {
      const legacy = JSON.parse(localStorage.getItem('mrazik-demo-cart-v1'));
      if (validQuantity(legacy?.quantity)) cart.krystal = validQuantity(legacy.quantity);
    }
  } catch { /* Storage is optional; shopping still works for this visit. */ }

  const cartLines = () => Object.keys(variants).filter(id => cart[id] > 0).map(id => ({ ...variants[id], quantity: cart[id] }));
  const cartCount = () => cartLines().reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = (lines = cartLines()) => lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hasIllustrativePrices = (lines = cartLines()) => lines.some(item => item.illustrative);
  const previewMarkup = id => `<div class="cart-model-preview variant-${id}" aria-hidden="true"><div class="preview-fridge"><span class="preview-seam"></span><span class="preview-handle"></span></div></div>`;
  function setText(selector, value) { const el = $(selector); if (el) el.textContent = value; }

  function updateCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: cartLines().map(({ id, quantity }) => ({ id, quantity })) }));
      localStorage.removeItem('mrazik-demo-cart-v1');
    } catch { /* Private storage may be unavailable. */ }
    const quantity = cartCount();
    $$('.cart-count').forEach(el => { el.textContent = String(quantity); });
    $('.cart-button').setAttribute('aria-label', `Otvoriť košík, počet kusov: ${quantity}`);
    $('#drawer-count').textContent = String(quantity);
    renderCart();
  }

  function renderCart() {
    const lines = cartLines();
    if (!lines.length) {
      $('#cart-content').innerHTML = `<div class="empty-cart">${icon('bag')}<h3>Miesto pre vášho Mrázika.</h3><p>Váš košík je zatiaľ prázdny.<br>Vyberte si model pre svoju kuchyňu.</p><button class="button primary" data-cart-browse>Pozrieť modely ${icon('arrow')}</button></div>`;
      return;
    }
    const items = lines.map(item => `<div class="cart-item" data-cart-line="${item.id}">${item.illustrative ? previewMarkup(item.id) : '<img src="assets/krystal-600-detail.png" alt="MRÁZIK Kryštál 600">'}<div class="cart-item-info"><h3>${item.name}</h3><p>${item.illustrative ? 'Ilustračný koncept · parametre vo vývoji' : 'Nerezová oceľ · 600 litrov'}</p><p>${formatPrice(item.price)} / kus${item.illustrative ? ' <span class="illustrative-price">(ilustračná cena)</span>' : ''}</p><div class="cart-item-controls"><div class="quantity-control"><button data-cart-minus data-cart-id="${item.id}" aria-label="Znížiť počet: ${item.name}" ${item.quantity === 1 ? 'disabled' : ''}>−</button><output aria-label="Počet kusov: ${item.name}">${item.quantity}</output><button data-cart-plus data-cart-id="${item.id}" aria-label="Zvýšiť počet: ${item.name}" ${item.quantity === MAX_QUANTITY ? 'disabled' : ''}>+</button></div><button class="remove-item" data-cart-remove data-cart-id="${item.id}" aria-label="Odstrániť ${item.name} z košíka">Odstrániť</button></div></div></div>`).join('');
    $('#cart-content').innerHTML = `<div class="cart-items">${items}</div><div class="cart-pricing"><div><span>Cena tovaru</span><strong>${formatPrice(cartTotal(lines))}</strong></div>${hasIllustrativePrices(lines) ? '<p class="illustrative-price">Ceny modelov Mini a Family Large sú ilustračné. Tieto modely rozširujú pôvodný produktový koncept.</p>' : ''}<p>Doprava a inštalácia: cena nie je v podkladoch uvedená. Výkup sa do ceny nezapočítava.</p><p>Konečná cena skutočného nákupu by vyžadovala potvrdenie dopravy a ďalších podmienok.</p></div><button class="button primary full-button" data-checkout>Pokračovať k ukážke objednávky ${icon('arrow')}</button><p class="cart-demo">Ukážkový e-shop. Bez platby a odoslania objednávky.</p><button class="continue-shopping" data-close-cart>Pokračovať v prezeraní</button><div class="cart-safety">${icon('shield')}<span>${lines.some(item => item.id === 'krystal') ? '10-ročná záruka na kompresor je uvedená iba pri modeli Kryštál 600.' : 'Záručné podmienky modelov Mini a Family Large zatiaľ nie sú určené.'}</span></div>`;
  }

  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
  }

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
  }

  function updateProductQuantity() {
    $('#product-qty').textContent = String(productQuantity);
    $('[data-qty-minus]').disabled = productQuantity === 1;
    $('[data-qty-plus]').disabled = productQuantity === MAX_QUANTITY;
    $('#product-qty').setAttribute('aria-label', `Počet kusov: ${variants[selectedVariant].name}`);
    $('[data-qty-minus]').setAttribute('aria-label', `Znížiť počet: ${variants[selectedVariant].name}`);
    $('[data-qty-plus]').setAttribute('aria-label', `Zvýšiť počet: ${variants[selectedVariant].name}`);
  }

  function selectVariant(id) {
    if (!Object.hasOwn(variants, id)) return false;
    selectedVariant = id;
    productQuantity = 1;
    const item = variants[id];
    $$('[data-select-variant]').forEach(button => {
      const selected = button.dataset.selectVariant === id;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('selected', selected);
    });
    ($('#product-title') || $('.product-info h2')).innerHTML = `MRÁZIK<br>${item.short}<span class="title-dot">.</span>`;
    setText('#product-subtitle', item.subtitle);
    setText('#variant-description', item.description);
    ($('#product-tags') || $('.product-tags')).innerHTML = item.tags.map(tag => `<span>${tag}</span>`).join('');
    setText('#product-price-value', formatPrice(item.price));
    setText('#product-price-note', item.illustrative ? 'Ilustračná cena konceptu' : 'Odporúčaná cena z prezentácie');
    $('#installment-info').hidden = item.illustrative;
    setText('#installment-label', '12 × 83,25 €');
    const rows = item.illustrative ? [['Model', item.name], ['Stav produktu', 'Ilustračný koncept'], ['Technické parametre', 'Vo vývoji'], ['Zobrazená cena', 'Ilustračná']] : [['Celkový objem', '600 litrov'], ['Kompresor', 'Invertorový'], ['Smart pripojenie', 'Wi‑Fi a mobilná aplikácia'], ['Povrch', 'Nerez odolný voči odtlačkom'], ['Energetická trieda*', 'A+++']];
    ($('#product-params') || $('.spec-list')).innerHTML = rows.map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join('');
    const paramsNote = $('#product-params-note') || $('#tab-parameters .fine-print');
    if (paramsNote) paramsNote.textContent = item.illustrative ? 'Model a jeho cena sú ilustračným rozšírením ponuky. Objem, rozmery, energetická trieda a ďalšie technické parametre zatiaľ nie sú určené.' : '*Označenie uvedené v dodanej prezentácii. Aktuálny energetický štítok ani rozmery nie sú v podkladoch uvedené.';
    $('#tab-delivery').innerHTML = item.illustrative ? '<p>Možnosti a cena dopravy, inštalácie či výkupu pre tento ilustračný model zatiaľ nie sú určené.</p><p>Objednávkový proces slúži iba na vyskúšanie e-shopu.</p>' : '<p>Produktový koncept počíta s doručením do 48 hodín, vynesením a inštaláciou prostredníctvom vlastnej logistiky.</p><p>Možný je aj výkup starého spotrebiča. Cena dopravy, dostupnosť a podmienky výkupu sa musia potvrdiť pred skutočným nákupom.</p>';
    $('#tab-warranty').innerHTML = item.illustrative ? '<p>Záručné a servisné podmienky tohto ilustračného modelu zatiaľ nie sú určené.</p><p>10-ročná záruka na kompresor z pôvodnej prezentácie sa týka modelu Kryštál 600.</p>' : '<p>Prezentácia uvádza 10-ročnú záruku na kompresor a dostupnosť servisnej linky a technikov do 24 hodín.</p><p>Konkrétne záručné a servisné podmienky nie sú súčasťou podkladov. Rozšírená záruka sa vzťahuje na kompresor.</p>';
    $('.purchase-note').innerHTML = `${icon('check')}${item.illustrative ? 'Ilustračný model a cena. Ukážkový nákup bez platby.' : 'Ukážkový nákup podľa produktového konceptu.'}`;
    setText('.color-picker strong', item.illustrative ? 'Nerezový vzhľad konceptu' : 'Nerezová oceľ');
    $('.color-swatch')?.setAttribute('aria-label', item.illustrative ? 'Ilustračný nerezový vzhľad' : 'Nerezová oceľ');
    const visual = $('#gallery-visual') || $('.gallery-main');
    const preview = $('#gallery-model-preview');
    [visual, preview].filter(Boolean).forEach(el => {
      el.classList.toggle('variant-mini', id === 'mini');
      el.classList.toggle('variant-family', id === 'family');
      el.classList.toggle('variant-krystal', id === 'krystal');
    });
    if (preview) { preview.hidden = !item.illustrative; preview.setAttribute('aria-label', `Ilustračný dizajn: ${item.name}`); }
    $('#product-image').hidden = item.illustrative;
    $('.gallery-thumbs').hidden = item.illustrative;
    $('#expand-gallery').hidden = item.illustrative;
    setText('.gallery-label', item.illustrative ? `${item.short.toUpperCase()} / DIZAJNOVÝ KONCEPT` : 'KRYŠTÁL 600 / NEREZ');
    setText('#active-product-caption', item.illustrative ? `Ilustračný dizajn modelu ${item.short}` : 'Originálny vizuál z produktovej prezentácie');
    setText('#mobile-product-name', item.short);
    setText('#mobile-product-price', formatPrice(item.price));
    updateProductQuantity();
    window.Mrazik3D?.setVariant?.(id);
    document.dispatchEvent(new CustomEvent('mrazik:variant', { detail: { id } }));
    return true;
  }
  window.MrazikShop = Object.freeze({ selectVariant, getVariant: () => selectedVariant, variants });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-select-variant]');
    if (!button) return;
    if (button.tagName === 'A') event.preventDefault();
    if (!selectVariant(button.dataset.selectVariant)) return;
    const scrollTarget = button.hasAttribute('data-scroll-3d') ? $('#vizualizacia') : button.hasAttribute('data-scroll-product') ? $('#produkt') : null;
    scrollTarget?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });

  $('[data-qty-minus]').addEventListener('click', () => {
    productQuantity = Math.max(1, productQuantity - 1);
    updateProductQuantity();
  });
  $('[data-qty-plus]').addEventListener('click', () => {
    productQuantity = Math.min(MAX_QUANTITY, productQuantity + 1);
    updateProductQuantity();
  });
  $('#add-to-cart').addEventListener('click', () => {
    const previous = cart[selectedVariant] || 0;
    cart[selectedVariant] = Math.min(MAX_QUANTITY, previous + productQuantity);
    updateCart();
    openDialog(cartDialog);
    if (cart[selectedVariant] === previous) toast('V ukážke môžete vložiť najviac 9 kusov z každého modelu.');
  });
  $$('[data-open-cart]').forEach(el => el.addEventListener('click', () => openDialog(cartDialog)));

  cartDialog.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.matches('[data-close-cart]')) cartDialog.close();
    if (target.matches('[data-cart-browse]')) {
      cartDialog.close();
      ($('#modely') || $('#produkt')).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    if (target.matches('[data-cart-minus], [data-cart-plus]')) {
      const id = target.dataset.cartId;
      if (!Object.hasOwn(variants, id) || !cart[id]) return;
      const action = target.matches('[data-cart-minus]') ? 'minus' : 'plus';
      cart[id] = Math.max(1, Math.min(MAX_QUANTITY, cart[id] + (action === 'minus' ? -1 : 1)));
      updateCart();
      const button = $(`[data-cart-${action}][data-cart-id="${id}"]`, cartDialog);
      (button.disabled ? $(`[data-cart-remove][data-cart-id="${id}"]`, cartDialog) : button).focus();
    }
    if (target.matches('[data-cart-remove]')) {
      const id = target.dataset.cartId;
      if (!Object.hasOwn(variants, id)) return;
      delete cart[id];
      updateCart();
      ($('[data-cart-remove]', cartDialog) || $('[data-cart-browse]', cartDialog)).focus();
    }
    if (target.matches('[data-checkout]') && cartCount()) {
      cartDialog.close();
      $('#checkout-body').innerHTML = checkoutTemplate;
      const items = $('#checkout-items');
      if (items) items.innerHTML = checkoutLinesMarkup(cartLines());
      setText('#checkout-quantity', `${cartCount()} ks`);
      $('#checkout-total').textContent = formatPrice(cartTotal());
      openDialog(checkoutDialog);
    }
  });

  function checkoutLinesMarkup(lines) {
    return lines.map(item => `<div class="checkout-line"><span class="checkout-line-copy">${item.quantity} × ${item.name}${item.illustrative ? '<small>Ilustračná cena</small>' : ''}</span><strong>${formatPrice(item.price * item.quantity)}</strong></div>`).join('');
  }

  $('[data-close-checkout]').addEventListener('click', () => checkoutDialog.close());
  checkoutDialog.addEventListener('close', () => {
    const form = $('#checkout-form');
    if (form) form.reset();
  });
  checkoutDialog.addEventListener('submit', event => {
    if (event.target.id !== 'checkout-form') return;
    event.preventDefault();
    if (!event.target.reportValidity() || !cartCount()) return;
    const lines = cartLines();
    $('#checkout-body').innerHTML = `<div class="checkout-success"><div class="success-icon">${icon('check')}</div><h3>Takto jednoducho to môže ísť.</h3><p>Ukážku objednávky ste dokončili. Neodoslali sme objednávku ani platbu a údaje z formulára sa neuložili.</p><div class="success-items">${checkoutLinesMarkup(lines)}</div><p class="success-total">${formatPrice(cartTotal(lines))} za tovar</p>${hasIllustrativePrices(lines) ? '<p>Ceny modelov Mini a Family Large sú ilustračné.</p>' : ''}<p>Doprava a podmienky nákupu by sa pri skutočnej objednávke museli potvrdiť.</p><button class="button primary" data-finish-demo>Späť na e-shop ${icon('arrow')}</button></div>`;
    cart = {};
    updateCart();
    $('[data-finish-demo]').focus();
  });
  checkoutDialog.addEventListener('click', event => {
    if (event.target.closest('[data-finish-demo]')) checkoutDialog.close();
  });

  const tabs = $$('[role=tab]');
  function activateTab(tab, focus = false) {
    tabs.forEach(el => {
      const active = el === tab;
      el.setAttribute('aria-selected', String(active));
      el.tabIndex = active ? 0 : -1;
      $(`#${el.getAttribute('aria-controls')}`).hidden = !active;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activateTab(tabs[next], true); }
    });
  });

  $$('.thumb').forEach(thumb => thumb.addEventListener('click', () => {
    if (selectedVariant !== 'krystal') return;
    $$('.thumb').forEach(el => {
      el.classList.toggle('selected', el === thumb);
      el.setAttribute('aria-pressed', String(el === thumb));
    });
    $('#product-image').src = thumb.dataset.image;
    $('#product-image').alt = thumb.dataset.alt;
  }));
  $('#expand-gallery').addEventListener('click', () => {
    if (selectedVariant !== 'krystal') return;
    $('#large-image').src = $('#product-image').getAttribute('src');
    $('#large-image').alt = $('#product-image').alt;
    openDialog(galleryDialog);
  });
  $('[data-close-gallery]').addEventListener('click', () => galleryDialog.close());

  const info = {
    installments: { title: 'Splátky bez úrokov', body: '<p>Produktová prezentácia navrhuje pri modeli Kryštál 600 dvanásť mesačných splátok bez úrokov.</p><p><strong>12 × 83,25 € = 999 €</strong> za jeden Kryštál 600.</p><p>Ide o súčasť produktového konceptu. Financujúca spoločnosť a záväzné podmienky nie sú určené. Tento web financovanie neposkytuje. Splátky modelov Mini a Family Large nie sú stanovené.</p>' },
    about: { title: 'O projekte MRÁZIK', body: '<p>Tento web je ukážkový e-shop značky MRÁZIK. Model Kryštál 600 vychádza z dodanej prezentácie marketingového mixu. Jeho pôvodné fotografie, cena a vlastnosti pochádzajú z prezentácie.</p><p>Mini a Family Large sú ilustračné dizajnové koncepty. Ich ceny 499 € a 1 399 € sú ilustračné, technické parametre zatiaľ nie sú určené.</p><p>3D modely ilustrujú dizajn a otváranie dverí. Nezobrazujú overené rozmery ani technickú konštrukciu skutočného spotrebiča.</p><p>Doprava, splátky, výkup a servis pri Kryštále 600 predstavujú navrhnuté služby konceptu. Košík a objednávkový formulár ukazujú priebeh nákupu. Skutočné objednávky ani platby sa neprijímajú.</p>' },
    privacy: { title: 'Vaše súkromie', body: '<p>V tomto prehliadači si uchovávame iba zvolené modely a ich počty v košíku, aby zostali zachované po obnovení stránky. Odstránením položiek košík vyprázdnite.</p><p>Údaje z objednávkového formulára sa neukladajú do úložiska a neposielajú na server. Po zatvorení alebo dokončení ukážky sa odstránia z formulára.</p><p>Stránka nepoužíva analytiku ani reklamné nástroje. Písmo sa načítava zo služby Google Fonts.</p>' }
  };
  function showInfo(type) {
    if (!Object.hasOwn(info, type)) return;
    $('#info-title').textContent = info[type].title;
    $('#info-content').innerHTML = info[type].body;
    openDialog(infoDialog);
  }
  $('#installment-info').addEventListener('click', () => { if (selectedVariant === 'krystal') showInfo('installments'); });
  $$('[data-info]').forEach(el => el.addEventListener('click', () => showInfo(el.dataset.info)));
  $('[data-close-info]').addEventListener('click', () => infoDialog.close());

  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  const menuToggle = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');
  function closeMenu() { mobileMenu.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Otvoriť menu'); }
  menuToggle.addEventListener('click', () => {
    mobileMenu.hidden = !mobileMenu.hidden;
    menuToggle.setAttribute('aria-expanded', String(!mobileMenu.hidden));
    menuToggle.setAttribute('aria-label', mobileMenu.hidden ? 'Otvoriť menu' : 'Zavrieť menu');
  });
  $$('a', mobileMenu).forEach(el => el.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('js-reveal');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('pending-reveal'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    $$('.reveal').forEach(el => {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('pending-reveal'); observer.observe(el); }
    });
  }
  $('#year').textContent = String(new Date().getFullYear());
  selectVariant('krystal');
  updateCart();
})();
