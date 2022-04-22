import { html, LitElement, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { ComposedEvent } from '@patternfly/pfe-core';
import { pfelement, bound, observed } from '@patternfly/pfe-core/decorators.js';
import { SlotController } from '@patternfly/pfe-core/controllers/slot-controller.js';
import { getRandomId } from '@patternfly/pfe-core/functions/random.js';
import { RhSecondaryNavMenu } from './rh-secondary-nav-menu';

export class SecondaryNavDropdownChangeEvent extends ComposedEvent {
  constructor(
    public expanded: boolean,
    public toggle: RhSecondaryNavDropdown,
  ) {
    super('change');
  }
}

import styles from './rh-secondary-nav-dropdown.scss';

@customElement('rh-secondary-nav-dropdown') @pfelement()
export class RhSecondaryNavDropdown extends LitElement {
  static readonly styles = [styles];

  private _slots = new SlotController(this, { slots: ['link', 'menu'] });

  @observed
  @property({ attribute: false }) expanded = false;


  constructor() {
    super();
    // set default value to false so _expandedChange doesn't trigger on load
    this.expanded = false;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.id ||= getRandomId();

    const [link] = this._slots.getSlotted<HTMLElement>('link');
    link.setAttribute('role', 'button');
    link.setAttribute('aria-expanded', 'false');
    const [menu] = this._slots.getSlotted<HTMLElement>('menu');
    link.setAttribute('aria-controls', menu.id);
    link.addEventListener('click', this._clickHandler);
  }

  render() {
    return html`
      <slot name="link"></slot>
      <slot name="menu"></slot>
    `;
  }

  protected _expandedChanged(oldVal?: 'false' | 'true', newVal?: 'false' | 'true') {
    if (newVal === oldVal) return;
    newVal ? this._open() : this._close();
  }

  @bound
  private _clickHandler( event: MouseEvent ) {
    const expanded = !this.expanded;
    this.dispatchEvent(new SecondaryNavDropdownChangeEvent(expanded, this));
  }

  private _open() {
    const link = this._slots.getSlotted('link').find(child => child instanceof HTMLAnchorElement)
    link?.setAttribute('aria-expanded', 'true')
    const menu = this._slots.getSlotted('menu').find(child => child instanceof RhSecondaryNavMenu)
    menu?.setAttribute('visible', '')
  }

  private _close() {
    const link = this._slots.getSlotted('link').find(child => child instanceof HTMLAnchorElement)
    link?.setAttribute('aria-expanded', 'false')
    const menu = this._slots.getSlotted('menu').find(child => child instanceof RhSecondaryNavMenu)
    menu?.removeAttribute('visible')
  }

}
