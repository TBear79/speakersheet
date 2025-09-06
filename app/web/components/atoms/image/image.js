import { BaseComponent }  from '/js/BaseComponent.js'

class AppImage extends BaseComponent {
    static get observedAttributes() {
      return ['src', 'alt'];
    }
  
    async render() {
      const [html, css] = await Promise.all([
        fetch(`/components/atoms/image/image-markup`).then(res => res.text()),
        fetch('/components/atoms/image/image-styles').then(res => res.text())
      ]);
  
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        ${html}
      `;

      this.#setAttributes();
    }
    
    #setAttributes(){
      const src = this.getAttribute('src') || '';
      const alt = this.getAttribute('alt');
  
      // WCAG: alt er påkrævet — men "" er tilladt (for dekorative billeder)
      if (alt === null) {
        console.warn('<app-image> mangler alt-attribut. Dette bryder WCAG.');
      }

      var img = this.shadowRoot.querySelector('img');
      img.setAttribute('src', src);
      img.setAttribute('alt', alt);
    }

}
  
  customElements.define('app-image', AppImage);
  