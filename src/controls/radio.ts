import { WUPcssHidden } from "../styles";
import WUPBaseControl, { SetValueReasons } from "./baseControl";

const tagName = "wup-radio";
declare global {
  namespace WUP.Radio {
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface ValidityMap extends WUP.BaseControl.ValidityMap {}
    interface NewOptions<T = any> {
      /** Items showed as radio-buttons
       * @tutorial Troubleshooting
       * * array items is converted to Proxy (observer) so
       * ```js
       * const items = [text: "1", value: {name: "Jenny"}]
       * el.$options.items = items;
       * setTimeout(()=> console.warn(el.$options.items === items)},1) // returns 'false'
       * setTimeout(()=> console.warn(el.$options.items[0].value === items[0].value)},1) // returns 'true'
       * ``` */
      items: WUP.Select.MenuItem<T>[] | (() => WUP.Select.MenuItem<T>[]);
      /** Reversed-style (radio+label for true vs label+radio)
       * @defaultValue false */
      reverse: boolean;
    }
    interface Options<T = any, VM = ValidityMap> extends WUP.BaseControl.Options<T, VM>, NewOptions<T> {}
    interface JSXProps<C = WUPRadioControl> extends WUP.BaseControl.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      "w-reverse"?: boolean | "";
      /** Global reference to object with array
       * @see  {@link WUP.Select.MenuItems}
       * @example
       * ```js
       * window.myItems = [...];
       * <wup-radio w-items="window.myItems"></wup-circle>
       * ``` */
      "w-items"?: string;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPRadioControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with radio buttons
       *  @see {@link WUPRadioControl} */
      [tagName]: WUP.Base.ReactHTML<WUPRadioControl> & WUP.Radio.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with radio buttons
       *  @see {@link WUPRadioControl} */
      [tagName]: HTMLAttributes<WUPRadioControl> & WUP.Radio.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

interface ExtInputElement extends HTMLInputElement {
  _index: number;
}

/** Form-control with radio buttons
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/radio}
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
    <wup-radio w-name="gender" w-initvalue="3" w-validations="myValidations" w-items="myRadioItems"/>
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
  static $ariaReadonly = __wupln("readonly", "aria");

  static get $styleRoot(): string {
    return `:root {
      --ctrl-radio-item-r: 14px;
      --ctrl-radio-item-r-on: 8px;
      --ctrl-radio-item-bg: none;
      --ctrl-radio-item-on: var(--ctrl-focus);
      --ctrl-radio-item-border: #0003;
      --ctrl-radio-item-border-w: 2px;
      --ctrl-radio-gap: 7px;
     }
     [wupdark] {
        --ctrl-radio-item-border: var(--ctrl-label);
      }`;
  }

  static get $style(): string {
    // :host input + [icon]:after >> not relative because 1.2em of 14px provides round-pixel-issue and not always rounded items
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
        padding: var(--ctrl-radio-gap);
        gap: var(--ctrl-radio-gap);
      }
      :host[w-reverse] label {
        flex-direction: row-reverse;
      }
      :host input {${WUPcssHidden}}
      :host[readonly],
      :host[readonly] legend,
      :host[readonly] label {
         cursor: default;
      }
      :host [icon] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--ctrl-radio-item-r);
        height: var(--ctrl-radio-item-r);
        box-sizing: border-box;
        background: var(--ctrl-radio-item-bg);
        box-shadow: 0 0 1px var(--ctrl-radio-item-border-w) var(--ctrl-radio-item-border);
        border-radius: 50%;
      }
      :host [icon]:after {
        content: "";
        display: inline-block;
        width: var(--ctrl-radio-item-r-on);
        height: var(--ctrl-radio-item-r-on);
        border-radius: 50%;
        transition: background-color var(--anim);
       }
      :host input:checked + [icon]:after {
        background: var(--ctrl-radio-item-on);
      }
      @media not all and (prefers-reduced-motion) {
        :host label {
          transition: color var(--anim);
        }
        :host [icon] {
          transition: background-color var(--anim);
        }
      }
      :host label:focus-within {
        color: var(--ctrl-selected);
      }
      :host label:focus-within [icon] {
        --ctrl-radio-item-border: var(--ctrl-selected);
      }
      @media (hover: hover) and (pointer: fine) {
        :host label:hover {
          color: var(--ctrl-selected);
        }
        :host label:hover [icon] {
          --ctrl-radio-item-border: var(--ctrl-selected);
        }
      }`;
  }

  static $defaults: WUP.Radio.Options = {
    ...WUPBaseControl.$defaults,
    validationRules: { ...WUPBaseControl.$defaults.validationRules },
    items: [],
    reverse: false,
  };

  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.Radio.Options;
    d.items = [];
    return d as unknown as T;
  }

  /** Called when need to parse attr [initValue] */
  override parse(attrValue: string): ValueType | undefined {
    const a = this.getItems() as WUP.Select.MenuItem<ValueType>[];
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
  #cachedItems?: WUP.Select.MenuItem<ValueType>[];
  protected getItems(): WUP.Select.MenuItem<ValueType>[] {
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
    arr.forEach((item, i) => {
      const lbl = document.createElement("label");
      const s = item.text;
      if (typeof s === "function") {
        s(item.value, lbl, i, this);
      } else {
        lbl.appendChild(document.createTextNode(item.text as string));
      }
      const inp = lbl.appendChild(document.createElement("input")) as ExtInputElement;
      lbl.appendChild(document.createElement("span")).setAttribute("icon", "");
      this.$refItems.push(inp);
      inp.id = this.#ctr.$uniqueId;
      inp._index = i;
      lbl.setAttribute("for", inp.id);
      inp.type = "radio";
      inp.name = nm; // required otherwise tabbing, arrow-keys doesn't work inside single fieldset
      parent.appendChild(lbl);
      if (item.onClick) {
        lbl.onclick = (e) => item.onClick?.call(lbl, e, item);
      }
    });

    this.$refItems[0].tabIndex = 0;
    // when user changed items
    setTimeout(() => this.checkInput(this.$value)); // timeout to fix case when el.$options.items=... el.$value=...
  }

  /** Called when need to update check-state of inputs */
  protected checkInput(v: ValueType | undefined): void {
    this.$refInput.checked = false;
    this.$refLabel.removeAttribute("checked");

    if (v === undefined) {
      // eslint-disable-next-line prefer-destructuring
      this.$refInput = this.$refItems[0] || this.$refInput;
    } else {
      const item = this.$refItems[this.getItems().findIndex((a) => this.#ctr.$isEqual(a.value, v, this))];
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
    this.$refInput.checked && this.$refLabel.setAttribute("checked", "");
  }

  protected override setValue(v: ValueType, reason: SetValueReasons): boolean | null {
    if (this.$isReady) {
      // timeout to fix case when el.$options.items=... el.$value=...
      reason === SetValueReasons.manual ? setTimeout(() => this.checkInput(v)) : this.checkInput(v); // otherwise it will be checked from renderItems
    }
    return super.setValue(v, reason);
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Radio.Options> | null): void {
    this._opts.items ??= [];
    const isNeedRenderItems = !propsChanged || propsChanged.includes("items");
    if (isNeedRenderItems) {
      this.#cachedItems = undefined;
      // it's important to be before super otherwise initValue won't work
      this.renderItems(this.$refFieldset);
    }
    super.gotChanges(propsChanged as any);
    this.setAttr("w-reverse", this._opts.reverse, true);

    const req = this.validations?.required;
    this.setAttr.call(this.$refFieldset, "aria-required", !!req);
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.$refInput.disabled = false;
    this.$refFieldset.disabled = this.$isDisabled as boolean;
    this.$ariaDetails(this.$isReadOnly ? this.#ctr.$ariaReadonly : null);
  }

  override setupInputReadonly(): void {
    const r = this.$isReadOnly;
    this.$refItems.forEach((a) => (a.readOnly = r)); // just for WA
    this.$refFieldset.onclick = r ? (e) => e.preventDefault() : null; // prevent changing input-readonly; attr readonly doesn't work for radio
  }

  protected gotFocus(e: FocusEvent): Array<() => void> {
    if (e.target !== this.$refInput) {
      this.$refInput.focus(); // focus current input instead of focused 1st - possible when item is focused via form.autofocus
    }
    return super.gotFocus(e);
  }

  override focus(): boolean {
    this.$refInput.focus();
    return document.activeElement === this.$refInput || super.focus();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override goShowError(err: string, target: HTMLElement): void {
    super.goShowError(err, this.$refFieldset);
  }

  /** Returns string for storage */
  valueToStrCompare(a: WUP.Select.MenuItem<ValueType>): string | null {
    const at = typeof a.text === "function" ? a.value?.toString() : a.text;
    return at?.replace(/\s/g, "") ?? null;
  }

  override valueFromStorage(str: string): ValueType | undefined {
    if (str === "null") {
      return null as ValueType;
    }
    const s = str.toLowerCase();
    const items = this.getItems();
    const item = items.find((a) => this.valueToStrCompare(a)?.toLowerCase() === s);
    if (item === undefined) {
      this.throwError("Not found in items (search by item.value.toString() & item.text)", {
        items,
        searchText: str,
      });

      return undefined;
    }
    return item.value;
    // return super.valueFromStorage(str) as any;
  }

  /** Store value to storage; if item.text is not function then stored text, otherwise value.toString()
   *  @see {@link valueToStrCompare} */
  override valueToStorage(v: ValueType): string | null {
    if (v == null) {
      return "null";
    }
    const items = this.getItems();
    const item = items.find((o) => this.#ctr.$isEqual(o.value, v, this)) || { value: v, text: v?.toString() };
    return this.valueToStrCompare(item!);
  }
}

customElements.define(tagName, WUPRadioControl);
