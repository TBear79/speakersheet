import { BaseComponent }  from '/js/BaseComponent.js'

class AppEditCongregation extends BaseComponent {
  static get observedAttributes() {
    return ['status'];
  }

  // -----Elements-----
  #modal; #cancelBtn; #saveBtn;
  #officialName; #nickname; #address; #circuit; #meetingDayTime
  
  #onDataUpdatedEventName

  async render() {
    const status = this.getAttribute('status') || 'closed';
    this.#onDataUpdatedEventName = this.getAttribute('ondataupdatedeventname');

    const html = await this.fetchWithCache('/components/organisms/edit-congregation/edit-congregation-markup');

    this.shadowRoot.innerHTML = html;
  
    if (!this.hasAttribute('status')) this.setAttribute('status', status);

    this.#setElements();  
    this.#bindEvents();
  }

  #setElements() {
    this.#modal = this.shadowRoot?.querySelector('app-modal[name="edit-congregation"]');
    this.#cancelBtn = this.shadowRoot.querySelector('app-button[name=cancel-button]');
    this.#saveBtn = this.shadowRoot.querySelector('app-button[name=save-button]');

    this.#officialName = this.shadowRoot.getElementById('edit-congregation__official-name')
    this.#nickname = this.shadowRoot.getElementById('edit-congregation__nickname')
    this.#address = this.shadowRoot.getElementById('edit-congregation__address')
    this.#circuit = this.shadowRoot.getElementById('edit-congregation__circuit')
    this.#meetingDayTime = this.shadowRoot.getElementById('edit-congregation__meeting-date-time')
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (!oldValue || oldValue === newValue) return;
  
    if (name !== 'status') return;

    if (newValue === 'open') this.#readStorageData();

    queueMicrotask(() => {
      // 2) Re-hent modal hvis den er null
      this.#modal ||= this.shadowRoot?.querySelector('app-modal[name="edit-congregation"]');
      if (!this.#modal) return;

      newValue === 'closed' ? this.#modal.closeModal() : this.#modal.openModal();
    });
  }
  
  #readStorageData() {
    const sd = sessionStorage.getItem('speakersheetData');
    const partData = (sd && JSON.parse(sd).congregation) || {};

    this.#fillForm(
      partData.officialName,
      partData.nickname,
      partData.address,
      partData.circuit,
      partData.meetingDay,
      partData.meetingTime      
    );
  }

  #fillForm(officialName, nickname, address, circuit, meetingDay, meetingTime) {
    if(officialName) this.#officialName.setValue(officialName);
    if(nickname) this.#nickname.setValue(nickname);
    if(address) this.#address.setValue(address);
    if(circuit) this.#circuit.setValue(circuit);
    if(meetingDay && meetingTime) this.#meetingDayTime.setValues({ 'congregation-meeting-day': meetingDay, 'congregation-meeting-time': meetingTime });
  }

  #bindEvents() {
    const cancelBtnEventName = this.#cancelBtn.getAttribute('onclickeventname');
    const saveBtnEventName = this.#saveBtn.getAttribute('onclickeventname');

    this.#cancelBtn.addEventListener(cancelBtnEventName, e => {
      this.setAttribute('status', 'closed');
    });

    this.#saveBtn.addEventListener(saveBtnEventName, () => {
      if(!this.#validateFields()) return;

      const meetingDayTime = this.#meetingDayTime.getValues();

      this.#saveCongregation(
        {
          officialName: this.#officialName.getValue(),
          nickname: this.#nickname.getValue(),
          address: this.#address.getValue(),
          circuit: this.#circuit.getValue(),
          meetingDay: meetingDayTime['congregation-meeting-day'],
          meetingTime: meetingDayTime['congregation-meeting-time'],
        }
      );

      this.setAttribute('status', 'closed');
    });
  }

  #validateFields() {
    const validations = [
      this.#validateTextField(this.#officialName),
      this.#validateTextField(this.#address),
      this.#validateTextField(this.#circuit),
      this.#validateMeetingDateTime()
    ];

    return validations.every(x => x === true);
  }

  #validateTextField(field) {
    const val = field.getValue(); 

    if(val === '') {
      field.setAttribute('message', `"${field.getAttribute('label')}" mangler at blive udfyldt`);
      return false;
    }

    field.setAttribute('message', '')
    return true;
  }

  #validateMeetingDateTime() {
    const values = this.#meetingDayTime.getValues();

    if(!values['congregation-meeting-day'] || !values['congregation-meeting-time']) {
      this.#meetingDayTime.setAttribute('message', `"${this.#meetingDayTime.getAttribute('label')}" mangler at blive udfyldt`);
      return false;
    }

    this.#meetingDayTime.setAttribute('message', '');
    return true;
  }

  #saveCongregation(congregation) {
    const sd = JSON.parse(sessionStorage.getItem('speakersheetData'));

    sessionStorage.setItem('speakersheetData', JSON.stringify({...sd, congregation}));

    this.dispatchNamedEvent(this.#onDataUpdatedEventName, congregation);
  }
}

customElements.define('app-edit-congregation', AppEditCongregation);
