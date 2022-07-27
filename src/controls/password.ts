import onEvent from "../helpers/onEvent";
import { stringLowerCount, stringUpperCount } from "../helpers/stringCaseCount";
// eslint-disable-next-line import/named
import WUPTextControl, { WUPTextIn } from "./text";

const tagName = "wup-pwd";
export namespace WUPPasswordIn {
  export interface Def {}
  export interface Opt {}
  export type Generics<
    ValueType = string,
    ValidationKeys extends WUPText.ValidationMap = WUPPassword.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPTextIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = string> = Generics<T>["Defaults"];
  export type GenOpt<T = string> = Generics<T>["Options"];
}

declare global {
  namespace WUPPassword {
    interface ValidationMap extends WUPText.ValidationMap {
      minNumber: number;
      minUpper: number;
      minLower: number;
      special: { min: number; chars: string };
    }
    interface EventMap extends WUPText.EventMap {}
    interface Defaults<T = string> extends WUPPasswordIn.GenDef<T> {}
    interface Options<T = string> extends WUPPasswordIn.GenOpt<T> {}
    interface JSXProps<T extends WUPPasswordControl> extends WUPText.JSXProps<T> {}
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPPasswordControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPPassword.JSXProps<WUPPasswordControl>;
    }
  }
}
/**
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input />
 *      <strong>{$options.label}</strong>
 *   </span>
 * </label>
 */
export default class WUPPasswordControl<
  ValueType = string,
  EventMap extends WUPPassword.EventMap = WUPPassword.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPPasswordControl;

  /** Text announced by screen-readers when input cleared; @defaultValue `input cleared` */
  static get $ariaDescription(): string {
    return "press Alt + V to show/hide password";
  }

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
        :host input[type='password'] {
          font-family: Verdana, sans-serif;
          letter-spacing: 0.125;
          ${"margin-bottom: -1px;" /* font Verdana affects on height */}
        }
        :host button[eye] {
          margin-right: -0.5em;
          -webkit-mask-image: var(--ctrl-icon-img);
          mask-image: var(--ctrl-icon-img);
          -webkit-mask-size: calc(var(--ctrl-icon-size) * 1.3);
          mask-size: calc(var(--ctrl-icon-size) * 1.3);
        }
        :host button[eye="off"] {
          --ctrl-icon-img: var(--wup-icon-eye-off);
        }
        @media (hover: hover) {
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
  static $defaults: WUPPassword.Defaults = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPTextControl.$defaults.validationRules,
      minNumber: (v, setV) =>
        (!v || (v.match(/[0-9]/g)?.length ?? 0) < setV) &&
        `Must contain at least ${setV} number${setV === 1 ? "" : "s"}`,
      minUpper: (v, setV) => (!v || stringUpperCount(v, setV) < setV) && `Must contain at least ${setV} upper case`,
      minLower: (v, setV) => (!v || stringLowerCount(v, setV) < setV) && `Must contain at least ${setV} lower case`,
      special: (v, setV) =>
        (!v || ![...setV.chars].reduce((prev, c) => (v.includes(c) ? ++prev : prev), 0)) &&
        `Must contain at least ${setV.min} special character${setV.min === 1 ? "" : "s"}: ${setV.chars}`,
    },
  };

  $options: WUPPassword.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

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
    b.tabIndex = -1;
    onEvent(b, "click", (e) => {
      e.preventDefault(); // prevent from submit
      e.stopPropagation();
      this.toggleVisibility();
    });
    this.$refLabel.appendChild(b);
  }

  protected toggleVisibility(): void {
    const start = this.$refInput.selectionStart;
    const end = this.$refInput.selectionEnd;
    const isOff = this.$refBtnEye.getAttribute("eye") !== "off";
    this.$refBtnEye.setAttribute("eye", isOff ? "off" : "");
    this.$refInput.type = isOff ? "text" : "password";
    window.requestAnimationFrame(() => {
      this.$refInput.selectionEnd = end;
      this.$refInput.selectionStart = start;
    }); // otherwise selection is reset
  }

  protected override gotChanges(propsChanged: Array<keyof WUPPassword.Options> | null): void {
    super.gotChanges(propsChanged);
    this.$refInput.autocomplete = this.$autoComplete || "new-password"; // otherwise form with email+password ignores autocomplete: "off" if previously it was saved
    // it can be ignored by browsers. To fix > https://stackoverflow.com/questions/2530/how-do-you-disable-browser-autocomplete-on-web-form-field-input-tags
    // https://stackoverflow.com/questions/11708092/detecting-browser-autofill
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    if (e.altKey && e.key === "v") {
      this.toggleVisibility();
    }
    super.gotKeyDown(e);
  }
}

customElements.define(tagName, WUPPasswordControl);

// testcase: form with email+password ignores autocomplete: "off" if previously it was saved
// testcase: toggle eye-btn and check if height stay the same

// todo option reverse btn-eye;
