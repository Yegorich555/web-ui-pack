import { WUPNotifyElement } from "web-ui-pack";
import * as h from "../testHelper";

/** @type WUPNotifyElement */
let el;

/** Web-Animations API isn't implemented in JSDOM: mock it & store created animations */
const animations = [];
Element.prototype.animate = function animateMock(keyframes, opts) {
  const anim = {
    el: this,
    keyframes,
    opts,
    playState: "idle",
    play: () => {
      anim.playState = "running";
    },
    pause: () => {
      anim.playState = "paused";
    },
    cancel: () => {
      anim.playState = "idle";
    },
  };
  animations.push(anim);
  return anim;
};

/** Re-init body with single notify-element & wait for opening (without waiting for `autoClose`)
 * @returns {WUPNotifyElement} */
async function initNotify(attrs = "", content = "Some text") {
  document.body.innerHTML = `<wup-notify ${attrs}>${content}</wup-notify>`;
  const a = document.body.firstElementChild;
  await h.wait(10);
  return a;
}

beforeEach(() => {
  WUPNotifyElement.$use();
  jest.useFakeTimers();
  animations.length = 0;
  jest.spyOn(document, "hasFocus").mockReturnValue(true); // simulate that window is focused
  jest.spyOn(WUPNotifyElement, "$uniqueId", "get").mockImplementation(() => "sID");
  el = document.body.appendChild(document.createElement("wup-notify"));
  el.textContent = "Some text";
  jest.advanceTimersToNextTimer(); // gotReady has timeout
  jest.spyOn(window, "matchMedia").mockReturnValue({ matches: true }); // simulate 'prefers-reduced-motion'
});

