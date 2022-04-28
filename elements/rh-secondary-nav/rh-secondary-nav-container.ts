import { html, LitElement, css } from 'lit';
import { customElement } from 'lit/decorators.js';

import { pfelement, bound } from '@patternfly/pfe-core/decorators.js';

import { getRandomId } from '@patternfly/pfe-core/functions/random.js';

import { RhSecondaryNavDropdown } from './rh-secondary-nav-dropdown.js';

import styles from './rh-secondary-nav-container.scss';

@customElement('rh-secondary-nav-container') @pfelement()
export class RhSecondaryNavContainer extends LitElement {
  static readonly styles = [styles];

  connectedCallback() {
    super.connectedCallback();
    this.id ||= getRandomId();
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
    const button = event.target as HTMLButtonElement;
    button?.getAttribute('aria-expanded') === 'false' ? button?.setAttribute('aria-expanded', 'true') : button?.setAttribute('aria-expanded', 'false');
    this.hasAttribute('expanded') ? this.removeAttribute('expanded') : this.setAttribute('expanded','');
  }
}