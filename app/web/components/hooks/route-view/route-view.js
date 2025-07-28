class AppRouteView extends HTMLElement {
  connectedCallback() {
    // Lyt til spa-navigate events
    window.addEventListener('spa-url-change', (e) => {

      const href = e.detail.href;
      if (href !== location.pathname) {
        history.pushState({}, '', href);
      }
      this.loadRoute(href);
    });

    // Lyt til browser frem/tilbage
    window.addEventListener('popstate', () => {
      this.loadRoute(location.pathname);
    });

    // Første indlæsning
    this.loadRoute(location.pathname);
  }

  async loadRoute(href) {
    console.log('ROUTECHANGE', href)
    // Fade ud
    this.style.opacity = '0';
    await new Promise(r => setTimeout(r, 150));

    try {
      const res = await fetch(href);
      const html = await res.text();

      // Udtræk kun body-content fra HTML (du kan tilpasse dette)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newContent = doc.querySelector('.site-main .content');

      if (newContent) {
        this.innerHTML = newContent.innerHTML;
        this.dispatchEvent(new CustomEvent('spa-page-loaded', { bubbles: true }));
      }
    } catch (err) {
      console.error('Routing failed', err);
      this.innerHTML = `<p style="color:red;">Der opstod en fejl under indlæsning af siden.</p>`;
    }

    // Fade ind
    await new Promise(r => setTimeout(r, 20)); // Trig reflow
    this.style.opacity = '1';
  }
}

customElements.define('app-route-view', AppRouteView);
