import findScrollParent, { findScrollParentAll } from "web-ui-pack/helpers/findScrollParent";

afterEach(() => {
  document.body.innerHTML = "";
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

function lockScroll(el, opts = { x: true, y: true }) {
  const o = { x: true, y: true, ...opts };
  o.y && jest.spyOn(el, "scrollTop", "set").mockImplementation(() => 0);
  o.x && jest.spyOn(el, "scrollLeft", "set").mockImplementation(() => 0);
}

function unLockScroll(el) {
  jest.spyOn(el, "scrollTop", "set").mockRestore();
  jest.spyOn(el, "scrollLeft", "set").mockRestore();
}

beforeEach(() => {
  // default scenario when no items places
  lockScroll(document.body);
  lockScroll(document.body.parentElement);
});

describe("helper.findScrollParent", () => {
  test("default behavior", () => {
    jest.useFakeTimers();

    const el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParent(el)).toBeNull();
    expect(findScrollParent(document.body)).toBeNull();

    jest.restoreAllMocks(); // to allow change scrollTop for body
    let { scrollTop } = document.body;
    let isStopped = false;
    jest.spyOn(document.body, "scrollTop", "set").mockImplementation((v) => {
      scrollTop = v;
      // simulate default behavior
      const ev = new Event("scroll", { bubbles: true, cancelable: true });
      ev.stopImmediatePropagation = () => {
        isStopped = true;
      };
      document.body.dispatchEvent(ev);
    });
    jest.spyOn(document.body, "scrollTop", "get").mockImplementation(() => scrollTop);
    expect(findScrollParent(el) === document.body).toBe(true);
    expect(isStopped).toBe(true);
    jest.advanceTimersByTime(10);
    jest.restoreAllMocks(); // to allow change scrollTop for body

    // again with scrollLeft
    let { scrollLeft } = document.body;
    isStopped = false;
    jest.spyOn(document.body, "scrollTop", "get").mockImplementation(() => 0);
    jest.spyOn(document.body, "scrollLeft", "set").mockImplementation((v) => {
      scrollLeft = v;
      // simulate default behavior
      const ev = new Event("scroll", { bubbles: true, cancelable: true });
      ev.stopImmediatePropagation = () => {
        isStopped = true;
      };
      document.body.dispatchEvent(ev);
    });
    jest.spyOn(document.body, "scrollLeft", "get").mockImplementation(() => scrollLeft);
    expect(findScrollParent(el) === document.body).toBe(true);
    expect(isStopped).toBe(true);
    jest.advanceTimersByTime(10);
    jest.restoreAllMocks();
    unLockScroll(document.body); // WARN: jest-bug: previous restoreAllMocks doesn't restore all actually

    document.body.scrollTop = 0;
    document.body.scrollLeft = 2; // cover case when item is scrolled
    expect(findScrollParent(el) === document.body).toBe(true);
    document.body.scrollLeft = 0;

    lockScroll(document.body, { x: false });
    expect(findScrollParent(el) === document.body).toBe(true); // because scrollLeft possible

    // when component with fixed position
    jest.restoreAllMocks(); // to allow change scroll
    document.body.innerHTML = `
      <main>
        <div></div>
      </main>
    `;
    const main = document.body.querySelector("main");
    const div = document.body.querySelector("div");
    expect(findScrollParent(div)?.tagName.toLowerCase()).toBe("main");

    main.style.position = "fixed";
    expect(findScrollParent(div)?.tagName.toLowerCase()).toBe("main");

    lockScroll(main);
    expect(findScrollParent(div)?.tagName.toLowerCase()).toBeFalsy(); // despite body is scrollable but main with fixed position

    // again when position-fixed added via classNames
    main.style.position = "";
    // simulate defaults
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === main) {
        /** @type CSSStyleDeclaration */
        return { position: "fixed" };
      }
      return orig(elem);
    });
    expect(findScrollParent(div)?.tagName.toLowerCase()).toBeFalsy(); // despite body is scrollable but main with fixed position
  });

  test("helper.findScrollParentAll", () => {
    let el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParentAll(el)).toBeNull();
    expect(findScrollParentAll(document.body)).toBeNull();

    unLockScroll(document.body);
    expect(findScrollParentAll(el)).toEqual([document.body]);

    // move element to nested
    document.body.innerHTML = `
      <main>
        <div></div>
      </main>
    `;
    const main = document.body.querySelector("main");
    el = document.body.querySelector("div");
    expect(findScrollParentAll(el).map((a) => a.tagName.toLowerCase())).toEqual(["main", "body"]); // because scrollTop possible now
    // check when main without scroll
    lockScroll(main);
    expect(findScrollParentAll(el).map((a) => a.tagName.toLowerCase())).toEqual(["body"]);

    unLockScroll(main);
    lockScroll(main, { x: false }); // for checking scrollLeft
    expect(findScrollParentAll(el).map((a) => a.tagName.toLowerCase())).toEqual(["main", "body"]); // in reality it's impossible but for simlation it's ok

    // when component with fixed position
    main.style.position = "fixed";
    expect(findScrollParentAll(el).map((a) => a.tagName.toLowerCase())).toEqual(["main"]);
  });
});
