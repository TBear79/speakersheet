/**
 * <app-form-time-picker />
 *
 * Eksempler
 * ---------
 *   <!-- Custom/Windows-lignende atom: tving stabil kolon og steps -->
 *   <app-form-time-picker
 *     name="startTime"
 *     label="Mødestart"
 *     value="08:30"
 *     step="5"
 *     use-native="never">
 *   </app-form-time-picker>
 *
 *   <!-- Device/native atom (OS/locale bestemmer indtastning/separator) -->
 *   <app-form-time-picker name="startTime" label="Start" use-native="always"></app-form-time-picker>
 *
 * Beskrivelse
 * -----------
 * Molecule, der wrapper <time-picker>-atomet med <app-label> og <app-validation-message>.
 * Komponent er form-associated (via ElementInternals) så værdien submit’es i native forms.
 *
 * Markup (serveres via endpoint)
 * ------------------------------
 * <div class="field">
 *   <app-label class="label"></app-label>
 *   <div class="row">
 *     <time-picker use-native="auto"></time-picker>
 *     <app-validation-message class="message"></app-validation-message>
 *   </div>
 * </div>
 *
 * Attributter (på <app-form-time-picker>)
 * ---------------------------------------
 * name            : string          // navnet, der submit’es i formen
 * label           : string          // tekst til <app-label>
 * value           : "HH:mm"         // 24h; initial/aktuel værdi
 * initial-value   : "HH:mm"         // fallback hvis value ikke sat (eller elementets tekstindhold ved første render)
 * placeholder     : string          // vises i atomets label når tomt (default "--:--")
 * step            : number          // minut-interval (default 1)
 * min / max       : "HH:mm"         // grænser; valideres ved commit
 * required        : boolean         // krævet felt
 * disabled        : boolean         // deaktiveret felt
 * use-native      : "auto" | "always" | "never" // videresendes til atomet (default "auto" fra markup)
 * enforce-step    : boolean         // kræv at minutes % step === 0 (default off)
 * error           : string          // statisk fejltekst (overruler auto-validering hvis sat)
 *
 * Events
 * ------
 * "change"              : bobler når tid ændres
 * "time-change"         : bobler fra <time-picker> (detail { name, value, hours, minutes })
 * "form-field-change"   : detail { name, value, valid }
 *
 */

import { BaseComponent } from '/js/BaseComponent.js';

let __uid = 0;
const uid = (p='id') => `${p}-${(++__uid).toString(36)}`;

