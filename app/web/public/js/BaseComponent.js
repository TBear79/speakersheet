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
          this.render();
        });
      }
    }
  
    render() {
      console.warn('BaseComponent.render() was called, but not implemented.');
    }

    dispatchNamedEvent(eventName, detail = {}, opts = {}) {
      this.#validateEventName(eventName);

      this.dispatchEvent(new CustomEvent(eventName, {
        detail,
        bubbles: opts.bubbles ?? true,
        composed: opts.composed ?? true
      }));

      return eventName;
    }

    #validateEventName(eventName) {
      if (typeof eventName !== 'string') {
        throw new Error(`Event name must be a string, got ${typeof eventName}`);
      }
  
      const regex = /^[a-z0-9]+:[a-z0-9]+:[a-z0-9]+$/;
  
      if (!regex.test(eventName)) {
        throw new Error(
          `Invalid event name "${eventName}". Must match format "part:part:part" (lowercase letters/numbers only). Example: "link:newpdf:click".`
        );
      }
  
      return true;
    }
  }