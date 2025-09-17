// <app-form-field
//   name="startTime"
//   label="Starttid"
//   for="startTime-input"          // optional; auto-linked if omitted
//   message="Ugyldigt tidspunkt"    // optional validation/help text
//   state="default"                 // "default" | "error" | "success" | "warning"
//   required                        // optional; adds * to label + aria-required
//   hidden-label                    // optional; keeps label for a11y but visually hides it
//   disabled                        // optional; dims content area visually
// >
//   <!-- Any focusable form control goes in the default slot -->
//   <time-picker id="startTime-input" use-native="auto"></time-picker>
// </app-form-field>
//
// ATTRIBUTES
// - name: identifier for events and analytics
// - label: the text for <label>
// - for: the id of the slotted control; if omitted we will try to find the first
//        focusable element in the slot, generate a stable id if missing, and set
//        the <label for> to that id.
// - message: text shown below the control; can be help text or validation error
// - state: visual + a11y state (default|error|success|warning). Controls aria-invalid
//          and styling. Default is "default".
// - required: when present, marks the field as required (adds * to label, sets aria-required)
// - hidden-label: visually hides the label (but keeps it available to screen readers)
// - disabled: when present, dims the field-area (does not disable the control itself)
//
// SLOTS
// - default: the form control (input/select/textarea/custom control)
//
// EVENTS
// (none custom) – this is a pure wrapper. Consumers should listen on the inner control.
//
// A11Y NOTES
// - The wrapper sets aria-invalid based on state="error" and wires label->control via "for".
// - The message is given an id and bound to the control via aria-describedby when present.
// - If we auto-generate an id for the slotted control, we set it on the element.
//
// KEYBOARD
// - No custom keyboard handling; focus management stays with the inner control.
//
// ----------------------------------------------------------------------------
// components/molecules/form-field/form-field.js
// -----------------------------------------------------------------------------
// Public API additions:
// - getValue(): any              -> value of the FIRST control in slot
// - getValues(): Record<string,any> -> map of { id|name: value } for ALL controls in slot
//
// Access from parent:
//   const fld = this.shadowRoot.getElementById('edit-congregation__official-name');
//   const one = fld.getValue();
//   const all = fld.getValues();
// -----------------------------------------------------------------------------
import { BaseComponent } from '/js/BaseComponent.js';

export class AppFormField extends BaseComponent {
  static get observedAttributes() {
    return ['name','label','for','message','state','required','hidden-label','disabled'];
  }

  /** private fields */
  #labelEl; #rowEl; #msgEl; #slot; #currentControl;
  #messageId; #cleanup = () => {};
  #lastControls = []; // cache af sidst fundne kontroller

  #rendering = true;

  get fieldState() { return (this.getAttribute('state') || 'default').toLowerCase(); }

