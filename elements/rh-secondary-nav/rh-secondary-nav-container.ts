import { html, LitElement, css } from 'lit';
import { customElement } from 'lit/decorators.js';

import { pfelement, bound } from '@patternfly/pfe-core/decorators.js';

import { RhSecondaryNavDropdown } from './rh-secondary-nav-dropdown.js';

import styles from './rh-secondary-nav-container.scss';

@customElement('rh-secondary-nav-container') @pfelement()
export class RhSecondaryNavContainer extends LitElement {
  static readonly styles = [styles];

  connectedCallback() {
    super.connectedCallback();
  }

  render() {
    return html`
      <slot name="logo"></slot>
      <button @click="${this._toggleMenu}">Menu</button>
      <slot name="nav"></slot>
      <slot name="cta"></slot>
    `;
  }

  private _toggleMenu() {
    const navItems = this.querySelectorAll('[slot=nav], [slot=cta]');
    navItems.forEach((item) => {
      if (item?.classList.contains('expand')) {
        item?.classList.remove('expand');
      } else {
        item?.classList.add('expand');
      }
    })
  }
}