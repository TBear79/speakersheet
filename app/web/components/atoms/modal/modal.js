import { BaseComponent } from '/js/BaseComponent.js';

class AppModal extends BaseComponent {
  static get observedAttributes() { return ['open','name','esc-close','aria-label']; }

  // ---------- public props
  get open() { return this.hasAttribute('open'); }
  set open(v) { this.toggleAttribute('open', !!v); }
  get name() { return this.getAttribute('name') || ''; }
  set name(v) { this.setAttribute('name', v ?? ''); }
  get escClose() { return this.hasAttribute('esc-close'); }
  set escClose(v) { this.toggleAttribute('esc-close', !!v); }

  // ---------- internal state
  _rendering = false;
  _mounted = false;
  _isPortaled = false;
  _portaling = false;
  #prevFocused = null;
  #inertTargets = null;
  _prevOverflow = '';
  #origParent = null;
  #origNext = null;

  static _tplHtml = null;
  static _tplCss = null;

  async render() {
    if (this._rendering) return;
    this._rendering = true;

    // 1) fetch templates kun første gang på tværs af alle instanser
    if (!AppModal._tplHtml || !AppModal._tplCss) {
      const [html, css] = await Promise.all([
        fetch('/components/atoms/modal/modal-markup').then(r => r.text()),
        fetch('/components/atoms/modal/modal-styles').then(r => r.text())
      ]);
      AppModal._tplHtml = html;
      AppModal._tplCss = css;
    }

    // 2) mount shadow kun første gang for denne instans
    if (!this._mounted) {
      const fallback = `
        :host{position:fixed;inset:0;display:none;place-items:center;z-index:1000}
        :host([open]){display:grid}
        .backdrop{position:absolute;inset:0;background:rgba(0,0,0,.35);opacity:1;z-index:0}
        .dialog{z-index:1;background:#f3f4f6;padding:1rem;border-radius:1rem;max-width:min(92vw,720px);max-height:90dvh;overflow:auto;outline:none}
      `;
      const css = AppModal._tplCss || fallback;
      const html = AppModal._tplHtml || `
        <div class="backdrop" part="backdrop" aria-hidden="true"></div>
        <div class="dialog" part="dialog" role="dialog" aria-modal="true" aria-labelledby="app-modal-title" tabindex="-1">
          <header class="dialog-header"><slot name="title" id="app-modal-title"></slot></header>
          <section class="dialog-content"><slot></slot></section>
          <footer class="dialog-actions"><slot name="actions"></slot></footer>
          <span class="focus-sentinel start" tabindex="0" aria-hidden="true"></span>
          <span class="focus-sentinel end" tabindex="0" aria-hidden="true"></span>
        </div>
      `;

      this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;
      this.#wire();
      this._mounted = true;

      // Hvis den er født med [open], håndter det efter denne render-cyklus
      queueMicrotask(() => {
        if (this.open && !this._isPortaled) this.#handleOpen();
        this.#reflectA11y();
      });
    } else {
      // allerede mountet: kun opdater a11y
      this.#reflectA11y();
    }

    this._rendering = false;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'open') {
      // Vent til vi har shadow/mount, så vi ikke portal’er midt i mount
      if (!this._mounted) {
        queueMicrotask(() => this.attributeChangedCallback(name, oldVal, this.getAttribute(name)));
        return;
      }
      if (this.open) this.#handleOpen();
      else this.#handleClose();
    }
  }

  disconnectedCallback() {
    // Hvis nogen fjerner elementet mens det er åbent: ryd op nok til ikke at efterlade siden låst
    if (this._isPortaled) this.#unlockPage();
    // lad restore ske i #handleClose når/ hvis den lukkes senere
  }

  // ---------- public API
  openModal(){ this.open = true; }
  closeModal(){ this.open = false; }
  toggle(){ this.open = !this.open; }

  // ---------- wire & a11y
  #wire() {
    const backdrop = this.shadowRoot.querySelector('.backdrop');

    // Backdrop lukker ikke – men spiser klik
    backdrop?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });

    // Keyboard: kun én keydown-trap på dialogen
    this.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (e.key === 'Escape' && this.escClose) {
        e.preventDefault(); e.stopPropagation();
        this.closeModal();
      } else if (e.key === 'Tab') {
        this.#trapTab(e);
      }
    });

    // VIGTIGT: ingen focus-listeners på sentinels (de skabte rekursion)
    // Sentinels bliver kun brugt som “hegnspæle” til skærmlæsere.
  }

  #reflectA11y() {
    const dlg = this.shadowRoot.querySelector('.dialog');
    const backdrop = this.shadowRoot.querySelector('.backdrop');
    const isOpen = this.open;
    backdrop?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    dlg?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  #dispatchState(isOpen) {
    this.dispatchEvent(new CustomEvent(isOpen ? 'modal-opened' : 'modal-closed', {
      bubbles: true, composed: true, detail: { name: this.name }
    }));
  }

  // ---------- open/close handlers (uden re-render)
  #handleOpen() {
    if (this._isPortaled || this._portaling) return;
    this._portaling = true;

    // Gem fokusafsender FØR vi flytter fokus
    this.#prevFocused = document.activeElement;

    // Portal
    if (!this._isPortaled) this.#portalToBody();

    // Lock page & fokus
    this.#lockPage();
    this.#focusFirst();
    this.#dispatchState(true);
    this.#reflectA11y();

    // Frigiv portaling-flag i næste microtask
    queueMicrotask(() => { this._portaling = false; });
  }

  #handleClose() {
    if (!this._isPortaled && !this._portaling) return;

    this.#unlockPage();
    this.#restoreToOrigin();
    this.#restoreFocus();
    this._isPortaled = false;
    this.#dispatchState(false);
    this.#reflectA11y();
  }

  // ---------- fokusstyring
  #focusables() {
    const dlg = this.shadowRoot.querySelector('.dialog');
    if (!dlg) return [];
    const sel = [
      'a[href]:not(.focus-sentinel)',
      'area[href]:not(.focus-sentinel)',
      'button:not([disabled]):not(.focus-sentinel)',
      'input:not([disabled]):not([type="hidden"]):not(.focus-sentinel)',
      'select:not([disabled]):not(.focus-sentinel)',
      'textarea:not([disabled]):not(.focus-sentinel)',
      'iframe:not(.focus-sentinel)',
      'audio[controls]:not(.focus-sentinel)',
      'video[controls]:not(.focus-sentinel)',
      '[contenteditable]:not([contenteditable="false"]):not(.focus-sentinel)',
      '[tabindex]:not([tabindex="-1"]):not(.focus-sentinel)'
    ].join(',');
    return [...dlg.querySelectorAll(sel)]
      .filter(el => el.offsetParent !== null || el === document.activeElement);
  }
  #focusFirst(){ (this.#focusables()[0] || this.shadowRoot.querySelector('.dialog'))?.focus?.(); }
  #focusLast(){ (this.#focusables().pop() || this.shadowRoot.querySelector('.dialog'))?.focus?.(); }
  #trapTab(e){
    if (e.key !== 'Tab') return;
    const items = this.#focusables();
    if (items.length === 0) { e.preventDefault(); this.shadowRoot.querySelector('.dialog')?.focus(); return; }
    const first = items[0], last = items[items.length-1];
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  }
  #restoreFocus(){ this.#prevFocused?.focus?.(); this.#prevFocused = null; }

  // ---------- portal + side-lås
  #portalToBody(){
    if (this._isPortaled) return;
    this.#origParent = this.parentNode;
    this.#origNext = this.nextSibling;
    document.body.appendChild(this);
    this._isPortaled = true;
  }
  #restoreToOrigin(){
    if (!this.#origParent) return;
    if (this.#origNext && this.#origNext.parentNode === this.#origParent) {
      this.#origParent.insertBefore(this, this.#origNext);
    } else {
      this.#origParent.appendChild(this);
    }
    this.#origParent = null;
    this.#origNext = null;
  }

  #lockPage(){
    this._prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    this.#inertTargets = [];
    for (const el of Array.from(document.body.children)) {
      if (el === this) continue;
      if (!el.hasAttribute('inert')) {
        el.setAttribute('inert','');
        this.#inertTargets.push(el);
      }
    }
  }
  #unlockPage(){
    document.documentElement.style.overflow = this._prevOverflow ?? '';
    if (this.#inertTargets) {
      for (const el of this.#inertTargets) el.removeAttribute('inert');
      this.#inertTargets = null;
    }
  }
}

customElements.define('app-modal', AppModal);
