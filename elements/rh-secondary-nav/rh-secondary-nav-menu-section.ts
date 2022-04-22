import { html, LitElement, css } from 'lit';
import { customElement } from 'lit/decorators.js';

import { pfelement } from '@patternfly/pfe-core/decorators.js';

@customElement('rh-secondary-nav-menu-section') @pfelement()
export class RhSecondaryNavMenuSection extends LitElement {
  // static readonly styles = [styles];
  static get styles() {
    return css`
      ::slotted([slot="links"]) {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
    `;
  }

  render() {
    return html`
      <section>
        <slot name="header"></slot>
        <slot name="links"></slot>
      </section>
    `;
  }
}
