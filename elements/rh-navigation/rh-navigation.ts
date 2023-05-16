import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators/custom-element.js';
import { classMap } from 'lit/directives/class-map.js';
import { Logger } from '@patternfly/pfe-core/controllers/logger.js';

import './rh-navigation-menu-section.js';
import './rh-navigation-overlay.js';

import { ComposedEvent } from '@patternfly/pfe-core';

import { RhNavigationDropdown, NavDropdownExpandEvent } from './rh-navigation-dropdown.js';

import { DirController } from '../../lib/DirController.js';
import { ScreenSizeController } from '../../lib/ScreenSizeController.js';

export class NavOverlayChangeEvent extends ComposedEvent {
  constructor(
    public open: boolean,
    public toggle: HTMLElement
  ) {
    super('overlay-change');
  }
}

import styles from './rh-navigation.css';
import { state } from 'lit/decorators/state.js';

/**
 * Red Hat Nav
 *
 * @summary  Connects a series of pages across web properties
 *
 * @slot logo           - Logo added to the main nav bar, expects a `<a> | <a><svg/></a> | <a><img/></a>`
 * @slot nav            - Navigation list added to the main nav bar, expects a `<ul>`
 * @slot cta            - Nav bar level CTA, expects a `<rh-cta>
 * @slot mobile-menu    - Text label for the mobile menu button, for l10n. Defaults to "Menu"
 *
 * @csspart nav         - container, <nav> element
 * @csspart container   - container, <div> element
 * @csspart cta         - container, <div> element
 *
 * @fires {NavOverlayChangeEvent} overlay-change -
 *                                         Fires when an dropdown is opened or closed in desktop
 *                                         view or when the mobile menu button is toggled in mobile
 *                                         view.
 */
@customElement('rh-navigation')
export class RhNavigation extends LitElement {
  static readonly styles = [styles];

  #logger = new Logger(this);

  #logoCopy: HTMLElement | null = null;

  /**
   * The accessible label for the <nav> element
   */
  #label = '';

  /** Is the element in an RTL context? */
  #dir = new DirController(this);

  /** Compact mode  */
  #compact = false;

  /**
   * `mobileMenuExpanded` property is toggled when the mobile menu button is clicked,
   * a focusout event occurs, or on an overlay click event.  It also switches state
   * when the viewport changes breakpoints depending on if a dropdown is open or not.
   */
  @state() private mobileMenuExpanded = false;

  @state() private overlayOpen = false;

