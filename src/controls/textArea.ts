import { inheritDefaults } from "../baseElement";
import { useTooltipOnce } from "../popup/popupTooltip";
import { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";
import WUPTextAreaInput from "./textArea.input";

WUPTextAreaInput.$use();

const tagName = "wup-textarea";
declare global {
  namespace WUP.TextArea {
    interface EventMap extends WUP.Text.EventMap {}
    interface ValidityMap extends WUP.Text.ValidityMap {}
    interface NewOptions {
      /** Hide footer with count of visible chars: `{count} / {max}` (see $renderFooter to customize content)
       * @see {@link WUPTextAreaControl.$renderFooter}
       * @defaultValue false */
      hideFooter: boolean;
    }
    interface Options<T = string, VM = ValidityMap>
      extends Omit<WUP.Text.Options<T, VM>, "mask" | "maskholder" | "prefix" | "postfix">,
        NewOptions {}
    interface JSXProps<C = WUPTextAreaControl>
      extends Omit<WUP.Text.JSXProps<C>, "w-mask" | "w-maskholder" | "w-prefix" | "w-postfix">,
        WUP.Base.OnlyNames<NewOptions> {
      "w-hideFooter"?: boolean | "" | "true" | "false";
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPTextAreaControl; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with multiline text-input
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textArea}
       *  @see {@link WUPTextAreaControl} */
      [tagName]: WUP.Base.ReactHTML<WUPTextAreaControl> & WUP.TextArea.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with multiline text-input
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textArea}
       *  @see {@link WUPTextAreaControl} */
      [tagName]: HTMLAttributes<WUPTextAreaControl> & WUP.TextArea.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Form-control with multiline text-input
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textArea}
 * @example
  const el = document.createElement("wup-textarea");
  el.$options.name = "textarea";
  el.$options.validations = {
    required: true,
    max: 250
  };

  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-textarea w-name="textarea" w-validations="myValidations"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <wup-areainput contenteditable="true" role="textbox" aria-multiline="true" />
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 * <footer role="note" aria-label="Characters: {count} of {max}" w-tooltip>{count} / {max}</footer> // $refFooter: see $renderFooter & $options.hideFooter
 * @tutorial Troubleshooting
 * * known issue: NVDA doesn't read multiline text https://github.com/nvaccess/nvda/issues/13369
 * to resolve it set WUPTextAreaControl.$defaults.selectOnFocus = true */
export default class WUPTextAreaControl<
  ValueType = string,
  TOptions extends WUP.TextArea.Options = WUP.TextArea.Options,
  EventMap extends WUP.TextArea.EventMap = WUP.TextArea.EventMap
> extends WUPTextControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  // #ctr = this.constructor as typeof WUPTextAreaControl;

  static get $style(): string {
    return super.$style;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.TextArea.Options = inheritDefaults(WUPTextControl.$defaults, {
    validationRules: inheritDefaults(WUPTextControl.$defaults.validationRules, {
      // WARN: validations min/max must depend on visible chars only
      min: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.min!.call!(c, v?.replace(/\n/g, ""), setV, c, r),
      max: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.max!.call!(c, v?.replace(/\n/g, ""), setV, c, r),
    }),
    hideFooter: false,
  });

  $refInput = document.createElement("wup-areainput") as HTMLInputElement;

  /** Footer with count of chars: it's removed if $options.hideFooter is true (see $renderFooter) */
  $refFooter?: HTMLElement;

  protected override renderControl(): void {
    super.renderControl();
    const { id } = this.$refInput;
    this.$refInput.removeAttribute("id");
    this.$refInput.setAttribute("aria-labelledby", id);
    this.$refTitle.id = id;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.TextArea.Options | any> | null): void {
    super.gotChanges(propsChanged);
    const o = this._opts as WUP.Text.Options;
    delete o.mask;
    delete o.maskholder;
    delete o.prefix;
    delete o.postfix;
    this.setupFooter(); // max count depends on validations: they can be changed via form too
  }

  /** Creates or removes footer according to $options.hideFooter & renders its content */
  protected setupFooter(): void {
    if (this._opts.hideFooter) {
      this.$refFooter?.remove();
      this.$refFooter = undefined;
    } else {
      if (!this.$refFooter) {
        useTooltipOnce("w-tooltip"); // footer shows aria-label via tooltip
        const f = this.appendChild(document.createElement("footer"));
        f.setAttribute("role", "note"); // otherwise it's landmark `contentinfo` (outside of <section>, <article> etc.) & aria-label isn't allowed
        f.setAttribute("w-tooltip", ""); // empty: tooltip shows aria-label
        this.$refFooter = f;
      }
      this.$renderFooter(this.$refFooter);
    }
  }

  /** Returns count of visible chars in input (the same as validations min/max count): line breaks are skipped */
  protected countChars(): number {
    return this.$refInput.value.replace(/\n/g, "").length;
  }

  /** Renders content of footer: count of visible chars (the same as validations min/max count)
   *  `{count} / {max}` if `validations.max` is pointed (with attr `invalid` if count exceeds max: red text), otherwise `{count}`;
   *  `aria-label` is shown via tooltip;
   *  it's called on every change of value & options (if footer isn't hidden via $options.hideFooter): override it to customize content
   * @example
   * class MyTextArea extends WUPTextAreaControl {
   *   override $renderFooter(footer: HTMLElement): void {
   *     const words = this.$refInput.innerText.split(/\s+/).filter(Boolean).length;
   *     footer.textContent = `${words}`;
   *     footer.setAttribute("aria-label", `Words: ${words}`);
   *   }
   * } */
  $renderFooter(footer: HTMLElement): void {
    const count = this.countChars();
    const max = (this.validations as WUP.TextArea.Options["validations"])?.max;
    const isMax = typeof max === "number";
    footer.textContent = isMax ? `${count} / ${max}` : `${count}`;
    this.setAttr.call(footer, "invalid", isMax && count > max, true); // red if count exceeds max
    footer.setAttribute(
      "aria-label",
      isMax ? __wupln(`Characters: ${count} of ${max}`, "aria") : __wupln(`Characters: ${count}`, "aria")
    );
  }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    super.gotInput(e);
    this.$refFooter && this.$renderFooter(this.$refFooter); // at once: $value is changed after $options.debounceMs
  }

  protected override setInputValue(v: string, reason: SetValueReasons): void {
    super.setInputValue(v, reason);
    this.$refFooter && this.$renderFooter(this.$refFooter);
  }

  protected override renderPrefix(): void {
    // not supported
  }

  protected override renderPostfix(): void {
    // not supported
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    super.gotKeyDown(e);
    if (e.key === "Enter") {
      e.submitPrevented = true;
    }
  }

  protected override gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    if (e.inputType.startsWith("format")) {
      e.preventDefault(); // prevent Bold,Italic etc. styles for plain text (formatting is implemented in TextRichControl)
    } else {
      super.gotBeforeInput(e);
    }
    // delete (this.$refInput as unknown as WUPTextAreaInput)._cached;
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    this.setInputValue(this.$value as string, SetValueReasons.userInput); // update because newLine is replaced
  }
}

// prettify defaults before create
let rr: Array<keyof WUP.Text.Options> | undefined = ["mask", "maskholder", "prefix", "postfix"];
rr.forEach((k) => delete WUPTextAreaControl.$defaults[k as keyof WUP.TextArea.Options]);
rr = undefined;

customElements.define(tagName, WUPTextAreaControl);
