(() => {
  'use strict';

  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('#site-nav');
  const navLinks = siteNav ? siteNav.querySelectorAll('a') : [];

  const setNavOpen = (isOpen) => {
    if (!navToggle || !siteNav) return;

    siteNav.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute(
      'aria-label',
      isOpen ? 'Закрити меню' : 'Відкрити меню'
    );
  };

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = !siteNav.classList.contains('is-open');
      setNavOpen(isOpen);
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => setNavOpen(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setNavOpen(false);
    });
  }

  const isValidPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  };

  const showMessage = (form, text, type) => {
    const message = form.querySelector('.lead-form__message');
    if (!message) return;

    message.hidden = false;
    message.textContent = text;
    message.classList.remove('is-error', 'is-success');
    message.classList.add(type === 'error' ? 'is-error' : 'is-success');
  };

  const forms = document.querySelectorAll('[data-lead-form]');

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const input = form.querySelector('input[name="phone"]');
      if (!input) return;

      const phone = input.value.trim();

      if (!phone) {
        input.classList.add('is-invalid');
        showMessage(form, 'Вкажіть номер телефону.', 'error');
        input.focus();
        return;
      }

      if (!isValidPhone(phone)) {
        input.classList.add('is-invalid');
        showMessage(form, 'Введіть коректний номер телефону.', 'error');
        input.focus();
        return;
      }

      input.classList.remove('is-invalid');
      showMessage(
        form,
        'Дякуємо! Ми звʼяжемося з вами найближчим часом.',
        'success'
      );
      form.reset();
    });

    const input = form.querySelector('input[name="phone"]');
    if (input) {
      input.addEventListener('input', () => {
        input.classList.remove('is-invalid');
      });
    }
  });
})();