  /**
   * ScreenSizeController effects callback to set #compact
   * When viewport size changes,
   *  - If viewport is mobile, open mobile menu
   *  - otherwise, close mobile menu and close overlay
   */
  #screenSize = new ScreenSizeController(this, 'lg', {
    onChange: matches => {
      this.#compact = !matches;
      const dropdownsOpen = this.#allDropdowns().some(x => x.expanded);
      this.mobileMenuExpanded = this.#compact && dropdownsOpen;
      this.overlayOpen = dropdownsOpen;
    }
  });

  /**
   * Checks if passed in element is a RhNavigationDropdown
   * @param element:
   * @returns {boolean}
   */
  static isDropdown(element: Element | null): element is RhNavigationDropdown {
    return element instanceof RhNavigationDropdown;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.#compact = !this.#screenSize.matches.has('lg');
    this.addEventListener('expand-request', this.#onExpandRequest);
    this.addEventListener('overlay-change', this.#onOverlayChange);
    this.addEventListener('focusout', this.#onFocusout);
    this.addEventListener('keydown', this.#onKeydown);
    this.#upgradeAccessibility();
  }

  render() {
    const expanded = this.mobileMenuExpanded;
    const rtl = this.#dir.dir === 'rtl';
    return html`
      <nav part="nav"
          class="${classMap({ compact: this.#compact, rtl })}"
          aria-label="${this.#label}">
        ${this.#logoCopy}
        <div id="container" part="container" class="${classMap({ expanded })}">
          <slot name="logo" id="logo"></slot>
          <button aria-controls="container"
                  aria-expanded="${String(expanded)}"
                  @click="${this.#toggleMobileMenu}">
                  <div id="hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <slot name="mobile-menu">Menu</slot></button>
          <slot name="nav"></slot>
          <div id="secondary-links" part="secondary-links">
            <slot name="secondary-links"></slot>
          </div>
        </div>
      </nav>
      <rh-navigation-overlay
          .open="${this.overlayOpen}"
          @click="${this.#onOverlayClick}"
      ></rh-navigation-overlay>
    `;
  }

  /**
   * Public API, opens a specific dropdown based on index.
   * Closes all open dropdowns before opening specified.
   * Toggles overlay to open
   */
  open(index: number): void {
    if (index == null) {
      return;
    }
    const dropdown = this.#dropdownByIndex(index);
    if (dropdown && RhNavigation.isDropdown(dropdown)) {
      this.close();
      this.#expand(index);
      dropdown?.querySelector('a')?.focus();
      this.overlayOpen = true;
    }
  }

  /**
   * Public API, closes all open dropdowns
   */
  close(): void {
    const dropdowns = this.#allDropdowns();
    dropdowns.forEach(dropdown => this.#closeDropdown(dropdown));
  }

  /**
   * When dropdown event is triggered gets dropdown index that triggered
   * event then closes all dropdowns.
   * If the event is to open a dropdown, run #expand(index)
   * If isMobile is set dispatch an NavOverlayChangeEvent event
   * to open the overlay
   */
  #onExpandRequest(event: Event): void {
    if (event instanceof NavDropdownExpandEvent) {
      const index = this.#getDropdownIndex(event.target as Element);
      if (index === null || index === undefined) {
        return;
      }
      this.close();
      if (event.expanded) {
        this.#expand(index);
      }
      if (this.#screenSize.matches.has('md')) {
        this.dispatchEvent(new NavOverlayChangeEvent(event.expanded, event.toggle));
      }
    }
  }

  /**
   * Handles when focus changes outside of the navigation
   * If _compact is set, close the mobileMenu
   * Closes all dropdowns and toggles overlay to closed
   */
  #onFocusout(event: FocusEvent) {
    const target = event.relatedTarget as HTMLElement;
    if (target?.closest('rh-navigation, rh-nav') === this || target === null) {
      // if the focus is still inside the rh-navigation exit
      return;
    } else {
      if (this.#screenSize.matches.has('md')) {
        this.mobileMenuExpanded = false;
      }
      this.close();
      this.overlayOpen = false;
    }
  }

  /**
   * Handles when the overlay receives a click event
   * Closes all dropdowns and toggles overlay to closed
   * If _compact then closes mobile menu to closed
   */
  #onOverlayClick() {
    this.close();
    this.overlayOpen = false;
    if (!this.#screenSize.matches.has('md')) {
      this.mobileMenuExpanded = false;
    }
  }

  /**
   * Closes dropdown menu on keydown, then places
   * focus on last button clicked
   */
  #onKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        if (this.#screenSize.matches.has('md')) {
          this.mobileMenuExpanded = false;
          this.shadowRoot?.querySelector('button')?.focus?.();
        } else {
          this.#allDropdowns()
            .find(x => x.expanded)
            ?.querySelector('a')
            ?.focus();
        }
        this.close();
        this.overlayOpen = false;
        break;
      default:
        break;
    }
  }

  /**
   * Gets all dropdowns and finds the element given and returns its index
   */
  #getDropdownIndex(element: Element | null): void | number {
    if (!RhNavigation.isDropdown(element)) {
      this.#logger.warn('The getDropdownIndex method expects to receive a dropdown element.');
      return;
    }
    const dropdowns = this.#allDropdowns();
    const index = dropdowns.findIndex(dropdown => dropdown.id === element.id);
    return index;
  }

  /**
   * Gets all dropdowns and returns the dropdown given an index
   */
  #dropdownByIndex(index: number): void | RhNavigationDropdown {
    const dropdowns = this.#allDropdowns();
    if (dropdowns[index] === undefined) {
      this.#logger.error('This dropdown index does not exist.');
      return;
    }
    return dropdowns[index];
  }

  /**
   * Opens a dropdown given an index
   */
  #expand(index: number): void {
    if (index == null) {
      return;
    }
    const dropdown = this.#dropdownByIndex(index);
    if (dropdown && RhNavigation.isDropdown(dropdown)) {
      this.#openDropdown(dropdown);
    }
  }

  /**
   * Gets all dropdowns
   */
  #allDropdowns(): RhNavigationDropdown[] {
    return Array.from(this.querySelectorAll('rh-navigation-dropdown, rh-nav-dropdown'));
  }

  /**
   * Sets property expanded=false on dropdown given
   */
  #closeDropdown(dropdown: RhNavigationDropdown): void {
    if (dropdown.expanded === false) {
      return;
    }
    dropdown.expanded = false;
  }

  /**
   * Sets property expanded=true on dropdown given
   */
  #openDropdown(dropdown: RhNavigationDropdown): void {
    if (dropdown.expanded === true) {
      return;
    }
    dropdown.expanded = true;
  }

  /**
   * Toggles the overlay triggered by eventListener
   */
  #onOverlayChange(event: Event) {
    if (event instanceof NavOverlayChangeEvent) {
      if (this.contains(event.toggle)) {
        this.overlayOpen = event.open;
      }
    }
  }

  /**
   * Upgrades the aria attributes on upgrade
   */
  #upgradeAccessibility(): void {
    // remove role="navigation" from host on upgrade
    this.removeAttribute('role');
    // remove aria-labelledby from slotted `<ul>` on upgrade
    this.querySelector(':is([slot="nav"]):is(ul)')?.removeAttribute('aria-labelledby');
    // transfer the aria-label to the shadow <nav>
    if (this.hasAttribute('aria-label')) {
      this.#label = this.getAttribute('aria-label') ?? '';
      this.removeAttribute('aria-label');
    }
  }

  /**
   * Toggles the mobile menu from `@click` of the _mobileMenuButton
   */
  #toggleMobileMenu() {
    this.mobileMenuExpanded = !this.mobileMenuExpanded;
    this.dispatchEvent(new NavOverlayChangeEvent(this.mobileMenuExpanded, this));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rh-navigation': RhNavigation;
  }
}
