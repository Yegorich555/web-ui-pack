import { WUPcssHidden } from "../styles";
import WUPBaseControl, { SetValueReasons } from "./baseControl";

const tagName = "wup-radio";
declare global {
  namespace WUP.Radio {
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface ValidityMap extends WUP.BaseControl.ValidityMap {}
    interface Defaults<T = any, VM = ValidityMap> extends WUP.BaseControl.Defaults<T, VM> {}
    interface Options<T = any, VM = ValidityMap> extends WUP.BaseControl.Options<T, VM>, Defaults<T, VM> {
      /** Items showed as radio-buttons
       * @tutorial Troubleshooting
       * * array items is converted to Proxy (observer) so
       * ```js
       * const items = [text: "1", value: {name: "Janny"}]
       * el.$options.items = items;
       * setTimeout(()=> console.warn(el.$options.items === items)},1) // returns 'false'
       * setTimeout(()=> console.warn(el.$options.items[0].value === items[0].value)},1) // returns 'true'
       * ``` */
      items: WUP.Select.MenuItems<T> | (() => WUP.Select.MenuItems<T>);
      /** Reversed-style (radio+label for true vs label+radio)
       * @defaultValue false */
      reverse?: boolean;
    }
    interface Attributes extends WUP.BaseControl.Attributes {
      /** Items showed as radio-buttons. Point global obj-key with items (set `window.inputRadio.items` for `window.inputRadio.items = [{value: 1, text: 'Item 1'}]` ) */
      items?: string;
      /** Reversed-style (radio+label vs label+radio) */
      reverse?: boolean | "";
    }
    interface JSXProps<C = WUPRadioControl> extends WUP.BaseControl.JSXProps<C>, Attributes {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPRadioControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with radio buttons
       *  @see {@link WUPRadioControl} */
      [tagName]: WUP.Radio.JSXProps<WUPRadioControl>; // add element to tsx/jsx intellisense
    }
  }
}

interface ExtInputElement extends HTMLInputElement {
  _index: number;
}

/** Form-control with radio buttons
 * @example
  const el = document.createElement("wup-radio");
  el.$options.name = "gender";
  el.$options.items = [
    { value: 1, text: "Male" },
    { value: 2, text: "Female" },
    { value: 3, text: "Other/Skip" },
  ];
  el.$initValue = 3;
  el.$options.validations = { required: true };
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-radio name="gender" initvalue="3" validations="myValidations" items="myRadioItems"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <fieldset>
 *   <legend><strong>{$options.label}</strong></legend>
 *   <label> <input/> <span/> </label>
 *   <label> <input/> <span/> </label>
 *   // etc.
 * </fieldset> */
export default class WUPRadioControl<
  ValueType = any,
  TOptions extends WUP.Radio.Options = WUP.Radio.Options,
  EventMap extends WUP.Radio.EventMap = WUP.Radio.EventMap
