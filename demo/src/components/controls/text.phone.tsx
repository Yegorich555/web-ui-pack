import Example from "src/elements/example";
import { WUPDropdownElement, WUPTextControl } from "web-ui-pack";
import { inheritDefaults } from "web-ui-pack/baseElement";
import { SetValueReasons, ValidateFromCases } from "web-ui-pack/controls/baseControl";
import { WUPcssIcon } from "web-ui-pack/styles";

WUPDropdownElement.$use();

interface Country {
  /** Short name displayed on the dropdown button */
  id: string;
  name: string;
  /** Must start with dialing code followed by space */
  mask: string;
}

/** Returns dialing code of the country: "+1" for mask "+1 (000) 000-0000" */
const dialCode = (c: Country): string => c.mask.split(" ")[0];

/** TextControl with built-in dropdown (prepended into <label/>) to select country code */
export class WUPPhoneControl extends WUPTextControl {
  #ctr = this.constructor as typeof WUPPhoneControl;

  static get $style(): string {
    return `${super.$style}
      :host wup-dropdown {
        flex: 0 0 auto;
        margin-right: 0.5em;
      }
      :host wup-dropdown button {
        font-weight: normal;
        color: inherit;
        background: none;
      }
      :host wup-dropdown > button {
        display: flex;
        align-items: center;
        padding: 0 0 0 0.4em;
      }
      :host wup-dropdown > button:after {
        content: "";
        --ctrl-icon-img: var(--wup-icon-chevron);
        ${WUPcssIcon}
      }
      :host wup-dropdown > button[aria-expanded=true]:after {
        transform: rotate(180deg);
      }
      :host wup-dropdown [menu] li {
        position: relative;
        padding: 0;
      }
      :host wup-dropdown [menu] li[aria-selected=true]:after {
        position: absolute;
        right: 1em;
        top: 50%;
        transform: translateY(-50%);
      }
      :host wup-dropdown [menu] li > button {
        width: 100%;
        padding: 1em;
        padding-right: calc(1.5em + var(--ctrl-icon-size)); ${/* space for check-icon */ ""}
        border-radius: 0;
        text-align: start;
      }
      :host wup-dropdown [menu] li > button:hover {
        box-shadow: none;
      }
      :host wup-dropdown [menu] li > button:focus {
        box-shadow: inset 0 0 0 2px var(--base-btn-focus);
      }`;
  }

  /** Countries available in the dropdown; the first one is selected by default */
  static $countries: Country[] = [
    { id: "US", name: "United States", mask: "+1 (000) 000-0000" },
    { id: "GB", name: "United Kingdom", mask: "+44 0000 000000" },
    { id: "FR", name: "France", mask: "+33 0 00 00 00 00" },
    { id: "PL", name: "Poland", mask: "+48 000 000 000" },
    { id: "BY", name: "Belarus", mask: "+375 (00) 000-00-00" },
    { id: "IN", name: "India", mask: "+91 00000 00000" },
  ];

  static $defaults: WUP.Text.Options = inheritDefaults(WUPTextControl.$defaults, {
    mask: WUPPhoneControl.$countries[0].mask,
  });

  /** Currently selected country */
  $country = this.#ctr.$countries[0];
  /** Reference to dropdown before the input */
  $refCountry = document.createElement("wup-dropdown");
  /** Reference to button that opens the dropdown */
  $refCountryBtn = document.createElement("button");

