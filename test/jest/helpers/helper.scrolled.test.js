import WUPScrolled from "web-ui-pack/helpers/scrolled";
// import WUPScrolled from "../../../src/helpers/scrolled";
import * as h from "../../testHelper";

let ul = document.createElement("ul");

let nextFrames = (n = 5) => Promise.resolve(n);
let itemNum = 0;
const createItem = (i, forceNum = null) => {
  itemNum = forceNum ?? itemNum + i;
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
  test("wheel & swipe", async () => {
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

  test("keyboard", async () => {
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

  test("several pages (without total & cycled)", async () => {
    const onRender = jest.fn().mockImplementation((dir, renderIndex, prev, next) => {
      const li = createItem(dir, renderIndex);
      prev.items.forEach((el) => el.removeAttribute("cur"));
      prev.items.forEach((el) => el.setAttribute("prev", prev.index));
      next.items.forEach((el) => el.setAttribute("cur", next.index));
      next.items.forEach((el) => el.removeAttribute("prev", next.index));
      return [li];
    });
    const s = new WUPScrolled(ul, { onRender, scrollByClick: true, pages: { current: 2, before: 1, after: 1 } });
    await nextFrames(1); // to fire 1st scrollToRange

    // during the init if option pages is pointed => render first items
    expect(onRender).toBeCalledTimes(3);
    expect(ul.innerHTML).toMatchInlineSnapshot(`"<li num="1"></li><li num="2" cur="2"></li><li num="3"></li>"`);

    s.goTo(true);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="1"></li><li num="2" prev="2"></li><li num="3" cur="3"></li><li num="4"></li>"`
    );
    await nextFrames(5);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="2" prev="2"></li><li num="3" cur="3"></li><li num="4"></li>"`
    );
    expect(onRender).toBeCalledTimes(4);

    s.goTo(false);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="1"></li><li num="2" cur="2"></li><li num="3" prev="3"></li><li num="4"></li>"`
    );
    await nextFrames(5);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="1"></li><li num="2" cur="2"></li><li num="3" prev="3"></li>"`
    );
    expect(onRender).toBeCalledTimes(5);

    expect(s.state.index).toBe(2);
    onRender.mockClear();
    s.goTo(0); // current page is placed between before & after pageIndex: -1 (so negative index expected to render current at the center)
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="-1"></li><li num="0" cur="0"></li><li num="1" prev="1"></li><li num="2" prev="2"></li><li num="3" prev="3"></li>"`
    );
    await nextFrames(5);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="-1"></li><li num="0" cur="0"></li><li num="1" prev="1"></li>"`
    );
    expect(onRender).toBeCalledTimes(2); // because inc was to 2 pages

    onRender.mockClear();
    s.goTo(0);
    expect(onRender).toBeCalledTimes(0); // noRender if goto the same page
    s.goTo(-1);
    expect(onRender).toBeCalledTimes(0); // noRender to outOfRange

    await h.userClick(ul.lastElementChild);
    expect(onRender).toBeCalledTimes(1);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="-1"></li><li num="0" prev="0"></li><li num="1" cur="1"></li><li num="2"></li>"`
    );
    await nextFrames(5);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="0" prev="0"></li><li num="1" cur="1"></li><li num="2"></li>"`
    );

    onRender.mockClear();
    await h.userClick(ul.children.item(1));
    expect(onRender).toBeCalledTimes(0); // no render if click on the same item

    await h.userClick(ul);
    expect(onRender).toBeCalledTimes(0); // no render if click not on the item

    await h.userClick(ul.firstElementChild, { button: 1 }); // no render if right-click
    expect(onRender).toBeCalledTimes(0); // no render if click not on the item

    ul.firstElementChild.onclick = (e) => e.preventDefault();
    await h.userClick(ul.firstElementChild);
    expect(onRender).toBeCalledTimes(0); // no render if prevented
    ul.firstElementChild.onclick = undefined;
  });

  test("several pages (with total)", async () => {
    const onRender = jest.fn().mockImplementation((dir, renderIndex, prev, next) => {
      const li = createItem(dir, renderIndex);
      prev.items.forEach((el) => el.removeAttribute("cur"));
      prev.items.forEach((el) => el.setAttribute("prev", prev.index));
      next.items.forEach((el) => el.setAttribute("cur", next.index));
      next.items.forEach((el) => el.removeAttribute("prev", next.index));
      return [li];
    });
    const s = new WUPScrolled(ul, { onRender, pages: { current: 2, total: 3 } });
    await nextFrames(1); // to fire 1st scrollToRange
    expect(ul.innerHTML).toMatchInlineSnapshot(`"<li num="2"></li>"`); // no attr [cur] because next.items always empty
    expect(onRender).toBeCalledTimes(1);

    onRender.mockClear();
    s.goTo(true);
    expect(onRender).toBeCalledTimes(0); // because cycled=false and no next pages

    s.goTo(false);
    expect(ul.innerHTML).toMatchInlineSnapshot(`"<li num="1"></li><li num="2" prev="2"></li>"`);
    await nextFrames(5);
    expect(ul.innerHTML).toMatchInlineSnapshot(`"<li num="1"></li>"`);
    expect(onRender).toBeCalledTimes(1);

    onRender.mockClear();
    const spyThen = jest.fn();
    s.goTo(0).then(spyThen);
    await nextFrames(5);
    expect(onRender).toBeCalledTimes(1);
    expect(spyThen).toBeCalledTimes(1);

    onRender.mockClear();
    spyThen.mockClear();
    s.goTo(1, false).then(spyThen); // goto without smooth
    expect(ul.innerHTML).toMatchInlineSnapshot(`"<li num="0" prev="0"></li><li num="1"></li>"`);
    expect(onRender).toBeCalledTimes(1);
    await h.wait(1);
    expect(spyThen).toBeCalledTimes(1);
  });

  test("several pages (cycled)", async () => {
    const onRender = jest.fn().mockImplementation((dir, renderIndex, prev, next) => {
      const li = createItem(dir, renderIndex);
      prev.items.forEach((el) => el.removeAttribute("cur"));
      prev.items.forEach((el) => el.setAttribute("prev", prev.index));
      next.items.forEach((el) => el.setAttribute("cur", next.index));
      next.items.forEach((el) => el.removeAttribute("prev", next.index));
      return [li];
    });
    expect(() => new WUPScrolled(ul, { onRender, pages: { current: 2, cycled: true } })).toThrow();
    ul._scrolled = new WUPScrolled(ul, {
      onRender,
      scrollByClick: true,
      pages: { current: 11, total: 12, before: 1, after: 1, cycled: true },
    });
    await nextFrames(1); // to fire 1st scrollToRange
    expect(ul.innerHTML).toMatchInlineSnapshot(`"<li num="10"></li><li num="11" cur="11"></li><li num="0"></li>"`);
    expect(onRender).toBeCalledTimes(3);

    await h.userClick(ul.lastElementChild); // scrolling must be to the nearest item
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="10"></li><li num="11" prev="11"></li><li num="0" cur="0"></li><li num="1"></li>"`
    );
    await nextFrames(5);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="11" prev="11"></li><li num="0" cur="0"></li><li num="1"></li>"`
    );
    expect(onRender).toBeCalledTimes(4);

    await h.userClick(ul.firstElementChild); // scrolling must be to the nearest item
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="10"></li><li num="11" cur="11"></li><li num="0" prev="0"></li><li num="1"></li>"`
    );
    await nextFrames(5);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="10"></li><li num="11" cur="11"></li><li num="0" prev="0"></li>"`
    );
    expect(onRender).toBeCalledTimes(5);

    await h.userClick(ul.firstElementChild);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="9"></li><li num="10" cur="10"></li><li num="11" prev="11"></li><li num="0" prev="0"></li>"`
    );
    await nextFrames(5);
    expect(ul.innerHTML).toMatchInlineSnapshot(
      `"<li num="9"></li><li num="10" cur="10"></li><li num="11" prev="11"></li>"`
    );
    expect(onRender).toBeCalledTimes(6);
  });

  test("dispose()", async () => {
    const spy = h.spyEventListeners();
    const renderNext = jest.fn().mockImplementation(() => [createItem()]);
    const obj = new WUPScrolled(ul, { onRender: renderNext });
    obj.dispose();

    spy.check();
  });
});
