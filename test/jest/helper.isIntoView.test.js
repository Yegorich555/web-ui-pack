import isIntoView from "web-ui-pack/helpers/isIntoView";

const vH = Math.max(document.documentElement.clientHeight, window.innerHeight);
const vW = Math.max(document.documentElement.clientWidth, window.innerWidth);

const bodySize = {
  width: vW,
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
};

/** @type HTMLElement */
let el;

beforeEach(() => {
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
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": true,
      }
    `);

    // move el to body > main > el
    const main = document.body.appendChild(document.createElement("main"));
    main.appendChild(el);
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": true,
      }
    `);
  });

  test("body as scrolled parent", () => {
    // simulate scrollHeight
    jest.spyOn(document.body, "scrollHeight", "get").mockImplementation(() => bodySize.height + 74);
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      const o = orig(elem);
      if (elem === document.body) {
        o.overflowY = "auto";
      }
      return o;
    });

    moveTo(10, 10); // full visible
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": true,
      }
    `);

    moveTo(10, 10); // partial visible because of offset
    expect(isIntoView(el, { offset: [20, 20] })).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": true,
        "partialHiddenY": true,
        "partialVisible": true,
        "visible": false,
      }
    `);

    moveTo(0, -elRect.height / 2); // partialHiddenY
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": true,
        "partialVisible": true,
        "visible": false,
      }
    `);

    moveTo(-elRect.width / 2, 0); // partialHiddenX
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": true,
        "partialHiddenY": false,
        "partialVisible": true,
        "visible": false,
      }
    `);

    moveTo(-elRect.width / 2, -elRect.height / 2); // partialHiddenX and Y
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": true,
        "partialHiddenY": true,
        "partialVisible": true,
        "visible": false,
      }
    `);

    moveTo(-elRect.width / 2, -elRect.height); // fullHiddenY and partialHiddenY
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": true,
        "hiddenX": false,
        "hiddenY": true,
        "partialHiddenX": true,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": false,
      }
    `);

    moveTo(-elRect.width, -elRect.height / 2); // fullHiddenX and partialHiddenX
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": true,
        "hiddenX": true,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": true,
        "partialVisible": false,
        "visible": false,
      }
    `);

    moveTo(-elRect.width, -elRect.height); // fullHiddenX and fullHiddenY
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": true,
        "hiddenX": true,
        "hiddenY": true,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": false,
      }
    `);

    moveTo(0, bodySize.height + elRect.height / 2); // partialHiddenY at bottom
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": true,
        "hiddenX": false,
        "hiddenY": true,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": false,
      }
    `);

    moveTo(0, bodySize.height + elRect.height); // fullHiddenY at bottom
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": true,
        "hiddenX": false,
        "hiddenY": true,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": false,
      }
    `);

    moveTo(bodySize.width + elRect.width / 2, 0); // partialHiddenX at right
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": true,
        "hiddenX": true,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": false,
      }
    `);

    moveTo(bodySize.width + elRect.width, 0); // fullHiddenX at right
    expect(isIntoView(el)).toMatchInlineSnapshot(`
      Object {
        "hidden": true,
        "hiddenX": true,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": false,
      }
    `);
  });

  test("option [childRect]", () => {
    moveTo(0, 0);
    expect(isIntoView(el, { childRect: el.getBoundingClientRect() })).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": true,
      }
    `);
  });

  test("option [scrollParents]", () => {
    moveTo(0, 0);
    expect(isIntoView(el, { scrollParents: [document.body] })).toMatchInlineSnapshot(`
      Object {
        "hidden": false,
        "hiddenX": false,
        "hiddenY": false,
        "partialHiddenX": false,
        "partialHiddenY": false,
        "partialVisible": false,
        "visible": true,
      }
    `);
  });
});
