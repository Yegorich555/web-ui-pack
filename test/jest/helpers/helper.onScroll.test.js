import onScroll from "web-ui-pack/helpers/onScroll";
import * as h from "../../testHelper";

let el = document.createElement("div");
beforeEach(() => {
  jest.useFakeTimers();
  el = document.body.appendChild(document.createElement("div"));
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("helper.onScroll", () => {
  test("wheel events", () => {
    const opts = { skip: undefined };
    const gotScroll = jest.fn();
    onScroll(el, gotScroll, opts);

    let isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })); // scrollDown
    expect(isPrevented).toBe(true);
    expect(gotScroll).toBeCalledTimes(1);
    expect(gotScroll).lastCalledWith(1);

    gotScroll.mockClear();
    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    expect(isPrevented).toBe(true);
    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    expect(gotScroll).toBeCalledTimes(2);
    expect(gotScroll).lastCalledWith(-1);

    opts.skip = () => true;
    gotScroll.mockClear();
    isPrevented = !el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 })); // scrollDown
    expect(isPrevented).toBe(false);
    expect(gotScroll).toBeCalledTimes(0);
  });

  test("swipe events", async () => {
    const opts = { skip: undefined, isXScroll: false };
    const gotScroll = jest.fn();
    const remove = onScroll(el, gotScroll, opts);

    await h.userSwipe(el, { movements: [{ dx: 0, dy: -50 }] }); // swipeUp => scrollDown
    expect(gotScroll).toBeCalledTimes(1);
    expect(gotScroll).lastCalledWith(1);

    gotScroll.mockClear();
    await h.userSwipe(el, { movements: [{ dx: 0, dy: 50 }] }); // swipeDown => scrollUp
    await h.userSwipe(el, { movements: [{ dx: 0, dy: 50 }] }); // swipeDown => scrollUp
    expect(gotScroll).toBeCalledTimes(2);
    expect(gotScroll).lastCalledWith(-1);

    gotScroll.mockClear();
    opts.skip = () => true;
    await h.userSwipe(el, { movements: [{ dx: 0, dy: -50 }] }); // swipeUp => scrollDown
    expect(gotScroll).toBeCalledTimes(0);
    opts.skip = undefined;

    // has effect if swipeY several times for a long time
    await h.userSwipe(el, {
      movements: [
        { dx: 0, dy: 50 },
        { dx: 0, dy: 50, delayMs: 400 },
      ],
    });
    expect(gotScroll).toBeCalledTimes(2);

    // no effect if swipeX
    gotScroll.mockClear();
    await h.userSwipe(el, { movements: [{ dx: 50, dy: 0 }] });
    expect(gotScroll).toBeCalledTimes(0);

    opts.isXScroll = true;
    await h.userSwipe(el, { movements: [{ dx: 50, dy: 0 }] }); // swipeRight => scrollLeft
    expect(gotScroll).toBeCalledTimes(1);
    expect(gotScroll).lastCalledWith(-1);

    gotScroll.mockClear();
    await h.userSwipe(el, { movements: [{ dx: -50, dy: 0 }] }); // swipeLeft => scrollRight
    expect(gotScroll).toBeCalledTimes(1);
    expect(gotScroll).lastCalledWith(1);

    // no effect if swipeY
    gotScroll.mockClear();
    await h.userSwipe(el, { movements: [{ dx: 0, dy: 50 }] }); // swipeDown => scrollUp
    await h.userSwipe(el, { movements: [{ dx: 0, dy: -50 }] }); // swipeDown => scrollUp
    expect(gotScroll).toBeCalledTimes(0);

    remove();
    await h.userSwipe(el, { movements: [{ dx: -50, dy: 0 }] });
    expect(gotScroll).toBeCalledTimes(0);
  });
});
