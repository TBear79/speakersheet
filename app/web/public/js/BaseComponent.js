export class BaseComponent extends HTMLElement {
    #renderScheduled = false;
  
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    connectedCallback() {
      this.scheduleRender();
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
        this.scheduleRender();
      }
    }
  
    scheduleRender() {
      if (!this.#renderScheduled) {
        this.#renderScheduled = true;
        queueMicrotask(() => {
          this.#renderScheduled = false;
          this.render(); // Din komponent skal definere en `render()` metode
        });
      }
    }
  
    // Undgå at nogen glemmer at overskrive `render`
    render() {
      console.warn('BaseComponent.render() was called, but not implemented.');
    }
  }