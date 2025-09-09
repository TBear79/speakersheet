import { BaseComponent }  from '/js/BaseComponent.js'

class AppEditCongregation extends BaseComponent {
  static get observedAttributes() { return ['status']; }

  _mounted = false;
  _modal = null;

  async render() {
    if (this._mounted) return; // <-- vigtig: render kun én gang

    const status = this.getAttribute('status') || 'closed';
    const query = new URLSearchParams({ status }).toString();

    const [html, css] = await Promise.all([
      fetch(`/components/organisms/edit-congregation/edit-congregation-markup?${query}`).then(res => res.text()),
      fetch('/components/organisms/edit-congregation/edit-congregation-styles').then(res => res.text())
    ]);

    this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;

    // find modal én gang og genbrug samme instans (selv når den portaler)
    this._modal = this.shadowRoot.querySelector('app-modal[name=edit-congregation]');

    this.#bindEvents();
    this._mounted = true;

    // hvis den er født med status="open", så åbn efter første render
    queueMicrotask(() => {
      if ((this.getAttribute('status') || 'closed') === 'open') {
        this._modal?.openModal();
      }
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name !== 'status' || oldValue === newValue) return;
    if (!this._mounted) return; // vent til første render er sket

    // åbn/luk kun på eksplicit værdi
    if (newValue === 'open') this._modal?.openModal();
    if (newValue === 'closed') this._modal?.closeModal();
  }

  #bindEvents() {
    const cancelBtn = this.shadowRoot.querySelector('app-button[name=cancel-button]');
    const saveBtn   = this.shadowRoot.querySelector('app-button[name=save-button]');
    const cancelEvt = cancelBtn?.getAttribute('onclickeventname');
    const saveEvt   = saveBtn?.getAttribute('onclickeventname');

    cancelBtn?.addEventListener(cancelEvt, () => {
      console.log('CANCEL');
      this._modal?.closeModal();
      this.setAttribute('status','closed'); // hold attribut i sync (valgfrit)
    });

    saveBtn?.addEventListener(saveEvt, () => {
      console.log('SAVE');
      // gem form...
      this._modal?.closeModal();
      this.setAttribute('status','closed');
    });
  }
}

customElements.define('app-edit-congregation', AppEditCongregation);
