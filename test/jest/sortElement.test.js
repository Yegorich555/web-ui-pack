import { WUPSortElement } from "web-ui-pack";
import * as h from "../testHelper";

/** @type WUPSortElement */
let el;

/** Height & width of every rendered item */
const hi = 30;
const w = 60;

/** Returns items that can be sorted (cloned element that follows the cursor is skipped) */
function getItems() {
  return Array.prototype.slice.call(el.querySelectorAll(`[item='']:not([drag])`));
}

/** Assign layout for control & items: 3 items in the 1st line, 1 item in the 2nd line */
function updateLayout() {
  h.setupLayout(el, { x: 0, y: 0, h: hi * 2, w: w * 3 });
  const items = getItems();
  // 1st line; WARN: items don't change own position - only content
  h.setupLayout(items[0], { x: 0, y: 0, h: hi, w });
  h.setupLayout(items[1], { x: w, y: 0, h: hi, w });
  h.setupLayout(items[2], { x: w * 2, y: 0, h: hi, w });
  // 2nd line
  h.setupLayout(items[3], { x: 0, y: hi, h: hi, w });
}

/** Gap between items of layouts below: to check the position of the line-indicator (dropIndicator: 'line') */
const gap = 10;

/** Assign layout with gaps between items: 3 items in the 1st line, 1 item in the 2nd line */
function gapLayoutGrid() {
  h.setupLayout(el, { x: 0, y: 0, h: hi * 2 + gap, w: (w + gap) * 3 });
  const items = getItems();
  // 1st line
  h.setupLayout(items[0], { x: 0, y: 0, h: hi, w });
  h.setupLayout(items[1], { x: w + gap, y: 0, h: hi, w });
  h.setupLayout(items[2], { x: (w + gap) * 2, y: 0, h: hi, w });
  // 2nd line
  h.setupLayout(items[3], { x: 0, y: hi + gap, h: hi, w });
}

/** Assign layout with gaps between items: every item on its own row */
function gapLayoutColumn() {
  h.setupLayout(el, { x: 0, y: 0, h: (hi + gap) * 4, w });
  getItems().forEach((item, i) => h.setupLayout(item, { x: 0, y: (hi + gap) * i, h: hi, w }));
}

/** Thickness of the line-indicator (see `const lineW` in sortElement.applyDragdrop) */
const lw = 1;

/** Returns inline styles of the line-indicator (dropIndicator: 'line') */
function lineStyle() {
  return el.querySelector("[drop-line]").style.cssText;
}

/** Returns expected styles of the vertical line-indicator (multi-line layout):
 * `x` is the middle of the gap between items, `y` is the top of the line */
function vLine(x, y = 0) {
  return `width: ${lw}px; height: ${hi}px; transform: translate(${x - lw / 2}px, ${y}px);`;
}

/** Returns expected styles of the horizontal line-indicator (single-line layout):
 * `y` is the middle of the gap between items */
function hLine(y) {
  return `width: ${w}px; height: ${lw}px; transform: translate(0px, ${y - lw / 2}px);`;
}

/** Simulate pointer event: jsdom has no PointerEvent - so pointer-properties must be defined manually.
 * WARN: every listed key is applied even when its value is `undefined` (to emulate engines without the property) */
function userPointer(trg, type, opts) {
  const ev = new MouseEvent(type, { clientX: opts.x, clientY: opts.y, cancelable: true, bubbles: true });
  ["pointerId", "isPrimary", "movementX", "movementY"].forEach((k) => {
    k in opts && Object.defineProperty(ev, k, { get: () => opts[k] });
  });
  trg.dispatchEvent(ev);
}

/** Returns outerHTML of every child of the control */
function getChildren() {
  return Array.prototype.slice.call(el.children).map((a) => a.outerHTML);
}

/** Simulate getBoundingClientRect for the cloned element that follows the cursor */
function bindDragEl() {
  const dragEl = el.querySelector("[drag]");
  jest.spyOn(dragEl, "getBoundingClientRect").mockImplementation(() => {
    const width = +/(-?[0-9]+)/.exec(dragEl.style.width)[1];
    const height = +/(-?[0-9]+)/.exec(dragEl.style.height)[1];
    const [, x, y] = /(-?[0-9]+)\D+(-?[0-9]+)/.exec(dragEl.style.transform);
    return {
      x: +x,
      y: +y,
      width,
      height,
      top: +y,
      left: +x,
      right: width + +x,
      bottom: height + +y,
      toJSON: () => "",
    };
  });
  return dragEl;
}

