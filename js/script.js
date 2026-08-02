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

  const sendLead = async ({ phone, source }) => {
    const response = await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        source,
        site: SITE_NAME,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.success !== true) {
      throw new Error('Lead request failed');
    }

    return data;
  };

  const bindPhoneMask = (input) => {
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

    input.addEventListener('input', () => {
      const caret = input.selectionStart || 0;
      const editableBefore = countEditableBefore(input.value, caret);
      applyPhoneValue(input, input.value, editableBefore);
    });

    input.addEventListener('paste', (event) => {
      event.preventDefault();

      const pasted = (event.clipboardData || window.clipboardData).getData('text');
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const digits = getEditableDigits(input.value);
      const pastedDigits = getEditableDigits(pasted);
      const editableBefore = countEditableBefore(input.value, start);
      const editableAfter = countEditableBefore(input.value, end);
      const next = (digits.slice(0, editableBefore) + pastedDigits + digits.slice(editableAfter)).slice(0, 9);

      applyPhoneValue(input, next, Math.min(next.length, editableBefore + pastedDigits.length));
    });
  };

  const modal = document.getElementById('audit-modal');
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

      form.dataset.submitting = 'true';
      setSubmitLoading(submitButton, true);

      try {
        await sendLead({
          phone: toApiPhone(phone),
          source,
        });

        resetPhoneInput(input);

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
      } finally {
        form.dataset.submitting = 'false';
        setSubmitLoading(submitButton, false);
      }
    });
  });
})();