  protected override renderControl(): void {
    super.renderControl();

    this.$refCountry.$options.closeOnPopupClick = false; // it's closed manually to move focus to the input
    this.$refCountryBtn.type = "button";
    this.$refCountry.appendChild(this.$refCountryBtn);
    const ul = this.$refCountry
      .appendChild(document.createElement("wup-popup"))
      .appendChild(document.createElement("ul"));
    this.#ctr.$countries.forEach((c) => {
      const btn = ul.appendChild(document.createElement("li")).appendChild(document.createElement("button"));
      btn.type = "button";
      btn.textContent = `${c.name} ${dialCode(c)}`;
      btn.onclick = () => this.gotCountrySelect(c);
    });
    this.$refLabel.prepend(this.$refCountry);
    this.renderCountry();
  }

  /** Update dropdown according to selected country */
  protected renderCountry(): void {
    const c = this.$country;
    this.$refCountryBtn.textContent = c.id;
    this.$refCountryBtn.setAttribute("aria-label", `Country code: ${c.name} ${dialCode(c)}`);
    this.$refCountry.querySelectorAll("li").forEach((li, i) => {
      li.setAttribute("aria-selected", this.#ctr.$countries[i] === c);
    });
  }

  /** Apply mask related to country */
  protected setCountry(c: Country): void {
    this.$country = c;
    this._opts.mask = c.mask;
    this._opts.maskholder = ""; // to re-generate it by new mask
    this.$isReady && this.gotChanges(["mask", "maskholder"]); // apply immediately: changing $options is applied only after timeout
    this.renderCountry();
  }

  /** Called when user selects country in the dropdown */
  protected gotCountrySelect(c: Country): void {
    this.$refCountry.$refPopup.$close();
    this.focus(); // so user can continue typing the number
    const prev = this.$country;
    if (c === prev) {
      return;
    }
    const localNumber = (this.$value ?? "").substring(dialCode(prev).length).replace(/\D/g, "");
    this.setCountry(c);
    if (!localNumber) {
      this.setValue(undefined, SetValueReasons.userInput);
      return;
    }
    const m = this.refMask!; // re-created by setCountry
    m.parse(dialCode(c) + localNumber);
    this.setValue(m.value, SetValueReasons.userInput);
    if (!m.isCompleted) {
      this._inputError = this.#ctr.$errorMask; // the same as user types incomplete value
      this.goValidate(ValidateFromCases.onChange);
    }
  }

  protected override setInputValue(v: string, reason: SetValueReasons): void {
    // select country related to value: on $value/$initValue changes & reset by Esc/clearButton
    const c = v && this.#ctr.$countries.find((x) => v.startsWith(`${dialCode(x)} `));
    c && c !== this.$country && this.setCountry(c);
    super.setInputValue(v, reason);
  }

  override gotFormChanges(propsChanged: Array<string> | null): void {
    super.gotFormChanges(propsChanged);
    this.$refCountryBtn.disabled = this.$isDisabled || this.$isReadOnly;
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    if (this.$refCountry.includes(e.target)) {
      e.submitPrevented = true; // Enter must click on the button without form submit
      return; // skip input related actions: clearing by Esc, undo/redo etc.
    }
    super.gotKeyDown(e);
  }
}

const tagName = "wup-phone";
customElements.define(tagName, WUPPhoneControl);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPPhoneControl;
  }
}

declare module "react" {
  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Base.ReactHTML<WUPPhoneControl> & WUP.Text.JSXProps;
    }
  }
}

export default function TextControlPhone() {
  return (
    <Example header="Built-in dropdown before input" link="demo/src/components/controls/text.phone.tsx">
      <wup-phone
        w-name="phoneIntl"
        w-label="Phone number with country code"
        ref={(el) => {
          if (el) {
            el.$initValue = "+44 1234 567890";
            el.$options.validations = { required: true };
          }
        }}
      />
      Features:
      <ul>
        <li>
          extends <b>WUPTextControl</b>: <b>wup-dropdown</b> is prepended into the label in the <b>renderControl()</b>
        </li>
        <li>country changes $options.mask; the local part of the number is kept</li>
        <li>country is detected by $value/$initValue (so reset by Esc or clear button also rolls back the country)</li>
        <li>keyboard: Shift+Tab from input focuses the dropdown, Tab goes through items</li>
      </ul>
    </Example>
  );
}
