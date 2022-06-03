import scrollIntoView from "web-ui-pack/helpers/scrollIntoView";
import { useFakeAnimation } from "../testHelper";

let step = 1;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let nextFrames = async (n = 1) => {};
/** @type HTMLElement */
let el;

// const vH = Math.max(document.documentElement.clientHeight, window.innerHeight);
// const vW = Math.max(document.documentElement.clientWidth, window.innerWidth);

const bodySize = {
  width: 400,
  height: 600,
};

const elRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  height: 50,
  width: 100,
  bottom: 50,
  right: 100,
};

const moveTo = (x, y) => {
  elRect.x = x;
  elRect.y = y;
  elRect.left = x;
  elRect.top = y;
  elRect.right = elRect.left + elRect.width;
  elRect.bottom = elRect.top + elRect.height;
  jest.advanceTimersByTime(1); // wait 1ms to clear cache
};

let isResolved = false;
/** @type {(opts: Parameters<scrollIntoView>['1'])=> Promise<void>} */
const scroll = (options) => {
  isResolved = false;
  const p = scrollIntoView(el, options);
  p.then(() => (isResolved = true));
  return p;
};

beforeEach(() => {
  jest.useFakeTimers();
  const a = useFakeAnimation();
  nextFrames = async (n = 1) => {
    for (let i = 0; i < n; ++i) {
      await a.nextFrame();
    }
  };
  step = a.step;

  jest.spyOn(document.documentElement, "scrollTop", "set").mockImplementation(() => 0);
  jest.spyOn(document.documentElement, "scrollLeft", "set").mockImplementation(() => 0);
  jest.spyOn(document.body, "scrollTop", "set").mockImplementation(() => 0);
  jest.spyOn(document.body, "scrollLeft", "set").mockImplementation(() => 0);

  jest.spyOn(document.body, "getBoundingClientRect").mockImplementation(() => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: bodySize.height,
    right: bodySize.width,
    ...bodySize,
    toJSON: () => "",
  }));
  jest.spyOn(document.body, "clientHeight", "get").mockImplementation(() => bodySize.height);
  jest.spyOn(document.body, "clientWidth", "get").mockImplementation(() => bodySize.width);

  el = document.body.appendChild(document.createElement("div"));
  el.append("some text");
  jest.spyOn(el, "getBoundingClientRect").mockImplementation(() => ({
    ...elRect,
    toJSON: () => "",
  }));
  moveTo(0, 0);
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("helper.scrollIntoView", () => {
  test("no scroll parents", async () => {
    expect(bodySize.width > 0).toBeTruthy();
    expect(bodySize.height > 0).toBeTruthy();

    scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    await Promise.resolve();
    expect(isResolved).toBeTruthy();
  });

  test("without animation", async () => {
    jest.spyOn(document.body, "scrollTop", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollLeft", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollHeight", "get").mockImplementation(() => document.body.clientHeight + 10);

    // scroll little bit
    document.body.scrollTop = 4;
    expect(document.body.scrollTop).toBe(4);
    moveTo(0, -4);
    await scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    expect(document.body.scrollTop).toBe(0);
    expect(document.body.scrollLeft).toBe(0);

    document.body.scrollLeft = 10;
    expect(document.body.scrollLeft).toBe(10);
    moveTo(-10, 0);
    await scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    expect(document.body.scrollTop).toBe(0);
    expect(document.body.scrollLeft).toBe(0);

    document.body.scrollTop = 4;
    document.body.scrollLeft = 10;
    moveTo(-10, -4);
    await scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    expect(document.body.scrollTop).toBe(0);
    expect(document.body.scrollLeft).toBe(0);
  });

  test("with animation", async () => {
    jest.spyOn(document.body, "scrollTop", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollLeft", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollHeight", "get").mockImplementation(() => document.body.clientHeight + 10);

    // scroll little bit
    document.body.scrollTop = 4;
    expect(document.body.scrollTop).toBe(4);
    moveTo(0, -4);
    scroll({ smoothMs: step * 2, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    await nextFrames();
    expect(isResolved).toBeFalsy();
    await nextFrames(3);
    expect(isResolved).toBeTruthy();
    expect(document.body.scrollTop).toBe(0);
    expect(document.body.scrollLeft).toBe(0);

    document.body.scrollLeft = 10;
    expect(document.body.scrollLeft).toBe(10);
    moveTo(-10, 0);
    scroll({ smoothMs: step * 2, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    await nextFrames(4);
    expect(document.body.scrollTop).toBe(0);
    expect(document.body.scrollLeft).toBe(0);

    document.body.scrollTop = 4;
    document.body.scrollLeft = 10;
    moveTo(-10, -4);
    scroll({ smoothMs: step * 2, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    await nextFrames(4);
    expect(document.body.scrollTop).toBe(0);
    expect(document.body.scrollLeft).toBe(0);
  });

  test("options.offset", async () => {
    jest.spyOn(document.body, "scrollTop", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollLeft", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollHeight", "get").mockImplementation(() => document.body.clientHeight + 10);

    document.body.scrollTop = 10;
    document.body.scrollLeft = 4;
    await scroll({ smoothMs: 0, offsetTop: -10, offsetLeft: 0, onlyIfNeeded: false });
    expect(document.body.scrollTop).toBe(0);
    expect(document.body.scrollLeft).toBe(4);

    document.body.scrollTop = 10;
    document.body.scrollLeft = 4;
    await scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: -4, onlyIfNeeded: false });
    expect(document.body.scrollTop).toBe(10);
    expect(document.body.scrollLeft).toBe(0);

    document.body.scrollTop = 10;
    document.body.scrollLeft = 10;
    await scroll({ smoothMs: 0, offsetTop: -4, offsetLeft: -2, onlyIfNeeded: false });
    expect(document.body.scrollTop).toBe(6);
    expect(document.body.scrollLeft).toBe(8);
  });

  test("options.onlyIfNeeded", async () => {
    jest.spyOn(document.body, "scrollTop", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollLeft", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollHeight", "get").mockImplementation(() => document.body.clientHeight + 10);

    moveTo(0, -4);
    document.body.scrollTop = 10;
    await scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    expect(document.body.scrollTop).toBe(6);

    moveTo(0, 0);
    document.body.scrollTop = 10;
    await scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: true });
    expect(document.body.scrollTop).toBe(10);

    moveTo(15, 15);
    document.body.scrollTop = 7;
    await scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: true });
    expect(document.body.scrollTop).toBe(7);

    moveTo(15, 15);
    document.body.scrollTop = 7;
    await scroll({ smoothMs: 0, offsetTop: 0, offsetLeft: 0, onlyIfNeeded: false });
    expect(document.body.scrollTop).toBe(22);
  });

  test("options undefined", async () => {
    jest.spyOn(document.body, "scrollTop", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollLeft", "set").mockRestore(); // make body scrollable
    jest.spyOn(document.body, "scrollHeight", "get").mockImplementation(() => document.body.clientHeight + 10);

    document.body.scrollTop = 10;
    document.body.scrollLeft = 8;
    await scroll({ smoothMs: undefined, offsetTop: undefined, offsetLeft: undefined, onlyIfNeeded: undefined });
    expect(document.body.scrollTop).toBe(10);
    expect(document.body.scrollLeft).toBe(8);

    await scroll({ smoothMs: null, offsetTop: null, offsetLeft: null, onlyIfNeeded: null });
    expect(document.body.scrollTop).toBe(10);
    expect(document.body.scrollLeft).toBe(8);

    await scroll({ smoothMs: 0 });
    expect(document.body.scrollTop).toBe(0); // because we have default offsetTop/Left
    expect(document.body.scrollLeft).toBe(0);
  });
});
