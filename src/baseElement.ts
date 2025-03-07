/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line max-classes-per-file
import focusFirst from "./helpers/focusFirst";
import nestedProperty from "./helpers/nestedProperty";
import observer, { Observer } from "./helpers/observer";
import onEvent, { onEventType } from "./helpers/onEvent";
import { WUPcssHidden, WUPcssBtnIcon, WUPcssIconSet } from "./styles";

// theoretically such single appending is faster than using :host inside shadowComponent
const appendedStyles = new Set<string>();
const appendedRootStyles = new Set<typeof WUPBaseElement>();
let lastUniqueNum = 0;

// Cached data
const allObservedOptions = new WeakMap<typeof WUPBaseElement, Set<string> | null>();
const allMappedAttrs = new WeakMap<typeof WUPBaseElement, Record<string, AttributeMap>>();

export interface AttributeMap {
  /** One of default types with defined parse */
  type: AttributeTypes;
  /** Option[name] realted to related attribute. Point if attrName !== propName */
  prop?: string;
  /** Custom parser for related attribute */
  parse?: (attrValue: string) => any;
}
export const enum AttributeTypes {
  /** Value presented by `true`, `false` or '' (empty string) */
  bool,
  number,
  string,
  reference,
  parsedObject,
  parseCustom,
  /** Element accessed via `document.querySelector` */
  selector,
}

/** Basic abstract class for every component in web-ui-pack */
export default abstract class WUPBaseElement<
  TOptions extends Record<string, any> = Record<string, any>,
  Events extends WUP.Base.EventMap = WUP.Base.EventMap
