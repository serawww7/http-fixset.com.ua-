(() => {
  'use strict';

  const MASK_BASE = '(0';
  const BASE_CARET = 2;

  const getEditableDigits = (value) => {
    let digits = String(value || '').replace(/\D/g, '');

    if (digits.startsWith('380')) {
      digits = digits.slice(3);
    } else if (digits.startsWith('38')) {
      digits = digits.slice(2);
    }

    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    return digits.slice(0, 9);
  };

  const formatUaPhone = (value) => {
    const d = getEditableDigits(value);

    if (!d.length) {
      return MASK_BASE;
    }

    let result = '(0';

    result += d.slice(0, 2);
    result += ')';

    if (d.length > 2) {
      result += ' ' + d.slice(2, 5);
    }

    if (d.length > 5) {
      result += '-' + d.slice(5, 7);
    }

    if (d.length > 7) {
      result += '-' + d.slice(7, 9);
    }

    return result;
  };

  const countEditableBefore = (value, caret) => {
    let editableSeen = 0;
    let passedFixedZero = false;
    const limit = Math.max(0, caret || 0);
    const str = String(value || '');

    for (let i = 0; i < limit && i < str.length; i += 1) {
      if (!/\d/.test(str[i])) continue;

      if (!passedFixedZero) {
        passedFixedZero = true;
        continue;
      }

      editableSeen += 1;
    }

    return editableSeen;
  };

  const setCaretByEditableIndex = (input, editableIndex) => {
    const value = input.value;
    const target = Math.max(0, Math.min(9, editableIndex || 0));

    if (target === 0) {
      input.setSelectionRange(BASE_CARET, BASE_CARET);
      return;
    }

    let editableSeen = 0;
    let passedFixedZero = false;

    for (let i = 0; i < value.length; i += 1) {
      if (!/\d/.test(value[i])) continue;

      if (!passedFixedZero) {
        passedFixedZero = true;
        continue;
      }

      editableSeen += 1;
      if (editableSeen >= target) {
        input.setSelectionRange(i + 1, i + 1);
        return;
      }
    }

    input.setSelectionRange(value.length, value.length);
  };

  const syncPhoneFieldState = (input) => {
    const field = input.closest('.phone-field');
    if (!field) return;
    field.classList.toggle('is-filled', getEditableDigits(input.value).length > 0);
  };

  const applyPhoneValue = (input, rawValue, editableCaretIndex) => {
    input.value = formatUaPhone(rawValue);
    setCaretByEditableIndex(input, editableCaretIndex);
    input.classList.remove('is-invalid');
    syncPhoneFieldState(input);
  };

  const ensurePhoneMask = (input) => {
    input.value = formatUaPhone(input.value);
    syncPhoneFieldState(input);
  };

  const placeCaretAtBase = (input) => {
    input.setSelectionRange(BASE_CARET, BASE_CARET);
  };

  const isValidPhone = (value) => getEditableDigits(value).length === 9;

  const showMessage = (form, text, type) => {
    const message = form.querySelector('.lead-form__message');
    if (!message) return;
    message.hidden = false;
    message.textContent = text;
    message.classList.remove('is-error', 'is-success');
    message.classList.add(type === 'error' ? 'is-error' : 'is-success');
  };

  const clearMessage = (form) => {
    const message = form.querySelector('.lead-form__message');
    if (!message) return;
    message.hidden = true;
    message.textContent = '';
    message.classList.remove('is-error', 'is-success');
  };

  const LEAD_ENDPOINT = 'https://fixset-api.serawww.workers.dev/lead';
  const SITE_NAME = 'fixset.com.ua';
  const SUCCESS_MESSAGE = 'Дякуємо! Ми скоро зателефонуємо.';
  const ERROR_MESSAGE = 'Не вдалося відправити заявку. Спробуйте ще раз.';
  const TOAST_MESSAGE =
    '✅ Ваш номер успішно відправлено.\nНаш менеджер зв\'яжеться з вами найближчим робочим часом.';
  const TOAST_DURATION_MS = 4000;

  let toastHideTimer = null;
  let toastRemoveTimer = null;

  const getSuccessToast = () => {
    let toast = document.getElementById('lead-success-toast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'lead-success-toast';
    toast.className = 'lead-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML =
      '<span class="lead-toast__icon" aria-hidden="true">✓</span>' +
      '<p class="lead-toast__text"></p>';
    document.body.appendChild(toast);
    return toast;
  };

  const showSuccessToast = () => {
    const toast = getSuccessToast();
    const textEl = toast.querySelector('.lead-toast__text');
    if (textEl) textEl.textContent = TOAST_MESSAGE;

    clearTimeout(toastHideTimer);
    clearTimeout(toastRemoveTimer);

    toast.hidden = false;
    toast.classList.remove('is-visible');
    void toast.offsetWidth;
    toast.classList.add('is-visible');

    toastHideTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      toastRemoveTimer = setTimeout(() => {
        toast.hidden = true;
      }, 320);
    }, TOAST_DURATION_MS);
  };

  const toApiPhone = (value) => `+380${getEditableDigits(value)}`;

  const resetPhoneInput = (input) => {
    if (!input) return;
    input.classList.remove('is-invalid');
    input.value = MASK_BASE;
    syncPhoneFieldState(input);
  };

  const setSubmitLoading = (button, isLoading) => {
    if (!button) return;

    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      button.disabled = true;
      button.textContent = 'Відправлення...';
      return;
    }

    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
    delete button.dataset.originalText;
  };

  const sendLead = async ({ phone, source, contact_method, turnstile_token }) => {
    const response = await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        source,
        site: SITE_NAME,
        contact_method,
        turnstile_token,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.success !== true) {
      throw new Error('Lead request failed');
    }

    return data;
  };

  const getTurnstileToken = (form) => {
    const input = form.querySelector('[name="cf-turnstile-response"]');
    return input && typeof input.value === 'string' ? input.value.trim() : '';
  };

  const resetTurnstile = (form) => {
    const widget = form.querySelector('.cf-turnstile');
    if (!widget || !window.turnstile || typeof window.turnstile.reset !== 'function') {
      return;
    }
    window.turnstile.reset(widget);
  };

  const bindPhoneMask = (input) => {
    let pendingPaste = null;

    const clampCaret = () => {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;

      if (start === end && start < BASE_CARET) {
        input.setSelectionRange(BASE_CARET, BASE_CARET);
        return;
      }

      if (start < BASE_CARET) {
        input.setSelectionRange(BASE_CARET, Math.max(end, BASE_CARET));
      }
    };

    input.addEventListener('focus', () => {
      ensurePhoneMask(input);
      if (getEditableDigits(input.value).length === 0) {
        requestAnimationFrame(() => placeCaretAtBase(input));
      }
    });

    input.addEventListener('click', clampCaret);
    input.addEventListener('keyup', clampCaret);

    input.addEventListener('keydown', (event) => {
      const key = event.key;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const value = input.value;
      const digits = getEditableDigits(value);
      const editableBefore = countEditableBefore(value, start);
      const editableAfter = countEditableBefore(value, end);

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();

        if (start !== end) {
          const next = digits.slice(0, editableBefore) + digits.slice(editableAfter);
          applyPhoneValue(input, next, editableBefore);
          return;
        }

        if (editableBefore === 0) {
          placeCaretAtBase(input);
          return;
        }

        const next = digits.slice(0, editableBefore - 1) + digits.slice(editableBefore);
        applyPhoneValue(input, next, editableBefore - 1);
        return;
      }

      if (key === 'Delete') {
        event.preventDefault();

        if (start !== end) {
          const next = digits.slice(0, editableBefore) + digits.slice(editableAfter);
          applyPhoneValue(input, next, editableBefore);
          return;
        }

        if (editableBefore >= digits.length) {
          return;
        }

        const next = digits.slice(0, editableBefore) + digits.slice(editableBefore + 1);
        applyPhoneValue(input, next, editableBefore);
        return;
      }

      const navKeys = [
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ];

      if (navKeys.includes(key)) {
        return;
      }

      if (/^\d$/.test(key)) {
        event.preventDefault();

        let next = digits.slice(0, editableBefore) + key + digits.slice(editableAfter);
        next = next.slice(0, 9);

        if (next.length === digits.length && start === end && digits.length >= 9) {
          return;
        }

        applyPhoneValue(input, next, Math.min(editableBefore + 1, next.length));
        return;
      }

      event.preventDefault();
    });

    input.addEventListener('beforeinput', (event) => {
      if (event.inputType === 'insertText' && event.data && /\D/.test(event.data)) {
        event.preventDefault();
      }
    });

    input.addEventListener('paste', (event) => {
      const clipboard = event.clipboardData || window.clipboardData;
      if (!clipboard) return;

      const pasted = clipboard.getData('text');
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const digits = getEditableDigits(input.value);
      const pastedDigits = getEditableDigits(pasted);
      const editableBefore = countEditableBefore(input.value, start);
      const editableAfter = countEditableBefore(input.value, end);
      const next = (digits.slice(0, editableBefore) + pastedDigits + digits.slice(editableAfter)).slice(0, 9);

      pendingPaste = {
        next,
        caret: Math.min(next.length, editableBefore + pastedDigits.length),
      };

      setTimeout(() => {
        if (!pendingPaste) return;
        const pending = pendingPaste;
        pendingPaste = null;
        applyPhoneValue(input, pending.next, pending.caret);
      }, 0);
    });

    input.addEventListener('input', () => {
      if (pendingPaste) {
        const { next, caret } = pendingPaste;
        pendingPaste = null;
        applyPhoneValue(input, next, caret);
        return;
      }

      const caret = input.selectionStart || 0;
      const editableBefore = countEditableBefore(input.value, caret);
      applyPhoneValue(input, input.value, editableBefore);
    });
  };

  const modal = document.getElementById('audit-modal');
  const serviceModal = document.getElementById('service-modal');
  const serviceModalTitle = document.getElementById('service-modal-title');
  const serviceModalList = document.getElementById('service-modal-list');
  const serviceDetails = {
    'disk-diagnostics': {
      title: 'Миттєва діагностика дисків',
      items: ['Діагностика', 'Перевірка дисків', 'Відновлення після збоїв', 'Відновлення даних'],
    },
    backup: {
      title: 'Безпечне резервне копіювання',
      items: ['Резервне копіювання', 'Налаштування резервного копіювання'],
    },
    security: {
      title: 'Захист від шифрувальників',
      items: ['ESET', 'Zillya', 'Видалення вірусів', 'Видалення рекламного ПЗ', 'Видалення майнерів', 'Очищення системи', 'Захист від шифрувальників'],
    },
    'system-optimization': {
      title: 'Оптимізація систем',
      items: ['Оптимізація швидкодії', 'Модернізація', 'Заміна комплектуючих', 'Встановлення SSD', 'Перенесення Windows'],
    },
    peripherals: {
      title: 'Налаштування периферії',
      items: ['Підключення техніки', 'Підключення обладнання', 'Підключення по мережі', 'Підключення Wi‑Fi', 'Налаштування'],
    },
    'business-software': {
      title: 'Підтримка M.E.Doc, BAS, УкрСклад та інших програм',
      items: ['M.E.Doc', 'Кашалот ПРРО', 'КЕП', 'Windows', 'Microsoft Office', 'Драйвери', 'Спеціалізовані програми', 'Встановлення', 'Оновлення', 'Налаштування', 'Перенесення баз', 'Відновлення роботи', 'Консультації'],
    },
  };
  const modalForm = modal ? modal.querySelector('[data-audit-modal-form]') : null;
  const modalPhone = modalForm ? modalForm.querySelector('input[name="phone"]') : null;
  let modalSource = '';
  let modalMessageForm = null;

  const openModal = (options = {}) => {
    if (!modal) return;

    const {
      source = '',
      phoneValue = '',
      messageForm = null,
    } = options;

    modalSource = source;
    modalMessageForm = messageForm;

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('audit-modal-open');

    if (modalForm) {
      clearMessage(modalForm);
    }

    if (modalPhone) {
      applyPhoneValue(
        modalPhone,
        phoneValue || MASK_BASE,
        getEditableDigits(phoneValue).length,
      );
      modalPhone.focus();
      if (!getEditableDigits(modalPhone.value).length) {
        placeCaretAtBase(modalPhone);
      }
    }
  };

  const openServiceModal = (serviceId) => {
    const service = serviceDetails[serviceId];
    if (!serviceModal || !service) return;
    serviceModalTitle.textContent = service.title;
    serviceModalList.replaceChildren(...service.items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
    serviceModal.hidden = false;
    serviceModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('service-modal-open');
  };

  const closeServiceModal = () => {
    if (!serviceModal) return;
    serviceModal.hidden = true;
    serviceModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('service-modal-open');
  };

  document.querySelectorAll('[data-service]').forEach((trigger) => {
    trigger.addEventListener('click', () => openServiceModal(trigger.dataset.service));
  });
  document.querySelectorAll('[data-close-service-modal]').forEach((el) => {
    el.addEventListener('click', closeServiceModal);
  });

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('audit-modal-open');
    if (modalForm) {
      modalForm.reset();
      clearMessage(modalForm);
      resetPhoneInput(modalPhone);
    }
  };

  document.querySelectorAll('[data-open-audit-modal]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();

      const sourceForm = trigger.closest('[data-lead-form]');
      const sourcePhone = sourceForm
        ? sourceForm.querySelector('input[name="phone"]')
        : null;

      openModal({
        source: trigger.dataset.source || (sourceForm && sourceForm.dataset.source) || '',
        phoneValue: sourcePhone ? sourcePhone.value : '',
        messageForm: sourceForm,
      });
    });
  });

  document.querySelectorAll('[data-close-audit-modal]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && serviceModal && !serviceModal.hidden) {
      closeServiceModal();
      return;
    }
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });

  const forms = document.querySelectorAll('[data-lead-form]');

  forms.forEach((form) => {
    const input = form.querySelector('input[name="phone"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const isModalForm = form.hasAttribute('data-audit-modal-form');

    if (input) {
      bindPhoneMask(input);
      input.value = MASK_BASE;
      syncPhoneFieldState(input);
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!input || form.dataset.submitting === 'true') return;

      const phone = input.value.trim();

      if (!phone || getEditableDigits(phone).length === 0) {
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
      clearMessage(form);

      const source = isModalForm
        ? (modalSource || form.dataset.source || '')
        : (form.dataset.source || '');

      const selectedContact = form.querySelector('input[name="contact_method"]:checked');
      const contact_method = selectedContact ? selectedContact.value : 'phone';
      const turnstile_token = getTurnstileToken(form);

      if (!turnstile_token) {
        showMessage(form, 'Підтвердіть, що ви не робот.', 'error');
        return;
      }

      form.dataset.submitting = 'true';
      setSubmitLoading(submitButton, true);

      try {
        await sendLead({
          phone: toApiPhone(phone),
          source,
          contact_method,
          turnstile_token,
        });

        resetPhoneInput(input);
        resetTurnstile(form);
        showSuccessToast();

        if (isModalForm) {
          if (modalMessageForm) {
            const openerPhone = modalMessageForm.querySelector('input[name="phone"]');
            resetPhoneInput(openerPhone);
          }

          const thanksForm = modalMessageForm
            || document.querySelector('[data-lead-form]:not([data-audit-modal-form])');
          closeModal();
          if (thanksForm) {
            showMessage(thanksForm, SUCCESS_MESSAGE, 'success');
          }
        } else {
          showMessage(form, SUCCESS_MESSAGE, 'success');
        }
      } catch (error) {
        showMessage(form, ERROR_MESSAGE, 'error');
        resetTurnstile(form);
      } finally {
        form.dataset.submitting = 'false';
        setSubmitLoading(submitButton, false);
      }
    });
  });

  const revealItems = document.querySelectorAll('[data-reveal]');
  if (revealItems.length) {
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.18, rootMargin: '0px 0px -40px 0px' },
      );

      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add('is-visible'));
    }
  }
})();
