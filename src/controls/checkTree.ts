import { inheritDefaults } from "../baseElement";
import nestedProperty from "../helpers/nestedProperty";
import { useTooltipOnce } from "../popup/popupTooltip";
import WUPBaseControl, { SetValueReasons } from "./baseControl";
import WUPCheckControl from "./check";

const tagName = "wup-checktree";
declare global {
  namespace WUP.CheckTree {
    interface Item<T = any> extends WUP.Select.MenuItem<T> {
      /** Nested items: parent is checked when every nested item is checked and partially checked when some of them
       * @tutorial Rules
       * * value of checked parent is included in `$value`; point `value: undefined` to exclude it
       * * leaf (item without nested items) must have value otherwise its state is lost */
      items?: Item<T>[];
      /** Expanded state on init (only with option `collapsible`)
       * @defaultValue false */
      expanded?: boolean;
      /** Disallow user to check item & nested items and to focus them (the same as option `disabled` of the control)
       * * point string (reason) to show it via tooltip (`WUPPopupElement.$useTooltip({ attr: "disabled" })` is applied automatically; call it before to customize)
       * @defaultValue false */
      disabled?: boolean | string;
      /** Disallow user to check item & nested items (the same as option `readOnly` of the control)
       * * point string (reason) to show it via tooltip (`WUPPopupElement.$useTooltip({ attr: "readonly" })` is applied automatically; call it before to customize)
       * @defaultValue false */
      readOnly?: boolean | string;
    }
    interface EventMap extends WUP.Check.EventMap {}
    interface ValidityMap extends WUP.Check.ValidityMap {
      /** Count of minimal values that must be checked */
      minCount: number;
      /** Count of maximal values that can be checked */
      maxCount: number;
    }
    interface NewOptions<T = any> {
      /** Items showed as tree of checkboxes; with custom HTML (`<ul>` inside the control) items are bound to `<li>` elements in depth-first order
       * @see {@link Item}
       * @see {@link WUPCheckTreeControl} customization via HTML
       * @tutorial Troubleshooting
       * * array items isn't converted to Proxy (observer) so changing array in place doesn't re-render items; reassign it instead */
      items: Item<T>[] | (() => Item<T>[]);
      /** Allow user to expand/collapse nested items and the whole tree (via the main checkbox) by click on icon or Enter.
       *  Items are collapsed by default (use `item.expanded` to change it) and the whole tree is expanded;
       *  nested items are rendered only on first expanding
       * @defaultValue false */
      collapsible: boolean;
    }
    interface Options<T = any, VM = ValidityMap> extends WUP.Check.Options<T, VM>, NewOptions<T> {
      /** @readonly Constant value that impossible to change: checkbox is placed before label for every item */
      reverse: true;
    }
    interface JSXProps<C = WUPCheckTreeControl> extends WUP.Check.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      /** @deprecated Not supported in CheckTreeControl */
      "w-reverse"?: never;
      /** Global reference to object with array
       * @see  {@link Item}
       * @example
       * ```js
       * window.myItems = [...];
       * <wup-checktree w-items="window.myItems"></wup-checktree>
       * ``` */
      "w-items"?: string;
      "w-collapsible"?: boolean | "";
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPCheckTreeControl; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with tree of checkboxes
       *  @see {@link WUPCheckTreeControl} */
      [tagName]: WUP.Base.ReactHTML<WUPCheckTreeControl> & WUP.CheckTree.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with tree of checkboxes
       *  @see {@link WUPCheckTreeControl} */
      [tagName]: HTMLAttributes<WUPCheckTreeControl> & WUP.CheckTree.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Check-state of tree item */
const enum CheckStates {
  off = 0,
  on,
  mixed,
}
/** Values for attr [aria-checked] by CheckStates */
const ariaChecked = ["false", "true", "mixed"];

/** Returns key to find item by value (the same as WUPBaseControl.$isEqual compares: by id or valueOf) */
const keyOf = (v: any): unknown => (v != null && typeof v === "object" ? v.id ?? v.valueOf() : v);

/** Sets/removes attr of item row: string is reason that is shown via tooltip; nested items of disabled/readonly parent get empty attr */
function setReason(row: Element, attr: string, isOn: boolean, reason?: boolean | string): void {
  isOn ? row.setAttribute(attr, typeof reason === "string" ? reason : "") : row.removeAttribute(attr);
  typeof reason === "string" && useTooltipOnce(attr);
}

type NodeElement = HTMLLIElement & { _index: number };
interface TreeNode<T> {
  item: WUP.CheckTree.Item<T>;
  /** Index of parent node; -1 for root-level */
  parent: number;
  /** Index next to the last nested node: nested nodes are placed in range [index + 1, end) */
  end: number;
  expanded: boolean;
  /** Item or some of parents is disabled */
  isDisabled: boolean;
  /** Item or some of parents is readonly */
  isReadOnly: boolean;
  /** Rendered element (with option `collapsible` nested items are rendered only on first expanding if HTML isn't custom) */
  li?: NodeElement;
}

/** Form-control with tree of checkboxes; the main checkbox checks/unchecks all items
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/checkTree}
 * @example
  const el = document.createElement("wup-checktree");
  el.$options.name = "permissions";
  el.$options.items = [
    {
      value: 1, // point `undefined` to exclude parent from $value
      text: "Users",
      items: [
        { value: 11, text: "Read" },
        { value: 12, text: "Write" },
      ],
    },
    { value: 2, text: "Reports" },
  ];
  el.$initValue = [11]; // `[1]` checks parent & all nested items => `$value: [1, 11, 12]`
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-checktree w-name="permissions" w-items="window.myItems" w-initvalue="window.myInitValue" w-collapsible />
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *    <input type='checkbox'/>
 *    <strong>{$options.label}</strong>
 *    <span icon></span>
 *    <span expand></span> // only with option collapsible
 * </label>
 * <ul role="tree">
 *    <li role="treeitem" aria-checked="mixed" aria-expanded="true"> // [aria-disabled] if item or some of parents is disabled
 *      <span expand></span> // only with option collapsible
 *      <span item><span icon></span>Users</span> // [disabled]/[readonly] if item or some of parents is disabled/readonly
 *      <ul role="group">
 *        <li role="treeitem" aria-checked="true"><span item><span icon></span>Read</span></li>
 *        // etc.
 *      </ul>
 *    </li>
 *    // etc.
 * </ul>
 * @tutorial Customization via HTML @example
 * // place `<ul>` with items inside the control: it isn't re-rendered but bound to $options.items by index in depth-first order;
 * // so nesting must be the same as for items (item.text is ignored); roles, aria-attrs and [expand] are added by the control
 * // otherwise error is logged and HTML is replaced by default rendering
 * <wup-checktree w-items="window.myItems">
 *    <ul>
 *      <li>
 *        <span item><span icon></span><b>Users</b></span>
 *        <ul>
 *          <li><span item><span icon></span>Read</span></li>
 *          <li><span item><span icon></span>Write</span></li>
 *        </ul>
 *      </li>
 *      <li><span item><span icon></span>Reports</span></li>
 *    </ul>
 * </wup-checktree>; */
export default class WUPCheckTreeControl<
  ValueType = any,
  TOptions extends WUP.CheckTree.Options = WUP.CheckTree.Options,
  EventMap extends WUP.CheckTree.EventMap = WUP.CheckTree.EventMap
> extends WUPCheckControl<TOptions, EventMap, ValueType[] | undefined> {
  #ctr = this.constructor as typeof WUPCheckTreeControl;

  static get $styleRoot(): string {
    return "";
  }

  static get $style(): string {
    return super.$style;
  }

  /** Compares values by check-states of items (so `[parent]` equals to `[parent, ...nested]`) */
  static override $isEqual(v1: unknown, v2: unknown, c: WUPCheckTreeControl): boolean {
    if (v1 === v2) {
      return true;
    }
    const a1 = (v1 as unknown[] | undefined) ?? [];
    const a2 = (v2 as unknown[] | undefined) ?? [];
    if (!c._nodes) {
      // items aren't rendered yet (control isn't ready)
      return a1.length === a2.length && a1.every((a) => a2.some((b) => WUPBaseControl.$isEqual(a, b, c)));
    }
    const s1 = c.valueToStates(a1);
    const s2 = c.valueToStates(a2);
    return s1.every((s, i) => s === s2[i]);
  }

  static override $isEmpty(v: unknown[] | undefined): boolean {
    return !v || v.length === 0;
  }

  static $defaults: WUP.CheckTree.Options = inheritDefaults(WUPCheckControl.$defaults, {
    validationRules: inheritDefaults(WUPCheckControl.$defaults.validationRules, {
      minCount: (v, setV) => (v == null || v.length < setV) && __wupln(`Min count is ${setV}`, "validation"),
      maxCount: (v, setV) => (v == null || v.length > setV) && __wupln(`Max count is ${setV}`, "validation"),
    }),
    items: [],
    collapsible: false,
    reverse: true,
  });

  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.CheckTree.Options;
    d.items = [];
    return d as unknown as T;
  }

  #value?: ValueType[];
  // WARN: SwitchControl casts value to boolean
  get $value(): ValueType[] | undefined {
    return this.#value;
  }

  set $value(v: ValueType[] | undefined) {
    this.setValue(v, SetValueReasons.manual);
  }

  /** Reference to the tree with items */
  $refTree = document.createElement("ul");
  /** Reference to icon that expands/collapses the whole tree (it's appended only with option `collapsible`) */
  $refExpand = document.createElement("span");

  /** Flat list of items in depth-first order; it's undefined when items aren't rendered yet */
  _nodes?: TreeNode<ValueType>[];
  /** Check-states of `_nodes` */
  _states?: Uint8Array;
  /** Index of `_nodes` by `keyOf(item.value)` */
  #index?: Map<unknown, number>;
  /** Index of item that is focusable via Tab (roving tabindex) */
  _activeIndex = 0;
  /** It's true when items was added as children in manual way */
  _isCustomRendered = false;

  /** Called when need to parse attr [initValue]: global reference to array of values is expected */
  override parse(attrValue: string): ValueType[] | undefined {
    return nestedProperty.get(window, attrValue);
  }

  /** Returns string-value representation for storage: `(value.id ?? value).toString()` or `$null` for `null` */
  valueToStr(v: ValueType): string {
    return v == null ? "$null" : ((v as any).id ?? v).toString();
  }

  override valueToStorage(v: ValueType[] | undefined): string | null {
    return v?.map((vi) => this.valueToStr(vi)).join("_") || null;
  }

  override valueFromStorage(str: string): ValueType[] | undefined {
    const set = new Set(str.split("_"));
    const r: ValueType[] = [];
    this._nodes!.forEach(
      ({ item }) => item.value !== undefined && set.has(this.valueToStr(item.value)) && r.push(item.value)
    );
    return r.length ? r : undefined;
  }

  protected override renderControl(): void {
    const ul = this.querySelector<HTMLUListElement>(":scope > ul");
    if (ul) {
      this.$refTree = ul;
      this._isCustomRendered = true;
    }
    super.renderControl();
    const t = this.$refTree;
    t.id ||= this.#ctr.$uniqueId;
    t.setAttribute("role", "tree");
    t.setAttribute("aria-multiselectable", true);
    this.$refTitle.id = this.#ctr.$uniqueId;
    t.setAttribute("aria-labelledby", this.$refTitle.id);
    this.$refInput.setAttribute("aria-controls", t.id);
    this.$refExpand.setAttribute("expand", "");
    this.appendChild(t);
  }

  protected override gotReady(): void {
    super.gotReady();
    const t = this.$refTree;
    this.appendEvent(t, "mousedown", (e) => {
      const li = this.findItem(e);
      li && this.setActive(li._index, true); // WARN: default behavior (text-selection & blur) is prevented by BaseControl
    });
    this.appendEvent(t, "click", (e) => this.gotClickItem(e), { passive: false }); // otherwise item.onClick can't prevent checking
    this.appendEvent(
      this.$refExpand,
      "click",
      (e) => {
        e.preventDefault(); // otherwise label toggles the main checkbox
        this.toggleExpand(-1);
      },
      { passive: false }
    );
  }

  /** Called to (re)build & render tree based on $options.items */
  protected renderItems(): void {
    this._nodes && this.setActive(-1); // remove tabindex from the previous active item (custom HTML isn't re-rendered)
    const { items, collapsible } = this._opts;
    const nodes: TreeNode<ValueType>[] = [];
    const index = new Map<unknown, number>();
    const add = (arr: WUP.CheckTree.Item<ValueType>[], parent: number): void => {
      const p = nodes[parent] as TreeNode<ValueType> | undefined;
      arr.forEach((item) => {
        const i =
          nodes.push({
            item,
            parent,
            end: 0,
            expanded: !collapsible || !!item.expanded,
            isDisabled: !!item.disabled || !!p?.isDisabled,
            isReadOnly: !!item.readOnly || !!p?.isReadOnly,
          }) - 1;
        const k = keyOf(item.value);
        item.value !== undefined && !index.has(k) && index.set(k, i);
        item.items?.length && add(item.items, i);
        nodes[i].end = nodes.length;
      });
    };
    add(typeof items === "function" ? items() : items, -1);

    this._nodes = nodes;
    this.#index = index;
    this._states = new Uint8Array(nodes.length);
    // apply current value to new items: value is normalized silently because check-states are the same (see $isEqual)
    this.setValue(this.#value, SetValueReasons.initValue);

    if (this._isCustomRendered && nodes.length && !this.bindNodes()) {
      this._isCustomRendered = false; // custom HTML is replaced by default rendering
    }
    if (!this._isCustomRendered) {
      const t = this.$refTree;
      this.removeChildren.call(t);
      t.appendChild(this.renderNodes(document.createDocumentFragment(), 0, nodes.length));
    }
    this.setActive(this.nextEnabled(0));
  }

  /** Called to render direct nested items placed in range [from, to) */
  protected renderNodes<T extends Node>(parent: T, from: number, to: number): T {
    for (let i = from; i < to; i = this._nodes![i].end) {
      parent.appendChild(this.renderNode(i));
    }
    return parent;
  }

  /** Called to render item & its nested items (if it's expanded) */
  protected renderNode(i: number): NodeElement {
    const n = this._nodes![i];
    const { item } = n;
    const isParent = n.end > i + 1;
    const li = document.createElement("li") as NodeElement;
    const row = li.appendChild(document.createElement("span"));
    row.setAttribute("item", "");
    row.appendChild(document.createElement("span")).setAttribute("icon", "");
    this.setupNode(i, li, row);
    const s = item.text;
    if (typeof s === "function") {
      this.setAttr.call(li, "aria-label", s(item.value, row.appendChild(document.createElement("span")), i, this));
    } else {
      row.appendChild(document.createTextNode(s));
      isParent && li.setAttribute("aria-label", s); // otherwise text of nested items can be included in the name
    }
    isParent && n.expanded && this.renderGroup(i);
    return li;
  }

  /** Called to bind items to the tree rendered via HTML: `<li>` elements are matched to items by index in depth-first order
   * @returns false if HTML doesn't match items (nothing is bound) */
  protected bindNodes(): boolean {
    const nodes = this._nodes!;
    const t = this.$refTree;
    const arr = t.querySelectorAll("li") as NodeListOf<NodeElement>;
    const rows: Element[] = [];
    if (arr.length === nodes.length) {
      for (let i = 0; i < nodes.length; ++i) {
        const li = arr[i];
        const row = li.querySelector(":scope > [item]");
        // nesting of elements must be the same as for items: the tree is placed directly in the control
        if (!row || li.parentElement!.parentElement !== (arr[nodes[i].parent] ?? this)) {
          break;
        }
        rows.push(row);
      }
    }
    if (rows.length !== nodes.length) {
      this.throwError("Custom HTML doesn't match items", { items: this._opts.items, tree: t }, true);
      return false;
    }
    rows.forEach((row, i) => {
      const li = arr[i];
      const ul = li.parentElement!;
      ul !== t && ul.setAttribute("role", "group");
      this.setupNode(i, li, row);
      // otherwise text of nested items is included in the name
      nodes[i].end > i + 1 && !li.hasAttribute("aria-label") && li.setAttribute("aria-label", row.textContent!.trim());
    });
    return true;
  }

  /** Called to update element of item (rendered by control or via HTML) according to item & options */
  protected setupNode(i: number, li: NodeElement, row: Element): void {
    const n = this._nodes![i];
    const { disabled, readOnly } = n.item;
    li._index = i;
    li.setAttribute("role", "treeitem");
    li.setAttribute("aria-checked", ariaChecked[this._states![i]]);
    this.setAttr.call(li, "aria-disabled", n.isDisabled);
    const prev = row.previousElementSibling;
    const ex = prev?.hasAttribute("expand") ? prev : null; // [expand] is placed right before [item]
    if (n.end > i + 1 && this._opts.collapsible) {
      li.setAttribute("aria-expanded", n.expanded);
      !ex && li.insertBefore(document.createElement("span"), row).setAttribute("expand", ""); // outside [item] to have own hover-state
    } else {
      li.removeAttribute("aria-expanded");
      ex?.remove();
    }
    setReason(row, "disabled", n.isDisabled, disabled);
    setReason(row, "readonly", n.isReadOnly, readOnly);
    n.li = li;
  }

  /** Called to render nested items of pointed parent */
  protected renderGroup(i: number): void {
    const n = this._nodes![i];
    const ul = document.createElement("ul");
    ul.setAttribute("role", "group");
    n.li!.appendChild(this.renderNodes(ul, i + 1, n.end));
  }

  /** Returns check-states of items according to value: checked parent checks every nested item */
  protected valueToStates(v: ValueType[] | undefined, isLogErr?: boolean): Uint8Array {
    const nodes = this._nodes!;
    const st = new Uint8Array(nodes.length);
    v?.forEach((vi) => {
      const i = this.findIndex(vi);
      if (i > -1) {
        st.fill(CheckStates.on, i, nodes[i].end);
      } else if (isLogErr) {
        this.throwError("Not found in items", { items: this._opts.items, value: vi }, true);
      }
    });
    return this.calcParents(st);
  }

  /** Updates check-states of parents based on nested items; returns the same array */
  protected calcParents(st: Uint8Array): Uint8Array {
    const nodes = this._nodes!;
    // reverse order because nested items are placed after the parent
    for (let i = nodes.length - 1; i > -1; --i) {
      const { end } = nodes[i];
      if (end > i + 1) {
        st[i] = this.calcState(st, i + 1, end);
      }
    }
    return st;
  }

  /** Returns value according to check-states: values of checked items (parent is checked when every nested item is checked) */
  protected statesToValue(st: Uint8Array): ValueType[] | undefined {
    const r: ValueType[] = [];
    this._nodes!.forEach(({ item }, i) => st[i] === CheckStates.on && item.value !== undefined && r.push(item.value));
    return r.length ? r : undefined;
  }

  /** Returns check-state of parent based on direct nested items placed in range [from, to) */
  protected calcState(st: Uint8Array, from: number, to: number): CheckStates {
    let isOn = false;
    let isOff = false;
    for (let i = from; i < to; i = this._nodes![i].end) {
      const s = st[i];
      if (s === CheckStates.on) {
        isOn = true;
      } else if (s === CheckStates.off) {
        isOff = true;
      }
      if (s === CheckStates.mixed || (isOn && isOff)) {
        return CheckStates.mixed;
      }
    }
    return isOn ? CheckStates.on : CheckStates.off;
  }

  /** Returns index of item by value or -1 */
  protected findIndex(v: ValueType): number {
    const nodes = this._nodes!;
    // WARN: base $isEqual because $isEqual of the control compares arrays
    const i = this.#index!.get(keyOf(v));
    if (i !== undefined && WUPBaseControl.$isEqual(nodes[i].item.value, v, this)) {
      return i;
    }
    return nodes.findIndex(({ item }) => item.value !== undefined && WUPBaseControl.$isEqual(item.value, v, this));
  }

  protected override setValue(v: ValueType[] | undefined, reason: SetValueReasons): boolean | null {
    if (this._nodes) {
      const st = this.valueToStates(v, true);
      v = this.statesToValue(st);
      this.renderStates(st);
    }
    this.#value = v;
    return super.setValue(v, reason);
  }

  /** Called to update check-states of rendered items */
  protected renderStates(st: Uint8Array): void {
    const prev = this._states!;
    this._nodes!.forEach(({ li }, i) => prev[i] !== st[i] && li?.setAttribute("aria-checked", ariaChecked[st[i]]));
    this._states = st;
  }

  /** Called to update the main checkbox: it's checked when every item is checked and indeterminate when some of them */
  protected override checkInput(): void {
    const s = this._nodes ? this.calcState(this._states!, 0, this._nodes.length) : CheckStates.off;
    this.$refInput.indeterminate = s === CheckStates.mixed;
    super.checkInput(s === CheckStates.on);
  }

  /** Called when user changes the main checkbox: checks/unchecks every item */
  protected override gotInput(): void {
    this.$isReadOnly ? this.checkInput() : this.toggleCheck(0, this._nodes!.length); // checkInput rollbacks changes of browser
  }

  /** Called when user toggles items placed in range [from, to): checks them or unchecks if they're checked;
   *  disabled & readonly items aren't changed */
  protected toggleCheck(from: number, to: number): void {
    const nodes = this._nodes!;
    const leaves: number[] = []; // states of parents are calculated based on nested items
    for (let i = from; i < to; ++i) {
      const n = nodes[i];
      n.end === i + 1 && !n.isDisabled && !n.isReadOnly && leaves.push(i);
    }
    if (!leaves.length) {
      this.checkInput(); // rollback changes of browser for the main checkbox
      return;
    }
    const st = this._states!.slice();
    const s = leaves.every((i) => st[i] === CheckStates.on) ? CheckStates.off : CheckStates.on;
    leaves.forEach((i) => (st[i] = s));
    this.setValue(this.statesToValue(this.calcParents(st)), SetValueReasons.userInput);
  }

  /** Called to expand/collapse nested items (only with option `collapsible`); point `-1` to expand/collapse the whole tree
   * @returns true if state is changed */
  protected toggleExpand(i: number): boolean {
    if (!this._opts.collapsible) {
      return false;
    }
    if (i === -1) {
      const t = this.$refTree;
      t.hidden = !t.hidden;
      this.$refInput.setAttribute("aria-expanded", !t.hidden);
      return true;
    }
    const n = this._nodes![i];
    if (n.end === i + 1) {
      return false; // item without nested items
    }
    n.expanded = !n.expanded;
    n.li!.setAttribute("aria-expanded", n.expanded);
    if (n.expanded) {
      !this._nodes![i + 1].li && this.renderGroup(i); // nested items are rendered on first expanding
    } else if (this._activeIndex > i && this._activeIndex < n.end) {
      this.setActive(i, this.$isFocused); // active item is hidden
    }
    return true;
  }

  /** Called to change item that is focusable via Tab (roving tabindex) */
  protected setActive(i: number, isFocus?: boolean): void {
    const nodes = this._nodes!;
    nodes[this._activeIndex]?.li?.removeAttribute("tabindex");
    this._activeIndex = i;
    const li = nodes[i]?.li;
    if (li) {
      this.$isDisabled ? li.removeAttribute("tabindex") : (li.tabIndex = 0);
      isFocus && li.focus();
    }
  }

  /** Returns pointed index or index of the next item that isn't disabled (nested items of disabled parent are skipped); `-1` if not found */
  protected nextEnabled(i: number): number {
    const nodes = this._nodes!;
    for (; i < nodes.length; i = nodes[i].end) {
      if (!nodes[i].isDisabled) {
        return i;
      }
    }
    return -1;
  }

  /** Returns index of next visible & enabled item; `-1` is the main checkbox (it's next to the last item) */
  protected nextVisible(i: number): number {
    if (i === -1) {
      return this.$refTree.hidden ? -1 : this.nextEnabled(0);
    }
    const n = this._nodes![i];
    return this.nextEnabled(n.expanded ? i + 1 : n.end); // for item without nested items `i + 1 === end`
  }

  /** Returns index of previous visible & enabled item; `-1` is the main checkbox (it's previous to the first item) */
  protected prevVisible(i: number): number {
    if (i === -1) {
      i = this.$refTree.hidden ? 0 : this._nodes!.length; // the last item is previous to the main checkbox
    }
    while (i) {
      i = this.visibleOf(i - 1);
      if (!this._nodes![i].isDisabled) {
        return i;
      }
    }
    return -1;
  }

  /** Returns index of pointed item or the top collapsed parent (if item is hidden) */
  protected visibleOf(i: number): number {
    const nodes = this._nodes!;
    let r = i;
    for (let p = nodes[i].parent; p !== -1; p = nodes[p].parent) {
      !nodes[p].expanded && (r = p);
    }
    return r;
  }

  /** Returns tree item related to mouse event (row or expand-icon) or null if it's not the main button or control/item is disabled */
  protected findItem(e: MouseEvent): NodeElement | null {
    const el = !e.button && !this.$isDisabled ? (e.target as Element).closest?.("[item],[expand]") : null;
    const li = el && this.$refTree.contains(el) ? (el.parentElement as NodeElement) : null;
    const n = li && this._nodes![li._index];
    return n && !n.isDisabled ? li : null; // custom HTML isn't bound when items are empty
  }

  /** Called when user clicks on the tree */
  protected gotClickItem(e: MouseEvent): void {
    const li = this.findItem(e);
    if (!li) {
      return;
    }
    const i = li._index;
    if ((e.target as Element).hasAttribute("expand")) {
      this.toggleExpand(i);
      return;
    }
    const { item, end } = this._nodes![i];
    item.onClick?.call(li, e, item);
    !e.defaultPrevented && !this.$isReadOnly && this.toggleCheck(i, end);
  }

  /** Called when user presses key on focused item or the main checkbox (it's item with index `-1`):
   *  arrows move focus (as for radio-group), Space checks item, Enter expands/collapses nested items (with option `collapsible`) */
  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    super.gotKeyDown(e);
    const i = e.target === this.$refInput ? -1 : (e.target as Partial<NodeElement>)._index;
    if (i === undefined || e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }
    let next: number | undefined;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = this.nextVisible(i);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = this.prevVisible(i);
        break;
      case " ":
        if (i === -1) {
          return; // browser toggles the main checkbox itself: see gotInput
        }
        this.toggleCheck(i, this._nodes![i].end);
        break;
      case "Enter":
        if (!this.toggleExpand(i)) {
          return; // allow form to submit
        }
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next !== undefined) {
      next === -1 ? this.$refInput.focus() : this.setActive(next, true);
    }
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.CheckTree.Options> | null): void {
    this._opts.reverse = true; // WARN: SwitchControl sets attr [w-reverse] that is required for styles
    this._opts.items ??= [];
    if (!propsChanged || propsChanged.includes("items") || propsChanged.includes("collapsible")) {
      this.renderItems(); // WARN: it's important to be before super otherwise initValue won't work
    }
    super.gotChanges(propsChanged as any);
    const isCollapsible = this._opts.collapsible;
    this.setAttr("w-collapsible", isCollapsible, true);
    if (isCollapsible) {
      if (!this.$refExpand.isConnected) {
        this.$refLabel.appendChild(this.$refExpand);
        this.$refInput.setAttribute("aria-expanded", true); // the whole tree is expanded on init
      }
    } else {
      this.$refExpand.remove();
      this.$refTree.hidden = false;
      this.$refInput.removeAttribute("aria-expanded");
    }
    this.setAttr.call(this.$refTree, "aria-required", this.$isRequired);
  }

  override gotFormChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotFormChanges(propsChanged);
    this.setAttr.call(this.$refTree, "aria-disabled", this.$isDisabled);
    this._nodes && this.setActive(this._activeIndex); // disabled item must not be focusable
  }
}

customElements.define(tagName, WUPCheckTreeControl);
