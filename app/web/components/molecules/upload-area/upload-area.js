import { BaseComponent } from '/js/BaseComponent.js';

class AppUploadArea extends BaseComponent {
  static get observedAttributes() {
    return ['onfiledrop'];
  }

  #dragCounter = 0;

  async render() {
    const [html, css] = await Promise.all([
      this.fetchWithCache('/components/molecules/upload-area/upload-area-markup'),
      this.fetchWithCache('/components/molecules/upload-area/upload-area-styles')
    ]);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.#setAttributes();
    this.#setupEvents();
  }

  #setAttributes() {
    const container = this.shadowRoot.querySelector('.upload-container');

    if(this.#isClickable())
      container.classList.add('clickable');
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

    const onFileDropEventName = this.getAttribute('onfiledropeventname');

    if(!onFileDropEventName)
    {
      console.error('onfiledropeventname is missing in attributes');
      return;
    }

    const files = event.dataTransfer?.files;

    if (files && files.length > 0) {
      this.dispatchNamedEvent(onFileDropEventName, { files });
    }
  };

  #setDragOver(state) {
    const container = this.shadowRoot.querySelector('.upload-container');
    if (container) container.classList.toggle('dragover', state);
  }
}

customElements.define('app-upload-area', AppUploadArea);