> extends WUPBaseControl<ValueType, TOptions, EventMap> {
  #ctr = this.constructor as typeof WUPRadioControl;

  /** Custom text that announced by screen-readers. Redefine it to use with another language */
  static $ariaReadonly = "readonly";

  static get $styleRoot(): string {
    return `:root {
      --ctrl-radio-size: 1em;
      --ctrl-radio-spot-size: calc(var(--ctrl-radio-size) * 0.5);
      --ctrl-radio-bg: #fff;
      --ctrl-radio-off: #fff;
      --ctrl-radio-on: var(--ctrl-focus);
      --ctrl-radio-border: #0003;
      --ctrl-radio-border-size: 2px;
      --ctrl-radio-gap: 7px;
     }`;
  }

  static get $style(): string {
    // :host input + span:after >> not relative because 1.2em of 14px provides round-pixel-issue and not always rounded items
    return `${super.$style}
      :host {
        position: relative;
        padding: var(--ctrl-padding);
      }
      :host fieldset {
        border: none;
        padding: 0;
        margin: calc(var(--ctrl-radio-gap) * -0.5) calc(var(--ctrl-radio-gap) * -1);
        display: flex;
        flex-wrap: wrap;
      }
      :host legend {
        display: block;
        position: absolute;
        top: 0.2em;
        transform-origin: top left;
        transform: scale(0.9);
        margin: 0 var(--ctrl-radio-gap);
        padding: 0;
        box-sizing: border-box;
        max-width: 100%;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        font-weight: normal;
        text-decoration: none;
      }
      :host strong {
        font: inherit;
      }
      :host label {
        padding: 0;
      }
      :host input {${WUPcssHidden}}
      :host input + span {
        padding: var(--ctrl-radio-gap);
        display: inline-flex;
        align-items: center;
      }
      :host[readonly],
      :host[readonly] legend,
      :host[readonly] label {
         cursor: default;
      }
      :host input + span:after {
        content: "";
        width: var(--ctrl-radio-size);
        height: var(--ctrl-radio-size);
        border: calc((var(--ctrl-radio-size) - var(--ctrl-radio-spot-size)) / 2) solid var(--ctrl-radio-bg);
        box-sizing: border-box;
        background: var(--ctrl-radio-off);
        box-shadow: 0 0 1px var(--ctrl-radio-border-size) var(--ctrl-radio-border);
        border-radius: 50%;
        margin-left: 0.5em;
      }
      :host fieldset[aria-required="true"] input + span:after {
        content: "";
      }
      :host[reverse] input + span {
        flex-direction: row-reverse;
      }
      :host[reverse] input + span:after {
        margin-left: 0;
        margin-right: 0.5em;
      }
      :host input:checked + span:after {
        background-color: var(--ctrl-radio-on);
      }
      @media not all and (prefers-reduced-motion) {
        :host input + span:after {
          transition: background-color var(--anim);
        }
      }
      :host input:focus + span {
        color: var(--ctrl-selected);
      }
      :host input:focus + span:after {
         box-shadow: 0 0 1px var(--ctrl-radio-border-size) var(--ctrl-selected);
      }
      @media (hover: hover) and (pointer: fine) {
        :host input + span:hover {
          color: var(--ctrl-selected);
        }
        :host input + span:hover:after {
          box-shadow: 0 0 1px var(--ctrl-radio-border-size) var(--ctrl-selected);
        }
      }
     `;
  }

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.Radio.Options>;
    arr.push("reverse", "items");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.Radio.Attributes>>;
    arr.push("reverse", "items");
    return arr;
  }

  static $defaults: WUP.Radio.Defaults = {
    ...WUPBaseControl.$defaults,
    validationRules: { ...WUPBaseControl.$defaults.validationRules },
  };

  constructor() {
    super();
    this._opts.items = [];
  }

  /** Called when need to parse attr [initValue] */
  override parse(attrValue: string): ValueType | undefined {
    const a = this.getItems() as WUP.Select.MenuItemText<ValueType>[];
    if (!a?.length) {
      return undefined;
    }

    const r = attrValue === "" ? a.find((o) => o.value == null) : a.find((o) => o.value && `${o.value}` === attrValue);
    return r?.value;
  }

  protected override gotReady(): void {
    super.gotReady();
    this.appendEvent(this, "input", this.gotInput as any);
  }

  /** Called when user touches inputs */
  protected gotInput(e: Event & { target: ExtInputElement }): void {
    this.setValue(this.getItems()[e.target._index].value, SetValueReasons.userInput);
  }

  /** Items resolved from options */
  #cachedItems?: WUP.Select.MenuItems<ValueType>;
  protected getItems(): WUP.Select.MenuItems<ValueType> {
    if (!this.#cachedItems) {
      const { items } = this._opts;
      this.#cachedItems = typeof items === "function" ? items() : items;
    }
    return this.#cachedItems;
  }

  $refFieldset = document.createElement("fieldset");
  $refItems: ExtInputElement[] = [];

  protected override renderControl(): void {
    this.$refFieldset.appendChild(document.createElement("legend")).appendChild(this.$refTitle);
    this.appendChild(this.$refFieldset);
  }

  protected renderItems(parent: HTMLFieldSetElement): void {
    this.$refItems.forEach((r) => r.parentElement!.remove());
    this.$refItems.length = 0;
    const arr = this.getItems();
    if (!arr?.length) {
      return;
    }
    const nm = this.#ctr.$uniqueId + (Date.now() % 1000);
    const arrLi = arr.map((_item, i) => {
      const lbl = document.createElement("label");
      const inp = lbl.appendChild(document.createElement("input")) as ExtInputElement;
      const tit = lbl.appendChild(document.createElement("span"));
      this.$refItems.push(inp);
      inp.id = this.#ctr.$uniqueId;
      inp._index = i;
      lbl.setAttribute("for", inp.id);
      inp.type = "radio";
      inp.name = nm; // required otherwise tabbing, arrow-keys doesn't work inside single fieldset
      parent.appendChild(lbl);
      return tit;
    });

    if (arr[0].text && typeof arr[0].text === "function") {
      arr.forEach((v, i) => (v as WUP.Select.MenuItemFn<ValueType>).text(v.value, arrLi[i], i));
    } else {
      arr.forEach((v, i) => (arrLi[i].textContent = (v as WUP.Select.MenuItemText<ValueType>).text));
    }

    this.$refItems[0].tabIndex = 0;
    // when user changed items
    setTimeout(() => this.checkInput(this.$value)); // timeout to fix case when el.$options.items=... el.$value=...
  }

  /** Called when need to update check-state of inputs */
  protected checkInput(v: ValueType | undefined): void {
    this.$refInput.checked = false;

    if (v === undefined) {
      // eslint-disable-next-line prefer-destructuring
      this.$refInput = this.$refItems[0] || this.$refInput;
    } else {
      const item = this.$refItems[this.getItems().findIndex((a) => a.value === v)];
      if (!item) {
        console.error(`${this.tagName}${this._opts.name ? `[${this._opts.name}]` : ""}. Not found in items`, {
          items: this._opts.items,
          value: v,
        });
      } else {
        item.checked = true;
        this.$refInput = item;
      }
    }
    this.setupInput();
    this.$refLabel = this.$refInput.parentElement as HTMLLabelElement;
  }

  protected override setValue(v: ValueType, reason: SetValueReasons): boolean | null {
    if (this.$isReady) {
      // timeout to fix case when el.$options.items=... el.$value=...
      reason === SetValueReasons.manual ? setTimeout(() => this.checkInput(v)) : this.checkInput(v); // otherwise it will be checked from renderItems
    }
    return super.setValue(v, reason);
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Radio.Options> | null): void {
    const isNeedRenderItems = !propsChanged || propsChanged.includes("items");
    if (isNeedRenderItems) {
      this.#cachedItems = undefined;
      // it's important to be before super otherwise initValue won't work
      this._opts.items = this.getAttr<WUP.Radio.Options["items"]>("items", "ref") || [];
      this.renderItems(this.$refFieldset);
    }

    super.gotChanges(propsChanged as any); // todo gotChanges must be called first

    this._opts.reverse = this.getAttr("reverse", "bool");
    this.setAttr("reverse", this._opts.reverse, true);

    const req = this.validations?.required;
    this.setAttr.call(this.$refFieldset, "aria-required", !!req);
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.$refInput.disabled = false;
    this.$refFieldset.disabled = this.$isDisabled as boolean;
    this.$ariaDetails(this.$isReadOnly ? this.#ctr.$ariaReadonly : null);
  }

  protected override gotOptionsChanged(e: WUP.Base.OptionEvent): void {
    this._isStopChanges = true;
    e.props.includes("reverse") && this.setAttr("reverse", this._opts.reverse, true);
    super.gotOptionsChanged(e);
  }

  override setupInputReadonly(): void {
    const r = this.$isReadOnly;
    this.$refItems.forEach((a) => (a.readOnly = r)); // just for WA
    this.$refFieldset.onclick = r ? (e) => e.preventDefault() : null; // prevent changing input-readonly; attr readonly doesn't work for radio
  }

  override focus(): boolean {
    this.$refInput.focus();
    return document.activeElement === this.$refInput || super.focus();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override goShowError(err: string, target: HTMLElement): void {
    super.goShowError(err, this.$refFieldset);
  }
}

customElements.define(tagName, WUPRadioControl);
