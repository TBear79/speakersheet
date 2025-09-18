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

  // ---------- Caching ----------

  static _cache = new Map();    // key -> parsed value (string/json/…)
  static _inflight = new Map(); // key -> Promise<parsed value>

  async fetchWithCache(url, { init = { cache: 'reload' } } = {}) {
    // 1) Cache hit
    if (BaseComponent._cache.has(url)) {
      return BaseComponent._cache.get(url);
    }

    // 2) In-flight: del samme promise
    if (BaseComponent._inflight.has(url)) {
      return BaseComponent._inflight.get(url);
    }

    // 3) Start én fælles opgave, der parser og cacher værdien
    const p = (async () => {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`Fetch ${res.status} ${res.statusText} for ${url}`);

      const value = await res.text();

      BaseComponent._cache.set(url, value);
      return value;
    })();

    BaseComponent._inflight.set(url, p);

    try {
      return await p;
    } finally {
      BaseComponent._inflight.delete(url);
    }
  }
  
  // ---------- Utilities ----------
  requireElement(selector, root = this.shadowRoot) {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`[${this.tagName.toLowerCase()}] Required element not found: ${selector}`);
    return el;
  }

  toggleAttributeOn(el, name, value = '') {
    if (!el) return;
  
    if (this.hasAttribute(name)) {
      el.setAttribute(name, this.getAttribute(name) || value);
    } else {
      el.removeAttribute(name);
    }
  }

  copyAttr(attr, target, fallback = null) {
    if (this.hasAttribute(attr)) {
      target.setAttribute(attr, this.getAttribute(attr) || fallback || '');
    } else {
      if (fallback) target.setAttribute(attr, fallback);
      else target.removeAttribute(attr);
    }
  }

  getWeekday(weekdayIndex) {
    if(isNaN(weekdayIndex) || weekdayIndex < 0 || weekdayIndex > 6) {
      console.error('Invalid weekday index', weekdayIndex);
      return;
    }

      return ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'][weekdayIndex];
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

  setBindings(root, data, formatters) {
    this.$all('[data-bind]', root).forEach(el => {
      const key = el.getAttribute('data-bind');
      
      const textContent = formatters && formatters[key] ? formatters[key](data?.[key]) : data?.[key];

      el.textContent = textContent ?? '';
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
