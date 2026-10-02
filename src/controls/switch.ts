// eslint-disable-next-line max-classes-per-file
import { inheritDefaults } from "../baseElement";
import WUPBaseControl, { SetValueReasons } from "./baseControl";

const tagName = "wup-switch";
declare global {
  namespace WUP.Switch {
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface ValidityMap extends WUP.BaseControl.ValidityMap {}
    interface NewOptions {
      /** Reversed-style (switch+label for true vs label+switch)
       * @defaultValue false */
      reverse: boolean;
    }
    interface Options<T = boolean, VM = ValidityMap> extends WUP.BaseControl.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPSwitchControl> extends WUP.BaseControl.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      "w-reverse"?: boolean | "";
      /** @deprecated use `w-initValue` instead */
      defaultChecked?: boolean;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSwitchControl; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with toggle button
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/switch}
       *  @see {@link WUPSwitchControl} */
      [tagName]: WUP.Base.ReactHTML<WUPSwitchControl> & WUP.Switch.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with toggle button
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/switch}
       *  @see {@link WUPSwitchControl} */
      [tagName]: HTMLAttributes<WUPSwitchControl> & WUP.Switch.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Form-control with toggle button
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/switch}
 * @example
  const el = document.createElement("wup-switch");
  el.$options.name = "isDarkMode";
  el.$options.label = "Dark Mode";
  el.$initValue = false;
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-switch w-name="isDarkMode" w-label="Dark Mode" w-initvalue="false"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *    <input type='checkbox'/>
 *    <strong>{$options.label}</strong>
 *    <span bar>
 *        <span thumb></span>
 *    </span>
 * </label> */
export default class WUPSwitchControl<
  TOptions extends WUP.Switch.Options = WUP.Switch.Options,
  EventMap extends WUP.Switch.EventMap = WUP.Switch.EventMap,
  ValueType = boolean
> extends WUPBaseControl<ValueType, TOptions, EventMap> {
  #ctr = this.constructor as typeof WUPSwitchControl;

  static get $styleRoot(): string {
    return "";
  }

  static get $style(): string {
    return super.$style;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static $isEqual(v1: unknown, v2: unknown, control: WUPBaseControl): boolean {
    return !!v1 === !!v2;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes;
    arr.push("defaultchecked");
    return arr;
  }

  static $defaults: WUP.Switch.Options = inheritDefaults(WUPBaseControl.$defaults, {
    validationRules: inheritDefaults(WUPBaseControl.$defaults.validationRules, {}),
    reverse: false,
  });

  get $value(): ValueType {
    return !!super.$value as ValueType;
  }

  set $value(v: ValueType) {
    super.$value = !!v as ValueType;
  }

  override parse(text: string): ValueType | undefined {
    return (text === "" || text === "1" || text.toLowerCase() === "true") as ValueType;
  }

  override valueToStorage(v: ValueType): string | null {
    return v ? "1" : null;
  }

  protected override renderControl(): void {
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    this.$refInput.type = "checkbox";
    this.$refLabel.appendChild(this.$refInput);
    this.$refLabel.appendChild(this.$refTitle);
    const sp = document.createElement("span");
    sp.setAttribute("bar", "");
    sp.appendChild(document.createElement("span")).setAttribute("thumb", "");
    this.$refLabel.appendChild(sp);
    this.appendChild(this.$refLabel);
  }

  protected override gotReady(): void {
    super.gotReady();
    this.$refInput.oninput = (e) => this.gotInput(e);
  }

  /** Called when user changes value via click or keyboard */
  protected gotInput(e: Event): void {
    if (this.$isReadOnly) {
      this.checkInput(!!this.$value); // rollback changes of browser
    } else {
      this.setValue((e.target as HTMLInputElement).checked as ValueType, SetValueReasons.userInput);
    }
  }

  /** Called when need to update check-state of input */
  protected checkInput(isChecked: boolean): void {
    this.$refInput.checked = isChecked;
    this.setAttr("checked", isChecked, true);
  }

  protected override setValue(v: ValueType, reason: SetValueReasons): boolean | null {
    const r = super.setValue(v, reason);
    this.checkInput(!!v);
    return r;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Switch.Options | any> | null): void {
    super.gotChanges(propsChanged as any);
    this.setAttr("w-reverse", this._opts.reverse, true);
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.setAttr.call(this.$refInput, "aria-readonly", this.$isReadOnly);
  }

  protected override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === "defaultchecked") {
      name = "initvalue";
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }
}

customElements.define(tagName, WUPSwitchControl);
