import { html, LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { pfelement } from '@patternfly/pfe-core/decorators.js';

@customElement('rh-secondary-nav-menu') @pfelement()
export class RhSecondaryNavMenu extends LitElement {
  // static readonly styles = [styles];
  static get styles() {
    return css`
      :host {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(13.75rem, 1fr));
        grid-template-rows: auto;
        grid-gap: 2rem;
      }
    `;
  }

  @property({ reflect: true}) type: 'fixed-width' | 'full-width' = 'full-width';

  render() {
    return html`
      <slot name="sections"></slot>
    `;
  }
}
