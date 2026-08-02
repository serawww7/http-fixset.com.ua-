(() => {
  'use strict';

  const PREFIX = '(0';
  const PREFIX_CARET = 2;

  const getPhoneDigits = (value) => {
    let digits = String(value || '').replace(/\D/g, '');

    if (digits.startsWith('380')) {
      digits = '0' + digits.slice(3);
    } else if (digits.startsWith('38')) {
      digits = digits.slice(2);
      if (digits.length === 9 && !digits.startsWith('0')) {
        digits = '0' + digits;
      }
    }

    return digits.slice(0, 10);
  };

  const formatUaPhone = (value) => {
    const digits = getPhoneDigits(value);

    if (!digits.length) {
      return '';
    }

    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 8);
    const p4 = digits.slice(8, 10);

    let result = '(' + p1;

    if (digits.length >= 3) {
      result += ')';
    }

    if (p2) {
      result += ' ' + p2;
    }

    if (digits.length >= 6) {
      result += '-';
    }

    if (p3) {
      result += p3;
    }

    if (digits.length >= 8) {
      result += '-';
    }

    if (p4) {
      result += p4;
    }

    return result;
  };

  const countDigitsBefore = (value, caret) =>
    String(value || '')
      .slice(0, Math.max(0, caret || 0))
      .replace(/\D/g, '').length;

  const setCaretByDigitIndex = (input, digitIndex) => {
    if (digitIndex <= 0) {
      input.setSelectionRange(0, 0);
      return;
    }

    const value = input.value;
    let seen = 0;

    for (let i = 0; i < value.length; i += 1) {
      if (/\d/.test(value[i])) {
        seen += 1;
        if (seen >= digitIndex) {
          input.setSelectionRange(i + 1, i + 1);
          return;
        }
      }
    }

    input.setSelectionRange(value.length, value.length);
  };

  const applyPhoneValue = (input, rawValue, digitCaretIndex) => {
    input.value = formatUaPhone(rawValue);
    setCaretByDigitIndex(input, digitCaretIndex);
    input.classList.remove('is-invalid');
  };

  const ensurePhonePrefix = (input) => {
    if (getPhoneDigits(input.value).length === 0) {
      input.value = PREFIX;
    }
  };

  const placeCaretAfterPrefix = (input) => {
    if (input.value.startsWith(PREFIX)) {
      input.setSelectionRange(PREFIX_CARET, PREFIX_CARET);
    }
  };

  const isValidPhone = (value) => getPhoneDigits(value).length === 10;

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

  const bindPhoneMask = (input) => {
    input.addEventListener('focus', () => {
      ensurePhonePrefix(input);
      if (input.value === PREFIX) {
        requestAnimationFrame(() => placeCaretAfterPrefix(input));
      }
    });

    input.addEventListener('keydown', (event) => {
      const allowedKeys = [
        'Backspace',
        'Delete',
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

      if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (!/^\d$/.test(event.key)) {
        event.preventDefault();
      }
    });

    input.addEventListener('beforeinput', (event) => {
      if (event.inputType === 'insertText' && event.data && /\D/.test(event.data)) {
        event.preventDefault();
      }
    });

    input.addEventListener('input', () => {
      const caret = input.selectionStart || 0;
      const digitsBeforeCaret = countDigitsBefore(input.value, caret);
      applyPhoneValue(input, input.value, digitsBeforeCaret);
    });

    input.addEventListener('paste', (event) => {
      event.preventDefault();

      const pasted = (event.clipboardData || window.clipboardData).getData('text');
      const selectionStart = input.selectionStart || 0;
      const selectionEnd = input.selectionEnd || 0;
      const nextRaw =
        input.value.slice(0, selectionStart) + pasted + input.value.slice(selectionEnd);
      const digitCaretIndex =
        countDigitsBefore(input.value, selectionStart) + getPhoneDigits(pasted).length;

      applyPhoneValue(input, nextRaw, digitCaretIndex);
    });
  };

  const modal = document.getElementById('audit-modal');
  const modalForm = modal ? modal.querySelector('[data-audit-modal-form]') : null;
  const modalPhone = modalForm ? modalForm.querySelector('input[name="phone"]') : null;

  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('audit-modal-open');
    if (modalPhone) {
      ensurePhonePrefix(modalPhone);
      modalPhone.focus();
      placeCaretAfterPrefix(modalPhone);
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
      if (modalPhone) {
        modalPhone.classList.remove('is-invalid');
      }
    }
  };

  document.querySelectorAll('[data-open-audit-modal]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openModal();
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
    if (input) {
      bindPhoneMask(input);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!input) return;

      const phone = input.value.trim();
      const isModalForm = form.hasAttribute('data-audit-modal-form');

      if (!phone || getPhoneDigits(phone).length <= 1) {
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
      showMessage(form, 'Дякуємо! Ми звʼяжемося з вами найближчим часом.', 'success');
      form.reset();

      if (isModalForm) {
        closeModal();
      }
    });
  });
})();