export class AppFormTimePicker extends BaseComponent {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'name','label','value','initial-value','placeholder',
      'step','min','max','required','disabled','use-native',
      'enforce-step','error'
    ];
  }

  // Props
  get name() { return this.getAttribute('name') || ''; }
  set name(v) { this.setAttribute('name', v ?? ''); }

  get label() { return this.getAttribute('label') || ''; }
  set label(v) { this.setAttribute('label', v ?? ''); }

  get value() { return this.getAttribute('value') || ''; }
  set value(v) { v == null ? this.removeAttribute('value') : this.setAttribute('value', v); }

  get initialValueAttr() { return this.getAttribute('initial-value') || ''; }

  get placeholder() { return this.getAttribute('placeholder') || '--:--'; }
  set placeholder(v) { this.setAttribute('placeholder', v ?? ''); }

  get step() { const s = parseInt(this.getAttribute('step') || '1', 10); return Number.isFinite(s) && s > 0 ? s : 1; }
  set step(v) { this.setAttribute('step', String(v ?? 1)); }

  get min() { return this.getAttribute('min') || ''; }
  set min(v) { v ? this.setAttribute('min', v) : this.removeAttribute('min'); }

  get max() { return this.getAttribute('max') || ''; }
  set max(v) { v ? this.setAttribute('max', v) : this.removeAttribute('max'); }

  get required() { return this.hasAttribute('required'); }
  set required(v) { this.toggleAttribute('required', !!v); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  get useNative() { return (this.getAttribute('use-native') ?? '').toLowerCase(); } // tom => lad markup styre (auto)
  set useNative(v) { v == null ? this.removeAttribute('use-native') : this.setAttribute('use-native', v); }

  get enforceStep() { return this.hasAttribute('enforce-step'); }
  set enforceStep(v) { this.toggleAttribute('enforce-step', !!v); }

  get error() { return this.getAttribute('error') || ''; }
  set error(v) { v == null ? this.removeAttribute('error') : this.setAttribute('error', v); }

  // Internals
  #els = {};
  #internals = null;
  #initialValue = '';
  #messageId = uid('msg');

  constructor() {
    super();
    if (this.attachInternals) this.#internals = this.attachInternals();
  }

  async render() {
    const [htmlText, cssText] = await Promise.all([
      fetch('/components/molecules/form-time-picker/form-time-picker-markup').then(r => r.text()),
      fetch('/components/molecules/form-time-picker/form-time-picker-styles').then(r => r.text()),
    ]);

    this.shadowRoot.innerHTML = `<style>${cssText}</style>${htmlText}`;

    this.#cacheRefs();
    this.#wireLabel();
    this.#mountTimePicker();
    this.#applyInitialValue();
    this.#syncFromAttrs();
    this.#validateAndReflect(false);
  }

  #cacheRefs() {
    const $ = (s) => this.shadowRoot.querySelector(s);
    this.#els.field   = $('.field');
    this.#els.labelEl = $('.label');   // <app-label>
    this.#els.row     = $('.row');
    this.#els.tp      = this.shadowRoot.querySelector('time-picker');
    this.#els.msg     = $('.message'); // <app-validation-message>
  }

  #wireLabel() {
    if (!this.#els.labelEl) return;
    // Knyt label -> time-picker for a11y
    const tpId = this.#els.tp?.id || uid('tp');
    if (this.#els.tp && !this.#els.tp.id) this.#els.tp.id = tpId;

    // Hvis <app-label> understøtter 'for', sæt den; ellers klik-delegér.
    this.#els.labelEl.setAttribute('for', tpId);
    if(this.hasAttribute('required')) this.#els.labelEl.setAttribute('required', '');
    this.#els.labelEl.addEventListener('click', () => {
      try {
        const trigger = this.#els.tp?.shadowRoot?.querySelector('[data-tp-trigger]');
        (trigger || this.#els.tp).focus?.();
        trigger?.click?.();
      } catch {}
    });

    // Beskriv fejlfelt til screenreaders
    if (this.#els.msg) {
      this.#els.msg.id = this.#messageId;
      this.#els.tp?.setAttribute('aria-describedby', this.#messageId);
    }
  }

  #mountTimePicker() {
    const tp = this.#els.tp;
    if (!tp) return;

    // Mirror relevante attributter til atom
    const mirror = ['value','placeholder','step','min','max','required','disabled','use-native'];
    for (const a of mirror) {
      if (this.hasAttribute(a)) tp.setAttribute(a, this.getAttribute(a) ?? '');
    }
    // Navn til atom, så e.detail.name er korrekt
    if (this.name) tp.setAttribute('name', this.name);

    // Lyt til atom events
    tp.addEventListener('time-change', (e) => {
      this.value = e.detail?.value || '';
      this.#validateAndReflect(true);
      this.dispatchEvent(new CustomEvent('form-field-change', {
        bubbles: true,
        detail: { name: this.name, value: this.value, valid: this.#internals ? this.#internals.checkValidity() : true }
      }));
      // Bubblér standard change for form integrators
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  #applyInitialValue() {
    if (this.hasAttribute('value')) {
      this.#initialValue = this.value;
    } else {
      const text = (this.textContent || '').trim();
      this.#initialValue = this.initialValueAttr || (this.#isValidTime(text) ? text : '') || '';
      if (this.#initialValue) this.value = this.#initialValue;
    }
  }

  #syncFromAttrs() {
    // Label-tekst
    if (this.#els.labelEl) {
      // prøv at sætte både attribute og tekst (understøtter forskellige <app-label> implementationer)
      try { this.#els.labelEl.setAttribute('text', this.label || ''); } catch {}
      if (!this.#els.labelEl.hasAttribute || !this.#els.labelEl.hasAttribute('text')) {
        this.#els.labelEl.textContent = this.label || '';
      }
    }

    // Visuelle tilstande
    this.#els.field?.classList.toggle('is-disabled', this.disabled);
    this.#els.field?.classList.toggle('is-required', this.required);

    // Pas-through til atom
    const tp = this.#els.tp;
    if (!tp) return;
    const passthrough = ['value','placeholder','step','min','max','required','disabled','use-native'];
    for (const a of passthrough) {
      if (this.hasAttribute(a)) tp.setAttribute(a, this.getAttribute(a) ?? '');
      else tp.removeAttribute(a);
    }
    if (this.name) tp.setAttribute('name', this.name);
  }

  attributeChangedCallback(name) {
    if (!this.isConnected || !this.shadowRoot) return;

    if (['label','required','disabled'].includes(name)) this.#syncFromAttrs();
    if (['value','placeholder','step','min','max','use-native','error','enforce-step'].includes(name)) this.#syncFromAttrs();

    if (name === 'value') {
      this.#internals?.setFormValue?.(this.value || null);
      this.#validateAndReflect(false);
    }
    if (name === 'error') {
      // Manuel fejltekst overskriver auto-validering
      this.#validateAndReflect(false);
    }
  }

  // ---- form-associated
  formDisabledCallback(disabled) { this.disabled = !!disabled; }

  formResetCallback() {
    if (this.#initialValue) this.value = this.#initialValue; else this.removeAttribute('value');
    this.#syncFromAttrs();
    this.#validateAndReflect(false);
  }

  formStateRestoreCallback(state /* string|null */) {
    if (typeof state === 'string') this.value = state; else this.removeAttribute('value');
    this.#syncFromAttrs();
    this.#validateAndReflect(false);
  }

  // ---- validation
  #validateAndReflect(announce = false) {
    const v = this.value || '';
    const problems = [];

    if (this.error) {
      problems.push(this.error); // statisk fejltekst har førsteprioritet
    } else {
      if (this.required && !v) problems.push('Dette felt er påkrævet.');
      if (v && !this.#isValidTime(v)) problems.push('Ugyldigt tidsformat. Brug HH:mm.');
      if (v && this.min && this.#num(v) < this.#num(this.min)) problems.push(`Tidspunktet skal være ≥ ${this.min}.`);
      if (v && this.max && this.#num(v) > this.#num(this.max)) problems.push(`Tidspunktet skal være ≤ ${this.max}.`);
      if (v && this.enforceStep) {
        const minutes = parseInt(v.slice(3,5), 10);
        if (minutes % this.step !== 0) problems.push(`Minutter skal være i intervaller af ${this.step}.`);
      }
    }

    const isValid = problems.length === 0;
    const message = problems[0] || '';

    // UI + aria-live
    this.#els.field?.classList.toggle('is-invalid', !isValid);
    if (this.#els.msg) {
      // Understøt både "text" attribute og textContent
      try { this.#els.msg.setAttribute('text', message); } catch {}
      if (!this.#els.msg.hasAttribute || !this.#els.msg.hasAttribute('text')) {
        this.#els.msg.textContent = message;
      }
      if (announce && message) this.#els.msg.setAttribute('aria-live', 'polite');
    }

    // form validity
    this.#internals?.setFormValue?.(v || null);
    if (this.#internals?.setValidity) {
      if (isValid) {
        this.#internals.setValidity({});
      } else {
        this.#internals.setValidity({ customError: true }, message, this.#els.tp);
      }
    }
    return isValid;
  }

  // utils
  #isValidTime(v) { return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(v); }
  #num(v) { return parseInt(v.replace(':',''), 10); }
}

customElements.define('app-form-time-picker', AppFormTimePicker);
