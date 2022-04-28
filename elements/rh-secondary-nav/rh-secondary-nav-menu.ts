import { html, LitElement } from 'lit';
import { customElement, property, queryAssignedNodes } from 'lit/decorators.js';

import { pfelement } from '@patternfly/pfe-core/decorators.js';
import { getRandomId } from '@patternfly/pfe-core/functions/random.js';

import styles from './rh-secondary-nav-menu.scss';

@customElement('rh-secondary-nav-menu') @pfelement()
export class RhSecondaryNavMenu extends LitElement {
  static readonly styles = [styles];

  @property({ reflect: true}) type: 'fixed-width' | 'full-width' = 'full-width';

  connectedCallback() {
    super.connectedCallback();

    this.id ||= getRandomId();
  }

  render() {
    return html`
      <div id="nav-menu">
        <div id="sections">
          <slot name="sections"></slot>
        </div>
      </div>
    `;
  }
}
