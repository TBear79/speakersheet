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

  // ---------- DOM helpers (ny) ----------
  $(sel, root = this.shadowRoot) { return root?.querySelector(sel) ?? null; }
  $all(sel, root = this.shadowRoot) { return root ? Array.from(root.querySelectorAll(sel)) : []; }

  cloneTpl(id, root = this.shadowRoot) {
    const tpl = root?.getElementById(id);
    if (!tpl || !tpl.content) throw new Error(`Template '${id}' not found`);
    return tpl.content.cloneNode(true); // DocumentFragment
  }

  setBindings(root, data) {
    this.$all('[data-bind]', root).forEach(el => {
      const path = el.getAttribute('data-bind');
      el.textContent = this.#get(data, path) ?? '';
    });

    // Valgfrit: bind attributes via "attr:path, attr2:path2"
    this.$all('[data-bind-attr]', root).forEach(el => {
      const spec = el.getAttribute('data-bind-attr') || '';
      spec.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
        const [attr, path] = pair.split(':').map(s => s.trim());
        const v = this.#get(data, path);
        if (v == null || v === '') el.removeAttribute(attr);
        else el.setAttribute(attr, String(v));
      });
    });

    // Valgfrit: rå HTML (brug kun på trusted/sanitized data)
    this.$all('[data-bind-html]', root).forEach(el => {
      const path = el.getAttribute('data-bind-html');
      const v = this.#get(data, path);
      el.innerHTML = v ?? '';
    });

    return root;
  }

  appendToSlot(root, slotName, node) {
    const host = root.querySelector(`[data-slot="${slotName}"]`);
    if (host && node) host.appendChild(node);
    return root;
  }

  #get(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((o, k) => (o?.[k]), obj);
  }
}
