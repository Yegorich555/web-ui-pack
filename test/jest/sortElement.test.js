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
  h.baseTestComponent(() => document.createElement("wup-sort"), { attrs: {} });

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
        "<div item="" draggable="false" drag="" style="width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(10px, 2px);">Item 1</div>",
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
        "<div item="" draggable="false" drag="" style="width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(80px, 5px);">Item 1</div>",
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
        "<div item="" draggable="false" drag="" style="width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(140px, 5px);">Item 1</div>",
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
        "<div item="" draggable="false" drag="" style="width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(140px, 5px);">Item 1</div>",
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
        "<div item="" draggable="false" drag="" style="width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(-5px, 35px);">Item 1</div>",
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
        "<div item="" draggable="false" drag="" style="width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(-5px, -5px);">Item 1</div>",
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
        "<div item="" draggable="false" drag="" style="width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(140px, 5px);">Item 1</div>",
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

    // editable content inside item
    getItems()[0].innerHTML = `<input />`;
    const input = el.querySelector("input");
    input.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(input, { x: w * 2, y: 0 });
    expect(el.querySelector("[drag]")).toBeFalsy();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));

    getItems()[0].innerHTML = `<span contenteditable="true">txt</span>`;
    const span = el.querySelector("span");
    span.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    h.userMouseMove(span, { x: w * 2, y: 0 });
    expect(el.querySelector("[drag]")).toBeFalsy();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));

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

  test("_disposeDragdrop", () => {
    el._disposeDragdrop();
    const was = el.innerHTML;
    const trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    h.userMouseMove(trg, { x: w * 2, y: 0 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.innerHTML).toBe(was);
  });
});
