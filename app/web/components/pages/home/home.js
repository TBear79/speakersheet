import { BaseComponent } from '/js/BaseComponent.js';

class AppHome extends BaseComponent {
  static get observedAttributes() {
    return [];
  }

  #onNewPdfLinkClickEventName = 'home:newpdflink:click';
  #onUploadAreaFileDropEventName = 'home:pdffile:drop';

  async render() {
    const query = new URLSearchParams({ onNewPdfLinkClickEventName: this.#onNewPdfLinkClickEventName, onUploadAreaFileDropEventName: this.#onUploadAreaFileDropEventName  }).toString();

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
    this.addEventListener(this.#onUploadAreaFileDropEventName, this.#handleFileSelect);

    this.addEventListener(this.#onNewPdfLinkClickEventName, e => {
      this.dispatchNamedEvent(
        this.closest('app-route-view')?.getAttribute('eventget'),
        { ...e.detail }
      );
    });
  }

  #handleFileSelect(e) {
    const file = e.detail?.files?.[0];
      if (!file) return;

      this.dispatchNamedEvent(
        this.closest('app-route-view')?.getAttribute('eventpost'),
        {
          href: '/edit-speakersheet',
          isSpa: true,
          body: file,
          headers: { 'Content-Type': file.type || 'application/pdf' }
        }
      );
  }
}

customElements.define('app-home', AppHome);
