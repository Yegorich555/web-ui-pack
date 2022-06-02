import isIntoView from "web-ui-pack/helpers/isIntoView";

const vH = Math.max(document.documentElement.clientHeight, window.innerHeight);
const vW = Math.max(document.documentElement.clientWidth, window.innerWidth);

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

jest.useFakeTimers();

const moveTo = (x, y) => {
  elRect.x = x;
  elRect.y = y;
  elRect.left = x;
  elRect.top = y;
  elRect.right = elRect.left + elRect.width;
  elRect.bottom = elRect.top + elRect.height;
  jest.advanceTimersByTime(1); // wait 1ms to clear cache
};

/** @type HTMLElement */
let el;

beforeEach(() => {
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
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("helper.isIntoView", () => {
  test("no scroll parents", () => {
    expect(bodySize.width > 0).toBeTruthy();
    expect(bodySize.height > 0).toBeTruthy();
    moveTo(0, 0);
    expect(isIntoView(el)).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: true,
    });

    // move el to body > main > el
    const main = document.body.appendChild(document.createElement("main"));
    main.appendChild(el);
    jest.spyOn(main, "scrollTop", "set").mockImplementation(() => 0);
    jest.spyOn(main, "scrollLeft", "set").mockImplementation(() => 0);
    expect(isIntoView(el)).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: true,
    });
  });

  test("body as scrolled parent", () => {
    // simulate scrollHeight
    jest.spyOn(document.body, "scrollTop", "set").mockRestore();

    moveTo(10, 10); // full visible
    expect(isIntoView(el)).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: true,
    });

    moveTo(10, 10); // full visible
    expect(isIntoView(el, { offset: [20, 20] })).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: document.documentElement,
      partialHiddenY: document.documentElement,
      partialVisible: document.documentElement,
      visible: false,
    });

    moveTo(0, -elRect.height / 2); // partialHiddenY
    expect(isIntoView(el)).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: document.documentElement,
      partialVisible: document.documentElement,
      visible: false,
    });

    moveTo(-elRect.width / 2, 0); // partialHiddenX
    expect(isIntoView(el)).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: document.documentElement,
      partialHiddenY: false,
      partialVisible: document.documentElement,
      visible: false,
    });

    moveTo(-elRect.width / 2, -elRect.height / 2); // partialHiddenX and Y
    expect(isIntoView(el)).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: document.documentElement,
      partialHiddenY: document.documentElement,
      partialVisible: document.documentElement,
      visible: false,
    });

    moveTo(-elRect.width / 2, -elRect.height); // fullHiddenY and partialHiddenY
    expect(isIntoView(el)).toEqual({
      hidden: document.body,
      hiddenX: false,
      hiddenY: document.body,
      partialHiddenX: document.documentElement,
      partialHiddenY: false,
      partialVisible: false,
      visible: false,
    });

    moveTo(-elRect.width, -elRect.height / 2); // fullHiddenX and partialHiddenX
    expect(isIntoView(el)).toEqual({
      hidden: document.body,
      hiddenX: document.body,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: document.documentElement,
      partialVisible: false,
      visible: false,
    });

    moveTo(-elRect.width, -elRect.height); // fullHiddenX and fullHiddenY
    expect(isIntoView(el)).toEqual({
      hidden: document.body,
      hiddenX: document.body,
      hiddenY: document.body,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: false,
    });

    moveTo(0, bodySize.height + elRect.height / 2); // partialHiddenY at bottom
    expect(isIntoView(el)).toEqual({
      hidden: document.body,
      hiddenX: false,
      hiddenY: document.body,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: false,
    });

    moveTo(0, bodySize.height + elRect.height); // fullHiddenY at bottom
    expect(isIntoView(el)).toEqual({
      hidden: document.body,
      hiddenX: false,
      hiddenY: document.body,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: false,
    });

    moveTo(bodySize.width + elRect.width / 2, 0); // partialHiddenX at right
    expect(isIntoView(el)).toEqual({
      hidden: document.body,
      hiddenX: document.body,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: false,
    });

    moveTo(bodySize.width + elRect.width, 0); // fullHiddenX at right
    expect(isIntoView(el)).toEqual({
      hidden: document.body,
      hiddenX: document.body,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: false,
    });

    moveTo(0, vH + 1); // hiddenY in viewport
    expect(isIntoView(el)).toEqual({
      hidden: document.documentElement,
      hiddenX: false,
      hiddenY: document.documentElement,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: false,
    });

    moveTo(vW + 1, 0); // hiddenX in viewport
    expect(isIntoView(el)).toEqual({
      hidden: document.documentElement,
      hiddenX: document.documentElement,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: false,
    });

    expect(vH).toBeGreaterThan(bodySize.height);
    moveTo(0, bodySize.height - 10); // partialHiddenY in body
    expect(isIntoView(el)).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: document.body,
      partialVisible: document.body,
      visible: false,
    });

    expect(vW).toBeGreaterThan(bodySize.width);
    moveTo(bodySize.width - 10, 0); // partialHiddenX in body
    expect(isIntoView(el)).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: document.body,
      partialHiddenY: false,
      partialVisible: document.body,
      visible: false,
    });
  });

  test("option [elRect]", () => {
    moveTo(0, 0);
    expect(isIntoView(el, { elRect: el.getBoundingClientRect() })).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: true,
    });
  });

  test("option [scrollParents]", () => {
    moveTo(0, 0);
    expect(isIntoView(el, { scrollParents: [document.body] })).toEqual({
      hidden: false,
      hiddenX: false,
      hiddenY: false,
      partialHiddenX: false,
      partialHiddenY: false,
      partialVisible: false,
      visible: true,
    });
  });
});
