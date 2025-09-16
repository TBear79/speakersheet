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
import { BaseComponent } from '/js/BaseComponent.js';

export class AppFormField extends BaseComponent {
  static get observedAttributes() {
    return ['name','label','for','message','state','required','hidden-label','disabled'];
  }

  /** private fields */
  #labelEl; #rowEl; #msgEl; #slot; #currentControl;
  #messageId; #cleanup = () => {};

  static _tplHtml = null; // markup cache
  static _tplCss = null;  // css cache

  #rendering = true;

  get fieldState() { return (this.getAttribute('state') || 'default').toLowerCase(); }

  async render() {
    const compPath = '/components/molecules/form-field';
    if (!AppFormField._tplHtml) {
      AppFormField._tplHtml = await fetch(`${compPath}/form-field-markup`).then(r => r.text());
    }
    if (!AppFormField._tplCss) {
      AppFormField._tplCss = await fetch(`${compPath}/form-field-styles`).then(r => r.text());
    }

    // Shadow DOM
    const html = `
      <style>${AppFormField._tplCss}</style>
      ${AppFormField._tplHtml}
    `;
    this.shadowRoot.innerHTML = html;

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

  // ----- internals
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
    const selector = 'input,select,textarea,button,[tabindex],time-picker,app-text';
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
}

customElements.define('app-form-field', AppFormField);





