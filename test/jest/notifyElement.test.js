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

/** Simulate pointer event: jsdom has no PointerEvent - so pointer-properties must be defined manually */
function userPointer(trg, type, x, opts = {}) {
  const ev = new MouseEvent(type, { clientX: x, clientY: opts.y ?? 0, cancelable: true, bubbles: true });
  const p = { pointerId: 1, isPrimary: true, pointerType: "touch", timeStamp: 0, ...opts };
  Object.keys(p).forEach((k) => Object.defineProperty(ev, k, { get: () => p[k] }));
  trg.dispatchEvent(ev);
}

/** Simulate touch-swipe via pointer events: down at 1st point, move by others (every 100ms), up at the last one */
function userSwipe(trg, points, end = "pointerup") {
  points.forEach((x, i) => userPointer(trg, i ? "pointermove" : "pointerdown", x, { timeStamp: i * 100 }));
  userPointer(trg, end, points[points.length - 1], { timeStamp: points.length * 100 });
}

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
      "w-placement": { value: "bottom-left", skip: true }, // it's also rendered attr (see test "options changes on opened")
      "w-autoclose": { value: 3000 },
      "w-closeonclick": { value: true },
      "w-closeonswipe": { value: true },
      "w-selfremove": { value: true },
      "w-opencase": { value: 0 },
      "w-pauseonhover": { value: true },
      "w-pauseonwinblur": { value: true },
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

    // time less than 100ms: progress duration can't be negative
    await initNotify(`w-autoclose="50" w-selfremove="false"`);
    expect(animations[animations.length - 1].opts.duration).toBe(0);
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

    // closing stops the timer: otherwise it closes re-opened item
    const el3 = await initNotify(`w-autoclose="1000" w-selfremove="false"`);
    await h.wait(500);
    el3.$close();
    el3.$open(); // interrupt the closing
    await h.wait(600);
    expect(el3.$isOpened).toBe(true);
    expect(el3.$isPlayed).toBe(true);
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

    // pauseOnHover: false via attr
    const el5 = await initNotify(`w-autoclose="1000" w-selfremove="false" w-pauseonhover="false"`);
    expect(el5.$options.pauseOnHover).toBe(false);
    el5.dispatchEvent(new MouseEvent("mouseenter"));
    expect(el5.$isPlayed).toBe(true); // no reaction
    await h.wait(1100);
    expect(el5.$isOpened).toBe(false);
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

    // pauseOnWinBlur: false via attr
    const el5 = await initNotify(`w-autoclose="1000" w-selfremove="false" w-pauseonwinblur="false"`);
    expect(el5.$options.pauseOnWinBlur).toBe(false);
    window.dispatchEvent(new Event("blur"));
    expect(el5.$isPlayed).toBe(true); // no reaction
    await h.wait(1100);
    expect(el5.$isOpened).toBe(false);
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

  test("option: closeOnSwipe", async () => {
    const el2 = await initNotify(`w-autoclose="1000" w-selfremove="false"`);
    expect(el2.$options.closeOnSwipe).toBe(true);
    expect(el2.style.touchAction).toBe("pan-y"); // otherwise browser cancels pointer-events on horizontal swipe
    jest.spyOn(el2, "offsetWidth", "get").mockReturnValue(300);
    const onWillClose = jest.fn();
    el2.$onWillClose = onWillClose;

    // element follows the finger & returns back when swiped less than 40% of width
    userPointer(el2, "pointerdown", 0);
    userPointer(el2, "pointermove", 5, { timeStamp: 100 });
    expect(el2.$isPlayed).toBe(true); // not swiping yet: movement is less than threshold
    expect(el2.getAttribute("style")).toBeNull();
    userPointer(el2, "pointermove", 50, { timeStamp: 200 });
    expect(el2.$isPlayed).toBe(false); // paused during the swipe
    expect(el2.hasAttribute("swiping")).toBe(true); // to disable transition
    userPointer(el2, "pointermove", 60, { timeStamp: 300, pointerId: 2 }); // another pointer is ignored
    userPointer(el2, "pointermove", 60, { timeStamp: 300 });
    userPointer(el2, "pointermove", 60, { timeStamp: 300 }); // the same time: velocity isn't changed
    expect(el2.getAttribute("style")).toMatchInlineSnapshot(`"transform: translateX(60px); opacity: 0.8;"`);
    userPointer(el2, "pointerup", 60, { timeStamp: 1000, pointerId: 2 }); // another pointer is ignored
    expect(el2.hasAttribute("swiping")).toBe(true);
    userPointer(el2, "pointerup", 60, { timeStamp: 1000 });
    expect(el2.getAttribute("style")).toBe("");
    expect(el2.hasAttribute("swiping")).toBe(false);
    expect(el2.$isPlayed).toBe(true); // resumed
    await h.wait(10);
    expect(el2.$isOpened).toBe(true);
    expect(onWillClose).not.toBeCalled();

    // listeners are removed after the gesture
    userPointer(el2, "pointermove", 200, { timeStamp: 1100 });
    expect(el2.getAttribute("style")).toBe("");

    // swiped out for more than 40% of width
    userSwipe(el2, [0, 50, 100, 130]);
    expect(onWillClose).toBeCalledTimes(1);
    expect(onWillClose.mock.calls[0][0].detail.closeCase).toBe(3); // NotifyCloseCases.onSwipe
    expect(el2.$isClosing).toBe(true);
    expect(el2.getAttribute("style")).toMatchInlineSnapshot(`"transform: translateX(100vw);"`); // fly out
    userPointer(el2, "pointerdown", 0); // ignored during the closing
    userPointer(el2, "pointermove", 50, { timeStamp: 100 });
    expect(el2.hasAttribute("swiping")).toBe(false);
    await h.wait();
    expect(el2.$isOpened).toBe(false);
    expect(el2.getAttribute("style")).toBe(""); // reset on resetState

    // fling to the left: short but fast swipe
    el2.$open();
    await h.wait(10);
    userPointer(el2, "pointerdown", 100);
    userPointer(el2, "pointermove", 85, { timeStamp: 100 });
    userPointer(el2, "pointermove", 50, { timeStamp: 110 }); // 3.5px/ms
    userPointer(el2, "pointerup", 50, { timeStamp: 120 });
    expect(el2.$isClosing).toBe(true);
    expect(el2.getAttribute("style")).toMatchInlineSnapshot(`"transform: translateX(-100vw);"`);
    await h.wait();

    // fast movement back isn't fling
    el2.$open();
    await h.wait(10);
    userPointer(el2, "pointerdown", 0);
    userPointer(el2, "pointermove", 100, { timeStamp: 100 });
    userPointer(el2, "pointermove", 50, { timeStamp: 110 }); // -5px/ms
    userPointer(el2, "pointerup", 50, { timeStamp: 120 });
    expect(el2.$isClosing).toBe(false);
    expect(el2.getAttribute("style")).toBe("");

    // pointercancel returns back
    userSwipe(el2, [0, 50, 200], "pointercancel");
    expect(el2.$isClosing).toBe(false);
    expect(el2.getAttribute("style")).toBe("");
    expect(el2.$isPlayed).toBe(true);

    // vertical movement (scroll) is ignored
    userPointer(el2, "pointerdown", 0);
    userPointer(el2, "pointermove", 5, { y: 20, timeStamp: 100 });
    userPointer(el2, "pointermove", 200, { y: 20, timeStamp: 200 });
    userPointer(el2, "pointerup", 200, { y: 20, timeStamp: 300 });
    expect(el2.$isClosing).toBe(false);
    expect(el2.getAttribute("style")).toBe("");

    // mouse & non-primary pointers are ignored
    userPointer(el2, "pointerdown", 0, { pointerType: "mouse" });
    userPointer(el2, "pointermove", 200, { pointerType: "mouse", timeStamp: 100 });
    userPointer(el2, "pointerdown", 0, { isPrimary: false });
    userPointer(el2, "pointermove", 200, { isPrimary: false, timeStamp: 100 });
    expect(el2.getAttribute("style")).toBe("");

    // returns back when closing is prevented
    el2.$onWillClose = (e) => e.preventDefault();
    userSwipe(el2, [0, 50, 200]);
    expect(el2.$isOpened).toBe(true);
    expect(el2.getAttribute("style")).toBe("");
    expect(el2.$isPlayed).toBe(true);
    el2.$onWillClose = undefined;

    // vertical position in the stack isn't affected: it's defined via style.translate
    el2.style.translate = "0 -60px";
    userPointer(el2, "pointerdown", 0);
    userPointer(el2, "pointermove", 50, { timeStamp: 100 });
    userPointer(el2, "pointermove", 60, { timeStamp: 1000 });
    expect(el2.style.transform).toBe("translateX(60px)");
    userPointer(el2, "pointermove", 200, { timeStamp: 2000 });
    userPointer(el2, "pointerup", 200, { timeStamp: 2100 });
    expect(el2.style.transform).toBe("translateX(100vw)");
    expect(el2.style.translate).toBe("0 -60px");
    await h.wait();

    // closeOnSwipe: false
    const el3 = await initNotify(`w-closeonswipe="false" w-autoclose="0" w-selfremove="false"`);
    expect(el3.$options.closeOnSwipe).toBe(false);
    expect(el3.style.touchAction).toBeFalsy(); // vertical & horizontal scroll by touch is allowed
    userSwipe(el3, [0, 50, 200]);
    expect(el3.$isOpened).toBe(true);
    expect(el3.getAttribute("style")).toBeNull();
  });

  test("closeOnSwipe prevents click after swipe", async () => {
    const el2 = await initNotify(`w-closeonclick w-autoclose="0" w-selfremove="false"`);
    jest.spyOn(el2, "offsetWidth", "get").mockReturnValue(300);
    const click = (trg) => trg.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    // swipe returns back: click fired right after pointerup must be ignored
    userSwipe(el2, [0, 50, 60]);
    click(el2);
    await h.wait();
    expect(el2.$isOpened).toBe(true);
    // even on button[close]
    userSwipe(el2, [0, 50, 60]);
    click(el2.$refClose);
    await h.wait();
    expect(el2.$isOpened).toBe(true);
    // without click: prevention is removed on the next tick
    userSwipe(el2, [0, 50, 60]);
    await h.wait(1);
    click(el2);
    await h.wait();
    expect(el2.$isOpened).toBe(false);

    // tap without swipe isn't affected
    el2.$open();
    await h.wait();
    userSwipe(el2, [0, 5]);
    click(el2);
    await h.wait();
    expect(el2.$isOpened).toBe(false);
  });

  test("gotClick (when closeOnClick: false)", async () => {
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

    // real click on custom button[close]
    el2.$open();
    await h.wait();
    document.getElementById("bcin").click();
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
    expect([a1.style.translate, a2.style.translate, a3.style.translate]).toEqual(["", "0 -60px", "0 -120px"]);
    expect(el._openedItems.length).toBe(3);

    // closing the middle one must re-position others
    a2.$close();
    expect(a2.style.translate).toBe("0 -60px"); // keeps position during the hiding
    await h.wait();
    expect(a2.$isOpened).toBe(false);
    expect(a2.style.translate).toBe(""); // reset on resetState
    expect([a1._dy, a3._dy]).toEqual([0, -60]);
    expect([a1.style.translate, a3.style.translate]).toEqual(["", "0 -60px"]);
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
    expect(c1.style.translate).toBe("");

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
    expect([d1.style.translate, d3.style.translate, d2.style.translate]).toEqual(["", "0 -60px", "0 -120px"]);
  });

  test("options changes on opened", async () => {
    const el2 = await initNotify(`w-autoclose="0" w-selfremove="false"`);
    expect(el2.$refProgress).toBeUndefined();
    // autoClose: progress is added & closing by time is started
    el2.$options.autoClose = 1000;
    await h.wait(1);
    expect(el2.$refProgress.isConnected).toBe(true);
    expect(el2.$isPlayed).toBe(true);
    await h.wait(1100);
    expect(el2.$isOpened).toBe(false);

    // placement: rendered attr is kept & item is moved to another stack
    el2.$options.autoClose = 0;
    el2.$open();
    const el3 = document.body.appendChild(document.createElement("wup-notify"));
    el3.$options.autoClose = 0;
    await h.wait();
    [el2, el3].forEach((a) => jest.spyOn(a, "offsetHeight", "get").mockReturnValue(50));
    el3.refreshVertical();
    expect(el3.style.translate).toBe("0 -50px");
    el2.$options.placement = "top-right";
    await h.wait(1);
    expect(el2.getAttribute("w-placement")).toBe("top-right");
    expect(el3.style.translate).toBe(""); // gap in prev stack is closed
    el2.setAttribute("w-placement", "top-left");
    await h.wait(1);
    expect(el2.$options.placement).toBe("top-left");
    expect(el2.getAttribute("w-placement")).toBe("top-left");
    expect(el2._openedItems).toEqual([el3, el2]);
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

  test("static $show with id", async () => {
    document.body.innerHTML = "";
    await h.wait(1);
    const n = WUPNotifyElement.$show({ id: "saving", textContent: "Saving...", defaults: { autoClose: 0 } });
    expect(WUPNotifyElement.$show({ id: "saving", textContent: "Saving 2" })).toBe(n); // the same even when not ready yet
    await h.wait(10);
    expect(n.$isOpened).toBe(true);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<wup-notify id="saving" open="" role="alert" w-placement="bottom-left" show=""><button type="button" aria-label="close" wup-icon="" close=""></button>Saving 2</wup-notify>"`
    );

    // refresh with new content & options
    const onRender = jest.fn();
    const onWillOpen = jest.fn();
    n.$onWillOpen = onWillOpen;
    expect(
      WUPNotifyElement.$show({
        id: "saving",
        textContent: "Saved",
        className: "ok",
        onRender,
        defaults: { autoClose: 1000 },
      })
    ).toBe(n);
    expect(onRender).toBeCalledTimes(1);
    expect(onRender.mock.calls[0][0]).toBe(n);
    await h.wait(10);
    expect(onWillOpen).not.toBeCalled(); // refreshed without re-opening
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<wup-notify id="saving" open="" role="alert" w-placement="bottom-left" show="" class="ok"><button type="button" aria-label="close" wup-icon="" close=""></button>Saved<div progress="" role="progressbar"></div></wup-notify>"`
    );
    expect(n.$isPlayed).toBe(true);
    expect(n._openedItems).toEqual([n]);

    // refresh restarts closing by time
    await h.wait(800);
    const anim = animations[animations.length - 1];
    WUPNotifyElement.$show({ id: "saving", textContent: "Saved 2" });
    expect(anim.playState).toBe("idle"); // previous is cancelled
    expect(animations[animations.length - 1]).not.toBe(anim);
    expect(animations[animations.length - 1].playState).toBe("running");
    await h.wait(800);
    expect(n.$isOpened).toBe(true);
    // events aren't duplicated on refreshing
    n.dispatchEvent(new Event("mouseenter"));
    expect(n.$isPlayed).toBe(false);
    n.dispatchEvent(new Event("mouseleave"));
    expect(n.$isPlayed).toBe(true);
    await h.wait(300);
    expect(n.$isOpened).toBe(false);
    expect(n.isConnected).toBe(false);

    // refresh while hovered keeps pause
    const n2 = WUPNotifyElement.$show({ id: "saving", textContent: "Hovered", defaults: { autoClose: 1000 } });
    expect(n2).not.toBe(n); // because prev is removed
    await h.wait(10);
    const spyHover = jest.spyOn(n2, "matches").mockImplementation((s) => s === ":hover");
    WUPNotifyElement.$show({ id: "saving", textContent: "Hovered 2" });
    spyHover.mockRestore();
    expect(n2.$isPlayed).toBe(false);
    await h.wait(5000);
    expect(n2.$isOpened).toBe(true);
    n2.dispatchEvent(new Event("mouseleave"));
    expect(n2.$isPlayed).toBe(true);

    // refresh with autoClose: 0 removes progress
    WUPNotifyElement.$show({ id: "saving", textContent: "Static", defaults: { autoClose: 0 } });
    expect(n2.$refProgress).toBeUndefined();
    expect(n2.$isPlayed).toBe(false);
    await h.wait(5000);
    expect(n2.$isOpened).toBe(true);

    // refresh with new placement moves item to another stack
    const other = WUPNotifyElement.$show({ textContent: "Other", defaults: { placement: "top-left", autoClose: 0 } });
    const below = WUPNotifyElement.$show({ textContent: "Below", defaults: { autoClose: 0 } }); // after n2 in prev stack
    await h.wait(10);
    [other, n2, below].forEach((a) => jest.spyOn(a, "offsetHeight", "get").mockReturnValue(50));
    below.refreshVertical();
    expect(below.style.translate).toBe("0 -50px");
    WUPNotifyElement.$show({ id: "saving", textContent: "Moved", defaults: { placement: "top-left" } });
    expect(n2.getAttribute("w-placement")).toBe("top-left");
    expect(n2._openedItems).toEqual([other, below, n2]);
    expect(n2.style.translate).toBe("0 50px"); // placed after other
    expect(below.style.translate).toBe(""); // gap in prev stack is closed
    await h.wait(10);
    expect(n2.getAttribute("w-placement")).toBe("top-left"); // isn't removed by options observer

    // closing item is re-opened & refreshed
    n2.$close();
    expect(n2.$isClosing).toBe(true);
    const n3 = WUPNotifyElement.$show({ id: "saving", textContent: "Reopened", defaults: { selfRemove: false } });
    expect(n3).toBe(n2);
    expect(n2.$isClosing).toBeFalsy();
    expect(n2.$isOpened).toBe(true);
    await h.wait();
    expect(n2.isConnected).toBe(true); // closing is interrupted
    expect(n2.textContent).toBe("Reopened");
    expect(n2.$refClose.isConnected).toBe(true);
    document.body.appendChild(document.createElement("div")).id = "not-notify";
    const n4 = WUPNotifyElement.$show({ id: "not-notify", textContent: "Not notify" });
    expect(n4.tagName).toBe("WUP-NOTIFY"); // new one because element with the same id is not notify

    // closed but not removed item is re-opened
    n3.$close();
    await h.wait();
    expect(n3.$isClosed).toBe(true);
    expect(n3.isConnected).toBe(true);
    expect(WUPNotifyElement.$show({ id: "saving", textContent: "Reopened 2" })).toBe(n3);
    expect(n3.$isOpened).toBe(true);
    await h.wait(10);
    expect(n3.textContent).toBe("Reopened 2");
    expect(n3.$refClose.isConnected).toBe(true);

    other.$close();
    below.$close();
    n4.$close();
    n3.$close();
    await h.wait();
  });
});
