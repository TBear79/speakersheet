import { BaseComponent } from '/js/BaseComponent.js';

class AppViewSpeakersheet extends BaseComponent {
  static get observedAttributes() {
    return [];
  }

  async render() {
    const [html, css] = await Promise.all([
      fetch('/components/pages/view-speakersheet/view-speakersheet-markup').then(res => res.text()),
      fetch('/components/pages/view-speakersheet/view-speakersheet-styles').then(res => res.text()).catch(() => '')
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;
  }
}

customElements.define('app-view-speakersheet', AppViewSpeakersheet);