WUPSortElement.$use();
beforeEach(() => {
  jest.useFakeTimers();
  h.userMouseMove.stored = { x: 0, y: 0 };
  document.body.innerHTML = `<wup-sort>
  <div item="">Item 1</div>
  <div item="">Item 2</div>
  <div item="">Item 3</div>
  <div item="">Item 4</div>
  <div item="false">Not sortable</div>
</wup-sort>`;
  el = document.body.firstElementChild;
  jest.advanceTimersByTime(1); // wait for ready
  updateLayout();
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("sortElement", () => {
  h.baseTestComponent(() => document.createElement("wup-sort"), {
    attrs: { "w-dropindicator": { value: "line" } },
  });

  test("items detection", () => {
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]); // [item='false'] is skipped

    // cloned element that follows cursor must be skipped
    const trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: w * 2, y: 0 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
  });

  test("sorting by drag&drop", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    el.$onChange = jest.fn();

    const trg = getItems()[0];
    // ordinary click without moving must be ignored
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    trg.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait(10);
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(onChanged).toBeCalledTimes(0);
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);

    // start dragging
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 12, y: 12 }); // moved less than the click-threshold (pointerdown was at 10,10)
    expect(el.querySelector("[drag]")).toBeFalsy(); // no-sorting when user moved cursor a bit
    h.userMouseMove(trg, { x: 20, y: 12 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false" drag="" style="box-sizing: border-box; width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(10px, 2px);">Item 1</div>",
        "<div item="" draggable="false" drop="">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);
    let dragEl = bindDragEl();

    // move to the 2nd item
    updateLayout();
    h.userMouseMove(dragEl, { x: w + w / 2, y: hi / 2 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false" drag="" style="box-sizing: border-box; width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(80px, 5px);">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="" draggable="false" drop="">Item 1</div>",
        "<div item="">Item 3</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);

    // checking throttling: no-changes because previous move was recently
    updateLayout();
    h.userMouseMove(dragEl, { x: w * 2 + w / 2, y: hi / 2 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false" drag="" style="box-sizing: border-box; width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(140px, 5px);">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="" draggable="false" drop="">Item 1</div>",
        "<div item="">Item 3</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);

    // move to the last item in the 1st line
    await h.wait(); // wait for throttling
    updateLayout();
    h.userMouseMove(dragEl, { x: w * 2 + w / 2, y: hi / 2 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false" drag="" style="box-sizing: border-box; width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(140px, 5px);">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="" draggable="false" drop="">Item 1</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);

    // move to the 2nd line
    await h.wait(); // wait for throttling
    updateLayout();
    h.userMouseMove(dragEl, { x: 5, y: hi + hi / 2 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false" drag="" style="box-sizing: border-box; width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(-5px, 35px);">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="">Item 4</div>",
        "<div item="" draggable="false" drop="">Item 1</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);

    // move back to the 1st position
    await h.wait(); // wait for throttling
    updateLayout();
    h.userMouseMove(dragEl, { x: 5, y: 5 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false" drag="" style="box-sizing: border-box; width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(-5px, -5px);">Item 1</div>",
        "<div item="" draggable="false" drop="">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);
    expect(onChanged).toBeCalledTimes(0); // because user doesn't finish dragging

    // move to the 3rd position & drop
    await h.wait(); // wait for throttling
    updateLayout();
    h.userMouseMove(dragEl, { x: w * 2 + w / 2, y: hi / 2 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false" drag="" style="box-sizing: border-box; width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(140px, 5px);">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="" draggable="false" drop="">Item 1</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);

    updateLayout();
    dragEl = bindDragEl();
    const { nextFrame } = h.useFakeAnimation(); // animation to return mirrored element
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(1);
    expect(el.$onChange).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][0].detail).toMatchInlineSnapshot(`
      {
        "items": [
          <div
            item=""
          >
            Item 2
          </div>,
          <div
            item=""
          >
            Item 3
          </div>,
          <div
            draggable="false"
            drop=""
            item=""
          >
            Item 1
          </div>,
          <div
            item=""
          >
            Item 4
          </div>,
        ],
        "reason": "move",
        "value": [
          1,
          2,
          0,
          3,
        ],
      }
    `);
    await nextFrame(10);
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="" draggable="false">Item 1</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `); // [drag] & [drop] are removed after animation
  });

  test("no sorting", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    const was = getItems().map((a) => a.textContent);
    const trg = getItems()[0];

    // right-click
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, button: 2 }));
    h.userMouseMove(trg, { x: w * 2, y: 0 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(was);

    // click on the control itself (outside items)
    el.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(el, { x: w * 2, y: 0 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(was);

    // click on item that isn't sortable
    const notSortable = el.querySelector("[item='false']");
    notSortable.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(notSortable, { x: w * 2, y: 0 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(was);

    // editable content inside item: sorting must be skipped - otherwise text-selection is broken
    /** Renders html inside the 1st item & tries to drag its deepest child */
    const tryDragEditable = (html) => {
      getItems()[0].innerHTML = html;
      let t2 = getItems()[0];
      while (t2.firstElementChild) {
        t2 = t2.firstElementChild; // WARN: the target can be nested inside the editable element
      }
      t2.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
      h.userMouseMove(t2, { x: w * 2, y: 0 });
      expect(el.querySelector("[drag]")).toBeFalsy();
      document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    };
    tryDragEditable(`<input />`);
    tryDragEditable(`<textarea></textarea>`);
    tryDragEditable(`<select><option>1</option></select>`);
    tryDragEditable(`<div contenteditable=""><b>nested</b></div>`); // empty attr-value means editable
    tryDragEditable(`<div contenteditable><b>nested</b></div>`);
    tryDragEditable(`<span contenteditable="true">txt</span>`);

    await h.wait();
    expect(onChanged).toBeCalledTimes(0);
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["txt", "Item 2", "Item 3", "Item 4"]); // order isn't changed

    // dragging without changing position
    const { nextFrame } = h.useFakeAnimation();
    const trg2 = getItems()[0];
    trg2.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg2, { x: 25, y: 20 }); // enough to start dragging but the nearest item is still the same
    expect(el.querySelector("[drag]")).toBeTruthy();
    bindDragEl();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(10);
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(onChanged).toBeCalledTimes(0); // no-event because position isn't changed

    // [contenteditable=false] isn't editable - sorting must work
    getItems()[0].innerHTML = `<span contenteditable="false">txt</span>`;
    const span = el.querySelector("span");
    span.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(span, { x: 25, y: 20 }); // enough to start dragging but the nearest item is still the same
    expect(el.querySelector("[drag]")).toBeTruthy();
    bindDragEl();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(10);
    expect(onChanged).toBeCalledTimes(0);
  });

  test("nested draggable content", () => {
    // dragging of img/video must be disabled during the sorting (otherwise browser starts own dragging)
    getItems()[0].innerHTML = `<img alt="test" />`;
    const img = el.querySelector("img");
    img.draggable = true;
    img.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    expect(img.draggable).toBe(false);
    h.userMouseMove(img, { x: w * 2, y: 0 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(img.draggable).toBe(true); // restored after dragging

    // WARN: draggability must be kept when pointerdown isn't on a sortable item - otherwise it's destroyed forever (no restore-path)
    el.querySelector("[item='false']").innerHTML = `<img alt="test2" />`;
    const img2 = el.querySelector("[item='false'] img");
    img2.draggable = true;
    img2.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    expect(img2.draggable).toBe(true);
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(img2.draggable).toBe(true);

    // the same for the control itself
    el.draggable = true;
    el.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    expect(el.draggable).toBe(true);
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.draggable).toBe(true);
  });

  test("touch events", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);

    // case when touch event impossible to prevent because browser decides to scroll
    let [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent("touchstart", { cancelable: true, bubbles: true }));
    h.userMouseMove(trg, { x: w * 2, y: 0 });
    expect(el.querySelector("[drag]")).toBeFalsy(); // because browser can scroll instead
    document.dispatchEvent(new MouseEvent("touchmove", { cancelable: false, bubbles: true }));
    document.dispatchEvent(new MouseEvent("pointercancel", { cancelable: false, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(0);
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);

    // case when touch event possible to prevent
    const { nextFrame } = h.useFakeAnimation();
    [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent("touchstart", { cancelable: true, bubbles: true }));
    const isPrevented = !document.dispatchEvent(new MouseEvent("touchmove", { cancelable: true, bubbles: true }));
    expect(isPrevented).toBe(true); // to prevent scrolling by touch
    updateLayout();
    h.userMouseMove(trg, { x: w + w / 2, y: hi / 2 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    bindDragEl();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(10);
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][0].detail.value).toStrictEqual([1, 0, 2, 3]);

    // all document-listeners must be removed after the sorting
    expect(document.dispatchEvent(new MouseEvent("touchmove", { cancelable: true, bubbles: true }))).toBe(true);
    document.dispatchEvent(new MouseEvent("touchstart", { cancelable: true, bubbles: true }));
    expect(document.dispatchEvent(new MouseEvent("touchmove", { cancelable: true, bubbles: true }))).toBe(true); // touchstart-listener is removed also
  });

  test("items with centers near y=0 (scrolled page)", () => {
    // all items in a single line with centers exactly at y=0: line-detection must not treat them as a part of the fake line y=0
    h.setupLayout(el, { x: 0, y: -hi / 2, h: hi, w: w * 4 });
    getItems().forEach((a, i) => h.setupLayout(a, { x: w * i, y: -hi / 2, h: hi, w }));

    const trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 0 }));
    expect(() => h.userMouseMove(trg, { x: w + w / 2, y: 0 })).not.toThrow(); // was TypeError because nearestEnd went out of items-range
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
  });

  test("click-threshold without ev.movementX/Y", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    const trg = getItems()[0];

    // ordinary click with a tiny move: `undefined` movement was accumulated into NaN and NaN < threshold === false - so the threshold was bypassed
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    userPointer(trg, "pointermove", { x: 12, y: 12, movementX: undefined, movementY: undefined });
    userPointer(trg, "pointermove", { x: 13, y: 13, movementX: undefined, movementY: undefined });
    expect(el.querySelector("[drag]")).toBeFalsy(); // 3px is less than the threshold - no dragging
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(0);
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);

    // real dragging must start even when movement is reported as 0 (touch-pointers)
    const { nextFrame } = h.useFakeAnimation();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    userPointer(trg, "pointermove", { x: w + w / 2, y: hi / 2, movementX: 0, movementY: 0 });
    expect(el.querySelector("[drag]")).toBeTruthy(); // 0-movement was accumulated forever - so dragging never started on mobile
    bindDragEl();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(10);
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    await h.wait(1);
    expect(onChanged.mock.calls[0][0].detail.value).toStrictEqual([1, 0, 2, 3]);
  });

  test("multi-touch: 2nd finger doesn't affect the 1st one", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    const { nextFrame } = h.useFakeAnimation();

    // 1st finger grabs Item 1 & moves it to the 2nd position
    const trg = getItems()[0];
    userPointer(trg, "pointerdown", { x: 10, y: 10, pointerId: 1, isPrimary: true });
    userPointer(trg, "pointermove", { x: w + w / 2, y: hi / 2, pointerId: 1 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    const dragEl = el.querySelector("[drag]");
    expect(dragEl.style.transform).toBe("translate(80px, 5px)");

    // 2nd finger touches another item & moves it: everything must be ignored
    await h.wait(); // wait for throttling - otherwise the skipped move isn't provable
    updateLayout();
    userPointer(getItems()[2], "pointerdown", { x: w * 2 + 5, y: hi / 2, pointerId: 2, isPrimary: false });
    userPointer(getItems()[2], "pointermove", { x: w * 2 + w / 2, y: hi / 2, pointerId: 2 });
    expect(el.querySelectorAll("[drag]")).toHaveLength(1); // 2nd finger mustn't start own dragging
    expect(dragEl.style.transform).toBe("translate(80px, 5px)"); // ... and mustn't move the item of the 1st finger
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);

    // 2nd finger is released: the 1st one must continue dragging
    userPointer(document, "pointercancel", { pointerId: 2 });
    userPointer(document, "pointerup", { pointerId: 2 });
    await h.wait();
    expect(el.querySelector("[drag]")).toBeTruthy();
    expect(onChanged).toBeCalledTimes(0); // no $change because the 1st finger still holds the item

    // 1st finger is released: sorting is committed
    bindDragEl();
    userPointer(document, "pointerup", { pointerId: 1 });
    await nextFrame(10);
    expect(el.querySelector("[drag]")).toBeFalsy();
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][0].detail.value).toStrictEqual([1, 0, 2, 3]);
  });

  test("re-grab the same item during the return-animation", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    const { nextFrame } = h.useFakeAnimation();
    const trg = getItems()[0];
    h.setupCssCompute(trg, { getPropertyValue: () => "200ms" }); // --anim-t: otherwise the return-animation is instant in jsdom

    // move Item 1 to the 2nd position & drop it
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: w + w / 2, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    bindDragEl();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(2);
    expect(el.querySelectorAll("[drag]")).toHaveLength(1); // the animation is in progress
    expect(trg.getAttribute("drop")).toBe("");

    // try to grab the same item again: must be ignored until the animation ends
    updateLayout();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: w + 10, clientY: 10 }));
    h.userMouseMove(trg, { x: w * 2 + w / 2, y: hi / 2 });
    expect(el.querySelectorAll("[drag]")).toHaveLength(1); // no 2nd clone
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]); // ... and the order isn't changed
    expect(trg.getAttribute("drop")).toBe(""); // ... and the highlight isn't lost
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));

    // the animation is finished
    await nextFrame(20);
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(trg.getAttribute("drop")).toBeNull();
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(1); // only the 1st sorting is committed

    // the same item is grabbable again
    updateLayout();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: w + 10, clientY: 10 }));
    h.userMouseMove(trg, { x: w * 2 + w / 2, y: hi / 2 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 3", "Item 1", "Item 4"]);
    bindDragEl();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(20);
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(2);
  });

  test("items rects are cached between moves", async () => {
    const trg = getItems()[0];
    /** Total getBoundingClientRect calls of all sortable items (mocked by h.setupLayout) */
    const rectCalls = () => getItems().reduce((sum, a) => sum + a.getBoundingClientRect.mock.calls.length, 0);

    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 }); // start dragging: cursor is still on the 1st item - no reorder
    const dragEl = bindDragEl();
    let prev = rectCalls();
    expect(prev).toBeGreaterThanOrEqual(getItems().length); // rects of all items are collected on the 1st move

    // moving without reorder mustn't re-read rects: getBoundingClientRect forces layout on every call
    h.userMouseMove(dragEl, { x: 25, y: 12 });
    h.userMouseMove(dragEl, { x: 30, y: 12 });
    expect(rectCalls()).toBe(prev);

    // reorder re-layouts items - so the cache must be reset
    h.userMouseMove(dragEl, { x: w + w / 2, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    await h.wait(); // wait for throttling
    updateLayout();
    prev = rectCalls();
    h.userMouseMove(dragEl, { x: w + w / 2 + 1, y: hi / 2 });
    expect(rectCalls()).toBeGreaterThan(prev);
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]); // no reorder here

    // ... and cached again
    prev = rectCalls();
    h.userMouseMove(dragEl, { x: w + w / 2 + 2, y: hi / 2 });
    expect(rectCalls()).toBe(prev);

    // scroll shifts viewport-based rects - so the cache must be reset
    document.dispatchEvent(new Event("scroll"));
    h.userMouseMove(dragEl, { x: w + w / 2 + 3, y: hi / 2 });
    expect(rectCalls()).toBeGreaterThan(prev);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    // scroll-listener must be removed with the others
    prev = rectCalls();
    document.dispatchEvent(new Event("scroll"));
    h.userMouseMove(dragEl, { x: w, y: hi / 2 });
    expect(rectCalls()).toBe(prev);
  });

  test("items of different sizes aren't swapped back & forth", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    const { nextFrame } = h.useFakeAnimation();

    /** Assign layout: the 1st line has Item 1 (20px) & Item 2 (200px), the 2nd one has the rest.
     * WARN: in opposite to updateLayout the size follows the item itself (not the position) - as a real browser does */
    const layoutBySize = () => {
      const items = getItems();
      const small = items.find((a) => a.textContent === "Item 1");
      const big = items.find((a) => a.textContent === "Item 2");
      h.setupLayout(el, { x: 0, y: 0, h: hi * 2, w: 220 });
      h.setupLayout(small, { x: items[0] === small ? 0 : 200, y: 0, h: hi, w: 20 });
      h.setupLayout(big, { x: items[0] === small ? 20 : 0, y: 0, h: hi, w: 200 });
      h.setupLayout(items[2], { x: 0, y: hi, h: hi, w: 110 });
      h.setupLayout(items[3], { x: 110, y: hi, h: hi, w: 110 });
    };
    layoutBySize();

    // grab the small item & move it over the big one: the center of the big one is closer to the cursor but isn't crossed yet
    const trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: hi / 2 }));
    h.userMouseMove(trg, { x: 70, y: hi / 2 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    const dragEl = bindDragEl();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]); // no reorder

    // the middle of the big item (x=120) is crossed - reorder is expected
    h.userMouseMove(dragEl, { x: 130, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);

    // the swap shifted the big item to x=0..200 (center 100): the cursor is closer to its center again
    // but it mustn't be swapped back until the cursor crosses the new middle - otherwise items jitter
    await h.wait(); // wait for throttling
    layoutBySize();
    h.userMouseMove(dragEl, { x: 110, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]); // no reorder
    await h.wait();
    h.userMouseMove(dragEl, { x: 105, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]); // still no reorder

    // the new middle is crossed - the previous order is restored
    h.userMouseMove(dragEl, { x: 90, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(10);
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(0); // the order is the same as before dragging
  });

  test("moving between lines isn't delayed", async () => {
    // WARN: the nearest line is detected by the closest center - so the item must be moved as soon as the cursor is in the another line
    // (waiting for the middle of that line means the item is moved only when it's completely there)
    const trg = getItems()[3]; // the single item of the 2nd line
    trg.dispatchEvent(
      new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: hi + hi / 2 })
    );
    h.userMouseMove(trg, { x: 20, y: hi + hi / 2 }); // start dragging: the cursor is still in the 2nd line - no reorder
    const dragEl = bindDragEl();
    expect(el.querySelector("[drag]")).toBeTruthy();

    // move between the 1st & the 2nd items of the 1st line, but below their centers (y=15)
    h.userMouseMove(dragEl, { x: w + w / 2, y: hi - 5 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 4", "Item 2", "Item 3"]);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
  });

  test("dropIndicator: line (multi-line layout)", async () => {
    // WARN: in opposite to 'ghost' the item isn't moved during the dragging: instead the line is painted between items
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    el.setAttribute("w-dropindicator", "line");
    jest.advanceTimersByTime(1); // wait for the attribute is parsed
    expect(el.$options.dropIndicator).toBe("line");
    gapLayoutGrid();

    // the 1st item is grabbed & the cursor is in its left half: no previous item - so the gap is mirrored (-10..0)
    const trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 20 });
    expect(lineStyle()).toBe(vLine(-5));
    // WARN: the layout mustn't be shifted at all - so the item stays on its place (only the clone follows the cursor)
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div drop-line="" style="width: 1px; height: 30px; transform: translate(-5.5px, 0px);"></div>",
        "<div item="" draggable="false" drag="" style="box-sizing: border-box; width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(10px, 10px);">Item 1</div>",
        "<div item="" draggable="false" drop="">Item 1</div>",
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="">Item 4</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);

    const dragEl = bindDragEl();
    // left half of the 2nd item: 60..70 is the gap between the 1st & the 2nd items - so the middle is 65
    h.userMouseMove(dragEl, { x: 80, y: 12 });
    expect(lineStyle()).toBe(vLine(65));
    // right half of the 2nd item: the gap is 130..140 - so the middle is 135
    h.userMouseMove(dragEl, { x: 120, y: 12 });
    expect(lineStyle()).toBe(vLine(135));
    // right half of the last item in the line: no next item - so the gap is mirrored (200..210)
    h.userMouseMove(dragEl, { x: 190, y: 12 });
    expect(lineStyle()).toBe(vLine(205));
    // the 2nd line has the single item - so there is no gap to detect: the line is painted on the edge of the item
    h.userMouseMove(dragEl, { x: 50, y: 50 });
    expect(lineStyle()).toBe(vLine(w, hi + gap));
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]); // no reorder yet

    // the new order is applied by the end of the dragging
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(el.querySelector("[drop-line]")).toBeFalsy();
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 3", "Item 4", "Item 1"]);
    expect(onChanged).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][0].detail.value).toStrictEqual([1, 2, 3, 0]);
    // WARN: the item must be inserted before non-sortable items ([item=false]) - not appended to the end of the parent
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="">Item 2</div>",
        "<div item="">Item 3</div>",
        "<div item="">Item 4</div>",
        "<div item="" draggable="false">Item 1</div>",
        "<div item="false">Not sortable</div>",
      ]
    `);
  });

  test("dropIndicator: line (single-line layout)", async () => {
    // WARN: every item is on its own row - so the line must be horizontal (with the width of the item)
    el.$options.dropIndicator = "line";
    gapLayoutColumn();

    // the last item is grabbed & the cursor is in its bottom half: no next item - so the gap is mirrored (150..160)
    const trg = getItems()[3];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 130 }));
    h.userMouseMove(trg, { x: 20, y: 140 });
    expect(lineStyle()).toBe(hLine(155));

    const dragEl = bindDragEl();
    // bottom half of the 2nd item: the gap is 70..80 - so the middle is 75
    h.userMouseMove(dragEl, { x: 12, y: 65 });
    expect(lineStyle()).toBe(hLine(75));
    // top half of the 2nd item: the gap is 30..40 - so the middle is 35
    h.userMouseMove(dragEl, { x: 12, y: 45 });
    expect(lineStyle()).toBe(hLine(35));
    // top half of the 1st item: no previous item - so the gap is mirrored (-10..0)
    h.userMouseMove(dragEl, { x: 12, y: 5 });
    expect(lineStyle()).toBe(hLine(-5));

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 4", "Item 1", "Item 2", "Item 3"]);
  });

  test("dropIndicator: line - dropped at the same place", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    el.$options.dropIndicator = "line";
    gapLayoutColumn();

    // the cursor is in the bottom half of the grabbed item - so the new place is the same
    const trg = getItems()[1];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 45 }));
    h.userMouseMove(trg, { x: 20, y: 55 });
    expect(el.querySelector("[drop-line]")).toBeTruthy();

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(el.querySelector("[drop-line]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);
    expect(onChanged).toBeCalledTimes(0); // the order is the same as before dragging
  });

  test("dropIndicator: line - target with a single item or without items at all", async () => {
    // WARN: a target with less than 2 items has no neighbors to compare rects with - so the row-layout must be detected by styles
    // (otherwise such a target is treated as a column & the line-indicator is painted with the wrong orientation)
    document.body.innerHTML = `<ul id="l1">
  <li item="">A1</li>
  <li item="">A2</li>
</ul>
<ul id="l2">
  <li item="">B1</li>
</ul>
<ul id="l3"></ul>`;
    const [l1, l2, l3] = ["l1", "l2", "l3"].map((a) => document.getElementById(a));
    el = document.body; // to re-use getItems(), bindDragEl() & lineStyle()

    /** Returns sortable items of the pointed list */
    const items = (t) => Array.prototype.slice.call(t.querySelectorAll(`[item='']:not([drag])`));
    // every list renders items in a row: WARN: jsdom has no layout at all - so the styles must be mocked
    h.setupCssCompute((a) => a === l1 || a === l2 || a === l3, { display: "flex", flexDirection: "row" });
    /** Assign layout: 3 lists side by side (the 2nd one has a single item, the 3rd one is empty) */
    [l1, l2, l3].forEach((t, ti) => {
      const arr = items(t);
      h.setupLayout(t, { x: ti * 200, y: 0, h: hi, w: Math.max(w * arr.length, w) });
      arr.forEach((a, i) => h.setupLayout(a, { x: ti * 200 + w * i, y: 0, h: hi, w }));
    });

    const onChanged = jest.fn();
    const detach = WUPSortElement.$attach([l1, l2, l3], onChanged, { dropIndicator: "line" });

    const trg = getItems()[0]; // A1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    const dragEl = bindDragEl();

    // over the left half of the single item: the line must be vertical (before the item) - not horizontal
    h.userMouseMove(dragEl, { x: 210, y: 15 });
    expect(lineStyle()).toBe(vLine(200));
    // ... and after the item when the cursor crosses its middle
    h.userMouseMove(dragEl, { x: 250, y: 15 });
    expect(lineStyle()).toBe(vLine(200 + w));

    // over the empty list: there are no items - so the line is painted on its left edge (not on the top one)
    h.userMouseMove(dragEl, { x: 410, y: 15 });
    expect(lineStyle()).toBe(`width: ${lw}px; height: ${hi}px; transform: translate(400px, 0px);`);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["A2"]);
    expect(items(l2).map((a) => a.textContent)).toStrictEqual(["B1"]);
    expect(items(l3).map((a) => a.textContent)).toStrictEqual(["A1"]);
    expect(onChanged).toBeCalledTimes(1);
    detach();
  });

  test("dragdrop is disposed on remove & re-applied on re-connect", () => {
    // the pointerdown-listener was registered via raw onEvent - so it stayed forever after the element was removed
    const spyRemove = jest.spyOn(el, "removeEventListener");
    el.remove();
    expect(spyRemove).toBeCalledWith("pointerdown", expect.any(Function), expect.anything());

    // ... so the detached element mustn't sort anymore
    let trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: w + w / 2, y: hi / 2 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);

    // sorting must work again when the element is added back (gotRender is called only once)
    document.body.appendChild(el);
    jest.advanceTimersByTime(1); // wait for ready
    updateLayout();
    [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: w + w / 2, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
  });

  test("$attach on ordinary element", async () => {
    // WARN: the pointed element isn't a custom element - so styles & listeners must be applied by $attach itself
    document.body.innerHTML = `<ul>
  <li item="">Item 1</li>
  <li item="">Item 2</li>
  <li item="">Item 3</li>
  <li item="">Item 4</li>
  <li item="false">Not sortable</li>
</ul>`;
    el = document.body.firstElementChild; // to re-use getItems(), getChildren() & updateLayout()
    const onChanged = jest.fn();
    let detach = WUPSortElement.$attach(el, onChanged);
    updateLayout();

    expect(el.className).toBe("wup-sort"); // "wup-sort" is the default class-name - so it's applied
    const styles = WUPSortElement.$refStyle.textContent;
    expect(styles).toContain("--sort-active-color"); // $styleRoot: appended even if no one <wup-sort> is created
    expect(styles).toContain(".wup-sort [item][drag]"); // $style: :host is replaced with the class-selector
    expect(styles).toContain(".wup-sort[hovered]");

    // sorting must work the same as for <wup-sort>
    let trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    expect(el.getAttribute("hovered")).toBe(""); // to prevent text-selection during the dragging
    let dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: w + w / 2, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(el.getAttribute("hovered")).toBeNull();
    expect(onChanged).toBeCalledTimes(1); // the callback is called instead of the $change event
    expect(onChanged.mock.calls[0][0]).toStrictEqual([1, 0, 2, 3]); // new ordered indexes
    expect(onChanged.mock.calls[0][1].map((a) => a.textContent)).toStrictEqual([
      "Item 2",
      "Item 1",
      "Item 3",
      "Item 4",
    ]); // items in the new order
    expect(onChanged.mock.calls[0][2]).toBe(-1); // removedIndex: nothing is removed

    // detach must remove the applied class-name & the listeners
    detach();
    expect(el.className).toBe("");
    [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: w + w / 2, y: hi / 2 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]); // no sorting
    expect(onChanged).toBeCalledTimes(1);

    // 2nd attach on the same element must re-init the previous one (otherwise every pointerdown is handled twice)
    WUPSortElement.$attach(el, onChanged);
    const mockWarn = h.wrapConsoleWarn(() => (detach = WUPSortElement.$attach(el, onChanged)));
    expect(mockWarn).toBeCalledTimes(1);
    updateLayout();
    [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: w + w / 2, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(2);

    detach();

    // options.className: styles are bound to the class-name - so every new class-name must get own styles
    const detach2 = WUPSortElement.$attach(el, onChanged, { className: "my-sort" });
    expect(el.className).toBe("my-sort");
    const styles2 = WUPSortElement.$refStyle.textContent;
    expect(styles2).toContain(".my-sort [item][drag]");
    expect(styles2).toContain(".my-sort[hovered]");
    expect(styles2.length).toBeGreaterThan(styles.length);
    updateLayout();
    [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: w + w / 2, y: hi / 2 });
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(3);

    // ...but the same class-name mustn't append styles again
    detach2();
    expect(el.className).toBe(""); // detach must remove the pointed class-name (not the default one)
    WUPSortElement.$attach(el, onChanged, { className: "my-sort" })();
    expect(WUPSortElement.$refStyle.textContent).toBe(styles2);

    // options.className:null - styles are defined by the user itself
    WUPSortElement.$attach(el, onChanged, { className: null })();
    expect(el.className).toBe("");
    expect(WUPSortElement.$refStyle.textContent).toBe(styles2); // no extra styles are appended
  });

  test("$attach with options.canRemove", async () => {
    document.body.innerHTML = `<ul>
  <li item="">Item 1</li>
  <li item="">Item 2</li>
  <li item="">Item 3</li>
  <li item="">Item 4</li>
</ul>`;
    el = document.body.firstElementChild; // to re-use getItems(), getChildren() & updateLayout()
    const onChanged = jest.fn();
    const detach = WUPSortElement.$attach(el, onChanged);
    updateLayout();

    // without canRemove dragging outside does nothing: the item is returned back
    let trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    let dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 1000, y: 1000 });
    expect(el.querySelector("[drag][remove]")).toBeFalsy();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(getItems().map((a) => a.textContent)).toMatchInlineSnapshot(`
      [
        "Item 2",
        "Item 3",
        "Item 4",
        "Item 1",
      ]
    `);
    expect(onChanged).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][2]).toBe(-1); // removedIndex: nothing is removed
    detach();

    // with canRemove the item dropped outside must be reported via removedIndex
    document.body.innerHTML = `<ul>
  <li item="">Item 1</li>
  <li item="">Item 2</li>
  <li item="">Item 3</li>
  <li item="">Item 4</li>
</ul>`;
    el = document.body.firstElementChild;
    onChanged.mockClear();
    const detach2 = WUPSortElement.$attach(el, onChanged, { canRemove: true });
    updateLayout();

    [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    dragEl = bindDragEl();
    expect(el.querySelector("[drag][remove]")).toBeFalsy(); // because it's inside the element yet
    h.userMouseMove(dragEl, { x: 1000, y: 1000 });
    expect(el.querySelector("[drag][remove]")).toBeTruthy(); // to show user that the item will be removed
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][2]).toBe(0); // removedIndex: index of the item dropped outside
    expect(onChanged.mock.calls[0][1].map((a) => a.textContent)).toMatchInlineSnapshot(`
      [
        "Item 1",
        "Item 2",
        "Item 3",
        "Item 4",
      ]
    `);
    expect(el.querySelector("[drag]")).toBeFalsy(); // the clone is removed without the return-animation
    expect(getItems().map((a) => a.textContent)).toMatchInlineSnapshot(`
      [
        "Item 1",
        "Item 2",
        "Item 3",
        "Item 4",
      ]
    `); // WARN: removing the item from the DOM is the responsibility of the callback

    // the item returns back when it's dropped inside
    onChanged.mockClear();
    updateLayout();
    [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: w + w / 2, y: hi / 2 });
    expect(el.querySelector("[drag][remove]")).toBeFalsy();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][2]).toBe(-1);
    detach2();
  });

  test("$attach with options.dropIndicator & canRemove", async () => {
    document.body.innerHTML = `<ul>
  <li item="">Item 1</li>
  <li item="">Item 2</li>
  <li item="">Item 3</li>
  <li item="">Item 4</li>
</ul>`;
    el = document.body.firstElementChild; // to re-use getItems(), lineStyle() & gapLayoutGrid()
    const onChanged = jest.fn();
    const detach = WUPSortElement.$attach(el, onChanged, { canRemove: true, dropIndicator: "line" });
    gapLayoutGrid();

    const trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    const dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 80, y: 12 });
    expect(lineStyle()).toBe(vLine(65));

    // the item is going to be removed - so the new place is meaningless
    h.userMouseMove(dragEl, { x: 1000, y: 1000 });
    expect(el.querySelector("[drag][remove]")).toBeTruthy();
    expect(lineStyle()).toBe(`${vLine(65)} display: none;`);

    // ... and it's shown again when the item is returned back inside
    h.userMouseMove(dragEl, { x: 120, y: 12 });
    expect(el.querySelector("[drag][remove]")).toBeFalsy();
    expect(lineStyle()).toBe(vLine(135));

    // dropped outside: the order mustn't be changed even if the line pointed the new place
    h.userMouseMove(dragEl, { x: 1000, y: 1000 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(el.querySelector("[drop-line]")).toBeFalsy();
    expect(onChanged).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][2]).toBe(0); // removedIndex: index of the item dropped outside
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);
    detach();
  });

  test("$attach on several elements (cross-parent dragdrop)", async () => {
    // WARN: items of all the pointed elements are handled as the single list - so an item can be dragged from one list into another
    document.body.innerHTML = `<ul id="l1">
  <li item="">A1</li>
  <li item="">A2</li>
  <li item="">A3</li>
</ul>
<ul id="l2">
  <li item="">B1</li>
  <li item="">B2</li>
</ul>`;
    const l1 = document.getElementById("l1");
    const l2 = document.getElementById("l2");
    el = document.body; // to re-use getItems() & bindDragEl(): items of both lists are gathered in the DOM-order

    /** Returns sortable items of the pointed list */
    const items = (t) => Array.prototype.slice.call(t.querySelectorAll(`[item='']:not([drag])`));
    /** Assign layout: 2 lists side by side; every item of a list is on its own row.
     * WARN: an empty list keeps the height (min-height in css) - otherwise it's impossible to drop an item into it */
    const layout = () =>
      [l1, l2].forEach((t, ti) => {
        const arr = items(t);
        h.setupLayout(t, { x: ti * 100, y: 0, h: Math.max(hi * arr.length, hi), w });
        arr.forEach((a, i) => h.setupLayout(a, { x: ti * 100, y: hi * i, h: hi, w }));
      });
    layout();

    const onChanged = jest.fn();
    const detach = WUPSortElement.$attach([l1, l2], onChanged);
    expect(l1.className).toBe("wup-sort"); // styles are applied to every pointed element
    expect(l2.className).toBe("wup-sort");

    // grab the 1st item of the 2nd list
    let trg = getItems()[3]; // B1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 110, clientY: 10 }));
    h.userMouseMove(trg, { x: 118, y: 12 });
    let dragEl = bindDragEl();
    expect(l1.getAttribute("hovered")).toBe(""); // both lists are marked: the item can be dropped into any of them
    expect(l2.getAttribute("hovered")).toBe("");
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["A1", "A2", "A3", "B1", "B2"]); // no reorder yet

    // ... and move it into the 1st list (between A1 & A2)
    h.userMouseMove(dragEl, { x: 10, y: 40 });
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["A1", "B1", "A2", "A3"]);
    expect(items(l2).map((a) => a.textContent)).toStrictEqual(["B2"]);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(1);
    // WARN: with several parents the callback gets the new state of the parent which held the item & of the one which holds it now
    const [from1, to1] = onChanged.mock.calls[0];
    expect(from1.parent).toBe(l2);
    expect(from1.items.map((a) => a.textContent)).toStrictEqual(["B2"]);
    expect(from1.newOrderedIndexes).toStrictEqual([1]); // indexes are related to the items of this parent only
    expect(from1.removedIndex).toBe(-1); // nothing is removed
    expect(to1.parent).toBe(l1);
    expect(to1.items.map((a) => a.textContent)).toStrictEqual(["A1", "B1", "A2", "A3"]);
    expect(to1.newOrderedIndexes).toStrictEqual([0, -1, 1, 2]); // -1 marks the item that came from another parent
    expect(to1.removedIndex).toBe(-1);

    // move the last item of the 2nd list into the 1st one: the 2nd list becomes empty
    layout();
    [trg] = items(l2); // B2 - the last item of the 2nd list
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 110, clientY: 10 }));
    h.userMouseMove(trg, { x: 118, y: 12 });
    dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 10, y: hi * 3 + 10 }); // over the last item of the 1st list
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["A1", "B1", "A2", "B2", "A3"]);
    expect(items(l2)).toStrictEqual([]);

    // the cursor is outside all the lists: the previous list is kept - otherwise the item jumps back to the initial place
    await h.wait(); // wait for throttling
    layout();
    h.userMouseMove(dragEl, { x: 1000, y: 100 });
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["A1", "B1", "A2", "B2", "A3"]);
    expect(items(l2)).toStrictEqual([]);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(2);
    const [from2, to2] = onChanged.mock.calls[1];
    expect(from2.parent).toBe(l2);
    expect(from2.items).toStrictEqual([]); // the list has no items anymore
    expect(from2.newOrderedIndexes).toStrictEqual([]);
    expect(to2.items.map((a) => a.textContent)).toStrictEqual(["A1", "B1", "A2", "B2", "A3"]);
    expect(to2.newOrderedIndexes).toStrictEqual([0, 1, 2, -1, 3]);

    // the empty list is still droppable
    layout();
    [trg] = getItems(); // A1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 18, y: 12 });
    dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 110, y: 10 });
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["B1", "A2", "B2", "A3"]);
    expect(items(l2).map((a) => a.textContent)).toStrictEqual(["A1"]);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(3);
    const [from3, to3] = onChanged.mock.calls[2];
    expect(from3.parent).toBe(l1);
    expect(from3.newOrderedIndexes).toStrictEqual([1, 2, 3, 4]);
    expect(to3.parent).toBe(l2);
    expect(to3.items.map((a) => a.textContent)).toStrictEqual(["A1"]);
    expect(to3.newOrderedIndexes).toStrictEqual([-1]); // the empty list got the item of another one

    // detach must remove the applied class-name & the listeners of every pointed element
    detach();
    expect(l1.className).toBe("");
    expect(l2.className).toBe("");
    layout();
    [trg] = getItems(); // B1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 110, y: 10 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["B1", "A2", "B2", "A3"]); // no sorting
    expect(onChanged).toBeCalledTimes(3);
  });

  test("$attach on several elements: dropIndicator line", async () => {
    document.body.innerHTML = `<ul id="l1">
  <li item="">A1</li>
  <li item="">A2</li>
  <li item="">A3</li>
</ul>
<ul id="l2">
  <li item="">B1</li>
</ul>`;
    const l1 = document.getElementById("l1");
    const l2 = document.getElementById("l2");
    el = document.body; // to re-use getItems(), bindDragEl() & lineStyle()

    /** Returns sortable items of the pointed list */
    const items = (t) => Array.prototype.slice.call(t.querySelectorAll(`[item='']:not([drag])`));
    /** Assign layout: 2 lists side by side; every item of a list is on its own row (with a gap between rows) */
    const layout = () =>
      [l1, l2].forEach((t, ti) => {
        const arr = items(t);
        h.setupLayout(t, { x: ti * 100, y: 0, h: Math.max((hi + gap) * arr.length - gap, hi), w });
        arr.forEach((a, i) => h.setupLayout(a, { x: ti * 100, y: (hi + gap) * i, h: hi, w }));
      });
    layout();
    /** Returns expected styles of the horizontal line-indicator of the list rendered at the pointed `x` */
    const hLineAt = (x, y) => `width: ${w}px; height: ${lw}px; transform: translate(${x}px, ${y - lw / 2}px);`;

    const onChanged = jest.fn();
    const detach = WUPSortElement.$attach([l1, l2], onChanged, { dropIndicator: "line" });

    // grab the 1st item of the 1st list: no previous item - so the gap is mirrored (-10..0)
    const trg = getItems()[0]; // A1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 20, y: 12 });
    expect(lineStyle()).toBe(hLineAt(0, -gap / 2));
    const dragEl = bindDragEl();

    // top half of the single item of the 2nd list: WARN: items of the 1st list aren't neighbors of it
    // (otherwise the gap is measured between the lists - so the line is painted in the wrong place)
    h.userMouseMove(dragEl, { x: 110, y: 5 });
    expect(lineStyle()).toBe(hLineAt(100, 0));
    // ... and its bottom half
    h.userMouseMove(dragEl, { x: 110, y: 25 });
    expect(lineStyle()).toBe(hLineAt(100, hi));
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["A1", "A2", "A3"]); // no reorder during the dragging
    expect(items(l2).map((a) => a.textContent)).toStrictEqual(["B1"]);

    // the new order is applied by the end of the dragging
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(el.querySelector("[drop-line]")).toBeFalsy();
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["A2", "A3"]);
    expect(items(l2).map((a) => a.textContent)).toStrictEqual(["B1", "A1"]);
    expect(onChanged).toBeCalledTimes(1);
    const [from, to] = onChanged.mock.calls[0];
    expect(from.parent).toBe(l1);
    expect(from.newOrderedIndexes).toStrictEqual([1, 2]);
    expect(to.parent).toBe(l2);
    expect(to.items.map((a) => a.textContent)).toStrictEqual(["B1", "A1"]);
    expect(to.newOrderedIndexes).toStrictEqual([0, -1]);
    detach();
  });

  test("$attach on several elements: drop into the empty list", async () => {
    document.body.innerHTML = `<ul id="l1">
  <li item="">A1</li>
  <li item="">A2</li>
</ul>
<ul id="l2"></ul>
<ul id="l3">
  <li item="">C1</li>
</ul>`;
    const [l1, l2, l3] = ["l1", "l2", "l3"].map((a) => document.getElementById(a));
    el = document.body; // to re-use getItems(), bindDragEl() & lineStyle()

    /** Returns sortable items of the pointed list */
    const items = (t) => Array.prototype.slice.call(t.querySelectorAll(`[item='']:not([drag])`));
    /** Assign layout: 3 lists side by side (the 2nd one is empty) */
    const layout = () =>
      [l1, l2, l3].forEach((t, ti) => {
        const arr = items(t);
        h.setupLayout(t, { x: ti * 100, y: 0, h: Math.max(hi * arr.length, hi), w });
        arr.forEach((a, i) => h.setupLayout(a, { x: ti * 100, y: hi * i, h: hi, w }));
      });
    layout();

    const onChanged = jest.fn();
    const detach = WUPSortElement.$attach([l1, l2, l3], onChanged, { dropIndicator: "line" });

    // WARN: the item is grabbed in the list AFTER the empty one - so its index in the whole set isn't changed by the move
    const trg = getItems()[2]; // C1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 210, clientY: 10 }));
    h.userMouseMove(trg, { x: 218, y: 12 });
    const dragEl = bindDragEl();

    // over the empty list: there are no items - so there is no gap to point & the line is painted on its top edge
    h.userMouseMove(dragEl, { x: 110, y: 15 });
    expect(lineStyle()).toBe(`width: ${w}px; height: ${lw}px; transform: translate(100px, 0px);`);
    expect(items(l3).map((a) => a.textContent)).toStrictEqual(["C1"]); // no reorder during the dragging

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    // WARN: the item must be placed between items of the neighbor lists - not appended to the end of the whole set
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["A1", "A2"]);
    expect(items(l2).map((a) => a.textContent)).toStrictEqual(["C1"]);
    expect(items(l3)).toStrictEqual([]);
    // WARN: the order of the whole set isn't changed - but the event must be fired anyway because the item changed the list
    expect(onChanged).toBeCalledTimes(1);
    const [from, to] = onChanged.mock.calls[0];
    expect(from).not.toBe(to); // the item changed the parent
    expect(from.parent).toBe(l3);
    expect(from.items).toStrictEqual([]);
    expect(to.parent).toBe(l2);
    expect(to.newOrderedIndexes).toStrictEqual([-1]);

    detach();
    expect(l1.className).toBe("");
    expect(l2.className).toBe("");
    expect(l3.className).toBe("");

    // 2nd attach on any of the pointed elements must re-init the previous one
    WUPSortElement.$attach([l1, l2], onChanged);
    const mockWarn = h.wrapConsoleWarn(() => WUPSortElement.$attach([l1, l2, l3], onChanged)());
    expect(mockWarn).toBeCalledTimes(1); // WARN: once - the 1st detach unbinds every element of the previous attach
  });

  test("$attach on several elements: drop into the empty list before the item", async () => {
    // WARN: the empty list is rendered BEFORE the grabbed item - so the new index is shifted in the opposite way
    document.body.innerHTML = `<ul id="l1"></ul>
<ul id="l2">
  <li item="">B1</li>
  <li item="">B2</li>
</ul>`;
    const l1 = document.getElementById("l1");
    const l2 = document.getElementById("l2");
    el = document.body; // to re-use getItems() & bindDragEl()

    /** Returns sortable items of the pointed list */
    const items = (t) => Array.prototype.slice.call(t.querySelectorAll(`[item='']:not([drag])`));
    [l1, l2].forEach((t, ti) => {
      const arr = items(t);
      h.setupLayout(t, { x: ti * 100, y: 0, h: Math.max(hi * arr.length, hi), w });
      arr.forEach((a, i) => h.setupLayout(a, { x: ti * 100, y: hi * i, h: hi, w }));
    });

    const onChanged = jest.fn();
    const detach = WUPSortElement.$attach([l1, l2], onChanged);

    const trg = getItems()[0]; // B1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 110, clientY: 10 }));
    h.userMouseMove(trg, { x: 118, y: 12 });
    const dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 10, y: 15 });
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["B1"]);
    expect(items(l2).map((a) => a.textContent)).toStrictEqual(["B2"]);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    // WARN: the order of the whole set isn't changed - but the event must be fired anyway because the item changed the list
    expect(onChanged).toBeCalledTimes(1);
    const [from, to] = onChanged.mock.calls[0];
    expect(from.parent).toBe(l2);
    expect(from.items.map((a) => a.textContent)).toStrictEqual(["B2"]);
    expect(from.newOrderedIndexes).toStrictEqual([1]);
    expect(to.parent).toBe(l1);
    expect(to.items.map((a) => a.textContent)).toStrictEqual(["B1"]);
    expect(to.newOrderedIndexes).toStrictEqual([-1]);
    detach();
  });

  test("$attach on several elements: reorder inside one parent & canRemove", async () => {
    document.body.innerHTML = `<ul id="l1">
  <li item="">A1</li>
  <li item="">A2</li>
  <li item="">A3</li>
</ul>
<ul id="l2">
  <li item="">B1</li>
  <li item="">B2</li>
</ul>`;
    const l1 = document.getElementById("l1");
    const l2 = document.getElementById("l2");
    el = document.body; // to re-use getItems() & bindDragEl()

    /** Returns sortable items of the pointed list */
    const items = (t) => Array.prototype.slice.call(t.querySelectorAll(`[item='']:not([drag])`));
    /** Assign layout: 2 lists side by side; every item of a list is on its own row */
    const layout = () =>
      [l1, l2].forEach((t, ti) => {
        const arr = items(t);
        h.setupLayout(t, { x: ti * 100, y: 0, h: Math.max(hi * arr.length, hi), w });
        arr.forEach((a, i) => h.setupLayout(a, { x: ti * 100, y: hi * i, h: hi, w }));
      });
    layout();

    const onChanged = jest.fn();
    const detach = WUPSortElement.$attach([l1, l2], onChanged, { canRemove: true });

    // ordinary reorder inside the single list
    let trg = getItems()[0]; // A1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 18, y: 12 });
    let dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 10, y: hi + hi / 2 });
    expect(items(l1).map((a) => a.textContent)).toStrictEqual(["A2", "A1", "A3"]);

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(1);
    const [from1, to1] = onChanged.mock.calls[0];
    expect(from1).toBe(to1); // WARN: the same object - so `from === to` means the item didn't change the parent
    expect(from1.parent).toBe(l1);
    expect(from1.items.map((a) => a.textContent)).toStrictEqual(["A2", "A1", "A3"]);
    expect(from1.newOrderedIndexes).toStrictEqual([1, 0, 2]);
    expect(from1.removedIndex).toBe(-1);

    // canRemove: the item is dropped outside all the lists
    layout();
    [trg] = items(l2); // B1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 110, clientY: 10 }));
    h.userMouseMove(trg, { x: 118, y: 12 });
    dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 1000, y: 1000 });
    expect(el.querySelector("[drag][remove]")).toBeTruthy(); // to show user that the item will be removed

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(2);
    const [from2, to2] = onChanged.mock.calls[1];
    expect(from2).toBe(to2);
    expect(from2.parent).toBe(l2);
    expect(from2.items.map((a) => a.textContent)).toStrictEqual(["B1", "B2"]); // WARN: removing the item from the DOM is the responsibility of the callback
    expect(from2.newOrderedIndexes).toStrictEqual([0, 1]);
    expect(from2.removedIndex).toBe(0); // index in `items` of the item dropped outside

    // the item is moved into another list & only after that dropped outside
    layout();
    [trg] = items(l1); // A2
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 18, y: 12 });
    dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 110, y: 10 });
    expect(items(l2).map((a) => a.textContent)).toStrictEqual(["B1", "A2", "B2"]);
    await h.wait(); // wait for throttling
    layout();
    h.userMouseMove(dragEl, { x: 1000, y: 1000 });

    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();
    expect(onChanged).toBeCalledTimes(3);
    const [from3, to3] = onChanged.mock.calls[2];
    expect(from3.parent).toBe(l1);
    expect(from3.items.map((a) => a.textContent)).toStrictEqual(["A1", "A3"]);
    expect(from3.newOrderedIndexes).toStrictEqual([1, 2]);
    expect(from3.removedIndex).toBe(-1); // the item is reported by `to`: it was moved into the 2nd list before going outside
    expect(to3.parent).toBe(l2);
    expect(to3.items.map((a) => a.textContent)).toStrictEqual(["B1", "A2", "B2"]);
    expect(to3.newOrderedIndexes).toStrictEqual([0, -1, 1]);
    expect(to3.removedIndex).toBe(1);
    detach();
  });

  test("$attach: items of a nested container aren't stolen", async () => {
    // WARN: items are searched among ALL the descendants (WUPSelectManyControl keeps them in `label > span`) -
    // so an item must belong to the nearest container that owns items, not to the outer one
    document.body.innerHTML = `<ul id="outer">
  <li item="">O1</li>
  <li item="">O2</li>
  <li>
    <ul id="inner">
      <li item="">I1</li>
      <li item="">I2</li>
    </ul>
  </li>
</ul>`;
    const outer = document.getElementById("outer");
    const inner = document.getElementById("inner");
    el = document.body; // to re-use getItems() & bindDragEl()

    /** Returns sortable items of the pointed container (the query is deep - as it is inside the element) */
    const items = (t) => Array.prototype.slice.call(t.querySelectorAll(`[item='']:not([drag])`));
    /** Assign layout: every item on its own row */
    const layout = () => {
      h.setupLayout(outer, { x: 0, y: 0, h: hi * 4, w });
      h.setupLayout(inner, { x: 0, y: hi * 2, h: hi * 2, w });
      items(outer).forEach((a, i) => h.setupLayout(a, { x: 0, y: hi * i, h: hi, w }));
    };
    layout();

    const onOuter = jest.fn();
    const onInner = jest.fn();
    const dOuter = WUPSortElement.$attach(outer, onOuter);
    const dInner = WUPSortElement.$attach(inner, onInner);

    // reorder the outer list: its own items only
    const trg = items(outer)[0]; // O1
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: 10, y: 22 }); // past the click-threshold; O1 is still the nearest - so no reorder yet
    const dragEl = bindDragEl();
    h.userMouseMove(dragEl, { x: 10, y: hi + hi / 2 }); // the center of O2
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();

    expect(items(outer).map((a) => a.textContent)).toStrictEqual(["O2", "O1", "I1", "I2"]);
    expect(items(inner).map((a) => a.textContent)).toStrictEqual(["I1", "I2"]); // the nested list isn't touched
    expect(onOuter).toBeCalledTimes(1);
    expect(onOuter.mock.calls[0][0]).toStrictEqual([1, 0]); // WARN: 2 items (not 4) - I1 & I2 belong to the nested list
    expect(onOuter.mock.calls[0][1].map((a) => a.textContent)).toStrictEqual(["O2", "O1"]);
    expect(onInner).not.toBeCalled();

    // ... and the nested list is sortable on its own
    layout();
    const trg2 = items(inner)[0]; // I1
    trg2.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg2, { x: 10, y: 22 });
    const dragEl2 = bindDragEl();
    h.userMouseMove(dragEl2, { x: 10, y: hi * 3 + hi / 2 }); // the center of I2
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await h.wait();

    expect(items(inner).map((a) => a.textContent)).toStrictEqual(["I2", "I1"]);
    expect(onInner).toBeCalledTimes(1);
    expect(onInner.mock.calls[0][0]).toStrictEqual([1, 0]);
    expect(onOuter).toBeCalledTimes(1); // the outer list isn't affected by the nested one

    dOuter();
    dInner();
  });
});