  async render() {
    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/molecules/form-field/form-field-markup'),
      this.fetchWithCache('/components/molecules/form-field/form-field-styles')
    ]);

    // Shadow DOM
    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    // refs
    this.#labelEl = this.shadowRoot.querySelector('app-label');
    this.#rowEl = this.shadowRoot.querySelector('.row');
    this.#msgEl = this.shadowRoot.querySelector('.message');
    this.#slot = this.shadowRoot.querySelector('slot');

    this.#applyStaticAttrs();
    this.#wireSlot();
    this.#updateVisualState();

    this.#rendering = false;
  }

  attributeChangedCallback(name, _old, _val) {
    if (this.#rendering) return;

    switch (name) {
      case 'label':
      case 'required':
      case 'hidden-label':
        this.#applyLabel();
        break;
      case 'message':
      case 'state':
        this.#applyMessageAndA11y();
        this.#updateVisualState();
        break;
      case 'for':
        this.#linkLabelToControl();
        break;
    }
  }

  // ========== PUBLIC API ==========
  /** Returnerer værdien af første control i slottet */
  getValue() {
    const ctrl = this.#currentControl || this.#findFirstControl();
    return this.#readValue(ctrl);
  }

  /** Returnerer et map { key: value } for alle kontroller i slottet */
  getValues() {
    const controls = this.#lastControls.length ? this.#lastControls : this.#collectControls();
    const out = {};
    let auto = 0;
    for (const el of controls) {
      let key = el.getAttribute?.('name') || el.getAttribute?.('id');
      if (!key) key = `${(this.getAttribute('name') || 'field')}-${el.tagName.toLowerCase()}-${auto++}`;
      while (Object.prototype.hasOwnProperty.call(out, key)) key = `${key}_${auto++}`;
      out[key] = this.#readValue(el);
    }
    return out;
  }

  /** Sæt værdien af første control i slottet */
  setValue(value) {
    const controls = this.#lastControls.length ? this.#lastControls : this.#collectControls();

    if(controls.length)
      controls[0].setAttribute('value', value);
  }

  /** Modtager et map { key: value } og sætter værdien for alle kontroller i slottet */
  setValues(valueMap) {
    const controls = this.#lastControls.length ? this.#lastControls : this.#collectControls();

    Object.entries(valueMap).forEach(([ key, value ]) => {
      const ctrl = controls.find(x => x.id === key);

      if(ctrl)
        ctrl.setAttribute('value', value);
    });
  }

  // ========== internals ==========
  #applyStaticAttrs() {
    this.#applyLabel();
    this.#applyMessageAndA11y();
  }

  #applyLabel() {
    const labelText = this.getAttribute('label') ?? '';
    const required = this.hasAttribute('required');
    const hidden = this.hasAttribute('hidden-label');
    this.#labelEl.textContent = labelText + (required && labelText ? ' *' : '');
    this.#labelEl.classList.toggle('visually-hidden', !!hidden);
    this.#labelEl.setAttribute('aria-hidden', hidden ? 'false' : 'false');
    this.#labelEl.setAttribute('data-required', required ? 'true' : 'false');
    this.setAttribute('aria-required', required ? 'true' : 'false');
    this.#linkLabelToControl();
  }

  #applyMessageAndA11y() {
    const msg = this.getAttribute('message') ?? '';
    const hasMsg = !!msg;
    if (!this.#messageId) this.#messageId = `${this.getAttribute('name') || 'field'}-msg-${Math.random().toString(36).slice(2)}`;
    this.#msgEl.id = this.#messageId;
    this.#msgEl.textContent = msg;
    this.#msgEl.hidden = !hasMsg;

    const isError = this.fieldState === 'error';
    this.toggleAttribute('aria-invalid', isError);

    // Attach aria-describedby to the current control when message present
    if (this.#currentControl) {
      const prev = (this.#currentControl.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      const set = new Set(prev);
      if (hasMsg) set.add(this.#messageId); else set.delete(this.#messageId);
      const next = Array.from(set).join(' ');
      if (next) this.#currentControl.setAttribute('aria-describedby', next); else this.#currentControl.removeAttribute('aria-describedby');
    }
  }

  #updateVisualState() {
    const s = this.fieldState;
    this.#rowEl.dataset.state = s;
  }

  #wireSlot() {
    this.#cleanup();
    const onSlotChange = () => this.#onSlotChanged();
    this.#slot.addEventListener('slotchange', onSlotChange);
    this.#onSlotChanged();
    this.#cleanup = () => this.#slot?.removeEventListener('slotchange', onSlotChange);
  }

  #onSlotChanged() {
    const assigned = this.#slot.assignedElements({ flatten: true });
    const ctrl = this.#findFocusable(assigned);
    this.#currentControl = ctrl || null;
    this.#lastControls = this.#collectControlsFrom(assigned);
    this.#linkLabelToControl();
    this.#applyMessageAndA11y();
  }

  #findFocusable(list) {
    for (const el of list) {
      if (this.#isFocusable(el)) return el;
      const inner = el.shadowRoot?.querySelector(
        'input,select,textarea,button,[tabindex], time-picker, app-text, [contenteditable="true"]'
      );
      if (inner && this.#isFocusable(inner)) return inner;
    }
    return null;
  }

  #isFocusable(el) {
    if (!el) return false;
    const selector = 'input,select,textarea,button,[tabindex],app-time-picker,app-text,app-rich-select';
    return el.matches?.(selector) || false;
  }

  #linkLabelToControl() {
    const explicitId = this.getAttribute('for');
    let idToUse = explicitId;
    if (!idToUse && this.#currentControl) {
      idToUse = this.#currentControl.getAttribute('id');
      if (!idToUse) {
        idToUse = `${this.getAttribute('name') || 'field'}-ctl-${Math.random().toString(36).slice(2)}`;
        this.#currentControl.setAttribute('id', idToUse);
      }
    }
    if (idToUse) this.#labelEl.setAttribute('for', idToUse);
  }

  #findFirstControl() {
    const assigned = this.#slot?.assignedElements?.({ flatten: true }) || [];
    return this.#findFocusable(assigned);
  }

  #collectControls() {
    const assigned = this.#slot?.assignedElements?.({ flatten: true }) || [];
    return this.#collectControlsFrom(assigned);
  }

  #collectControlsFrom(nodes) {
    const out = [];
    for (const el of nodes) {
      if (this.#isFocusable(el)) out.push(el);
      // kig ind i shadow-root på custom controls (typiske input/select/textarea)
      const inner = el.shadowRoot?.querySelectorAll?.('input,select,textarea');
      if (inner?.length) inner.forEach(n => { if (this.#isFocusable(n)) out.push(n); });
    }
    return out;
  }

  #readValue(el) {
    if (!el) return undefined;
    // 1) native
    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox') return !!el.checked;
      if (el.type === 'radio')    return el.checked ? el.value : undefined;
      return el.value;
    }
    if (el instanceof HTMLTextAreaElement) return el.value;
    if (el instanceof HTMLSelectElement) {
      if (el.multiple) return Array.from(el.selectedOptions).map(o => o.value);
      return el.value;
    }
    // 2) custom element med value/getValue
    if ('getValue' in el && typeof el.getValue === 'function') {
      try { return el.getValue(); } catch { /* ignore */ }
    }
    if ('value' in el) {
      try { return el.value; } catch { /* ignore */ }
    }
    // 3) fallback: kig efter indre native kontrol
    const inner = el.shadowRoot?.querySelector?.('input,select,textarea');
    if (inner) return this.#readValue(inner);
    return undefined;
  }
}

customElements.define('app-form-field', AppFormField);
