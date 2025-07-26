import { BaseComponent } from '/js/BaseComponent.js';

class AppUploadArea extends BaseComponent {
  static get observedAttributes() {
    return ['onfiledrop'];
  }

  #dragCounter = 0;

  async render() {
    const query = new URLSearchParams({ isClickable: this.#isClickable() }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/molecules/upload-area/upload-area-markup?${query}`).then(res => res.text()),
      fetch('/components/molecules/upload-area/upload-area-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#setupEvents();
  }

  #isClickable() {
    return this.getAttribute('clickable') === "true";
  }

  #setupEvents() {
    this.addEventListener('dragenter', this.#onDragEnter);
    this.addEventListener('dragover', this.#onDragOver);
    this.addEventListener('dragleave', this.#onDragLeave);
    this.addEventListener('drop', this.#onDrop);

    if(this.#isClickable())
        this.addEventListener('click', this.#onClick);
  }

  #onClick = () => {
    const input = this.shadowRoot.querySelector('#upload-input');
    if (input) input.click();
  };

  #onDragEnter = (event) => {
    event.preventDefault();
    this.#dragCounter++;
    this.#setDragOver(true);
  };

  #onDragOver = (event) => {
    event.preventDefault();
  };

  #onDragLeave = (event) => {
    event.preventDefault();
    this.#dragCounter--;

    if (this.#dragCounter <= 0) {
      this.#setDragOver(false);
      this.#dragCounter = 0;
    }
  };

  #onDrop = (event) => {
    event.preventDefault();
    this.#dragCounter = 0;
    this.#setDragOver(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.#handleFiles(files);
    }
  };

  #handleFiles(files) {
    const handlerName = this.getAttribute('onfiledrop');
    if (handlerName && typeof window[handlerName] === 'function') {
      window[handlerName](files);
    } else {
      console.warn('No valid onfiledrop handler found:', handlerName);
    }
  }

  #setDragOver(state) {
    const container = this.shadowRoot.querySelector('.upload-container');
    if (container) container.classList.toggle('dragover', state);
  }
}

customElements.define('app-upload-area', AppUploadArea);
