import { html, LitElement, css } from 'lit';
import { customElement } from 'lit/decorators.js';

import { pfelement } from '@patternfly/pfe-core/decorators.js';

import styles from './rh-secondary-nav-menu-section.scss';

@customElement('rh-secondary-nav-menu-section') @pfelement()
export class RhSecondaryNavMenuSection extends LitElement {
  static readonly styles = [styles];

  render() {
    return html`
      <section>
        <slot name="header"></slot>
        <slot name="links"></slot>
      </section>
    `;
  }
}
