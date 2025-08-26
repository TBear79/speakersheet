import { BaseComponent } from '/js/BaseComponent.js';

class AppRouteView extends BaseComponent {
  currentLoadId = 0;

  static get observedAttributes() { return ['eventget','eventpost']; }

  // private fields
  #getEvt = 'route:get';
  #postEvt = 'route:post';

  async connectedCallback() {
    await this.render();
    this.#bind();

    // Back/forward (GET)
    window.addEventListener('popstate', () => {
      const href = location.pathname;
      const fetchFn = (url) => fetch(url, { headers: { 'x-spa-request': 'true' } });
      this.loadRoute(href, fetchFn, { isSpa: true });
    });

    // Første indlæsning (GET, uden pushState)
    const firstFetch = (url) => fetch(url, { headers: { 'x-spa-request': 'true' } });
    this.loadRoute(location.pathname, firstFetch, { isSpa: false });
  }

  async render() {
    this.#getEvt  = this.getAttribute('eventget')  || 'route:get';
    this.#postEvt = this.getAttribute('eventpost') || 'route:post';
    
    const [css] = await Promise.all([
      fetch('/components/hooks/route-view/route-view-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      <slot></slot>
    `;
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#bind();
  }

  #bind() {
    // fjern gamle lyttere hvis vi re-binder
    this.removeEventListener(this.#getEvt,  this.#onGet);
    this.removeEventListener(this.#postEvt, this.#onPost);

    this.addEventListener(this.#getEvt,  this.#onGet);
    this.addEventListener(this.#postEvt, this.#onPost);
  }

  // GET-listener
  #onGet = (e) => {
    const href  = e.detail?.href  ?? location.pathname;
    const isSpa = e.detail?.isSpa ?? true;
    const headers = e.detail?.headers ?? {};

    const fetchFn = (url) => fetch(url, {
      method: 'GET',
      headers: { ...(isSpa ? { 'x-spa-request': 'true' } : {}), ...headers }
    });

    this.#handlePushState(isSpa, href);
    this.loadRoute(href, fetchFn, { isSpa });
  };

  // POST-listener
  #onPost = (e) => {
    const href    = e.detail?.href    ?? location.pathname;
    const isSpa   = e.detail?.isSpa   ?? true;
    const body    = e.detail?.body    ?? null;     // FormData eller JSON-string
    const headers = e.detail?.headers ?? {};       // sæt Content-Type selv ved JSON

    const fetchFn = (url) => fetch(url, {
      method: 'POST',
      headers: { ...(isSpa ? { 'x-spa-request': 'true' } : {}), ...headers },
      body
    });

    this.#handlePushState(isSpa, href);
    this.loadRoute(href, fetchFn, { isSpa });
  };

  #handlePushState(isSpa, href) {
    const historyOn = (this.getAttribute('data-history') ?? 'on') !== 'off';
    if (isSpa && historyOn && href !== location.pathname) history.pushState({}, '', href);
  }

  async loadRoute(href, fetchFn, { isSpa = true } = {}) {
    const loadId = ++this.currentLoadId;

    this.classList.add('fade-out');
    await new Promise(r => setTimeout(r, 200));

    try {
      const res  = await fetchFn(href);
      const html = await res.text();

      if (html.includes('<!DOCTYPE html>')) {
        console.error('FEJL: app-route-view modtog hele dokumentet. Sørg for layout: false på serveren.');
        return;
      }

      // Ryd tidligere indhold uden at fjerne styles
      [...this.children].forEach(c => { if (!(c instanceof HTMLStyleElement)) c.remove(); });

      // Indsæt ny side
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      this.appendChild(wrapper);

      this.dispatchEvent(new CustomEvent('spa-page-loaded', { bubbles: true, detail: { href, isSpa } }));
    } catch (err) {
      if (loadId === this.currentLoadId) {
        this.innerHTML = `<p style="color:red;">Der opstod en fejl under indlæsning af siden.</p>`;
      }
      console.error('Routing failed', err);
    }

    if (loadId === this.currentLoadId) {
      void this.offsetWidth;
      this.classList.remove('fade-out');
    }
  }
}

customElements.define('app-route-view', AppRouteView);
