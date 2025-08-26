import { BaseComponent } from '/js/BaseComponent.js';

class AppHome extends BaseComponent {
  static get observedAttributes() {
    return [];
  }

  #onNewPdfLinkClickEventName = 'home:newpdflink:click';

  async render() {
    const query = new URLSearchParams({ onNewPdfLinkClickEventName: this.#onNewPdfLinkClickEventName }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/pages/home/home-markup?${query}`).then(res => res.text()),
      fetch('/components/pages/home/home-styles').then(res => res.text()).catch(() => '')
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#bindEvents();
  }

  #bindEvents() {
    const uploadArea = this.shadowRoot.querySelector('app-upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('upload-existing-filedrop', (e) => {
        this.#handleFiles(e.detail.files);
      });
    }

    this.addEventListener(this.#onNewPdfLinkClickEventName, e => {
      this.dispatchNamedEvent(
        this.closest('app-route-view')?.getAttribute('eventget'),
        { ...e.detail }
      );
    });
  }

  #handleFiles(files) {
    console.log('Filer droppet:', files);
  }
}

customElements.define('app-home', AppHome);
