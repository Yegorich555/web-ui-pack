import { animate } from "web-ui-pack/helpers/animate";
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

describe("helper.animate", () => {
  test("ordinary animation", async () => {
    const spy = jest.fn();
    const spyThen = jest.fn();
    animate(0, 100, Math.round(step * 2 - 0.5), spy).then(spyThen);

    expect(spy).not.toBeCalled();
    await nextFrame();
    expect(spy.mock.lastCall).toMatchInlineSnapshot(`
      [
        0,
        0,
        false,
        16.666666666666668,
      ]
    `);
    expect(spyThen).not.toBeCalled();

    await nextFrame();
    expect(spy.mock.lastCall).toMatchInlineSnapshot(`
      [
        50.505050505050505,
        16.666666666666668,
        false,
        33.333333333333336,
      ]
    `);

    await nextFrame();
    expect(spy.mock.lastCall).toMatchInlineSnapshot(`
      [
        100,
        33,
        true,
        50,
      ]
    `);
    expect(spyThen).toBeCalledTimes(1);
  });

  test("stop()", async () => {
    const spy = jest.fn();
    const spyThen = jest.fn();
    const spyThenStop = jest.fn();
    let p = animate(0, 100, step * 2, spy);
    p.then(spyThen);

    // stop immediately after animation runned
    p.stop().then(spyThenStop);
    expect(spy).not.toBeCalled();
    expect(spyThen).not.toBeCalled();
    await nextFrame();
    expect(spy.mock.lastCall).toMatchInlineSnapshot(`
      [
        100,
        0,
        true,
        16.666666666666668,
      ]
    `);
    expect(spyThen).toBeCalledTimes(1);
    expect(spyThenStop).toBeCalledTimes(1);

    // stop with rejection immediately after animation runned
    spy.mockClear();
    spyThen.mockClear();
    spyThenStop.mockClear();
    const spyCatch = jest.fn();
    p = animate(0, 100, step * 2, spy);
    p.then(spyThen).catch(spyCatch);

    p.stop(false).then(spyThenStop);
    expect(spy).not.toBeCalled();
    expect(spyThen).not.toBeCalled();
    await nextFrame();
    expect(spy).not.toBeCalled();
    expect(spyThen).not.toBeCalled();
    expect(spyCatch).toBeCalledTimes(1);
    expect(spyThenStop).toBeCalledTimes(1);
  });

  test("option [force]", async () => {
    const spy = jest.fn();
    const spyThen = jest.fn();

    // without force when ms < 10
    animate(0, 100, -5, spy).then(spyThen);
    await nextFrame();
    expect(spyThen).toBeCalledTimes(1);
    expect(spy.mock.lastCall).toMatchInlineSnapshot(`
      [
        100,
        -5,
        true,
        16.666666666666668,
      ]
    `);

    // simulate 'prefers-reduced-motion'
    let force = false;
    spy.mockClear();
    spyThen.mockClear();
    jest.spyOn(window, "matchMedia").mockReturnValueOnce({ matches: true });
    animate(0, 100, Math.round(step * 2 - 0.5), spy, force).then(spyThen);
    await nextFrame();
    expect(spyThen).toBeCalledTimes(1);
    expect(spy.mock.lastCall).toMatchInlineSnapshot(`
      [
        100,
        0,
        true,
        33.333333333333336,
      ]
    `);

    // with option force
    force = true;
    spy.mockClear();
    spyThen.mockClear();
    jest.spyOn(window, "matchMedia").mockReturnValueOnce({ matches: true });
    animate(0, 100, Math.round(step * 2 - 0.5), spy, force).then(spyThen);
    await nextFrame();
    expect(spyThen).not.toBeCalled();
    expect(spy.mock.lastCall).toMatchInlineSnapshot(`
      [
        0,
        0,
        false,
        50,
      ]
    `);
    await nextFrame(2);
    expect(spyThen).toBeCalled();
    expect(spy.mock.lastCall).toMatchInlineSnapshot(`
      [
        100,
        33,
        true,
        83.33333333333334,
      ]
    `);
  });
});
