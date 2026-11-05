(function () {
  'use strict';

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Mobile navigation
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Analytics events (only fire when GA4 is loaded, i.e. on production)
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="tel:"]');
    if (link) track('click_to_call', { link_url: link.getAttribute('href') });
  });

  // Contact form (Web3Forms)
  var form = document.getElementById('contact-form');
  if (!form) return;

  var PHONE = '(417) 543-3431';
  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');
  var key = form.getAttribute('data-access-key') || '';

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  // The access key is only inserted by the production deploy. Anywhere else
  // (staging, local preview) the placeholder remains and the form is disabled.
  if (!/^[0-9a-f-]{36}$/i.test(key)) {
    button.disabled = true;
    button.textContent = 'Form disabled in preview';
    setStatus('This contact form is disabled on the staging/preview site. Please call ' + PHONE + '.', 'note');
    return;
  }
  form.querySelector('input[name="access_key"]').value = key;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var invalid = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var bad = !el.value.trim() || (el.type === 'email' && !el.checkValidity());
      el.classList.toggle('invalid', bad);
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad && !invalid) invalid = el;
    });
    if (invalid) {
      setStatus('Please complete the required fields.', 'err');
      invalid.focus();
      return;
    }

    // Honeypot tripped: pretend success, send nothing.
    if (form.querySelector('input[name="botcheck"]').checked) {
      form.reset();
      setStatus('Thank you! Your message has been sent.', 'ok');
      return;
    }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    data.subject = 'Website inquiry from ' + data.name + (data.company ? ' (' + data.company + ')' : '');

    button.disabled = true;
    var label = button.textContent;
    button.textContent = 'Sending…';
    setStatus('', '');

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, body: j }; }); })
      .then(function (r) {
        if (r.ok && r.body.success) {
          form.reset();
          setStatus('Thank you! Your message has been sent. We will be in touch soon.', 'ok');
          track('generate_lead', { form_id: 'contact-form' });
        } else {
          throw new Error(r.body.message || 'Submission failed');
        }
      })
      .catch(function () {
        setStatus('Sorry, your message could not be sent. Please call us at ' + PHONE + '.', 'err');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = label;
      });
  });
})();
