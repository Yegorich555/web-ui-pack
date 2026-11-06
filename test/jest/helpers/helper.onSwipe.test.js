import onSwipe from "web-ui-pack/helpers/onSwipe";

let el = document.createElement("div");
beforeEach(() => {
  jest.useFakeTimers();
  el = document.body.appendChild(document.createElement("div"));
});

afterEach(() => {
  document.body.innerHTML = "";
});

/** Simulate pointer event: jsdom has no PointerEvent - so pointer-properties must be defined manually */
function userPointer(type, x, opts = {}) {
  const ev = new MouseEvent(type, { clientX: x, clientY: opts.y ?? 0, cancelable: true, bubbles: true });
  const p = { pointerId: 1, isPrimary: true, pointerType: "touch", timeStamp: 0, ...opts };
  Object.keys(p).forEach((k) => Object.defineProperty(ev, k, { get: () => p[k] }));
  el.dispatchEvent(ev);
}

/** Simulate touch-swipe: down at 1st point, move by others (every 100ms), up at the last one */
function userSwipe(points, end = "pointerup", opts = {}) {
  points.forEach((x, i) => userPointer(i ? "pointermove" : "pointerdown", x, { timeStamp: i * 100, ...opts }));
  userPointer(end, points[points.length - 1], { timeStamp: points.length * 100, ...opts });
}

describe("helper.onSwipe", () => {
  test("callbacks", () => {
    const onStart = jest.fn();
    const onMove = jest.fn();
    const onEnd = jest.fn();
    const remove = onSwipe(el, { onStart, onMove, onEnd });
    expect(el.style.touchAction).toBe("pan-y");

    userPointer("pointerdown", 0);
    userPointer("pointermove", 5, { timeStamp: 100 });
    expect(onStart).not.toBeCalled(); // less than minDelta
    userPointer("pointermove", 50, { timeStamp: 200, pointerId: 2 }); // another pointer is ignored
    expect(onStart).not.toBeCalled();
    userPointer("pointermove", 50, { timeStamp: 200 });
    expect(onStart).toBeCalledTimes(1);
    expect(onMove.mock.calls).toEqual([[50, expect.anything()]]);
    userPointer("pointermove", 30, { timeStamp: 210 });
    userPointer("pointermove", 30, { timeStamp: 210 }); // the same time: velocity isn't changed
    expect(onStart).toBeCalledTimes(1);
    expect(onMove.mock.calls[2][0]).toBe(30);
    userPointer("pointerup", 30, { timeStamp: 300 });
    expect(onEnd).toBeCalledTimes(1);
    expect(onEnd.mock.calls[0].slice(0, 2)).toEqual([30, -2]); // -20px per 10ms
    expect(onEnd.mock.calls[0][2].type).toBe("pointerup");

    // listeners of the gesture are removed
    userPointer("pointermove", 100, { timeStamp: 400 });
    userPointer("pointerup", 100, { timeStamp: 500 });
    expect(onMove).toBeCalledTimes(3);
    expect(onEnd).toBeCalledTimes(1);

    // pointercancel
    userSwipe([0, 50, 60], "pointercancel");
    expect(onEnd).toBeCalledTimes(2);
    expect(onEnd.mock.calls[1][2].type).toBe("pointercancel");

    // tap without swipe
    userSwipe([0, 5]);
    expect(onEnd).toBeCalledTimes(2);

    // vertical scroll
    userPointer("pointerdown", 0);
    userPointer("pointermove", 5, { y: 20, timeStamp: 100 });
    userPointer("pointermove", 100, { y: 20, timeStamp: 200 });
    userPointer("pointerup", 100, { y: 20, timeStamp: 300 });
    expect(onStart).toBeCalledTimes(2);
    expect(onEnd).toBeCalledTimes(2);

    // mouse & non-primary pointers are ignored
    userSwipe([0, 50, 100], "pointerup", { pointerType: "mouse" });
    userSwipe([0, 50, 100], "pointerup", { isPrimary: false });
    expect(onStart).toBeCalledTimes(2);

    remove();
    expect(el.style.touchAction).toBe("");
    userSwipe([0, 50, 100]);
    expect(onStart).toBeCalledTimes(2);
  });

  test("options", () => {
    const onEnd = jest.fn();
    const skip = jest.fn().mockReturnValue(true);
    onSwipe(el, { onEnd, skip, minDelta: 60 });
    userSwipe([0, 50, 100]);
    expect(skip).toBeCalledTimes(1);
    expect(onEnd).not.toBeCalled();

    skip.mockReturnValue(false);
    userSwipe([0, 50]);
    expect(onEnd).not.toBeCalled(); // less than minDelta
    userSwipe([0, 70]);
    expect(onEnd).toBeCalledTimes(1);

    // without callbacks
    onSwipe(el, {});
    userSwipe([0, 70]);
  });

  test("click after swipe is prevented", () => {
    const btn = el.appendChild(document.createElement("button"));
    const onClick = jest.fn();
    btn.addEventListener("click", onClick);
    const click = () => btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    onSwipe(el, {});

    userSwipe([0, 50]);
    expect(click()).toBe(false); // prevented
    expect(onClick).not.toBeCalled();
    click(); // once
    expect(onClick).toBeCalledTimes(1);

    // prevention is removed on the next tick when click isn't fired
    userSwipe([0, 50]);
    jest.advanceTimersByTime(1);
    click();
    expect(onClick).toBeCalledTimes(2);

    // not after pointercancel & tap
    userSwipe([0, 50], "pointercancel");
    click();
    userSwipe([0, 5]);
    click();
    expect(onClick).toBeCalledTimes(4);
  });
});
