import { html, LitElement } from 'lit';
import { customElement, property, queryAssignedNodes, state } from 'lit/decorators.js';

import { pfelement } from '@patternfly/pfe-core/decorators.js';

import { getRandomId } from '@patternfly/pfe-core/functions/random.js';

import styles from './rh-secondary-nav-menu.scss';

@customElement('rh-secondary-nav-menu') @pfelement()
export class RhSecondaryNavMenu extends LitElement {
  static readonly styles = [styles];

  @property({ reflect: true}) type: 'fixed-width' | 'full-width' = 'full-width';

  @queryAssignedNodes('cta', true)
  private _ctaNodes: NodeListOf<HTMLElement>;

  @state()
  private _hasCta = false;

  connectedCallback() {
    super.connectedCallback();

    this.id ||= getRandomId();
  }

  render() {
    return this._hasCta ? html`
      <div id="nav-menu">
        <div id="sections">
          <slot name="sections"></slot>
        </div>
        <div id="cta">
          <slot name="cta" @slotchange=${this._onCtaSlotChange}></slot>
        </div>
      </div>
    ` : html`
      <div id="nav-menu">
        <div id="sections">
          <slot name="sections"></slot>
        </div>
        <slot name="cta" @slotchange=${this._onCtaSlotChange}></slot>
      </div>
    `;
  }

  private _onCtaSlotChange() {
    this._hasCta = this._ctaNodes.length > 0;
  }
}
