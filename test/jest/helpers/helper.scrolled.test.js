import WUPScrolled from "web-ui-pack/helpers/scrolled";
import * as h from "../../testHelper";

let ul = document.createElement("ul");

let nextFrames = (n = 5) => Promise.resolve(n);
let itemNum = 0;
const createItem = (i) => {
  itemNum += i;
  const li = document.body.firstElementChild.appendChild(document.createElement("li"));
  li.setAttribute("num", itemNum.toString());
  jest.spyOn(li, "offsetHeight", "get").mockImplementation(() => li.parentElement.offsetHeight);
  jest.spyOn(li, "offsetWidth", "get").mockImplementation(() => li.parentElement.offsetWidth);
  return li;
};

beforeEach(() => {
  jest.useFakeTimers();
  const na = h.useFakeAnimation().nextFrame;
  nextFrames = async (n) => {
    for (let i = 0; i < n; ++i) {
      await na();
    }
    return n;
  };
  ul = document.body.appendChild(document.createElement("ul"));
  jest.spyOn(ul, "offsetHeight", "get").mockImplementation(() => 100);
  jest.spyOn(ul, "offsetWidth", "get").mockImplementation(() => 60);
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
  itemNum = 0;
});

describe("helper.onScrollStop", () => {
  test("single page: wheel & swipe", async () => {
    ul.appendChild(createItem(1));
    const onRender = jest.fn().mockImplementation((dir) => [createItem(dir)]);
    onRender.last = () => onRender.mock.calls[onRender.mock.calls.length - 1];
    const s = new WUPScrolled(ul, { onRender });
    expect(ul.outerHTML).toMatchInlineSnapshot(`"<ul style="overflow: hidden;"><li num="1"></li></ul>"`);
    await nextFrames(1); // to fire 1st scrollToRange
    expect(onRender).toBeCalledTimes(0);
    expect(s.state.items).toEqual(Array.prototype.slice.call(ul.children));

    // scrollDown
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="1"></li><li num="2"></li></ul>"`
    ); // expected 2items: 2 after 1
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="2"></li></ul>"`
    ); // expected only 2nd item
    expect(onRender.last()).toMatchInlineSnapshot(`
      [
        1,
        1,
        {
          "index": 0,
          "items": [
            <li
              num="1"
            />,
          ],
        },
        {
          "index": 1,
          "items": [
            <li
              num="2"
            />,
          ],
        },
      ]
    `);

    // scrollUp
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="1"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="1"></li></ul>"`
    );
    expect(onRender.last()).toMatchInlineSnapshot(`
      [
        -1,
        0,
        {
          "index": 1,
          "items": [
            <li
              num="2"
            />,
          ],
        },
        {
          "index": 0,
          "items": [
            <li
              num="1"
            />,
          ],
        },
      ]
    `);
    // scrollUp again (to negative page index)
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li><li num="1"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li></ul>"`
    );

    expect(s.state).toMatchInlineSnapshot(`
      {
        "index": -1,
        "items": [
          <li
            num="0"
          />,
        ],
      }
    `);

    // swipeUp => scrollDown
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 0, dy: -50 }] });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li><li num="1"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="1"></li></ul>"`
    );

    // swipeDown => scrollUp
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 0, dy: 50 }] });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li><li num="1"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li></ul>"`
    );

    // no new items - no scroll
    onRender.mockImplementation(() => []);
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li></ul>"`
    );

    onRender.mockImplementation(() => null);
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;"><li num="0"></li></ul>"`
    );
  });

  test("scroll with keyboard", async () => {
    ul.appendChild(createItem(1));
    const onRender = jest.fn().mockImplementation((dir) => [createItem(dir)]);
    ul._scrolled = new WUPScrolled(ul, { onRender });
    expect(ul.outerHTML).toMatchInlineSnapshot(`"<ul style="overflow: hidden;"><li num="1"></li></ul>"`);
    await nextFrames(1); // to fire 1st scrollToRange
    expect(onRender).toBeCalledTimes(0);

    ul.setAttribute("tabindex", "0");
    ul.focus();

    // PageDown
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true, cancelable: true }));
    expect(onRender).toBeCalledTimes(1);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;" tabindex="0"><li num="1"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;" tabindex="0"><li num="2"></li></ul>"`
    );

    // PageUp
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true, cancelable: true }));
    expect(onRender).toBeCalledTimes(2);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;" tabindex="0"><li num="1"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;" tabindex="0"><li num="1"></li></ul>"`
    );

    // ArrowDown
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(onRender).toBeCalledTimes(3);
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;" tabindex="0"><li num="2"></li></ul>"`
    );

    // ArrowUp
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(onRender).toBeCalledTimes(4);
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-height: 100px;" tabindex="0"><li num="1"></li></ul>"`
    );

    onRender.mockClear();
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled(); // because it's Y-scroll
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled(); // because it's Y-scroll
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled(); // just for coverage
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled(); // just for coverage
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", altKey: true, bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled();
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", shiftKey: true, bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled();
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", ctrlKey: true, bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled();
    ul.addEventListener("keydown", (e) => e.preventDefault(), { capture: true });
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled();
  });

  test("options.isXScroll", async () => {
    ul.appendChild(createItem(1));
    const onRender = jest.fn().mockImplementation((dir) => [createItem(dir)]);
    onRender.last = () => onRender.mock.calls[onRender.mock.calls.length - 1];
    ul._scrolled = new WUPScrolled(ul, { onRender, isXScroll: true });
    expect(ul.outerHTML).toMatchInlineSnapshot(`"<ul style="overflow: hidden;"><li num="1"></li></ul>"`);
    await nextFrames(1); // to fire 1st scrollToRange

    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 0, dy: -50 }] });
    expect(onRender).not.toBeCalled();

    // swipeLeft => scrollRight
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: -50, dy: 0 }] });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-width: 60px;"><li num="1"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-width: 60px;"><li num="2"></li></ul>"`
    );

    // swipeRight=> scrollLeft
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 50, dy: 0 }] });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-width: 60px;"><li num="1"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-width: 60px;"><li num="1"></li></ul>"`
    );

    // ArrowDown
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(onRender).toBeCalledTimes(3);
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-width: 60px;"><li num="2"></li></ul>"`
    );

    // ArrowUp
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    expect(onRender).toBeCalledTimes(4);
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="overflow: hidden; max-width: 60px;"><li num="1"></li></ul>"`
    );

    onRender.mockClear();
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled(); // because it's X-scroll
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(onRender).not.toBeCalled(); // because it's X-scroll
  });

  test("dispose()", async () => {
    const spy = h.spyEventListeners();
    const renderNext = jest.fn().mockImplementation(() => [createItem()]);
    const obj = new WUPScrolled(ul, { onRender: renderNext });
    obj.dispose();

    spy.check();
  });
});
