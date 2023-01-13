// todo rewrite tests for WUPScrolled
import scrollCarousel from "web-ui-pack/helpers/scrollCarousel";
import * as h from "../../testHelper";

let ul = document.createElement("ul");

let nextFrames = (n = 5) => Promise.resolve(n);
let itemNum = 0;
const createItem = () => {
  const li = document.body.firstElementChild.appendChild(document.createElement("li"));
  li.setAttribute("num", (++itemNum).toString());
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
  test("scroll via wheel", async () => {
    ul.appendChild(createItem());
    const renderNext = jest.fn().mockImplementation(() => [createItem()]);
    scrollCarousel(ul, renderNext);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="1"></li></ul>"`
    );
    await nextFrames(1); // to fire 1st scrollToRange

    // scrollDown
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="1"></li><li num="2"></li></ul>"`
    ); // expected 2items: 2 after 1
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="2"></li></ul>"`
    ); // expected only 2nd item
    expect(renderNext).toHaveBeenLastCalledWith(1);

    // scrollUp
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li></ul>"`
    );
    expect(renderNext).toHaveBeenLastCalledWith(-1);

    // no new items - no scroll
    renderNext.mockImplementation(() => []);
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li></ul>"`
    );

    renderNext.mockImplementation(() => null);
    ul.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 }));
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li></ul>"`
    );
  });

  test("scroll via touchPad (swipe)", async () => {
    ul.appendChild(createItem());
    const renderNext = jest.fn().mockImplementation(() => [createItem()]);
    scrollCarousel(ul, renderNext);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="1"></li></ul>"`
    );
    await nextFrames(1); // to fire 1st scrollToRange

    // swipeUp => scrollDown
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 0, dy: -50 }] });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="1"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="2"></li></ul>"`
    );
    expect(renderNext).toHaveBeenLastCalledWith(1);

    // swipeDown => scrollUp
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 0, dy: 50 }] });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li></ul>"`
    );
    expect(renderNext).toHaveBeenLastCalledWith(-1);

    // no effect if swipeX
    renderNext.mockClear();
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 50, dy: 0 }] });
    await nextFrames(5);
    expect(renderNext).not.toBeCalled();
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li></ul>"`
    );

    // no effect if swipeY is small
    renderNext.mockClear();
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 2, dy: 5 }] });
    await nextFrames(5);
    expect(renderNext).not.toBeCalled();
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="3"></li></ul>"`
    );

    // has effect if swipeY is small but several times
    renderNext.mockClear();
    await h.userSwipe(ul.firstElementChild, {
      movements: [
        { dx: 0, dy: 5 },
        { dx: 0, dy: 5 },
        { dx: 0, dy: 5 },
        { dx: 0, dy: 5 },
        { dx: 0, dy: 5 },
        { dx: 0, dy: 5 },
      ],
    });
    await nextFrames(5);
    expect(renderNext).toBeCalledTimes(1);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="4"></li></ul>"`
    );

    // has effect if swipeY several times with small time - render 1 times
    renderNext.mockClear();
    await h.userSwipe(ul.firstElementChild, {
      movements: [
        { dx: 0, dy: 50 },
        { dx: 0, dy: 50 },
      ],
    });
    await nextFrames(5);
    expect(renderNext).toBeCalledTimes(1);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="5"></li></ul>"`
    );

    // has effect if swipeY several times for a long time
    renderNext.mockClear();
    await h.userSwipe(ul.firstElementChild, {
      movements: [
        { dx: 0, dy: 50 },
        { dx: 0, dy: 50, delayMs: 400 },
      ],
    });
    await nextFrames(5);
    expect(renderNext).toBeCalledTimes(2);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="7"></li></ul>"`
    );
  });

  test("scroll with pageUp/pageDown", async () => {
    ul.appendChild(createItem());
    const renderNext = jest.fn().mockImplementation(() => [createItem()]);
    scrollCarousel(ul, renderNext);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;"><li num="1"></li></ul>"`
    );
    await nextFrames(1); // to fire 1st scrollToRange

    ul.setAttribute("tabindex", "0");
    ul.focus();

    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true, cancelable: true }));
    expect(renderNext).toHaveBeenLastCalledWith(1);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;" tabindex="0"><li num="1"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;" tabindex="0"><li num="2"></li></ul>"`
    );

    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true, cancelable: true }));
    expect(renderNext).toHaveBeenLastCalledWith(-1);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;" tabindex="0"><li num="3"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-height: 100px; overflow: hidden;" tabindex="0"><li num="3"></li></ul>"`
    );

    renderNext.mockClear();
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", altKey: true, bubbles: true, cancelable: true }));
    expect(renderNext).not.toBeCalled();
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", shiftKey: true, bubbles: true, cancelable: true }));
    expect(renderNext).not.toBeCalled();
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", ctrlKey: true, bubbles: true, cancelable: true }));
    expect(renderNext).not.toBeCalled();

    ul.addEventListener("keydown", (e) => e.preventDefault(), { capture: true });
    ul.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true, cancelable: true }));
    expect(renderNext).not.toBeCalled();
  });

  test("options.isXScroll", async () => {
    ul.appendChild(createItem());
    const renderNext = jest.fn().mockImplementation(() => [createItem()]);
    scrollCarousel(ul, renderNext, { isXScroll: true });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-width: 60px; overflow: hidden;"><li num="1"></li></ul>"`
    );
    await nextFrames(1); // to fire 1st scrollToRange

    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 0, dy: -50 }] });
    expect(renderNext).not.toBeCalled();

    // swipeLeft => scrollRight
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: -50, dy: 0 }] });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-width: 60px; overflow: hidden;"><li num="1"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-width: 60px; overflow: hidden;"><li num="2"></li></ul>"`
    );
    expect(renderNext).toHaveBeenLastCalledWith(1);

    // swipeRight=> scrollLeft
    await h.userSwipe(ul.firstElementChild, { movements: [{ dx: 50, dy: 0 }] });
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-width: 60px; overflow: hidden;"><li num="3"></li><li num="2"></li></ul>"`
    );
    await nextFrames(5);
    expect(ul.outerHTML).toMatchInlineSnapshot(
      `"<ul style="max-width: 60px; overflow: hidden;"><li num="3"></li></ul>"`
    );
    expect(renderNext).toHaveBeenLastCalledWith(-1);
  });

  test("element size not defined", () => {
    jest.spyOn(ul, "offsetHeight", "get").mockImplementation(() => 0);
    const renderNext = jest.fn().mockImplementation(() => [createItem()]);
    scrollCarousel(ul, renderNext);
    jest.spyOn(ul, "offsetHeight", "get").mockImplementation(() => 12);
    jest.advanceTimersByTime(1);
    expect(ul.outerHTML).toMatchInlineSnapshot(`"<ul style="overflow: hidden; max-height: 12px;"></ul>"`);
  });

  test("removing listener", async () => {
    const spy = h.spyEventListeners();
    const renderNext = jest.fn().mockImplementation(() => [createItem()]);
    const obj = scrollCarousel(ul, renderNext);
    obj.remove();

    spy.check();
  });
});
