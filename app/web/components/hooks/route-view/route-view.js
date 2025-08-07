import { BaseComponent } from '/js/BaseComponent.js';

class AppRouteView extends BaseComponent {
  currentLoadId = 0;

  async render() {
    const [css] = await Promise.all([
      fetch('/components/hooks/route-view/route-view-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      <slot></slot>
    `;
  }

  async connectedCallback() {
    await this.render();

    // SPA-navigation
    window.addEventListener('spa-url-change', (e) => {
      const href = e.detail.href;
      if (href !== location.pathname) {
        history.pushState({}, '', href);
      }
      this.loadRoute(href);
    });

    // Browser frem/tilbage
    window.addEventListener('popstate', () => {
      this.loadRoute(location.pathname);
    });

    // Første indlæsning
    this.loadRoute(location.pathname);
  }

  async loadRoute(href) {
    const loadId = ++this.currentLoadId;

    if (loadId !== this.currentLoadId) return; // Nyere navigation påbegyndt

    // Fade ud
    this.classList.add('fade-out');
    await new Promise(r => setTimeout(r, 200));

    try {
      const res = await fetch(href, {
        headers: { 'x-spa-request': 'true' }
      });

      const html = await res.text();

      if (html.includes('<!DOCTYPE html>')) {
        console.error('FEJL: app-route-view modtog hele dokumentet. Sørg for layout: false på serveren.');
        return;
      }

      // Ryd tidligere indhold uden at fjerne styles
      [...this.children].forEach(child => {
        if (!(child instanceof HTMLStyleElement)) child.remove();
      });

      // Indsæt ny side
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      this.appendChild(wrapper);

      this.dispatchEvent(new CustomEvent('spa-page-loaded', { bubbles: true }));

    } catch (err) {
      if (loadId === this.currentLoadId) {
        this.innerHTML = `<p style="color:red;">Der opstod en fejl under indlæsning af siden.</p>`;
      }
      console.error('Routing failed', err);
    }

    // Fade ind igen
    if (loadId === this.currentLoadId) {
      void this.offsetWidth;
      this.classList.remove('fade-out');
    }
  }
}

customElements.define('app-route-view', AppRouteView);
