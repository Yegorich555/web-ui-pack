import { animateDropdown } from "web-ui-pack/helpers/animate";
import { useFakeAnimation } from "../../testHelper";

let step = 1;
let nextFrame = async () => {};
/** @type HTMLElement */
let el;

beforeEach(() => {
  jest.useFakeTimers();
  const a = useFakeAnimation();
  nextFrame = a.nextFrame;
  step = a.step;

  el = document.body.appendChild(document.createElement("ul"));
  const ul = el.appendChild(document.createElement("ul"));
  const li = ul.appendChild(document.createElement("li"));
  li.textContent = "Some text here";
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("helper.animateDropdown", () => {
  test("ordinary open/hide with 1 children", async () => {
    let p = animateDropdown(el, step * 3, false);
    let isResolved = false;
    p.then(() => (isResolved = true)).catch(() => null);

    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul><li>Some text here</li></ul></ul>"`
    );
    // open
    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0);"><ul><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.33333333333333337);"><ul style="transform: scaleY(2.9999999999999996) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666666);"><ul style="transform: scaleY(1.5) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul>"`
    );

    // close
    isResolved = false;
    p = animateDropdown(el, step * 3, true);
    p.then(() => (isResolved = true)).catch(() => null);
    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(1);"><ul style="transform: scaleY(1) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666669);"><ul style="transform: scaleY(1.4999999999999996) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.33333333333333337);"><ul style="transform: scaleY(2.9999999999999996) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul>"`
    );

    // try open again
    isResolved = false;
    p = animateDropdown(el, step * 3); // isHidden doesn't required
    p.then(() => (isResolved = true)).catch(() => null);
    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0);"><ul style=""><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.3333333333333337);"><ul style="transform: scaleY(2.999999999999997) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666669);"><ul style="transform: scaleY(1.4999999999999996) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul>"`
    );

    // try close again
    isResolved = false;
    p = animateDropdown(el, step * 3, true);
    p.then(() => (isResolved = true));
    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(1);"><ul style="transform: scaleY(1) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666669);"><ul style="transform: scaleY(1.4999999999999996) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.33333333333333315);"><ul style="transform: scaleY(3.0000000000000018) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul>"`
    );
  });

  test("open > partial wait > hide", async () => {
    // open
    let p = animateDropdown(el, step * 3, false);
    let isResolvedOpen = false;
    p.then((v) => (isResolvedOpen = v)).catch(() => null);

    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0);"><ul><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.33333333333333337);"><ul style="transform: scaleY(2.9999999999999996) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666666);"><ul style="transform: scaleY(1.5) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    // close
    p.stop(false);
    let isResolvedClose = false;
    p = animateDropdown(el, step * 3, true);
    p.then((v) => (isResolvedClose = v)).catch(() => null);

    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(isResolvedClose).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666666);"><ul style="transform: scaleY(1.5) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(isResolvedClose).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.3333333333333332);"><ul style="transform: scaleY(3.0000000000000013) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    // open
    p.stop(false);
    p = animateDropdown(el, step * 3, false);
    let isResolvedOpen2 = false;
    p.then(() => (isResolvedOpen2 = true)).catch(() => null);
    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(isResolvedOpen2).toBe(false);
    expect(isResolvedClose).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.3333333333333332);"><ul style="transform: scaleY(3.0000000000000013) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(isResolvedOpen2).toBe(false);
    expect(isResolvedClose).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666666);"><ul style="transform: scaleY(1.5) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    await nextFrame();
    expect(isResolvedOpen).toBe(false);
    expect(isResolvedOpen2).toBe(true);
    expect(isResolvedClose).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul>"`
    );
  });

  test("open > hide for many in parallel", async () => {
    animateDropdown(el, step * 3, false);
    await nextFrame();
    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.33333333333333337);"><ul style="transform: scaleY(2.9999999999999996) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );

    const div = document.body.appendChild(document.createElement("div"));
    animateDropdown(div, step * 3, false);
    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666666);"><ul style="transform: scaleY(1.5) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul><div style="animation-name: none; transform-origin: top; transform: scaleY(0);"></div>"`
    );
    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul><div style="animation-name: none; transform-origin: top; transform: scaleY(0.3333333333333334);"></div>"`
    );
    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul><div style="animation-name: none; transform-origin: top; transform: scaleY(0.6666666666666669);"></div>"`
    );
    await nextFrame();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul><div style="animation-name: none;"></div>"`
    );
  });

  test("open animate when attr[position]='top'", async () => {
    el.setAttribute("position", "top");
    animateDropdown(el, step * 2, false);

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul position="top" style="animation-name: none; transform-origin: bottom; transform: scaleY(0);"><ul><li>Some text here</li></ul></ul>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul position="top" style="animation-name: none; transform-origin: bottom; transform: scaleY(0.5);"><ul style="transform: scaleY(2) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul position="top" style="animation-name: none; transform-origin: bottom; transform: scaleY(0.9999999999999998);"><ul style="transform: scaleY(1.0000000000000002) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul position="top" style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul>"`
    );
  });

  test("affect on style.transform", async () => {
    el.style.transform = "translate(-50%,-50%)";
    animateDropdown(el, step * 2, false);

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="transform: translate(-50%,-50%) scaleY(0); animation-name: none; transform-origin: top;"><ul><li>Some text here</li></ul></ul>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="transform: translate(-50%,-50%) scaleY(0.5); animation-name: none; transform-origin: top;"><ul style="transform: scaleY(2) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="transform: translate(-50%,-50%) scaleY(0.9999999999999998); animation-name: none; transform-origin: top;"><ul style="transform: scaleY(1.0000000000000002) translateZ(0px); transform-origin: bottom;"><li>Some text here</li></ul></ul>"`
    );
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="transform: translate(-50%,-50%); animation-name: none;"><ul style=""><li>Some text here</li></ul></ul>"`
    );
    expect(el.style.transform).toBe("translate(-50%,-50%)");
  });

  test("el removed during the animation", async () => {
    const spyThen = jest.fn();
    const p = animateDropdown(el, step * 2, false);
    p.then(spyThen).catch(() => null);

    await nextFrame();
    await nextFrame();
    el.remove();
    await nextFrame();
    expect(spyThen).lastCalledWith(false);
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul style=""><li>Some text here</li></ul></ul>"`
    );
  });

  test("stop animation", async () => {
    const spyThen = jest.fn();
    let p = animateDropdown(el, step * 2, false);
    p.then(spyThen).catch(() => null);

    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0);"><ul><li>Some text here</li></ul></ul>"`
    );
    p.stop();
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none;"><ul><li>Some text here</li></ul></ul>"`
    );
    expect(spyThen).toBeCalled();

    spyThen.mockClear();
    p = animateDropdown(el, step * 2, false);
    p.then(spyThen).catch(() => null);
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0);"><ul><li>Some text here</li></ul></ul>"`
    );
    p.stop(false);
    await nextFrame();
    await nextFrame();
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<ul style="animation-name: none; transform-origin: top; transform: scaleY(0);"><ul><li>Some text here</li></ul></ul>"`
    );
    expect(spyThen).lastCalledWith(false);
  });

  test("options timeMs is 0", async () => {
    const p = animateDropdown(el, 0, false);
    let isResolved = false;
    p.then(() => (isResolved = true));
    await nextFrame();
    expect(p.stop).toBeDefined();
    expect(() => p.stop()).not.toThrow();
    expect(isResolved).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(`"<ul><ul><li>Some text here</li></ul></ul>"`);
  });
});
