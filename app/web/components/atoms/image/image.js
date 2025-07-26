import { BaseComponent }  from '/js/BaseComponent.js'

class AppImage extends BaseComponent {
    static get observedAttributes() {
      return ['src', 'alt'];
    }
  
    async render() {
      const src = this.getAttribute('src') || '';
      const alt = this.getAttribute('alt');
  
      // WCAG: alt er påkrævet — men "" er tilladt (for dekorative billeder)
      if (alt === null) {
        console.warn('<app-image> mangler alt-attribut. Dette bryder WCAG.');
      }
  
      const query = new URLSearchParams({ src, alt: alt || '' }).toString();
  
      const [html, css] = await Promise.all([
        fetch(`/components/atoms/image?${query}`).then(res => res.text()),
        fetch('/components/atoms/image/image.css').then(res => res.text())
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;
    }
  }
  
  customElements.define('app-image', AppImage);
  