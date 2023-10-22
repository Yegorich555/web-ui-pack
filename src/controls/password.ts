import onEvent from "../helpers/onEvent";
import { stringLowerCount, stringUpperCount } from "../helpers/string";
import { WUPcssIcon } from "../styles";
import WUPTextControl from "./text";

const tagName = "wup-pwd";
declare global {
  namespace WUP.Password {
    interface EventMap extends WUP.Text.EventMap {}
    interface ValidityMap extends WUP.Text.ValidityMap {
      /** If count of numbers < pointed shows message 'Must contain at least {x} numbers' */
      minNumber: number;
      /** If count of uppercase letters < pointed shows message 'Must contain at least {x} upper case' */
      minUpper: number;
      /** If count of lowercase letters < pointed shows message 'Must contain at least {x} lower case' */
      minLower: number;
      /** If count of pointed chars < pointed shows message 'Must contain at least {x} special characters' */
      special: { min: number; chars: string };
      /** If $value != with previous siblint wup-pwd.$value shows message 'Passwords must be equal' */
      confirm: boolean;
    }
    interface Options<T = string, VM = ValidityMap>
      extends Omit<WUP.Text.Options<T, VM>, "mask" | "maskholder" | "storageKey" | "storage"> {
      /** Reversed-style for button-eye
       * @defaultValue false */
      reverse: boolean;
    }
    interface JSXProps<C = WUPPasswordControl>
      extends Omit<WUP.Text.JSXProps<C>, "mask" | "maskholder" | "prefix" | "postfix"> {
      /** Reversed-style for button-eye
       * @defaultValue false */
      "w-reverse"?: boolean | string;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPPasswordControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with password input
       *  @see {@link WUPPasswordControl} */
      [tagName]: WUP.Password.JSXProps<WUPPasswordControl>; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with password input
 * @example
  const el = document.createElement("wup-pwd");
  el.$options.name = "password";
  el.$options.validations = {
    required: true,
    min: 8,
    minNumber: 1,
    minUpper: 1,
    minLower: 1,
    special: { min: 1, chars: "#!-_?,.@:;'" }
  };
  el.$options.validationShowAll = true;

  const elConfirm = document.createElement("wup-pwd");
  elConfirm.$options.name = "passwordConfirm";
  elConfirm.$options.validations = { confirm: true };

  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-pwd w-name="password" w-validations="myValidations"/>
    <wup-pwd w-name="passwordConfirm" w-validations="myValidations2"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input/>
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label> */
export default class WUPPasswordControl<
  ValueType extends string = string,
  TOptions extends WUP.Password.Options = WUP.Password.Options,
  EventMap extends WUP.Password.EventMap = WUP.Password.EventMap
> extends WUPTextControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPPasswordControl;

  /** Text announced by screen-readers when input cleared; @defaultValue `input cleared` */
  static $ariaDescription = __wupln("press Alt + V to show/hide password", "aria");

  static get $styleRoot(): string {
    return `:root {
        --wup-icon-eye: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M384 122.182C209.455 122.182 60.392 230.749 0 384c60.392 153.251 209.455 261.818 384 261.818S707.608 537.251 768 384c-60.392-153.251-209.455-261.818-384-261.818zm0 436.363c-96.35 0-174.545-78.197-174.545-174.545S287.651 209.455 384 209.455 558.545 287.651 558.545 384 480.348 558.545 384 558.545zm0-279.272c-57.95 0-104.727 46.778-104.727 104.727S326.051 488.727 384 488.727 488.727 441.949 488.727 384 441.949 279.273 384 279.273z'/%3E%3C/svg%3E");
        --wup-icon-eye-off: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M384 209.375c96.393 0 174.625 78.232 174.625 174.625 0 22.701-4.54 44.005-12.573 63.913l101.981 101.981C700.77 505.889 742.331 448.961 767.826 384c-60.42-153.321-209.55-261.938-384.174-261.938-48.895 0-95.695 8.731-139.001 24.448l75.438 75.438c19.907-8.032 41.212-12.573 63.913-12.573zM34.75 114.03l95.695 95.695C72.469 254.778 27.067 314.85-.174 384.001 60.246 537.322 209.376 645.938 384 645.938c54.133 0 105.823-10.477 152.971-29.337l14.668 14.668 102.33 101.981 44.355-44.355L79.105 69.676 34.75 114.031zm193.135 193.135 54.133 54.133c-1.746 7.334-2.794 15.018-2.794 22.701 0 57.976 46.799 104.775 104.775 104.775 7.684 0 15.367-1.048 22.701-2.794l54.134 54.134c-23.4 11.525-49.244 18.51-76.835 18.51-96.393 0-174.625-78.232-174.625-174.625 0-27.591 6.985-53.435 18.51-76.835zm150.527-27.242 110.014 110.014.698-5.588c0-57.976-46.799-104.775-104.775-104.775l-5.937.349z'/%3E%3C/svg%3E");
     }`;
  }

  static get $style(): string {
    return `${super.$style}
        :host {
          --ctrl-icon-img: var(--wup-icon-eye);
        }
        :host[w-reverse] {
          --ctrl-icon-img: var(--wup-icon-eye-off);
        }
        :host input[type='password'] {
          font-family: Verdana, sans-serif;
          letter-spacing: 0.125;
          ${"margin-bottom: -1px;" /* font Verdana affects on height // todo somehow it's wrong on other apps */}
        }
        :host button[eye] {
          cursor: pointer;
          margin-right: -0.5em;
          ${WUPcssIcon}
          -webkit-mask-size: calc(var(--ctrl-icon-size) * 1.3);
          mask-size: calc(var(--ctrl-icon-size) * 1.3);
        }
        :host button[eye="off"] {
          --ctrl-icon-img: var(--wup-icon-eye-off);
        }
        :host[w-reverse] button[eye="off"] {
          --ctrl-icon-img: var(--wup-icon-eye);
        }
        @media (hover: hover) and (pointer: fine) {
          :host button[eye]:hover {
            box-shadow: none;
            background-color: var(--ctrl-focus-label);
          }
        }
        :host button[clear] {
          margin: 0;
        }`;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Password.Options = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPTextControl.$defaults.validationRules,
      minNumber: (v, setV) =>
        (!v || (v.match(/[0-9]/g)?.length ?? 0) < setV) &&
        __wupln(`Must contain at least ${setV} number${setV === 1 ? "" : "s"}`, "validation"),
      minUpper: (v, setV) =>
        (!v || stringUpperCount(v, setV) < setV) && __wupln(`Must contain at least ${setV} upper case`, "validation"),
      minLower: (v, setV) =>
        (!v || stringLowerCount(v, setV) < setV) && __wupln(`Must contain at least ${setV} lower case`, "validation"),
      special: (v, setV) =>
        (!v || ![...setV.chars].reduce((prev, c) => (v.includes(c) ? ++prev : prev), 0)) &&
        __wupln(
          `Must contain at least ${setV.min} special character${setV.min === 1 ? "" : "s"}: ${setV.chars}`,
          "validation"
        ),
      confirm: (v, setV, c) => {
        if (!setV) {
          return false;
        }
        const selector = c.tagName.toLowerCase();
        const all = document.querySelectorAll(selector);
        let i = -1;
        // eslint-disable-next-line no-restricted-syntax
        for (const el of all.values()) {
          if (c === el) {
            const found = all[i] as WUPPasswordControl;
            if (!found) {
              i = -2;
            } else if (found.$value === v) {
              return false;
            }
            break;
          }
          ++i;
        }
        if (i === -2) {
          return `Previous "${selector}" not found`;
        }
        return __wupln("Passwords must be equal", "validation");
      },
    },
    reverse: false,
  };

  $refBtnEye = document.createElement("button");
  protected override renderControl(): void {
    super.renderControl();
    this.$refInput.type = "password";
    this.$ariaDetails(this.#ctr.$ariaDescription);
    this.renderBtnEye();
  }

  /** Create & append element to control */
  protected renderBtnEye(): void {
    const b = this.$refBtnEye;
    b.setAttribute("eye", "");
    b.setAttribute("aria-hidden", true);
    b.setAttribute("type", "button");
    b.tabIndex = -1;
    onEvent(
      b,
      "click",
      (e) => {
        e.preventDefault(); // prevent from submit
        this.toggleVisibility();
      },
      { passive: false }
    );
    this.$refLabel.appendChild(b);
  }

  protected toggleVisibility(): void {
    const start = this.$refInput.selectionStart;
    const end = this.$refInput.selectionEnd;
    const isOff = this.$refBtnEye.getAttribute("eye") !== "off";
    this.$refBtnEye.setAttribute("eye", isOff ? "off" : "");
    this.$refInput.type = isOff ? "text" : "password";
    window.requestAnimationFrame(() => {
      this.$refInput.setSelectionRange(start, end);
    }); // otherwise selection is reset
  }

  protected override gotChanges(propsChanged: Array<string> | null): void {
    super.gotChanges(propsChanged as any);
    this.$refInput.autocomplete = this.$autoComplete || "new-password"; // otherwise form with email+password ignores autocomplete: "off" if previously it was saved
    // it can be ignored by browsers. To fix > https://stackoverflow.com/questions/2530/how-do-you-disable-browser-autocomplete-on-web-form-field-input-tags
    // https://stackoverflow.com/questions/11708092/detecting-browser-autofill

    this.setAttr("w-reverse", this._opts.reverse, true);
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    if (e.altKey && e.key === "v") {
      this.toggleVisibility();
    }
    super.gotKeyDown(e);
  }

  protected override storageSet(): void {
    console.error("Saving not allowed for password. Remove $options.storageKey");
  }
}

// prettify defaults before create
let rr: Array<keyof WUP.Text.Options> | undefined = ["mask", "maskholder", "storageKey", "storage"];
rr.forEach((k) => delete WUPPasswordControl.$defaults[k as keyof WUP.Password.Options]);
rr = undefined;

customElements.define(tagName, WUPPasswordControl);

// manual testcase: form with email+password ignores autocomplete: "off" if previously it was saved
