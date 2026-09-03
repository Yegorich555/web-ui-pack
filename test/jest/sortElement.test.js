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

/** Returns outerHTML of every child of the control */
function getChildren() {
  return Array.prototype.slice.call(el.children).map((a) => a.outerHTML);
}

/** Simulate mouse-move: 1st call is ignored by control (threshold to avoid sorting by ordinary click) */
function userMouseMove(trg, { x, y }) {
  h.userMouseMove(trg, { x: x + 100, y: y + 100 }); // 1st move is skipped by threshold
  h.userMouseMove(trg, { x, y });
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
    userMouseMove(trg, { x: w * 2, y: 0 });
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
    h.userMouseMove(trg, { x: 10, y: 10 }); // 1st move is ignored because of threshold
    expect(el.querySelector("[drag]")).toBeFalsy(); // no-sorting when user moved cursor a bit
    h.userMouseMove(trg, { x: 12, y: 12 });
    expect(getChildren()).toMatchInlineSnapshot(`
      [
        "<div item="" draggable="false" drag="" style="width: 60px; height: 30px; top: 0px; left: 0px; position: fixed; z-index: 9999; transform: translate(2px, 2px);">Item 1</div>",
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
    userMouseMove(trg, { x: w * 2, y: 0 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(was);

    // click on the control itself (outside items)
    el.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    userMouseMove(el, { x: w * 2, y: 0 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(was);

    // click on item that isn't sortable
    const notSortable = el.querySelector("[item='false']");
    notSortable.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    userMouseMove(notSortable, { x: w * 2, y: 0 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.querySelector("[drag]")).toBeFalsy();
    expect(getItems().map((a) => a.textContent)).toStrictEqual(was);

    // editable content inside item
    getItems()[0].innerHTML = `<input />`;
    const input = el.querySelector("input");
    input.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    userMouseMove(input, { x: w * 2, y: 0 });
    expect(el.querySelector("[drag]")).toBeFalsy();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));

    getItems()[0].innerHTML = `<span contenteditable="true">txt</span>`;
    const span = el.querySelector("span");
    span.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true }));
    userMouseMove(span, { x: w * 2, y: 0 });
    expect(el.querySelector("[drag]")).toBeFalsy();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));

    await h.wait();
    expect(onChanged).toBeCalledTimes(0);
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["txt", "Item 2", "Item 3", "Item 4"]); // order isn't changed

    // dragging without changing position
    const { nextFrame } = h.useFakeAnimation();
    const trg2 = getItems()[0];
    trg2.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    userMouseMove(trg2, { x: 12, y: 12 });
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
    userMouseMove(img, { x: w * 2, y: 0 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(img.draggable).toBe(true); // restored after dragging
  });

  test("touch events", async () => {
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);

    // case when touch event impossible to prevent because browser decides to scroll
    let [trg] = getItems();
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent("touchstart", { cancelable: true, bubbles: true }));
    userMouseMove(trg, { x: w * 2, y: 0 });
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
    userMouseMove(trg, { x: w + w / 2, y: hi / 2 });
    expect(el.querySelector("[drag]")).toBeTruthy();
    bindDragEl();
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    await nextFrame(10);
    expect(getItems().map((a) => a.textContent)).toStrictEqual(["Item 2", "Item 1", "Item 3", "Item 4"]);
    await h.wait(1);
    expect(onChanged).toBeCalledTimes(1);
    expect(onChanged.mock.calls[0][0].detail.value).toStrictEqual([1, 0, 2, 3]);
  });

  test("_disposeDragdrop", () => {
    el._disposeDragdrop();
    const was = el.innerHTML;
    const trg = getItems()[0];
    trg.dispatchEvent(new MouseEvent("pointerdown", { cancelable: true, bubbles: true, clientX: 10, clientY: 10 }));
    userMouseMove(trg, { x: w * 2, y: 0 });
    document.dispatchEvent(new MouseEvent("pointerup", { cancelable: true, bubbles: true }));
    expect(el.innerHTML).toBe(was);
  });
});
