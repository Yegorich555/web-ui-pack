/* eslint-disable prefer-destructuring */
import { WUPCheckTreeControl } from "web-ui-pack";
import { SetValueReasons } from "web-ui-pack/controls/baseControl";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

const getItems = () => [
  {
    text: "Users",
    value: 1,
    items: [
      { text: "Read", value: 11 },
      { text: "Write", value: 12 },
    ],
  },
  { text: "Reports", value: 2 },
  { text: "Settings", value: 3 },
];

/** @type WUPCheckTreeControl */
let el;
initTestBaseControl({
  type: WUPCheckTreeControl,
  htmlTag: "wup-checktree",
  onInit: (e) => {
    el = e;
    el.$options.items = getItems();

    window.$1Value = [11];
    window.$2Value = [2, 3];
    window.$3Value = [12];
  },
});

/** Returns rendered items in format `text:aria-checked` + `:expanded={aria-expanded}` + `:tab` (if focusable via Tab) */
function getStates() {
  return Array.from(el.$refTree.querySelectorAll("li")).map((li) => {
    const ex = li.getAttribute("aria-expanded");
    const tab = li.getAttribute("tabindex") === "0" ? ":tab" : "";
    return `${li.querySelector(":scope > [item]").textContent}:${li.getAttribute("aria-checked")}${
      ex ? `:expanded=${ex}` : ""
    }${tab}`;
  });
}

/** Returns state of the main checkbox */
const getMainState = () => (el.$refInput.indeterminate ? "mixed" : el.$refInput.checked);

/** Returns text of focused item or `main` for the main checkbox */
const getFocused = () =>
  document.activeElement === el.$refInput
    ? "main"
    : document.activeElement.querySelector(":scope > [item]")?.textContent;

/** Returns rendered rows [item] */
const getRows = () => el.$refTree.querySelectorAll("[item]");

/** Simulates pressing key on focused element; returns true if event is handled (default prevented) */
function pressKey(key, opts) {
  const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts });
  document.activeElement.dispatchEvent(ev);
  return ev.defaultPrevented;
}

