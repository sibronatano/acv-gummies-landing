// ── AOS (Animate on Scroll) ────────────────────────────────
(function initAOS() {
  const els = document.querySelectorAll('[data-aos]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.aosDelay || 0);
        setTimeout(() => e.target.classList.add('aos-animate'), delay);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => observer.observe(el));
})();

// ── COUNTDOWN TIMER ────────────────────────────────────────
(function initCountdown() {
  // Set 12 hours from page load
  let total = 12 * 60 * 60;
  const stored = sessionStorage.getItem('cdEnd');
  let endTime;
  if (stored) {
    endTime = parseInt(stored);
  } else {
    endTime = Date.now() + total * 1000;
    sessionStorage.setItem('cdEnd', endTime);
  }

  function update() {
    const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('cd-hours').textContent = pad(h);
    document.getElementById('cd-mins').textContent = pad(m);
    document.getElementById('cd-secs').textContent = pad(s);
    if (diff > 0) setTimeout(update, 1000);
  }
  update();
})();

// ── STOCK COUNTDOWN ────────────────────────────────────────
(function initStock() {
  let stock = parseInt(sessionStorage.getItem('stock') || '17');
  const el = document.getElementById('stock-count');
  if (!el) return;
  el.textContent = stock;
  // Slowly decrement every ~30 seconds to create urgency
  setInterval(() => {
    if (stock > 3) {
      stock--;
      sessionStorage.setItem('stock', stock);
      el.textContent = stock;
    }
  }, 30000);
})();

// ── URGENCY BAR ────────────────────────────────────────────
(function initUrgency() {
  const fill = document.getElementById('urgency-fill');
  const sold = document.getElementById('sold-count');
  if (!fill || !sold) return;
  // Slowly increase sold count
  let pct = 83;
  setInterval(() => {
    if (pct < 97) {
      pct += 1;
      fill.style.width = pct + '%';
      sold.textContent = pct;
    }
  }, 45000);
})();

// ── STICKY CTA ─────────────────────────────────────────────
(function initStickyCta() {
  const hero = document.getElementById('hero');
  const cta = document.getElementById('stickyCta');
  if (!hero || !cta) return;

  // Only show on mobile
  const mq = window.matchMedia('(max-width: 768px)');
  if (!mq.matches) return;

  const observer = new IntersectionObserver(([e]) => {
    cta.style.display = e.isIntersecting ? 'none' : 'block';
  }, { threshold: 0.1 });
  observer.observe(hero);
})();

// ── FAQ TOGGLE ─────────────────────────────────────────────
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ── ORDER FORM ─────────────────────────────────────────────
async function submitOrder(e) {
  e.preventDefault();
  const form = document.getElementById('orderForm');
  const btn = document.getElementById('submitBtn');

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const city = document.getElementById('city').value;
  const qtyEl = form.querySelector('input[name="quantity"]:checked');

  if (!qtyEl) {
    showAlert('يرجى اختيار الكمية', 'error');
    return;
  }

  // Basic phone validation
  if (!/^05\d{8}$/.test(phone)) {
    showAlert('يرجى إدخال رقم جوال سعودي صحيح (مثال: 0512345678)', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ جارٍ إرسال الطلب...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, city, quantity: qtyEl.value })
    });
    const data = await res.json();

    if (data.success) {
      form.style.display = 'none';
      document.getElementById('successMsg').style.display = 'block';
      // Smooth scroll to success
      document.getElementById('successMsg').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showAlert(data.message || 'حدث خطأ، يرجى المحاولة لاحقاً', 'error');
      btn.disabled = false;
      btn.textContent = '✅ تأكيد الطلب – الدفع عند الاستلام';
    }
  } catch {
    showAlert('خطأ في الاتصال، يرجى المحاولة مجدداً', 'error');
    btn.disabled = false;
    btn.textContent = '✅ تأكيد الطلب – الدفع عند الاستلام';
  }
}

// ── HELPER: ALERT ──────────────────────────────────────────
function showAlert(msg, type) {
  const existing = document.getElementById('customAlert');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'customAlert';
  el.style.cssText = `
    position:fixed; top:80px; left:50%; transform:translateX(-50%);
    background:${type === 'error' ? '#e53e3e' : '#2d8c4e'};
    color:#fff; padding:14px 28px; border-radius:10px;
    font-family:'Tajawal',sans-serif; font-size:1rem; font-weight:600;
    z-index:9999; box-shadow:0 8px 24px rgba(0,0,0,0.2);
    animation: slideDown 0.3s ease;
    direction: rtl; text-align: center;
  `;
  el.textContent = msg;
  document.body.appendChild(el);

  const style = document.createElement('style');
  style.textContent = '@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }';
  document.head.appendChild(style);

  setTimeout(() => el.remove(), 4000);
}

// ── SMOOTH SCROLL for all anchor links ─────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
