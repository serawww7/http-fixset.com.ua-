(() => {
  'use strict';

  const THEME_KEY = 'fixset-theme';
  const THEMES = {
    'theme-1': 'css/theme-1.css',
    'theme-2': 'css/theme-2.css',
    'theme-3': 'css/theme-3.css',
    'theme-4': 'css/theme-4.css',
    'theme-5': 'css/theme-5.css',
  };

  const themeLink = document.querySelector('#theme-css');
  const themeButtons = document.querySelectorAll('[data-theme]');

  const getSavedTheme = () => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return THEMES[saved] ? saved : 'theme-1';
    } catch (error) {
      return 'theme-1';
    }
  };

  const setActiveButtons = (themeId) => {
    themeButtons.forEach((button) => {
      const isActive = button.getAttribute('data-theme') === themeId;
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const applyTheme = (themeId, persist) => {
    if (!themeLink || !THEMES[themeId]) return;

    themeLink.setAttribute('href', THEMES[themeId]);
    setActiveButtons(themeId);

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, themeId);
      } catch (error) {
        /* ignore quota / private mode */
      }
    }
  };

  if (themeLink && themeButtons.length) {
    applyTheme(getSavedTheme(), false);

    themeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        applyTheme(button.getAttribute('data-theme'), true);
      });
    });
  }

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