afterEach(() => {
  document.body.innerHTML = "";
  // eslint-disable-next-line jest/no-standalone-expect
  expect(WUPNotifyElement.prototype._openedItems).toHaveLength(0); // it's singleton: check for leaking between the tests
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("notifyElement", () => {
  h.baseTestComponent(() => document.createElement("wup-notify"), {
    attrs: {
      "w-placement": { value: "bottom-left" },
      "w-autoclose": { value: 3000 },
      "w-closeonclick": { value: true },
      "w-selfremove": { value: true },
      "w-opencase": { value: 0 },
    },
    // onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("open & close", async () => {
    // re-init
    document.body.innerHTML = `<wup-notify w-autoclose="0" w-selfremove="false">Some text</wup-notify>`;
    el = document.body.firstElementChild;
    // enable animation
    jest.spyOn(window, "matchMedia").mockRestore();
    h.setupCssCompute(el, { transitionDuration: "0.4s" });

    const onWillOpen = jest.fn();
    el.$onWillOpen = onWillOpen;
    const onOpen = jest.fn();
    el.$onOpen = onOpen;
    const onWillClose = jest.fn();
    el.$onWillClose = onWillClose;
    const onClose = jest.fn();
    el.$onClose = onClose;
    const thenOpen = jest.fn();
    const thenClose = jest.fn();

    expect(el.$isOpened).toBe(false);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosed).toBe(true);
    expect(el.$isClosing).toBe(false);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-notify w-autoclose="0" w-selfremove="false">Some text</wup-notify></body>"`
    );
    jest.advanceTimersToNextTimer(); // gotReady has timeout
    // start opening
    expect(el.$isOpened).toBe(true);
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(false);
    expect(el.$isOpening).toBe(true);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-notify w-autoclose="0" w-selfremove="false" open="" role="alert" w-placement="bottom-left"><button type="button" aria-label="close" wup-icon="" close=""></button>Some text</wup-notify></body>"`
    );
    el.$open().then(thenOpen); // despite on opening it shouldn't trigger open again but must return prev-saved promise
    await h.wait(1);
    expect(onWillOpen).toBeCalledTimes(1);
    expect(onWillOpen.mock.calls[0][0].detail.openCase).toBe(1); // NotifyOpenCases.onInit
    expect(onOpen).toBeCalledTimes(0);
    expect(onWillClose).toBeCalledTimes(0);
    expect(onClose).toBeCalledTimes(0);
    expect(thenOpen).toBeCalledTimes(0);
    // end opening: opened
    await h.wait();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-notify w-autoclose="0" w-selfremove="false" open="" role="alert" w-placement="bottom-left" show=""><button type="button" aria-label="close" wup-icon="" close=""></button>Some text</wup-notify></body>"`
    );
    expect(el.$isOpened).toBe(true);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(false);
    expect(onWillOpen).toBeCalledTimes(1);
    expect(onOpen).toBeCalledTimes(1);
    expect(onWillClose).toBeCalledTimes(0);
    expect(onClose).toBeCalledTimes(0);
    expect(thenOpen).toBeCalledTimes(1);

    // closing
    jest.clearAllMocks();
    el.$close().then(thenClose);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosing).toBe(true);
    expect(el.$isClosed).toBe(false);
    expect(el.$isOpened).toBe(true);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-notify w-autoclose="0" w-selfremove="false" open="" role="alert" w-placement="bottom-left"><button type="button" aria-label="close" wup-icon="" close=""></button>Some text</wup-notify></body>"`
    );
    await h.wait(1);
    expect(onWillOpen).toBeCalledTimes(0);
    expect(onOpen).toBeCalledTimes(0);
    expect(onWillClose).toBeCalledTimes(1);
    expect(onWillClose.mock.calls[0][0].detail.closeCase).toBe(0); // NotifyCloseCases.onManualCall
    expect(onClose).toBeCalledTimes(0);
    expect(thenClose).toBeCalledTimes(0);
    await h.wait();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-notify w-autoclose="0" w-selfremove="false" role="alert" w-placement="bottom-left"><button type="button" aria-label="close" wup-icon="" close=""></button>Some text</wup-notify></body>"`
    );
    expect(el.$isOpened).toBe(false);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosed).toBe(true);
    expect(el.$isClosing).toBe(false);
    expect(onWillOpen).toBeCalledTimes(0);
    expect(onOpen).toBeCalledTimes(0);
    expect(onWillClose).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);
    expect(thenClose).toBeCalledTimes(1);

    // open & close without animation
    jest.clearAllMocks();
    h.setupCssCompute(el, { transitionDuration: "0" }); // disable animation
    el.$open();
    await h.wait(10);
    expect(el.$isOpened).toBe(true);
    expect(el.$isOpening).toBe(false);
    expect(onWillOpen).toBeCalledTimes(1);
    expect(onOpen).toBeCalledTimes(1);
    expect(onWillClose).toBeCalledTimes(0);
    expect(onClose).toBeCalledTimes(0);

    jest.clearAllMocks();
    el.$close();
    await h.wait(10);
    expect(el.$isOpened).toBe(false);
    expect(el.$isClosed).toBe(true);
    expect(onWillOpen).toBeCalledTimes(0);
    expect(onOpen).toBeCalledTimes(0);
    expect(onWillClose).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(1);

    // prevent open & close
    jest.clearAllMocks();
    el.$onWillOpen = jest.fn().mockImplementationOnce((e) => e.preventDefault());
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);

    el.$onWillClose = jest.fn().mockImplementationOnce((e) => e.preventDefault());
    el.$close();
    await h.wait();
    expect(el.$isClosed).toBe(false);
    el.$close();
    await h.wait();
    expect(el.$isClosed).toBe(true);

    // open & close in short time
    jest.clearAllMocks();
    h.setupCssCompute(el, { transitionDuration: "0.4s" });
    el.$open();
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    thenClose.mockClear();
    el.$close().then(thenClose); // close when it's closed already
    await h.wait(1);
    expect(thenClose).toBeCalledTimes(1);
    el.$open();
    el.$close();
    el.$open(); // interrupt the closing
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(el._openedItems).toHaveLength(1); // no duplicates in the singleton-list
    el.$close();
    await h.wait(10);
    expect(el.$isClosing).toBe(true);
    thenClose.mockClear();
    el.$close().then(thenClose); // 2nd close must return the same promise
    await h.wait();
    expect(thenClose).toBeCalledTimes(1);

    // open & remove after without closing
    el.$open();
    await h.wait(1);
    expect(el.$isOpening).toBe(true);
    el.remove();
    expect(() => jest.advanceTimersByTime(1000)).not.toThrow();
    await h.wait();
    expect(el.$isClosed).toBe(true);

    // $open() when element isn't appended to document
    const el2 = document.createElement("wup-notify");
    const onRejected = jest.fn();
    el2.$open().catch(onRejected);
    await h.wait();
    expect(onRejected).toBeCalledTimes(1);
    expect(onRejected.mock.calls[0][0].message).toMatchInlineSnapshot(
      `"WUP-NOTIFY. Impossible to show: not appended to document"`
    );
    // $open() when element is appended but not ready yet
    document.body.appendChild(el2);
    el2.$options.openCase = 0; // NotifyOpenCases.onManualCall
    const thenOpen2 = jest.fn();
    el2.$open().then(thenOpen2);
    await h.wait();
    expect(el2.$isOpened).toBe(true);
    expect(thenOpen2).toBeCalledTimes(1);
  });

  test("render", async () => {
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(el.$refClose).toBeDefined();
    expect(el.$refProgress).toBeDefined();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-notify open="" role="alert" w-placement="bottom-left" show=""><button type="button" aria-label="close" wup-icon="" close=""></button>Some text<div progress="" role="progressbar"></div></wup-notify></body>"`
    );

    // no progress-bar when autoClose is disabled
    const el2 = await initNotify(`w-autoclose="0"`);
    expect(el2.$refProgress).toBeUndefined();
    expect(el2.outerHTML).toMatchInlineSnapshot(
      `"<wup-notify w-autoclose="0" open="" role="alert" w-placement="bottom-left" show=""><button type="button" aria-label="close" wup-icon="" close=""></button>Some text</wup-notify>"`
    );

    // refs must be re-used on re-opening
    const el3 = await initNotify(`w-selfremove="false"`);
    const { $refClose, $refProgress } = el3;
    el3.$close();
    await h.wait();
    el3.$open();
    await h.wait();
    expect(el3.$refClose).toBe($refClose);
    expect(el3.$refProgress).toBe($refProgress);
    expect(el3.querySelectorAll("[close]").length).toBe(1);
    expect(el3.querySelectorAll("[progress]").length).toBe(1);

    // placement is rendered as attribute
    const el4 = await initNotify(`w-placement="top-middle" w-autoclose="0"`);
    expect(el4.getAttribute("w-placement")).toBe("top-middle");
    expect(el4.getAttribute("role")).toBe("alert");
  });

  test("option: openCase", async () => {
    // openCase: onInit (default)
    expect(el.$options.openCase).toBe(1);
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // openCase: onManualCall
    const el2 = await initNotify(`w-opencase="0" w-autoclose="0" w-selfremove="false"`);
    expect(el2.$options.openCase).toBe(0);
    expect(el2.$isOpened).toBe(false);
    expect(el2.outerHTML).toMatchInlineSnapshot(
      `"<wup-notify w-opencase="0" w-autoclose="0" w-selfremove="false">Some text</wup-notify>"`
    );
    el2.$open();
    await h.wait();
    expect(el2.$isOpened).toBe(true);
    el2.$close();
    await h.wait();

    // changing option must open element again
    el2.$options.openCase = 1;
    await h.wait();
    expect(el2.$isOpened).toBe(true);
  });

  test("option: autoClose", async () => {
    // default: 5000ms
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(el.$isPlayed).toBe(true);
    expect(el.$isPaused).toBe(false);
    expect(animations.length).toBe(1);
    expect(animations[0].el).toBe(el.$refProgress);
    expect(animations[0].opts).toEqual({ fill: "forwards", duration: 4900 }); // -100ms for more native effect
    expect(animations[0].playState).toBe("running");

    const onWillClose = jest.fn();
    el.$onWillClose = onWillClose;
    await h.wait(3000);
    expect(el.$isOpened).toBe(true);
    await h.wait(2000);
    expect(el.$isOpened).toBe(false);
    expect(onWillClose).toBeCalledTimes(1);
    expect(onWillClose.mock.calls[0][0].detail.closeCase).toBe(2); // NotifyCloseCases.onTimeEnd
    expect(el.isConnected).toBe(false); // because selfRemove: true by default

    // autoClose: 0 - no progress & no closing by time
    const el2 = await initNotify(`w-autoclose="0" w-selfremove="false"`);
    expect(el2.$isPlayed).toBe(false);
    expect(el2.$refProgress).toBeUndefined();
    expect(el2.$pause()).toBe(-1); // -1 because nothing to pause
    await h.wait(100000);
    expect(el2.$isOpened).toBe(true);

    // custom time
    const el3 = await initNotify(`w-autoclose="300" w-selfremove="false"`);
    expect(el3.$isPlayed).toBe(true);
    await h.wait(200);
    expect(el3.$isOpened).toBe(true);
    await h.wait(200);
    expect(el3.$isOpened).toBe(false);
    expect(el3.isConnected).toBe(true); // because selfRemove: false
  });

  test("$pause & $play", async () => {
    const el2 = await initNotify(`w-autoclose="1000" w-selfremove="false"`);
    expect(el2.$isPlayed).toBe(true);
    const anim = animations[animations.length - 1];
    expect(anim.playState).toBe("running");
    const animCnt = animations.length;

    el2.$pause();
    el2.$play(1000); // restart with the known time (to don't depend on init-time)
    await h.wait(400);
    expect(el2.$pause()).toBe(600); // returns left time
    expect(el2.$isPlayed).toBe(false);
    expect(anim.playState).toBe("paused");
    expect(animations.length).toBe(animCnt); // no new animation: prev is re-used
    await h.wait(5000);
    expect(el2.$isOpened).toBe(true); // no closing because it's paused

    el2.$play(); // resume with stored time
    expect(el2.$isPlayed).toBe(true);
    expect(anim.playState).toBe("running");
    expect(animations.length).toBe(animCnt);
    await h.wait(500);
    expect(el2.$isOpened).toBe(true);
    await h.wait(200);
    expect(el2.$isOpened).toBe(false);

    // $play with custom time
    el2.$open();
    await h.wait(10);
    el2.$pause();
    el2.$play(2000);
    await h.wait(1500);
    expect(el2.$isOpened).toBe(true);
    await h.wait(600);
    expect(el2.$isOpened).toBe(false);

    // $play without stored time & when autoClose is disabled: closes immediately
    el2.$open();
    await h.wait(10);
    el2.$options.autoClose = 0;
    await h.wait(10);
    el2.$play(); // no stored left-time here: so takes it from $options.autoClose
    await h.wait(10);
    expect(el2.$isOpened).toBe(false);
  });

  test("option: pauseOnHover", async () => {
    const el2 = await initNotify(`w-autoclose="1000" w-selfremove="false"`);
    expect(el2.$isPlayed).toBe(true);
    // mouse hover
    el2.dispatchEvent(new MouseEvent("mouseenter"));
    expect(el2.$isPlayed).toBe(false);
    await h.wait(5000);
    expect(el2.$isOpened).toBe(true);
    el2.dispatchEvent(new MouseEvent("mouseleave"));
    expect(el2.$isPlayed).toBe(true);
    await h.wait(500);
    expect(el2.$isOpened).toBe(true);
    await h.wait(600);
    expect(el2.$isOpened).toBe(false);

    // touch: toggle pause/play
    const el3 = await initNotify(`w-autoclose="1000" w-selfremove="false"`);
    expect(el3.$isPlayed).toBe(true);
    el3.dispatchEvent(new Event("touchstart"));
    expect(el3.$isPlayed).toBe(false);
    await h.wait(5000);
    expect(el3.$isOpened).toBe(true);
    el3.dispatchEvent(new Event("touchstart"));
    expect(el3.$isPlayed).toBe(true);
    await h.wait(1100);
    expect(el3.$isOpened).toBe(false);

    // pauseOnHover: false
    document.body.innerHTML = "";
    const el4 = document.body.appendChild(document.createElement("wup-notify"));
    el4.$options.autoClose = 1000;
    el4.$options.selfRemove = false;
    el4.$options.pauseOnHover = false;
    await h.wait(10);
    expect(el4.$isPlayed).toBe(true);
    el4.dispatchEvent(new MouseEvent("mouseenter"));
    el4.dispatchEvent(new Event("touchstart"));
    expect(el4.$isPlayed).toBe(true); // no reaction
    await h.wait(1100);
    expect(el4.$isOpened).toBe(false);
  });

  test("option: pauseOnWinBlur", async () => {
    const el2 = await initNotify(`w-autoclose="1000" w-selfremove="false"`);
    expect(el2.$isPlayed).toBe(true);
    window.dispatchEvent(new Event("blur"));
    expect(el2.$isPlayed).toBe(false);
    await h.wait(5000);
    expect(el2.$isOpened).toBe(true);
    window.dispatchEvent(new Event("focus"));
    expect(el2.$isPlayed).toBe(true);
    await h.wait(1100);
    expect(el2.$isOpened).toBe(false);

    // when window isn't focused on opening
    document.hasFocus.mockReturnValue(false);
    const el3 = await initNotify(`w-autoclose="1000" w-selfremove="false"`);
    expect(el3.$isPlayed).toBe(false); // don't play because window isn't focused
    await h.wait(5000);
    expect(el3.$isOpened).toBe(true);
    window.dispatchEvent(new Event("focus"));
    expect(el3.$isPlayed).toBe(true);
    await h.wait(1100);
    expect(el3.$isOpened).toBe(false);

    // pauseOnWinBlur: false
    document.hasFocus.mockReturnValue(true);
    document.body.innerHTML = "";
    const el4 = document.body.appendChild(document.createElement("wup-notify"));
    el4.$options.autoClose = 1000;
    el4.$options.selfRemove = false;
    el4.$options.pauseOnWinBlur = false;
    await h.wait(10);
    expect(el4.$isPlayed).toBe(true);
    window.dispatchEvent(new Event("blur"));
    expect(el4.$isPlayed).toBe(true); // no reaction
    await h.wait(1100);
    expect(el4.$isOpened).toBe(false);
  });

  test("option: selfRemove", async () => {
    // selfRemove: true (default)
    expect(el.$options.selfRemove).toBe(true);
    await h.wait();
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.isConnected).toBe(false);

    // selfRemove: false
    const el2 = await initNotify(`w-selfremove="false" w-autoclose="0"`);
    el2.$close();
    await h.wait();
    expect(el2.$isOpened).toBe(false);
    expect(el2.isConnected).toBe(true);
    expect(el2.outerHTML).toMatchInlineSnapshot(
      `"<wup-notify w-selfremove="false" w-autoclose="0" role="alert" w-placement="bottom-left"><button type="button" aria-label="close" wup-icon="" close=""></button>Some text</wup-notify>"`
    );
  });

  test("close by button[close]", async () => {
    await h.wait();
    expect(el.$isOpened).toBe(true);
    const onWillClose = jest.fn();
    el.$onWillClose = onWillClose;
    await h.userClick(el.$refClose);
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(onWillClose).toBeCalledTimes(1);
    expect(onWillClose.mock.calls[0][0].detail.closeCase).toBe(1); // NotifyCloseCases.onCloseClick
    expect(el.isConnected).toBe(false);

    // click on element doesn't close it (when closeOnClick: false)
    const el2 = await initNotify(`w-autoclose="0" w-selfremove="false"`);
    await h.userClick(el2);
    await h.wait();
    expect(el2.$isOpened).toBe(true);
  });

  test("option: closeOnClick", async () => {
    const el2 = await initNotify(`w-closeonclick w-autoclose="0" w-selfremove="false"`);
    expect(el2.$options.closeOnClick).toBe(true);
    await h.userClick(el2);
    await h.wait();
    expect(el2.$isOpened).toBe(false);

    // right-button click is ignored
    el2.$open();
    await h.wait();
    await h.userClick(el2, { button: 1 });
    await h.wait();
    expect(el2.$isOpened).toBe(true);

    // click with preventDefault is ignored
    document.body.innerHTML = `<wup-notify w-closeonclick w-autoclose="0" w-selfremove="false"><span id="in">txt</span></wup-notify>`;
    const el3 = document.body.firstElementChild;
    await h.wait();
    expect(el3.$isOpened).toBe(true);
    document.getElementById("in").onclick = (e) => e.preventDefault();
    await h.userClick("#in");
    await h.wait();
    expect(el3.$isOpened).toBe(true);
  });

  test("gotClick (when closeOnClick: false)", async () => {
    // WARN: gotClick is attached only when closeOnClick is enabled: so call it directly
    document.body.innerHTML = `<wup-notify w-autoclose="0" w-selfremove="false">
        <span id="txt">txt</span>
        <button close id="bc"><span id="bcin">x</span></button>
      </wup-notify>`;
    const el2 = document.body.firstElementChild;
    await h.wait();
    expect(el2.$isOpened).toBe(true);

    el2.gotClick({ target: el2 }); // click on itself
    await h.wait();
    expect(el2.$isOpened).toBe(true);

    el2.gotClick({ target: document.getElementById("txt") }); // click on ordinary content
    await h.wait();
    expect(el2.$isOpened).toBe(true);

    el2.gotClick({ target: document.getElementById("bcin") }); // click inside custom button[close]
    await h.wait();
    expect(el2.$isOpened).toBe(false);

    // click on built-in button[close]
    el2.$open();
    await h.wait();
    el2.gotClick({ target: el2.$refClose });
    await h.wait();
    expect(el2.$isOpened).toBe(false);
  });

  test("placement & stacking", async () => {
    document.body.innerHTML = "";
    h.setupCssCompute((e) => e.tagName === "WUP-NOTIFY", {
      marginTop: "10px",
      marginBottom: "10px",
      transform: "translateX(-100%)",
    });
    /** @returns {WUPNotifyElement} */
    const add = (placement, height = 50) => {
      const a = document.body.appendChild(document.createElement("wup-notify"));
      a.textContent = placement;
      a.$options.placement = placement;
      a.$options.autoClose = 0;
      a.$options.selfRemove = false;
      jest.spyOn(a, "offsetHeight", "get").mockReturnValue(height);
      return a;
    };

    // bottom: every next item is shifted up
    const a1 = add("bottom-left");
    const a2 = add("bottom-left");
    const a3 = add("bottom-left");
    await h.wait();
    expect([a1.$isOpened, a2.$isOpened, a3.$isOpened]).toEqual([true, true, true]);
    expect([a1._dy, a2._dy, a3._dy]).toEqual([0, -60, -120]); // -50 (height) -10 (margin)
    expect([a1.style.transform, a2.style.transform, a3.style.transform]).toMatchInlineSnapshot(`
      [
        "",
        "translateY(-60px)",
        "translateY(-120px)",
      ]
    `);
    expect(el._openedItems.length).toBe(3);

    // closing the middle one must re-position others
    a2.$close();
    expect(a2.style.transform).toMatchInlineSnapshot(`"translateX(-100%) translateY(-60px)"`); // saved position (see gotClose)
    await h.wait();
    expect(a2.$isOpened).toBe(false);
    expect(a2.style.transform).toBe(""); // reset on resetState
    expect([a1._dy, a3._dy]).toEqual([0, -60]);
    expect([a1.style.transform, a3.style.transform]).toMatchInlineSnapshot(`
      [
        "",
        "translateY(-60px)",
      ]
    `);
    expect(el._openedItems.length).toBe(2);

    // top: every next item is shifted down
    document.body.innerHTML = "";
    await h.wait(1);
    expect(el._openedItems.length).toBe(0);
    const b1 = add("top-right");
    const b2 = add("top-right");
    await h.wait();
    expect([b1._dy, b2._dy]).toEqual([0, 60]);

    // invisible item (height: 0) must be skipped
    const b3 = add("top-right", 0);
    const b4 = add("top-right");
    await h.wait();
    expect([b3._dy, b4._dy]).toEqual([120, 120]); // b4 is placed after b2 (b3 is skipped)

    // other placement isn't sibling: so no shifting
    const c1 = add("bottom-middle");
    await h.wait();
    expect(c1._dy).toBe(0);
    expect(c1.style.transform).toBe("");

    // $open() during the closing: item must be moved to the end without duplicates
    document.body.innerHTML = "";
    await h.wait(1);
    const d1 = add("bottom-left");
    const d2 = add("bottom-left");
    const d3 = add("bottom-left");
    await h.wait();
    expect([d1._dy, d2._dy, d3._dy]).toEqual([0, -60, -120]);
    d2.$close();
    d2.$open(); // interrupt the closing: resetState is skipped in this case
    await h.wait();
    expect(el._openedItems).toHaveLength(3); // no duplicates
    expect([d1._dy, d3._dy, d2._dy]).toEqual([0, -60, -120]);
    expect([d1.style.transform, d3.style.transform, d2.style.transform]).toMatchInlineSnapshot(`
      [
        "",
        "translateY(-60px)",
        "translateY(-120px)",
      ]
    `);
  });

  test("static $show", async () => {
    document.body.innerHTML = "";
    await h.wait(1);
    const onRender = jest.fn();
    const n = WUPNotifyElement.$show({
      textContent: "Hello",
      className: "cls-me",
      onRender,
      defaults: { placement: "top-right", autoClose: 0 },
    });
    expect(onRender).toBeCalledTimes(1);
    expect(onRender.mock.calls[0][0]).toBe(n);
    expect(n.isConnected).toBe(true);
    expect(n.$options.selfRemove).toBe(true);
    expect(n.$options.placement).toBe("top-right");
    expect(n.$options.autoClose).toBe(0);
    expect(n.$options.openCase).toBe(1); // NotifyOpenCases.onInit
    await h.wait();
    expect(n.$isOpened).toBe(true);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-notify class="cls-me" open="" role="alert" w-placement="top-right" show=""><button type="button" aria-label="close" wup-icon="" close=""></button>Hello</wup-notify></body>"`
    );
    n.$close();
    await h.wait();
    expect(n.$isOpened).toBe(false);
    expect(n.isConnected).toBe(false); // because of selfRemove

    // without extra options
    const n2 = WUPNotifyElement.$show({ textContent: "Hi" });
    await h.wait(10);
    expect(n2.$isOpened).toBe(true);
    expect(n2.className).toBe("");
    expect(n2.$options.placement).toBe("bottom-left");
    expect(n2.outerHTML).toMatchInlineSnapshot(
      `"<wup-notify open="" role="alert" w-placement="bottom-left" show=""><button type="button" aria-label="close" wup-icon="" close=""></button>Hi<div progress="" role="progressbar"></div></wup-notify>"`
    );
    n2.$close();
    await h.wait();
    expect(n2.isConnected).toBe(false);
  });
});
