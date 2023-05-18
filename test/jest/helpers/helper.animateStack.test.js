import animateStack from "web-ui-pack/helpers/animateStack";
import { useFakeAnimation, setupLayout } from "../../testHelper";

let step = 1;
let nextFrame = async () => {};
/** @type HTMLElement */
let el;
let anim = (opts = { isHide: false, isVertical: true }) => animateStack(...opts);

const btnSize = { h: 20, w: 50 };

beforeEach(() => {
  jest.useFakeTimers();
  const a = useFakeAnimation();
  nextFrame = a.nextFrame;
  step = a.step;

  el = document.body.appendChild(document.createElement("div"));
  const btn = el.appendChild(document.createElement("button"));
  const ul = el.appendChild(document.createElement("ul"));
  ul.appendChild(document.createElement("li")).textContent = "Item 1";
  ul.appendChild(document.createElement("li")).textContent = "Item 2";
  const ms = step * 3;
  anim = (opts) => animateStack(btn, ul.children, ms, opts.isHide, opts.isVertical);

  btn.style.zIndex = 5;
  setupLayout(btn, { x: 0, y: 0, ...btnSize });
  // vertical with 6px margin by default
  setupLayout(ul.children[0], { x: 0, y: btnSize.h + 6, ...btnSize });
  setupLayout(ul.children[1], { x: 0, y: (btnSize.h + 6) * 2, ...btnSize });
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("helper.animateDropdown", () => {
  test("ordinary open/hide with 2 children", async () => {
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul><li>Item 1</li><li>Item 2</li></ul></div>"`
    );
    let p = anim({ isHide: false, isVertical: true });
    let isResolved = false;
    p.then(() => (isResolved = true)).catch(() => null);

    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transform: translateY(-26px);">Item 1</li><li style="transform: translateY(-52px);">Item 2</li></ul></div>"`
    );
    // open
    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out;">Item 1</li><li style="transition: transform 50ms ease-out;">Item 2</li></ul></div>"`
    );

    await nextFrame(5);
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );

    // close
    isResolved = false;
    p = anim({ isHide: true, isVertical: true });
    p.then(() => (isResolved = true)).catch(() => null);
    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out; transform: translateY(-26px);">Item 1</li><li style="transition: transform 50ms ease-out; transform: translateY(-52px);">Item 2</li></ul></div>"`
    );

    await nextFrame(5);
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );

    // open again
    isResolved = false;
    p = animateStack(document.querySelector("button"), document.querySelector("ul").children, step * 3);
    p.then(() => (isResolved = true)).catch(() => null);
    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out;">Item 1</li><li style="transition: transform 50ms ease-out;">Item 2</li></ul></div>"`
    );

    await nextFrame(5);
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );

    // close again
    isResolved = false;
    p = animateStack(document.querySelector("button"), document.querySelector("ul").children, step * 3, true);
    p.then(() => (isResolved = true));
    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out; transform: translateY(-26px);">Item 1</li><li style="transition: transform 50ms ease-out; transform: translateY(-52px);">Item 2</li></ul></div>"`
    );

    await nextFrame(5);
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );
  });

  test("open > partial wait > hide", async () => {
    // open
    let p = anim({ isHide: false, isVertical: true });
    let isResolvedOpen = false;
    p.then((v) => (isResolvedOpen = v)).catch(() => null);
    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out;">Item 1</li><li style="transition: transform 50ms ease-out;">Item 2</li></ul></div>"`
    );

    // close
    p.stop(false);
    let isResolvedClose = false;
    p = anim({ isHide: true, isVertical: true });
    p.then((v) => (isResolvedClose = v)).catch(() => null);
    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(isResolvedClose).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out; transform: translateY(-26px);">Item 1</li><li style="transition: transform 50ms ease-out; transform: translateY(-52px);">Item 2</li></ul></div>"`
    );

    // open again
    p.stop(false);
    p = anim({ isHide: false, isVertical: true });
    let isResolvedOpen2 = false;
    p.then(() => (isResolvedOpen2 = true)).catch(() => null);
    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(isResolvedOpen2).toBe(false);
    expect(isResolvedClose).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out;">Item 1</li><li style="transition: transform 50ms ease-out;">Item 2</li></ul></div>"`
    );

    await nextFrame(5);
    expect(isResolvedOpen).toBe(false);
    expect(isResolvedOpen2).toBe(true);
    expect(isResolvedClose).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );
  });

  test("animate vertical", async () => {
    anim({ isHide: false, isVertical: true });
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out;">Item 1</li><li style="transition: transform 50ms ease-out;">Item 2</li></ul></div>"`
    );
    await nextFrame(5);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );

    anim({ isHide: true, isVertical: true });
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out; transform: translateY(-26px);">Item 1</li><li style="transition: transform 50ms ease-out; transform: translateY(-52px);">Item 2</li></ul></div>"`
    );
    await nextFrame(5);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );
  });

  test("animate horizontal", async () => {
    const ul = document.querySelector("ul");
    // horizontal with 6px margin by default
    setupLayout(ul.children[0], { x: btnSize.w + 6, y: 0, ...btnSize });
    setupLayout(ul.children[1], { x: (btnSize.w + 6) * 2, y: 0, ...btnSize });

    anim({ isHide: false, isVertical: false });
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out;">Item 1</li><li style="transition: transform 50ms ease-out;">Item 2</li></ul></div>"`
    );
    await nextFrame(5);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );

    anim({ isHide: true, isVertical: false });
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 4;"><li style="transition: transform 50ms ease-out; transform: translateX(-56px);">Item 1</li><li style="transition: transform 50ms ease-out; transform: translateX(-112px);">Item 2</li></ul></div>"`
    );
    await nextFrame(5);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul></div>"`
    );
  });

  test("options timeMs is 0", async () => {
    const p = animateStack(null, null, 0);
    let isResolved = false;
    p.then(() => (isResolved = true));
    await nextFrame();
    expect(p.stop).toBeDefined();
    expect(() => p.stop()).not.toThrow();
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<div><button style="z-index: 5;"></button><ul><li>Item 1</li><li>Item 2</li></ul></div>"`
    );
  });

  test("other specific cases", async () => {
    // zindex isn't number
    const btn = document.querySelector("button");
    btn.zIndex = "auto";
    jest.spyOn(window, "getComputedStyle").mockImplementationOnce(
      /** @type CSSStyleDeclaration */
      () => ({ zIndex: "auto" })
    );
    let p = Promise.resolve();
    expect(() => {
      p = anim({ isHide: false, isVertical: true });
    }).not.toThrow();
    expect(document.querySelector("ul").style.zIndex).toBe("0");

    // stop with clearing state
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<button style="z-index: 5;"></button><ul style="overflow: visible; z-index: 0;"><li style="transition: transform 50ms ease-out;">Item 1</li><li style="transition: transform 50ms ease-out;">Item 2</li></ul>"`
    );
    p.stop();
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<button style="z-index: 5;"></button><ul style=""><li style="">Item 1</li><li style="">Item 2</li></ul>"`
    );
  });
});
