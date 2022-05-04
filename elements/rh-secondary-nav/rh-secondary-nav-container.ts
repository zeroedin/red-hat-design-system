import { html, LitElement, css } from 'lit';
import { customElement, query } from 'lit/decorators.js';

import { pfelement, bound } from '@patternfly/pfe-core/decorators.js';

import { getRandomId } from '@patternfly/pfe-core/functions/random.js';

import { RhSecondaryNavDropdown } from './rh-secondary-nav-dropdown.js';

import styles from './rh-secondary-nav-container.scss';

@customElement('rh-secondary-nav-container') @pfelement()
export class RhSecondaryNavContainer extends LitElement {
  static readonly styles = [styles];

  @query('button') _button: HTMLButtonElement;

  connectedCallback() {
    super.connectedCallback();
    this.id ||= getRandomId();

    this.addEventListener('change', this._changeHandler as EventListener);
  }

  render() {
    return html`
      <slot name="logo"></slot>
      <button aria-expanded="false" aria-controls="${this.id}" @click="${this._toggleMenu}">Menu</button>
      <slot name="nav"></slot>
      <div id="cta"><slot name="cta"></slot></div>
    `;
  }

  private _toggleMenu(event: MouseEvent) {
    if (this._button?.getAttribute('aria-expanded') === 'false'){
      this._open()
    } else {
      this._close()
    }
  }

  @bound 
  private _changeHandler(event: SecondaryNavDropdownChangeEvent) {
    // only respond to expanded, if it responds close events then it will close
    // full menu when a single dropdown is closed in mobile view.
    if (event.expanded) {
      this._open()
    } 
  }

  private _open() {
    if (this._button?.getAttribute('aria-expanded') === "true") return;
    this._button?.setAttribute('aria-expanded', 'true')
    this.setAttribute('expanded',''); 
  }

  private _close() {
    if (this._button?.getAttribute('aria-expanded') === "false") return;
    this._button?.setAttribute('aria-expanded', 'false');
    this.removeAttribute('expanded');
  }
}