> extends HTMLElement {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseElement;

  /** Register control in the web to allow to use */
  static $use(): void {
    // WARN: this is method required but must be empty for webpack optimization (see sideEffects)
  }

  /** Reference to global style element used by web-ui-pack */
  static get $refStyle(): HTMLStyleElement | null {
    return window.WUPrefStyle || null;
  }

  static set $refStyle(v: HTMLStyleElement | null) {
    window.WUPrefStyle = v || undefined;
  }

  /** StyleContent related to component */
  static get $style(): string {
    return "";
  }

  /** StyleContent related to component & inherited components */
  static get $styleRoot(): string {
    return `:root {
          --base-focus: #00778d;
          --base-btn-bg: #009fbc;
          --base-btn-text: #fff;
          --base-btn-focus: #005766;
          --base-btn2-bg: #6c757d;
          --base-btn2-text: #fff;
          --base-btn3-bg: none;
          --base-btn3-text: inherit;
          --base-sep: #e4e4e4;
          --base-margin: 20px;
          --border-radius: 6px;
          --anim-t: 200ms;
          --anim: var(--anim-t) cubic-bezier(0, 0, 0.2, 1) 0ms;
          --icon-hover-r: 30px;
          --icon-hover-bg: #0001;
          --icon-focus-bg: #0000001a;
          --icon-size: 14px;
          --menu-hover-text: inherit;
          --menu-hover-bg: #f1f1f1;
          ${WUPcssIconSet}
        }
        [wupdark] {
          --base-btn-focus: #bdbdbd;
          --base-sep: #141414;
          --icon: #fff;
          --icon-hover-bg: #fff1;
          --icon-focus-bg: #fff2;
          --scroll: #fff2;
          --scroll-hover: #fff3;
          --menu-hover-text: inherit;
          --menu-hover-bg: #222a36;
        }`;
  }

  /** Get unique id for html elements; Every getter returns new id */
  static get $uniqueId(): string {
    return `wup${++lastUniqueNum}`;
  }

  /** Returns default class name for visually hidden element */
  static get classNameHidden(): string {
    return "wup-hidden";
  }

  /** Returns default class name for buttons with icons */
  static get classNameBtnIcon(): string {
    return "wup-icon";
  }

  /** Returns map-type based on value */
  static mapAttribute(value: any): AttributeTypes {
    if (value == null || value === "auto") {
      return AttributeTypes.reference;
    }
    switch (typeof value) {
      case "boolean":
        return AttributeTypes.bool;
      case "number":
        return AttributeTypes.number;
      case "string":
        return AttributeTypes.string;
      // case "object": return AttributeTypes.reference;
      // case "bigint": - not supported
      // case "symbol": - not supported
      default:
        return AttributeTypes.reference;
    }
  }

  /** Returns map-model based on $defaults for mapping attributes & options */
  static get mappedAttributes(): Record<string, AttributeMap> {
    const o: Record<string, AttributeMap> = {};
    const def = this.$defaults;
    Object.keys(def).forEach((k) => {
      const attr = k.toLowerCase(); // attributes exists only in lowerCase
      o[attr] = {
        type: this.mapAttribute(def[k]),
        prop: k,
      };
    });
    return o;
  }

  /** Array of options names to listen for changes; @returns `undefined` if need to observe for every option
   * @defaultValue every option from $defaults` */
  static get observedOptions(): Array<string> | null {
    return null;
  }

  /** Array of attribute names to listen for changes
   * @defaultValue every option from `observedOptions` OR $defaults (in  `w-${k.toLowerCase()}`) */
  static get observedAttributes(): Array<string> {
    return (this.observedOptions || Object.keys(this.$defaults)).map((k) => `w-${k.toLowerCase()}`);
  }

  /** Global default options applied to every element. Change it to configure default behavior OR use `element.$options` to change per item */
  static $defaults: Record<string, any> = {};

  /** Used to clone single value (from defaults) */
  static cloneValue<T>(v: T): T {
    if (v == null) {
      return v;
    }
    switch (typeof v) {
      case "function":
        return v;
      case "object":
        if (Array.isArray(v)) {
          return [...v] as T;
        }
        if (v instanceof HTMLElement) {
          return v;
        }
        return { ...v };
      default:
        return v;
    }
  }

  /** Used to clone defaults to options on init; override it to clone  */
  static cloneDefaults<T extends Record<string, any>>(): T {
    return { ...this.$defaults } as T;
  }

  /** Merge options with $defaults; Object.assign merges values 'undefined' by the method replace undefined with defaults */
  static mergeDefaults<T extends Record<string, any>>(opts: T): T {
    const def = this.$defaults;
    Object.keys(def).forEach((k) => {
      if (opts[k] == null) {
        opts[k as keyof T] = this.cloneValue(def[k]);
      }
    });
    return opts;
  }

  /** Raw part of $options for internal usage (.$options is Proxy object and better avoid useless extra-calles via Proxy) */
  // @ts-expect-error - TS doesn't see that init happens via constructor.$options = null;
  protected _opts: TOptions; // = objectClone(this.#ctr.$defaults) as TOptions;
  /* Observed part of $options */
  #optsObserved?: Observer.Observed<Record<string, any>>;
  #removeObserved?: () => void;
  get $options(): Partial<TOptions> {
    // return observed options
    if (this.$isReady) {
      if (!this.#optsObserved) {
        // get from cache
        let o = allObservedOptions.get(this.#ctr);
        if (o === undefined) {
          const arr = this.#ctr.observedOptions;
          o = arr ? new Set(arr) : null;
          allObservedOptions.set(this.#ctr, o);
        }
        const watched = o;
        if (!watched?.size && watched !== null) {
          return this._opts;
        }
        // cast to observed only if option was retrieved: to optimize init-performance
        this.#optsObserved = observer.make(this._opts, { excludeNested: true });
        this.#removeObserved = observer.onChanged(this.#optsObserved, (e) => {
          this.#isReady &&
            e.props.some((p) => (watched == null ? Object.hasOwn(this.#ctr.$defaults, p) : watched.has(p as string))) &&
            this.gotOptionsChanged(e);
        });
      }
      return this.#optsObserved as TOptions;
    }
    // OR return original options if element no appended to body - in this case we don't need to track for changes
    return this._opts;
  }

  /** Options inherited from `static.$defaults` and applied to element. Use this to change behavior per item OR use `$defaults` to change globally */
  set $options(v: Partial<TOptions>) {
    if (this._opts === v) {
      return;
    }
    const prev = this._opts;
    if (!v) {
      v = this.#ctr.cloneDefaults() as TOptions;
    }
    this._opts = v as TOptions;

    if (this.$isReady) {
      // unsubscribe from previous events here
      this.#removeObserved?.call(this);
      this.#optsObserved = undefined;
      this.#removeObserved = undefined;

      const watched = allObservedOptions.get(this.#ctr);
      if (!watched?.size && watched !== null) {
        return; // don't call event if there is nothing to watchFor
      }
      // shallow comparison with filter watched options
      if (prev.valueOf() !== v.valueOf()) {
        const props: string[] = [];
        (watched || Object.keys(this.#ctr.$defaults)).forEach((k) => {
          if (this._opts[k] !== prev[k]) {
            props.push(k);
          }
        });
        props.length && this.gotOptionsChanged({ props, target: this._opts });
      }
    }
  }

  /* Return all prototypes till HTMLElement */
  static findAllProtos(t: unknown, protos: (typeof WUPBaseElement)[]): (typeof WUPBaseElement)[] {
    const p = Object.getPrototypeOf(t);
    if (p !== HTMLElement.prototype) {
      protos.push(p.constructor);
      // Object.getOwnPropertyNames(p).forEach((s) => {
      //   const k = s as keyof Omit<WUPBaseElement, keyof HTMLElement | "$isReady">;
      //   const desc = Object.getOwnPropertyDescriptor(p, s) as PropertyDescriptor;
      //   if (typeof desc.value === "function" && s !== "constructor") {
      //     this[k] = (this[k] as Function).bind(this);
      //   }
      // });
      this.findAllProtos(p, protos);
    }
    return protos;
  }

  /** Add common styles */
  static firstInit(): void {
    this.$refStyle = document.createElement("style");
    /* from https://snook.ca/archives/html_and_css/hiding-content-for-accessibility  */
    this.$refStyle.append(`${this.$styleRoot}\r\n`);
    appendedRootStyles.add(WUPBaseElement);
    this.$refStyle.append(`.${this.classNameHidden}, [${this.classNameHidden}] {${WUPcssHidden}}\r\n`);
    this.$refStyle.append(`${WUPcssBtnIcon(`[${this.classNameBtnIcon}]`)}\r\n`);

    document.head.prepend(this.$refStyle);
  }

  constructor() {
    super();
    this.$options = null as any;

    // setup styles
    if (!appendedStyles.has(this.tagName)) {
      appendedStyles.add(this.tagName);

      const refStyle = this.#ctr.$refStyle!;
      // NiceToHave refactor to append styles via CDN or somehow else
      const protos = this.#ctr.findAllProtos(this, []);
      protos.reverse().forEach((p) => {
        // append $styleRoot
        if (!appendedRootStyles.has(p)) {
          appendedRootStyles.add(p);
          if (Object.prototype.hasOwnProperty.call(p, "$styleRoot")) {
            const s = p.$styleRoot;
            s && refStyle.append(s);
          }
        }
      });

      const c = protos[protos.length - 1].$style;
      refStyle.append(c.replace(/:host/g, `${this.tagName}`));
    }
  }

  /** Returns true if element is appended (result of setTimeout on connectedCallback) */
  get $isReady(): boolean {
    return this.#isReady;
  }

  /** Returns if current element or some nested child is active/focused */
  get $isFocused(): boolean {
    const a = document.activeElement;
    return this === a || this.includes(a);
  }

  /** Try to focus self or first possible children; returns true if successful */
  focus(): boolean {
    delete this._willFocus;
    return focusFirst(this);
  }

  /** Remove focus from element on any nested active element */
  blur(): void {
    const a = document.activeElement;
    if (a === this) {
      super.blur();
    } else if (a instanceof HTMLElement && this.includes(a)) {
      a.blur();
    }
  }

  /** Called when need to parse attribute */
  parse(text: string): any {
    return text;
  }

  /** Clear this to prevent autofocus */
  _willFocus?: ReturnType<typeof setTimeout>;
  #isReady = false;
  /** Called when element is added to document (after empty timeout - at the end of call stack) */
  protected gotReady(): void {
    this.#readyTimeout = undefined;
    this.#isReady = true;
    this._isStopChanges = true;
    this.gotChanges(null);
    this._isStopChanges = false;
    if (this.autofocus || this._opts.autoFocus) {
      this._willFocus = setTimeout(() => this.focus(), 2);
    }
  }

  /** Called when element is removed from document */
  protected gotRemoved(): void {
    this.#isReady = false;
    this.dispose();
  }

  /** Called on Init (with propsChanged: null) and every time as options/attributes changed */
  protected gotChanges(propsChanged: Array<string> | null): void {
    this.#ctr.mergeDefaults(this._opts); // WARN during the init it fired twice: 1st: cloned defaults, 2nd: merge defaults here
  }

  /** Called when element isReady and at least one of observedOptions is changed */
  protected gotOptionsChanged(e: WUP.Base.OptionEvent): void {
    this._isStopChanges = true;
    e.props.forEach((p) => {
      this.removeAttribute(`w-${p}`);
    }); // remove related attributes otherwise impossible to override
    this.gotChanges(e.props);
    this._isStopChanges = false;
  }

  /** Called once on Init */
  protected gotRender(): void {}

  #isFirstConn = true;
  #readyTimeout?: ReturnType<typeof setTimeout>;
  /** Browser calls this method when the element is added to the document */
  protected connectedCallback(): void {
    // async requires otherwise attributeChangedCallback doesn't set immediately
    this.#readyTimeout = setTimeout(() => this.gotReady.call(this));
    if (this.#isFirstConn) {
      this.#isFirstConn = false;
      this.gotRender();
    }
  }

  /** Browser calls this method when the element is removed from the document;
   * (can be called many times if an element is repeatedly added/removed) */
  protected disconnectedCallback(): void {
    this.#readyTimeout && clearTimeout(this.#readyTimeout);
    this.#readyTimeout = undefined;
    this.gotRemoved();
  }

  /** Prevent gotChanges call during the some attribute or options custom changes */
  _isStopChanges = false;
  #attrTimer?: ReturnType<typeof setTimeout>;
  #attrChanged?: string[];
  /** Called when any of observedAttributes is changed */
  protected gotAttributeChanged(name: string, value: string | null): void {
    const key = this.attrToProp(name, value);

    if (this.#isReady) {
      if (!this.#attrTimer) {
        this.#attrChanged = [];
        this.#attrTimer = setTimeout(() => {
          this.#attrTimer = undefined;
          this._isStopChanges = true;
          this.gotChanges(this.#attrChanged!);
          this._isStopChanges = false;
          this.#attrChanged = undefined;
        });
      }
      this.#attrChanged!.push(key);
    }
  }

  /** Parse attribute & assign to related property
   * @returns defined propertyName */
  protected attrToProp(name: string, value: string | null): string {
    if (name.startsWith("w-")) {
      name = name.substring(2);
    }
    // WARN: observedAttribute must return same collection as mappedAttributes
    let map = allMappedAttrs.get(this.#ctr); // try to get from cache first
    if (!map) {
      map = this.#ctr.mappedAttributes;
      allMappedAttrs.set(this.#ctr, map);
    }
    const m = map[name] ?? { type: AttributeTypes.bool, prop: name };
    const isRemoved = value == null;

    const key = m.prop ?? name;
    // eslint-disable-next-line no-nested-ternary
    this._opts[key as keyof TOptions] = isRemoved
      ? this.#ctr.cloneValue(this.#ctr.$defaults[key]) // value == null when attr is removed, then need to rollback to default
      : m.parse
      ? m.parse(value)
      : this.parseAttr(m.type, value, key, name);

    return key;
  }

  /** Browser calls this method when attrs pointed in observedAttributes is changed */
  protected attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    !this._isStopChanges && oldValue !== newValue && this.gotAttributeChanged(name, newValue);
  }

  // watchfix: how to change  listener: (this: WUPBaseElement) to generic: https://github.com/microsoft/TypeScript/issues/299
  /* eslint-disable max-len */
  // prettier-ignore
  addEventListener<K extends keyof Events>(type: K, listener: (this: WUPBaseElement, ev: Events[K]) => any, options?: boolean | AddEventListenerOptions): void;
  // prettier-ignore
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: any, listener: any, options?: any): void {
    return super.addEventListener(type, listener, options);
  }

  // prettier-ignore
  removeEventListener<K extends keyof Events>(type: K, listener: (this: WUPBaseElement, ev: Events[K]) => any, options?: boolean | EventListenerOptions): void;
  // prettier-ignore
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: any, listener: any, options?: any): void {
    return super.removeEventListener(type, listener, options);
  }
  /* eslint-enable max-len */

  /** Inits customEvent & calls dispatchEvent and returns created event; by default `cancelable: false, bubbles: true`
   * @tutorial Troubleshooting
   * * Default event bubbling: el.event.click > el.onclick >>> parent.event.click > parent.onclick etc.
   * * Custom event bubbling: el.$onclick > el.event.$click >>> parent.event.$click otherwise impossible to stop propagation from on['event] of target directly */
  // @ts-expect-error - somehow TS doesn't allow  Events[K]["detail"] but it works
  fireEvent<K extends keyof Events, T extends Events[K]["detail"]>(type: K, eventInit: CustomEventInit<T> = {}): Event {
    eventInit.cancelable ??= false;
    eventInit.bubbles ??= true;
    const ev = new CustomEvent<T>(type as string, eventInit);
    const isCustom = (type as string).startsWith("$");
    if (isCustom) {
      const str = (type as string).substring(1, 2).toUpperCase() + (type as string).substring(2);
      const f = (this as any)[`$on${str}`];
      f && this.addEventListener(type, (evHook) => f.call(this, evHook), { once: true, capture: true });
    }

    super.dispatchEvent(ev);
    return ev;
  }

  /** Array of removeEventListener() that called on remove */
  protected disposeLst: Array<() => void> = [];
  /** Add event listener and remove after component removed; @options.passive=true by default */
  appendEvent<
    T extends keyof E,
    K extends HTMLElement | Document,
    E extends HTMLElementEventMap & Record<string, Event>
  >(...args: Parameters<onEventType<T, K, E>>): () => void {
    // self-removing when option.once
    if ((args[3] as AddEventListenerOptions)?.once) {
      const listener = args[2];
      args[2] = function wrapper(...args2): any {
        const v = listener.call(this, ...args2);
        remove();
        return v;
      };
    }
    // @ts-ignore
    const r = onEvent(...args);
    this.disposeLst.push(r);
    const remove = (): void => {
      const i = this.disposeLst.indexOf(r);
      if (i !== -1) {
        r();
        this.disposeLst.splice(i, 1);
      }
    };

    return remove;
  }

  /** Remove events/functions that was appended */
  protected dispose(): void {
    this.disposeLst.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLst.length = 0;
  }

  /** Returns true if el is instance of Node and contains pointed element
   * @tutorial Troubleshooting
   * * if element has position `fixed` or `absolute` then returns false */
  includes(el: unknown): boolean {
    return el instanceof Node && this.contains(el);
  }

  /** Returns true if element contains eventTarget or it's eventTarget
   * @tutorial Troubleshooting
   * * if element has position `fixed` or `absolute` then returns false */
  includesTarget(e: Event): boolean {
    return this.itsMe(e.target);
  }

  /** Find parent/self according with callback */
  findParent(callback: (el: HTMLElement) => boolean, options = { bubbleCount: 10 }): HTMLElement | null {
    let i = options?.bubbleCount || 10; // expected no more 10 parents
    let el: HTMLElement | null = this;
    while (--i) {
      if (callback(el)) {
        return el;
      }
      if (el === document.body) {
        return null;
      }
      el = el.parentElement;
      if (!el) {
        return null;
      }
    }
    return null;
  }

  /** Returns true if contains pointed element or has itself
   * @tutorial Troubleshooting
   * * if element has position `fixed` or `absolute` then returns false */
  itsMe(el: Element | EventTarget | null): boolean {
    return this === el || (el instanceof Node && this.contains(el));
  }

  /** Returns first element according to pointed selector
   * @tutorial rules
   * * point 'prev' to return previousElementSibling
   * * point 'next' to return nextElementSibling
   * * point ordinary selector to execute `document.querySelector(selector)` */
  findBySelector<T extends HTMLElement>(selector: string): T | null {
    switch (selector) {
      case "prev":
        return this.previousElementSibling as T;
      case "next":
        return this.nextElementSibling as T;
      default:
        return document.querySelector(selector);
    }
  }

  /** Returns parsed value according to pointed type OR current value if something wrong;
   * override method for implementation custom parsing OR static method mappedAttributes to redefine map-types */
  parseAttr(type: AttributeTypes, attrValue: string, propName: string, attrName: string): any {
    const prev = this._opts[propName];
    // eslint-disable-next-line default-case
    switch (attrValue) {
      case "false":
        return false;
      // case "":
      case "true":
        return true; // empty attr and 'true' is enable`
      case "auto":
        return attrValue;
    }
    switch (type) {
      case AttributeTypes.bool:
        return attrValue !== "false";
      case AttributeTypes.number: {
        const v = +attrValue;
        if (Number.isNaN(v)) {
          this.throwError(`Expected number for attribute [${attrName}] but pointed '${attrValue}'`);
          return prev;
        }
        return v;
      }
      case AttributeTypes.reference: {
        if (!attrValue) {
          return undefined;
        }
        const v = nestedProperty.get(window, attrValue);
        if (v === undefined) {
          this.throwError(
            `Value not found according to attribute [${attrName}] in '${
              attrValue.startsWith("window.") ? attrValue : `window.${attrValue}`
            }'`
          );
          return prev;
        }
        return v;
      }
      case AttributeTypes.parsedObject: {
        try {
          return this.parse(attrValue);
        } catch (err) {
          this.throwError(err);
          return prev;
        }
      }
      case AttributeTypes.selector: {
        if (!attrValue) {
          return undefined;
        }
        let el = this.findBySelector(attrValue);
        if (!el) {
          setTimeout(() => {
            el = this.findBySelector(attrValue);
            if (el) {
              this._opts[propName as keyof TOptions] = el as any;
            } else {
              this.throwError(`Element not found according to attribute [${attrName}]='${attrValue}' `);
            }
          }); // on init item can be missed and added after
          return attrValue;
        }
        return el;
      }
      default:
        return attrValue; // string
    }
  }

  /** Remove attr if value falseOrEmpty; set '' or 'true' if true for HTMLELement
   * @param isSetEmpty set if need '' instead of 'value' */
  setAttr(attr: string, v: boolean | string | undefined | null, isSetEmpty?: boolean): void {
    v ? this.setAttribute(attr, isSetEmpty ? "" : v) : this.removeAttribute(attr);
  }

  /** Remove all children in fastest way */
  removeChildren(): void {
    // benchmark: https://measurethat.net/Benchmarks/Show/23474/2/remove-all-children-from-dom-element-2
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  }

  // NiceToHave: throwError in 90% must be excluded from prod-build
  /** Throws unhandled error via empty setTimeout */
  throwError(err: string | Error | unknown, details?: any, consoleOnly?: boolean): void {
    const msg = `${this.tagName}${this._opts.name ? `[${this._opts.name}]` : ""}. ${err}`;
    const e = new Error(msg, { cause: err });
    if (consoleOnly) {
      console.error(msg, details);
      return;
    }
    setTimeout(() => {
      details && console.error(details);
      throw e;
    });
  }

  /** Removes empty attr [style] */
  removeEmptyStyle(): void {
    !this.getAttribute("style") && this.removeAttribute("style");
  }

  // /** Forces to re-calc render-logic of browser */
  // refreshRender(): void {
  //   const was = this.style.display;
  //   this.style.display = was === "none" ? "block" : "none";
  //   (this as any).__fixRefresh = this.offsetHeight; // no need to store this anywhere, the reference is enough
  //   this.style.display = was;
  //   delete (this as any).__fixRefresh;
  // }

  // Uncomment if it's required
  // /** Replace all children of node with nodes, while replacing strings in nodes with equivalent Text nodes */
  // replaceChildren(...nodes: (string | Node)[]): void {
  // https://measurethat.net/Benchmarks/Show/23478/1/replace-text-content-on-dom-element-2
  //   if (super.replaceChildren as any) {
  //     return super.replaceChildren(...nodes);
  //   }
  //   this.removeChildren();
  //   return this.append(...nodes);
  // }
}

WUPBaseElement.firstInit();
window.__wupln = (s) => s;

declare global {
  /** Translate function that need to replace to translate content according to requirements
   * @param text Text that must be translated
   * @param type Type of related text
   * @returns the same string by default */
  const __wupln: WUP.Base.LangFunc; // NiceToHave: interpolation `Max length ${setV} is chars` where (-s) can depend on value
  interface Window {
    /** Translate function that need to replace to translate content according to requirements
     * @param text Text that must be translated
     * @param type Type of related text
     * @returns the same string by default */
    __wupln: WUP.Base.LangFunc;
  }

  namespace WUP.Base {
    interface LangFunc {
      (text: string, type: "aria" | "content" | "validation"): string;
    }

    /** Cast not-supported props to optional string */
    type toJSX<T> = {
      [P in keyof T]?: T[P] extends number | boolean | string | undefined ? T[P] : string;
    };
    type OnlyNames<T> = {
      // [K in keyof T]?: never;
      [K in keyof T as K extends string ? `w-${K}` : never]?: unknown; // watchfix https://github.com/microsoft/TypeScript/issues/50715
    };
    type OptionEvent<T extends Record<string, any> = Record<string, any>> = {
      props: Array<Extract<keyof T, string>>;
      target: T;
    };
    type EventMap<T = HTMLElementEventMap> = HTMLElementEventMap & Record<keyof T, Event>;

    // type JSXPropsOld<T, Opts extends Record<string, any> = any> = React.DetailedHTMLProps<
    //   // react doesn't support [className] attr for WebComponents; use [class] instead: https://github.com/facebook/react/issues/4933
    //   Omit<React.HTMLAttributes<T>, "className"> & { class?: string | undefined },
    //   T
    // > &
    //   toJSX<Opts>;
    type ReactHTML<T> = React.DetailedHTMLProps<
      // react doesn't support [className] attr for WebComponents; use [class] instead: https://github.com/facebook/react/issues/4933
      Omit<React.HTMLAttributes<T>, "className"> & {
        class?: string | undefined;
        /** @deprecated isn't supported for React & WebComponents; use attr `class` instead
         * @see {@link https://react.dev/reference/react-dom/components#custom-html-elements} */
        className?: never;
      },
      T
    >;
    type JSXProps<T> = React.DetailedHTMLProps<
      // react doesn't support [className] attr for WebComponents; use [class] instead: https://github.com/facebook/react/issues/4933
      Omit<React.HTMLAttributes<T>, "className"> & { class?: string | undefined },
      T
    >;
  }
}

// NiceToHave: HTML attrs-events like 'onsubmit' & 'onchange'
// @ts-ignore
console[`${String.fromCharCode(105)}nfo`]("Powered by https://github.com/Yegorich555/web-ui-pack");