describe("control.checkTree", () => {
  testBaseControl({
    noInputSelection: true,
    isValueNormalized: true,
    initValues: [
      { attrValue: "window.$1Value", value: [11] },
      { attrValue: "window.$2Value", value: [2, 3], urlValue: "2_3" },
      { attrValue: "window.$3Value", value: [12] },
    ],
    validations: {
      minCount: { set: 2, failValue: [11], trueValue: [2, 3] },
      maxCount: { set: 2, failValue: [11, 2, 3], trueValue: [2, 3] },
    },
    attrs: {
      "w-items": { value: getItems() },
      "w-collapsible": { value: true, equalValue: "" },
      "w-reverse": { skip: true }, // constant value
      defaultchecked: { skip: true },
    },
    onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("items rendering", () => {
    expect(el.$refTree.outerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="tree" aria-multiselectable="true" aria-labelledby="txt3"><li role="treeitem" aria-checked="false" aria-label="Users" tabindex="0"><span item=""><span icon=""></span>Users</span><ul role="group"><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Read</span></li><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Write</span></li></ul></li><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Reports</span></li><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Settings</span></li></ul>"`
    );
    expect(el.$refInput.getAttribute("aria-controls")).toBe(el.$refTree.id);
    expect(el.$refTree.getAttribute("aria-labelledby")).toBe(el.$refTitle.id);

    // text as function: returned value is used as aria-label
    el.$options.items = [
      {
        value: 1,
        text: (v, span, i) => {
          span.textContent = `Custom ${v}`;
          return `Aria ${i}`;
        },
        items: [
          {
            value: 11,
            text: (v, span) => {
              span.textContent = `Nested ${v}`;
            },
          },
        ],
      },
    ];
    jest.advanceTimersByTime(1);
    expect(el.$refTree.innerHTML).toMatchInlineSnapshot(
      `"<li role="treeitem" aria-checked="false" aria-label="Aria 0" tabindex="0"><span item=""><span icon=""></span><span>Custom 1</span></span><ul role="group"><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span><span>Nested 11</span></span></li></ul></li>"`
    );

    // items as function & empty nested items
    el.$options.items = () => [{ value: 5, text: "Five", items: [] }];
    jest.advanceTimersByTime(1);
    expect(getStates()).toStrictEqual(["Five:false:tab"]);
    expect(el.$refTree.querySelector("[aria-label]")).toBe(null); // aria-label is required only for parents

    // without items
    el.$options.items = undefined;
    jest.advanceTimersByTime(1);
    expect(el.$options.items).toStrictEqual([]);
    expect(el.$refTree.innerHTML).toBe("");
  });

  test("$value & check-states", () => {
    const onErr = h.mockConsoleError();
    expect(el.$value).toBe(undefined);
    expect(getMainState()).toBe(false);

    el.$value = [1]; // checked parent checks every nested item
    expect(el.$value).toStrictEqual([1, 11, 12]);
    expect(getStates()).toStrictEqual(["Users:true:tab", "Read:true", "Write:true", "Reports:false", "Settings:false"]);
    expect(getMainState()).toBe("mixed");
    expect(el.hasAttribute("checked")).toBe(false);

    el.$value = [11, 12]; // parent is checked when every nested item is checked
    expect(el.$value).toStrictEqual([1, 11, 12]);

    el.$value = [12];
    expect(el.$value).toStrictEqual([12]);
    expect(getStates()).toStrictEqual([
      "Users:mixed:tab",
      "Read:false",
      "Write:true",
      "Reports:false",
      "Settings:false",
    ]);
    expect(getMainState()).toBe("mixed");

    el.$value = [3, 2, 1]; // ordered by items
    expect(el.$value).toStrictEqual([1, 11, 12, 2, 3]);
    expect(getMainState()).toBe(true);
    expect(el.hasAttribute("checked")).toBe(true);

    el.$value = [];
    expect(el.$value).toBe(undefined);
    expect(getMainState()).toBe(false);
    expect(el.hasAttribute("checked")).toBe(false);
    expect(onErr).not.toBeCalled();

    // value isn't found in items
    el.$value = [2, 99];
    expect(el.$value).toStrictEqual([2]);
    expect(onErr).toBeCalledTimes(1);
    expect(onErr.mock.lastCall[0]).toBe("WUP-CHECKTREE. Not found in items");
    expect(onErr.mock.lastCall[1]).toStrictEqual({ items: el.$options.items, value: 99 });
    h.unMockConsoleError();
  });

  test("$value is equal by check-states", () => {
    const spyChange = jest.fn();
    el.$onChange = spyChange;

    el.$initValue = [1];
    expect(el.$value).toStrictEqual([1, 11, 12]);
    el.$value = [11, 12];
    expect(el.$isChanged).toBe(false);
    jest.advanceTimersByTime(1);
    expect(spyChange).not.toBeCalled();

    el.$value = [11];
    expect(el.$isChanged).toBe(true);
    jest.advanceTimersByTime(1);
    expect(spyChange).toBeCalledTimes(1);

    // changing items keeps value & normalizes it silently
    spyChange.mockClear();
    el.$options.items = [...getItems(), { text: "New", value: 4 }];
    jest.advanceTimersByTime(1);
    expect(el.$value).toStrictEqual([11]);
    expect(spyChange).not.toBeCalled();
    expect(getStates()).toStrictEqual([
      "Users:mixed:tab",
      "Read:true",
      "Write:false",
      "Reports:false",
      "Settings:false",
      "New:false",
    ]);
    el.$options.items = [{ text: "Read", value: 11 }];
    jest.advanceTimersByTime(1);
    expect(el.$value).toStrictEqual([11]);
    expect(getMainState()).toBe(true);
    expect(spyChange).not.toBeCalled();
  });

  test("parent without value & deep nesting", () => {
    el.$options.items = [
      {
        text: "Group",
        value: undefined, // parent isn't included in $value
        items: [
          {
            text: "A",
            value: "a",
            items: [
              { text: "A1", value: "a1" },
              { text: "A2", value: "a2" },
            ],
          },
          { text: "B", value: "b" },
        ],
      },
      { text: "C", value: "c" },
    ];
    jest.advanceTimersByTime(1);

    el.$value = ["a", "b"];
    expect(el.$value).toStrictEqual(["a", "a1", "a2", "b"]);
    expect(getStates()).toStrictEqual(["Group:true:tab", "A:true", "A1:true", "A2:true", "B:true", "C:false"]);

    el.$value = ["a1", "b"];
    expect(el.$value).toStrictEqual(["a1", "b"]);
    expect(getStates()).toStrictEqual(["Group:mixed:tab", "A:mixed", "A1:true", "A2:false", "B:true", "C:false"]);

    el.$value = ["a2"];
    expect(getStates()).toStrictEqual(["Group:mixed:tab", "A:mixed", "A1:false", "A2:true", "B:false", "C:false"]);
  });

  test("complex values", () => {
    const onErr = h.mockConsoleError();
    const items = [
      { text: "Obj", value: { id: 1, name: "One" } },
      { text: "Date", value: new Date("2024-01-02") },
      { text: "Custom", value: { id: 3, valueOf: () => 33 } },
      { text: "Num", value: 4 },
      { text: "Duplicate", value: 4 },
      { text: "Null", value: null },
    ];
    el.$options.items = items;
    jest.advanceTimersByTime(1);

    el.$value = [{ id: 1 }]; // compared by id
    expect(el.$value).toStrictEqual([items[0].value]);
    expect(el.$value[0]).toBe(items[0].value);

    el.$value = [new Date("2024-01-02")]; // compared by valueOf
    expect(el.$value[0]).toBe(items[1].value);

    el.$value = [{ id: 7, valueOf: () => 33 }]; // the same valueOf despite on different id
    expect(el.$value[0]).toBe(items[2].value);

    el.$value = [4]; // the first item is used for duplicates
    expect(getStates()).toStrictEqual([
      "Obj:false:tab",
      "Date:false",
      "Custom:false",
      "Num:true",
      "Duplicate:false",
      "Null:false",
    ]);

    el.$value = [null];
    expect(el.$value).toStrictEqual([null]);
    expect(onErr).not.toBeCalled();

    el.$value = [{ id: 4 }]; // found by key but not equal to item with value 4
    expect(el.$value).toBe(undefined);
    expect(onErr).toBeCalledTimes(1);
    h.unMockConsoleError();
  });

  test("$isEqual & $isEmpty", () => {
    // when items aren't rendered yet
    const notReady = document.createElement("wup-checktree");
    expect(WUPCheckTreeControl.$isEqual([1, 2], [2, 1], notReady)).toBe(true);
    expect(WUPCheckTreeControl.$isEqual([1], [1, 2], notReady)).toBe(false);
    expect(WUPCheckTreeControl.$isEqual([1, 3], [1, 2], notReady)).toBe(false);
    expect(WUPCheckTreeControl.$isEqual(undefined, [], notReady)).toBe(true);
    expect(WUPCheckTreeControl.$isEqual([{ id: 1 }], [{ id: 1, name: "One" }], notReady)).toBe(true);

    // compared by check-states
    expect(WUPCheckTreeControl.$isEqual([1], [1, 11, 12], el)).toBe(true);
    expect(WUPCheckTreeControl.$isEqual([11, 12], [1], el)).toBe(true);
    expect(WUPCheckTreeControl.$isEqual([11], [12], el)).toBe(false);
    expect(WUPCheckTreeControl.$isEqual([], undefined, el)).toBe(true);
    expect(WUPCheckTreeControl.$isEqual(undefined, [2], el)).toBe(false);
    expect(WUPCheckTreeControl.$isEqual([99], undefined, el)).toBe(true); // because not found in items
    const v = [2];
    expect(WUPCheckTreeControl.$isEqual(v, v, el)).toBe(true);

    expect(WUPCheckTreeControl.$isEmpty(undefined)).toBe(true);
    expect(WUPCheckTreeControl.$isEmpty([])).toBe(true);
    expect(WUPCheckTreeControl.$isEmpty([1])).toBe(false);
    el.$value = [2];
    expect(el.$isEmpty).toBe(false);
  });

  test("user clicks on items", async () => {
    const spyChange = jest.fn();
    el.$onChange = spyChange;

    await h.userClick(getRows()[1]); // Read
    expect(el.$value).toStrictEqual([11]);
    expect(el.$isDirty).toBe(true);
    expect(el.$isChanged).toBe(true);
    expect(getFocused()).toBe("Read");
    expect(getStates()).toStrictEqual([
      "Users:mixed",
      "Read:true:tab",
      "Write:false",
      "Reports:false",
      "Settings:false",
    ]);
    jest.advanceTimersByTime(1);
    expect(spyChange).toBeCalledTimes(1);
    expect(spyChange.mock.lastCall[0].detail).toStrictEqual({ reason: SetValueReasons.userInput });

    await h.userClick(getRows()[0]); // mixed parent => checked with every nested item
    expect(el.$value).toStrictEqual([1, 11, 12]);
    await h.userClick(getRows()[0]); // checked parent => unchecked with every nested item
    expect(el.$value).toBe(undefined);
    await h.userClick(getRows()[0]);
    await h.userClick(getRows()[2]); // unchecked nested item => parent isn't checked anymore
    expect(el.$value).toStrictEqual([11]);
    expect(getStates()).toStrictEqual([
      "Users:mixed",
      "Read:true",
      "Write:false:tab",
      "Reports:false",
      "Settings:false",
    ]);

    // only the main button is handled
    await h.userClick(getRows()[3], { button: 1 });
    expect(el.$value).toStrictEqual([11]);
    expect(getFocused()).toBe("Write"); // focus isn't changed

    // click outside items
    await h.userClick(el.$refTree);
    expect(el.$value).toStrictEqual([11]);
    getRows()[3].lastChild.dispatchEvent(new MouseEvent("click", { bubbles: true })); // just for coverage: event from text node
    expect(el.$value).toStrictEqual([11]);
    // control is placed inside another [item]
    const wrapper = document.body.appendChild(document.createElement("span"));
    wrapper.setAttribute("item", "");
    wrapper.appendChild(el);
    await h.wait(1);
    el.$refTree.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.$value).toStrictEqual([11]);
    await h.userClick(getRows()[3]);
    expect(el.$value).toStrictEqual([11, 2]);
  });

  test("item.onClick", async () => {
    const onClick = jest.fn();
    el.$options.items = [
      { text: "A", value: "a", onClick },
      { text: "B", value: "b", onClick: (e) => e.preventDefault() }, // prevents checking
    ];
    jest.advanceTimersByTime(1);

    await h.userClick(getRows()[0]);
    expect(onClick).toBeCalledTimes(1);
    expect(onClick.mock.instances[0]).toBe(el.$refTree.querySelector("li"));
    expect(onClick.mock.lastCall[0]).toBeInstanceOf(MouseEvent);
    expect(onClick.mock.lastCall[1]).toBe(el.$options.items[0]);
    expect(el.$value).toStrictEqual(["a"]);

    await h.userClick(getRows()[1]);
    expect(el.$value).toStrictEqual(["a"]);
  });

  test("[readOnly] & [disabled] prevent changing", async () => {
    el.$value = [11];
    el.$options.readOnly = true;
    jest.advanceTimersByTime(1);
    await h.userClick(getRows()[0]);
    expect(el.$value).toStrictEqual([11]);
    expect(getFocused()).toBe("Users"); // it's possible to focus item

    el.$refInput.click(); // browser changes the main checkbox & control rollbacks it
    expect(el.$value).toStrictEqual([11]);
    expect(getMainState()).toBe("mixed");

    el.$options.readOnly = false;
    el.$options.disabled = true;
    jest.advanceTimersByTime(1);
    expect(el.$refTree.getAttribute("aria-disabled")).toBe("true");
    expect(el.$refTree.querySelector("[tabindex]")).toBe(null); // disabled item must not be focusable
    await h.userClick(getRows()[3]);
    expect(el.$value).toStrictEqual([11]);
    expect(getFocused()).toBe("Users");

    el.$options.disabled = false;
    jest.advanceTimersByTime(1);
    expect(el.$refTree.hasAttribute("aria-disabled")).toBe(false);
    expect(getStates()[0]).toBe("Users:mixed:tab");
  });

  test("item.disabled & item.readOnly", async () => {
    el.$options.collapsible = true;
    el.$options.items = [
      {
        text: "Users",
        value: 1,
        expanded: true,
        items: [
          { text: "Read", value: 11 },
          { text: "Write", value: 12, readOnly: "Reason RO" },
          { text: "Delete", value: 13, disabled: true },
        ],
      },
      // nested items of disabled/readonly parent are disabled/readonly also
      {
        text: "Reports",
        value: 2,
        disabled: "Reason",
        expanded: true,
        items: [{ text: "Daily", value: 21, disabled: false }],
      },
      { text: "Settings", value: 3, readOnly: true, expanded: true, items: [{ text: "Theme", value: 31 }] },
    ];
    jest.advanceTimersByTime(1);
    el.$value = [13];
    expect(el.$refTree.innerHTML).toMatchInlineSnapshot(
      `"<li role="treeitem" aria-checked="mixed" aria-expanded="true" aria-label="Users" tabindex="0"><span expand=""></span><span item=""><span icon=""></span>Users</span><ul role="group"><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Read</span></li><li role="treeitem" aria-checked="false"><span item="" readonly="Reason RO"><span icon=""></span>Write</span></li><li role="treeitem" aria-checked="true" aria-disabled="true"><span item="" disabled=""><span icon=""></span>Delete</span></li></ul></li><li role="treeitem" aria-checked="false" aria-disabled="true" aria-expanded="true" aria-label="Reports"><span expand=""></span><span item="" disabled="Reason"><span icon=""></span>Reports</span><ul role="group"><li role="treeitem" aria-checked="false" aria-disabled="true"><span item="" disabled=""><span icon=""></span>Daily</span></li></ul></li><li role="treeitem" aria-checked="false" aria-expanded="true" aria-label="Settings"><span expand=""></span><span item="" readonly=""><span icon=""></span>Settings</span><ul role="group"><li role="treeitem" aria-checked="false"><span item="" readonly=""><span icon=""></span>Theme</span></li></ul></li>"`
    );

    jest.advanceTimersByTime(1); // skip $change event of $value
    const spyChange = jest.fn();
    el.$onChange = spyChange;
    // parent toggles only editable items
    await h.userClick(getRows()[0]);
    expect(el.$value).toStrictEqual([11, 13]);
    expect(getStates()[0]).toBe("Users:mixed:expanded=true:tab");
    await h.userClick(getRows()[0]); // every editable item is checked => uncheck them
    expect(el.$value).toStrictEqual([13]);
    jest.advanceTimersByTime(1);
    expect(spyChange).toBeCalledTimes(2);

    // readonly item is focusable but isn't changed
    await h.userClick(getRows()[2]); // Write
    expect(el.$value).toStrictEqual([13]);
    expect(getFocused()).toBe("Write");
    await h.userClick(getRows()[7]); // Theme: nested item of readonly parent
    expect(el.$value).toStrictEqual([13]);
    expect(getFocused()).toBe("Theme");
    await h.userClick(getRows()[6]); // Settings: readonly parent
    expect(el.$value).toStrictEqual([13]);
    // disabled item isn't focusable & isn't changed
    await h.userClick(getRows()[3]); // Delete
    await h.userClick(getRows()[4]); // Reports
    await h.userClick(getRows()[5]); // Daily: nested item of disabled parent
    expect(el.$value).toStrictEqual([13]);
    expect(getFocused()).toBe("Settings");
    jest.advanceTimersByTime(1);
    expect(spyChange).toBeCalledTimes(2);

    // expand: possible for readonly but not for disabled
    const getExpanded = () =>
      Array.from(el.$refTree.querySelectorAll("[aria-expanded]")).map((li) => li.getAttribute("aria-expanded"));
    await h.userClick(el.$refTree.querySelectorAll("[expand]")[1]); // Reports
    await h.userClick(el.$refTree.querySelectorAll("[expand]")[2]); // Settings
    expect(getExpanded()).toStrictEqual(["true", "true", "false"]);
    await h.userClick(el.$refTree.querySelectorAll("[expand]")[2]);

    // the main checkbox toggles only editable items
    el.$refInput.click();
    expect(el.$value).toStrictEqual([11, 13]);
    expect(getMainState()).toBe("mixed");
    el.$refInput.click();
    expect(el.$value).toStrictEqual([13]);
    expect(getMainState()).toBe("mixed");

    // keyboard skips disabled items
    el.$refInput.focus();
    const order = [];
    for (let i = 0; i < 6; ++i) {
      pressKey("ArrowDown");
      order.push(getFocused());
    }
    expect(order).toStrictEqual(["Users", "Read", "Write", "Settings", "Theme", "main"]);
    order.length = 0;
    for (let i = 0; i < 6; ++i) {
      pressKey("ArrowUp");
      order.push(getFocused());
    }
    expect(order).toStrictEqual(["Theme", "Settings", "Write", "Read", "Users", "main"]);
    pressKey("ArrowUp");
    pressKey("ArrowUp");
    pressKey("ArrowUp");
    expect(getFocused()).toBe("Write");
    expect(pressKey(" ")).toBe(true); // readonly item isn't changed
    expect(el.$value).toStrictEqual([13]);
    jest.advanceTimersByTime(1);
    expect(spyChange).toBeCalledTimes(4);

    // every item is locked: the main checkbox isn't changed
    el.$value = undefined;
    jest.advanceTimersByTime(1);
    spyChange.mockClear();
    el.$options.items = [
      { text: "A", value: 1, disabled: true },
      { text: "B", value: 2, readOnly: true },
    ];
    jest.advanceTimersByTime(1);
    expect(getStates()).toStrictEqual(["A:false", "B:false:tab"]); // the 1st item isn't focusable since disabled
    el.$refInput.click();
    expect(el.$value).toBe(undefined);
    expect(getMainState()).toBe(false);
    // the previous item to the 1st enabled one is the main checkbox
    el.$refTree.querySelector("[tabindex]").focus();
    expect(pressKey("ArrowUp")).toBe(true);
    expect(getFocused()).toBe("main");

    el.$options.items = [{ text: "A", value: 1, disabled: true }];
    jest.advanceTimersByTime(1);
    expect(el.$refTree.querySelector("[tabindex]")).toBe(null);
    expect(pressKey("ArrowDown")).toBe(true);
    expect(getFocused()).toBe("main");
    jest.advanceTimersByTime(1);
    expect(spyChange).not.toBeCalled();
  });

  test("user clicks on the main checkbox", () => {
    el.$refInput.click();
    expect(el.$value).toStrictEqual([1, 11, 12, 2, 3]);
    expect(getMainState()).toBe(true);
    expect(el.$isDirty).toBe(true);

    el.$refInput.click();
    expect(el.$value).toBe(undefined);
    expect(getMainState()).toBe(false);

    el.$value = [11];
    expect(getMainState()).toBe("mixed");
    el.$refInput.click(); // mixed => checked
    expect(el.$value).toStrictEqual([1, 11, 12, 2, 3]);
    expect(getMainState()).toBe(true);

    // without items
    el.$value = undefined;
    el.$options.items = [];
    jest.advanceTimersByTime(1);
    el.$refInput.click();
    expect(el.$value).toBe(undefined);
    expect(getMainState()).toBe(false);
  });

  test("keyboard", async () => {
    el.$refInput.focus();
    await h.wait(1);

    expect(pressKey("ArrowDown")).toBe(true);
    expect(getFocused()).toBe("Users");
    expect(pressKey("ArrowRight")).toBe(true);
    expect(getFocused()).toBe("Read");
    expect(getStates()).toStrictEqual([
      "Users:false",
      "Read:false:tab",
      "Write:false",
      "Reports:false",
      "Settings:false",
    ]);
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    expect(getFocused()).toBe("Settings");
    expect(pressKey("ArrowDown")).toBe(true);
    expect(getFocused()).toBe("main"); // the main checkbox is next to the last item
    expect(pressKey("ArrowUp")).toBe(true);
    expect(getFocused()).toBe("Settings"); // the last item is previous to the main checkbox
    expect(pressKey("ArrowLeft")).toBe(true);
    expect(getFocused()).toBe("Reports");
    pressKey("ArrowUp");
    pressKey("ArrowUp");
    pressKey("ArrowUp");
    expect(getFocused()).toBe("Users");
    pressKey("ArrowUp");
    expect(getFocused()).toBe("main");
    expect(getStates()[0]).toBe("Users:false:tab"); // the last focused item is focusable via Tab

    // Space
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    expect(pressKey(" ")).toBe(true);
    expect(el.$value).toStrictEqual([11]);
    expect(pressKey(" ")).toBe(true);
    expect(el.$value).toBe(undefined);
    el.$refInput.focus();
    expect(pressKey(" ")).toBe(false); // browser toggles the main checkbox itself
    expect(el.$value).toBe(undefined);

    // Enter
    expect(pressKey("Enter")).toBe(false); // allow form to submit
    pressKey("ArrowDown");
    expect(pressKey("Enter")).toBe(false); // because option collapsible is disabled

    // ignored keys
    expect(pressKey("ArrowDown", { ctrlKey: true })).toBe(false);
    expect(pressKey("ArrowDown", { altKey: true })).toBe(false);
    expect(pressKey("ArrowDown", { metaKey: true })).toBe(false);
    expect(pressKey("Home")).toBe(false);
    expect(getFocused()).toBe("Users");
    const ev = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
    el.dispatchEvent(ev); // from another element
    expect(ev.defaultPrevented).toBe(false);
  });

  test("option collapsible", async () => {
    el.$value = [12];
    el.$options.collapsible = true;
    jest.advanceTimersByTime(1);
    expect(el.$refLabel.outerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><input id="txt1" type="checkbox" aria-controls="txt2" autocomplete="off" aria-expanded="true"><strong id="txt3"></strong><span icon=""></span><span expand=""></span></label>"`
    );
    expect(el.$refTree.outerHTML).toMatchInlineSnapshot(
      `"<ul id="txt2" role="tree" aria-multiselectable="true" aria-labelledby="txt3"><li role="treeitem" aria-checked="mixed" aria-expanded="false" aria-label="Users" tabindex="0"><span expand=""></span><span item=""><span icon=""></span>Users</span></li><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Reports</span></li><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Settings</span></li></ul>"`
    ); // nested items are rendered only on 1st expanding
    expect(el.getAttribute("w-collapsible")).toBe("");

    el.$value = [11]; // affects on items that aren't rendered yet
    expect(getStates()).toStrictEqual(["Users:mixed:expanded=false:tab", "Reports:false", "Settings:false"]);
    const expand = el.$refTree.querySelector("[expand]");
    await h.userClick(expand);
    expect(getStates()).toStrictEqual([
      "Users:mixed:expanded=true:tab",
      "Read:true",
      "Write:false",
      "Reports:false",
      "Settings:false",
    ]);
    expect(el.$value).toStrictEqual([11]); // click on [expand] doesn't check item
    const nested = el.$refTree.querySelector("[role=group]");
    await h.userClick(expand);
    expect(el.$refTree.querySelector("li").getAttribute("aria-expanded")).toBe("false");
    await h.userClick(expand);
    expect(el.$refTree.querySelector("[role=group]")).toBe(nested); // nested items are rendered only once

    // keyboard
    expect(getFocused()).toBe("Users");
    expect(pressKey("Enter")).toBe(true);
    expect(getStates()[0]).toBe("Users:mixed:expanded=false:tab");
    pressKey("ArrowDown");
    expect(getFocused()).toBe("Reports"); // collapsed nested items are skipped
    pressKey("ArrowUp");
    expect(getFocused()).toBe("Users");
    expect(pressKey("Enter")).toBe(true);
    pressKey("ArrowDown");
    expect(getFocused()).toBe("Read");
    expect(pressKey("Enter")).toBe(false); // item without nested items

    // collapsed parent becomes active if active item is hidden
    expand.click(); // click without mousedown: possible with screen-readers
    expect(getFocused()).toBe("Users");
    expect(getStates()[0]).toBe("Users:mixed:expanded=false:tab");
    pressKey("ArrowDown");
    expect(pressKey("ArrowUp")).toBe(true);
    expect(getFocused()).toBe("Users"); // because nested items are collapsed
    expand.click(); // active item isn't changed by expanding
    expect(getStates()[0]).toBe("Users:mixed:expanded=true:tab");
    pressKey("ArrowDown");
    expect(getFocused()).toBe("Read");
    document.activeElement.blur();
    expand.click(); // active item is hidden when control isn't focused
    expect(document.activeElement).toBe(document.body);
    expect(getStates()[0]).toBe("Users:mixed:expanded=false:tab");

    // the whole tree via the main [expand]
    el.$refInput.focus();
    el.$refExpand.click();
    expect(el.$refTree.hidden).toBe(true);
    expect(el.$refInput.getAttribute("aria-expanded")).toBe("false");
    expect(el.$value).toStrictEqual([11]); // label doesn't toggle the main checkbox
    expect(pressKey("ArrowDown")).toBe(true);
    expect(getFocused()).toBe("main"); // because the tree is collapsed
    expect(pressKey("ArrowUp")).toBe(true);
    expect(getFocused()).toBe("main");
    expect(pressKey("Enter")).toBe(true);
    expect(el.$refTree.hidden).toBe(false);
    expect(el.$refInput.getAttribute("aria-expanded")).toBe("true");

    // disable option
    el.$options.collapsible = false;
    el.$refTree.hidden = true;
    jest.advanceTimersByTime(1);
    expect(el.$refExpand.isConnected).toBe(false);
    expect(el.$refTree.hidden).toBe(false);
    expect(el.$refInput.hasAttribute("aria-expanded")).toBe(false);
    expect(el.$refTree.querySelector("[expand],[aria-expanded]")).toBe(null);
    expect(el.hasAttribute("w-collapsible")).toBe(false);

    // item.expanded
    el.$options.items = getItems().map((a) => ({ ...a, expanded: true }));
    el.$options.collapsible = true;
    jest.advanceTimersByTime(1);
    expect(getStates()).toStrictEqual([
      "Users:mixed:expanded=true:tab",
      "Read:true",
      "Write:false",
      "Reports:false",
      "Settings:false",
    ]);
    el.$options.label = "Other";
    jest.advanceTimersByTime(1);
    expect(el.$refLabel.querySelectorAll("[expand]").length).toBe(1);
  });

  test("roving tabindex after re-rendering", async () => {
    el.$refInput.focus();
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    expect(getStates()[2]).toBe("Write:false:tab");

    el.$options.collapsible = true; // active item becomes hidden
    jest.advanceTimersByTime(1);
    expect(getStates()).toStrictEqual(["Users:false:expanded=false:tab", "Reports:false", "Settings:false"]);

    el.$options.items = [];
    jest.advanceTimersByTime(1);
    expect(el.$refTree.innerHTML).toBe("");
    el.$options.items = getItems();
    jest.advanceTimersByTime(1);
    expect(getStates()[0]).toBe("Users:false:expanded=false:tab");
  });

  test("required", () => {
    el.$options.validations = { required: true };
    jest.advanceTimersByTime(1);
    expect(el.$refTree.getAttribute("aria-required")).toBe("true");
    el.$options.validations = {};
    jest.advanceTimersByTime(1);
    expect(el.$refTree.hasAttribute("aria-required")).toBe(false);
  });

  test("storage", () => {
    el.$options.items = [
      { text: "Null", value: null },
      { text: "Obj", value: { id: 2, name: "Two" } },
      { text: "Group", value: undefined, items: [{ text: "Num", value: 3 }] },
    ];
    jest.advanceTimersByTime(1);

    expect(el.valueToStorage(undefined)).toBe(null);
    expect(el.valueToStorage([])).toBe(null);
    expect(el.valueToStorage([null, { id: 2 }, 3])).toBe("$null_2_3");
    expect(el.valueFromStorage("$null_2_3")).toStrictEqual([null, el.$options.items[1].value, 3]);
    expect(el.valueFromStorage("3_7")).toStrictEqual([3]);
    expect(el.valueFromStorage("7_8")).toBe(undefined); // not found in items
  });

  test("with form: options are changed before control is ready", () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    jest.advanceTimersByTime(1);
    form.$options.disabled = true;
    const c = form.appendChild(document.createElement("wup-checktree"));
    c.$options.items = getItems();
    jest.advanceTimersByTime(1);
    expect(c.$isReady).toBe(true);
    expect(c.$refTree.getAttribute("aria-disabled")).toBe("true");
    expect(c.$refTree.querySelector("[tabindex]")).toBe(null);
  });

  /** Creates control with custom HTML, assigns it to `el` & returns it */
  function createCustom(html, items) {
    el = document.createElement("wup-checktree");
    el.innerHTML = html;
    el.$options.items = items;
    document.body.appendChild(el);
    jest.advanceTimersByTime(1);
    return el;
  }

  test("customization with html", async () => {
    createCustom(
      `
      <ul id="myTree">
        <li>
          <span item><span icon></span><b>Users</b></span>
          <ul>
            <li><span item><span icon></span>Read</span></li>
            <li><span item><span icon></span>Write</span></li>
          </ul>
        </li>
        <li aria-label="Custom aria"><span item><span icon></span>Reports</span></li>
        <li><span item><span icon></span>Settings</span></li>
      </ul>`,
      getItems()
    );
    const lis = Array.from(el.querySelectorAll("li"));
    expect(el._isCustomRendered).toBe(true);
    expect(el.$refTree).toBe(el.querySelector("ul"));
    expect(el.$refTree.id).toBe("myTree"); // id isn't overridden
    expect(el.lastElementChild).toBe(el.$refTree); // the main label is placed before the tree
    expect(el.$refTree.outerHTML.replace(/\n\s*/g, "")).toMatchInlineSnapshot(
      `"<ul id="myTree" role="tree" aria-multiselectable="true" aria-labelledby="txt5"><li role="treeitem" aria-checked="false" aria-label="Users" tabindex="0"><span item=""><span icon=""></span><b>Users</b></span><ul role="group"><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Read</span></li><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Write</span></li></ul></li><li aria-label="Custom aria" role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Reports</span></li><li role="treeitem" aria-checked="false"><span item=""><span icon=""></span>Settings</span></li></ul>"`
    );

    // value & user clicks
    el.$value = [11];
    expect(getStates()).toStrictEqual([
      "Users:mixed:tab",
      "Read:true",
      "Write:false",
      "Reports:false",
      "Settings:false",
    ]);
    await h.userClick(el.querySelector("b")); // custom content inside [item]
    expect(el.$value).toStrictEqual([1, 11, 12]);
    expect(getFocused()).toBe("Users");
    el.$refInput.click();
    expect(el.$value).toStrictEqual([1, 11, 12, 2, 3]);
    await h.userClick(getRows()[4]);
    expect(el.$value).toStrictEqual([1, 11, 12, 2]);
    expect(getFocused()).toBe("Settings");

    // elements aren't re-rendered on items changing
    const items = getItems();
    items[1].disabled = "Reason";
    el.$options.items = items;
    jest.advanceTimersByTime(1);
    expect(Array.from(el.querySelectorAll("li")).every((li, i) => li === lis[i])).toBe(true);
    expect(el.$value).toStrictEqual([1, 11, 12, 2]);
    expect(getStates()).toStrictEqual(["Users:true:tab", "Read:true", "Write:true", "Reports:true", "Settings:false"]);
    expect(el.$refTree.querySelectorAll("[tabindex]").length).toBe(1); // tabindex is removed from the previous active item
    expect(lis[3].getAttribute("aria-disabled")).toBe("true");
    expect(getRows()[3].getAttribute("disabled")).toBe("Reason");
    el.$options.items = getItems();
    jest.advanceTimersByTime(1);
    expect(lis[3].hasAttribute("aria-disabled")).toBe(false);
    expect(getRows()[3].hasAttribute("disabled")).toBe(false);

    // option collapsible: [expand] is added by the control
    el.$options.collapsible = true;
    jest.advanceTimersByTime(1);
    expect(getStates()).toStrictEqual([
      "Users:true:expanded=false:tab",
      "Read:true",
      "Write:true",
      "Reports:true",
      "Settings:false",
    ]);
    expect(el.$refTree.querySelectorAll("[expand]").length).toBe(1);
    await h.userClick(el.$refTree.querySelector("[expand]"));
    expect(getStates()[0]).toBe("Users:true:expanded=true:tab");
    expect(el.querySelectorAll("ul").length).toBe(2); // nested items aren't rendered again
    el.$options.items = getItems();
    jest.advanceTimersByTime(1);
    expect(el.$refTree.querySelectorAll("[expand]").length).toBe(1); // existed [expand] is reused
    el.$options.collapsible = false;
    jest.advanceTimersByTime(1);
    expect(el.$refTree.querySelector("[expand],[aria-expanded]")).toBe(null);
    expect(lis.every((li, i) => li === el.querySelectorAll("li")[i])).toBe(true);
  });

  test("customization with html - not matched to items", async () => {
    const spy = h.mockConsoleError();
    const tree = (s) => `<ul>${s}</ul>`;
    const li = (s = "") => `<li><span item><span icon></span>${s}</span></li>`;

    // without items: nothing to bind
    createCustom(tree(li("A")), []);
    expect(spy).not.toBeCalled();
    expect(el.$refTree.id).toBeTruthy();
    await h.userClick(getRows()[0]);
    expect(el.$value).toBe(undefined);
    // elements fewer than items: HTML is replaced by default rendering
    const ul = el.$refTree;
    el.$options.items = getItems();
    jest.advanceTimersByTime(1);
    expect(spy).toBeCalledTimes(1);
    expect(spy.mock.lastCall[0]).toMatch("Custom HTML doesn't match items");
    expect(el._isCustomRendered).toBe(false);
    expect(el.$refTree).toBe(ul);
    expect(getStates()).toStrictEqual([
      "Users:false:tab",
      "Read:false",
      "Write:false",
      "Reports:false",
      "Settings:false",
    ]);
    // elements more than items
    const items = [{ text: "Default", value: 1, items: [{ text: "Nested", value: 11 }] }];
    createCustom(tree(li("A") + li("B") + li("C")), items);
    expect(spy).toBeCalledTimes(2);
    expect(getStates()).toStrictEqual(["Default:false:tab", "Nested:false"]);
    await h.userClick(getRows()[1]);
    expect(el.$value).toStrictEqual([1, 11]);
    // nesting isn't the same
    createCustom(tree(li("A") + li("B")), items);
    expect(spy).toBeCalledTimes(3);
    expect(getStates()).toStrictEqual(["Default:false:tab", "Nested:false"]);
    // element without [item]
    createCustom(tree("<li>A</li>"), [items[0].items[0]]);
    expect(spy).toBeCalledTimes(4);
    expect(getStates()).toStrictEqual(["Nested:false:tab"]);
    h.unMockConsoleError();
  });
});
