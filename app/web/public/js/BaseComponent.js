export class BaseComponent extends HTMLElement {
  #renderScheduled = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { this.scheduleRender(); }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this.scheduleRender();
  }

  scheduleRender() {
    if (!this.#renderScheduled) {
      this.#renderScheduled = true;
      queueMicrotask(() => {
        this.#renderScheduled = false;
        this.render();
      });
    }
  }

  render() {
    console.warn('BaseComponent.render() was called, but not implemented.');
  }

  // ---------- Utilities ----------
  requireElement(selector, root = this.shadowRoot) {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`[${this.tagName.toLowerCase()}] Required element not found: ${selector}`);
    return el;
  }

  // ---------- Event helpers ----------

  dispatchNamedEvent(eventName, detail = {}, opts = {}) {
    this.#validateEventName(eventName);
    this.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: opts.bubbles ?? true,
      composed: opts.composed ?? true
    }));
    return eventName;
  }

  #validateEventName(eventName) {
    if (typeof eventName !== 'string') {
      throw new Error(`Event name must be a string, got ${typeof eventName}`);
    }
    const regex = /^[a-z0-9]+:[a-z0-9]+:[a-z0-9]+$/;
    if (!regex.test(eventName)) {
      throw new Error(
        `Invalid event name "${eventName}". Must match format "part:part:part" (lowercase letters/numbers only). Example: "link:newpdf:click".`
      );
    }
    return true;
  }

  // ---------- DOM helpers ----------
  $all(sel, root = this.shadowRoot) { return root ? Array.from(root.querySelectorAll(sel)) : []; }

  cloneTpl(id, root = this.shadowRoot) {
    const tpl = root?.getElementById(id);
    if (!tpl || !tpl.content) throw new Error(`Template '${id}' not found`);
    return tpl.content.cloneNode(true); // DocumentFragment
  }

  setBindings(root, data) {
    this.$all('[data-bind]', root).forEach(el => {
      const key = el.getAttribute('data-bind');
      el.textContent = data?.[key] ?? '';
    });
  
    this.$all('[data-bind-attr]', root).forEach(el => {
      const spec = el.getAttribute('data-bind-attr') || '';
      spec.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        const v = data?.[key];
        if (v == null || v === '') el.removeAttribute(attr);
        else el.setAttribute(attr, String(v));
      });
    });
  
    this.$all('[data-bind-html]', root).forEach(el => {
      const key = el.getAttribute('data-bind-html');
      el.innerHTML = data?.[key] ?? '';
    });
  
    return root;
  }

  appendToSlot(root, slotName, node) {
    const host = root.querySelector(`[data-slot="${slotName}"]`);
    if (host && node) host.appendChild(node);
    return root;
  }

  // ---------------- Conditional rendering helpers ----------------
  pruneIf(root, data) {
    // Fjern elementer hvor data-if peger på en "tom" eller false værdi
    this.$all('[data-if]', root).forEach(el => {
      const key = el.getAttribute('data-if');
      const v = data?.[key];
      if (this.#isEmptyForIf(v)) el.remove();
    });
  
    // Fjern elementer hvor data-unless peger på en "ikke-tom" værdi
    this.$all('[data-unless]', root).forEach(el => {
      const key = el.getAttribute('data-unless');
      const v = data?.[key];
      if (!this.#isEmptyForIf(v)) el.remove();
    });
  
    return root;
  }
  
  // --- private helpers ---
  #isEmptyForIf(v) {
    if (v == null) return true;                 // null/undefined
    if (typeof v === 'boolean') return v === false;
    if (typeof v === 'string') return v.trim() === '';
    if (Array.isArray(v)) return v.length === 0;
    return false; // objekter og tal regnes som "ikke tomme"
  }
}
