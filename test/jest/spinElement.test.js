import { WUPSpinElement } from "web-ui-pack";
import {
  spinUseDualRing,
  spinUseTwinDualRing,
  spinUseRoller,
  spinUseDotRoller,
  spinUseDotRing,
  spinUseSpliceRing,
  spinUseHash,
} from "web-ui-pack/spinElement";
import * as h from "../testHelper";

let nextFrame = async () => {};
/** @type WUPSpinElement */
let el;

const orig = window.getComputedStyle;
function mockTarget(trg, width, height) {
  jest.spyOn(trg, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: height,
    height,
    width,
    right: width,
    toJSON: () => "",
  });
  jest.spyOn(trg, "clientHeight", "get").mockReturnValue(height);
  jest.spyOn(trg, "offsetHeight", "get").mockReturnValue(height);
  jest.spyOn(trg, "clientWidth", "get").mockReturnValue(width);
  jest.spyOn(trg, "offsetWidth", "get").mockReturnValue(width);

  jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
    if (elem === trg) {
      /** @type CSSStyleDeclaration */
      return {
        paddingTop: "0px",
        paddingLeft: "0px",
        paddingBottom: "0px",
        paddingRight: "0px",
        getPropertyValue: (s) => {
          if (s === "--spin-item-size") {
            return `30px`;
          }
          return orig(elem).getPropertyValue(s);
        },
      };
    }
    return orig(elem);
  });
}

function targetAppend(targetW = 100, targetH = 20) {
  const trg = document.body.appendChild(document.createElement("button"));
  trg.textContent = "someText";
  mockTarget(trg, targetW, targetH);
  return trg;
}

beforeEach(() => {
  !WUPSpinElement && console.error("missed");
  const a = h.useFakeAnimation();
  nextFrame = a.nextFrame;

  mockTarget(document.body, 600, 400);

  jest.useFakeTimers();
  el = document.body.appendChild(document.createElement("wup-spin"));
  jest.spyOn(el, "clientHeight", "get").mockReturnValue(30);
  jest.spyOn(el, "clientWidth", "get").mockReturnValue(30);
  jest.advanceTimersToNextTimer(); // gotReady has timeout
});

afterEach(() => {
  document.body.removeAttribute("style");
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("spinElement", () => {
  h.baseTestComponent(() => document.createElement("wup-spin"), { attrs: { fit: { onRemove: true } } });

  test("applied styles", () => {
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>.wup-hidden, [wup-hidden] {
      position: absolute;
      height:1px; width:1px;
      top:0;left:0;
      overflow:hidden;
      clip:rect(1px,1px,1px,1px);
      min-width:initial;
      padding:0;}:root {
                --base-bg: #fff;
                --base-text: #232323;
                --base-focus: #00778d;
                --base-btn-bg: #009fbc;
                --base-btn-text: #fff;
                --base-btn-focus: #005766;
                --base-btn2-bg: var(--base-btn-text);
                --base-btn2-text: var(--base-btn-bg);
                --base-btn3-bg: var(--base-bg);
                --base-btn3-text: inherit;
                --base-sep: #e4e4e4;
                --border-radius: 6px;
                --anim-time: 200ms;
                --anim: var(--anim-time) cubic-bezier(0, 0, 0.2, 1) 0ms;
              }:root {
                --spin-1: #ffa500;
                --spin-2: #fff;
                --spin-speed: 1.2s;
                --spin-size: 3em;
                --spin-item-size: calc(var(--spin-size) / 8);
                --spin-fade: #ffffff6e;
              }
            @keyframes WUP-SPIN-1 {
              100% { transform: rotate(360deg); }
            }
            WUP-SPIN {
              contain: style;
              z-index: 100;
              width: var(--spin-size);
              height: var(--spin-size);
              top:0; left:0;
              pointer-events: none;
            }
            WUP-SPIN,
            WUP-SPIN div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            WUP-SPIN div {
              animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            WUP-SPIN div[fade] {
               display: block;
               position: absolute;
               left:0; top:0;
               animation: none;
               border: none;
               border-radius: var(--border-radius);
               transform: none;
               z-index: -1;
               background: var(--spin-fade);
            }
            WUP-SPIN div[fade]::after { content: none; }
            WUP-SPIN div {
              border: var(--spin-item-size) solid var(--spin-1);
              border-top-color: var(--spin-2);
            }</style>"
    `);
  });

  test("ordinary render", async () => {
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body aria-busy="true"><wup-spin style="position: absolute; transform: translate(285px,185px);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-285px,-185px); width: 600px; height: 400px;"></div></wup-spin></body>"`
    );
    await nextFrame();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body aria-busy="true"><wup-spin style="position: absolute; transform: translate(285px,185px);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-285px,-185px); width: 600px; height: 400px;"></div></wup-spin></body>"`
    );
    el.remove();
    expect(document.body.outerHTML).toMatchInlineSnapshot(`"<body></body>"`);
  });

  test("$options.inline", () => {
    el.$options.inline = true;
    jest.advanceTimersToNextTimer();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body aria-busy="true"><wup-spin style="--spin-size: 400px; --spin-item-size: calc(30px * 1);" aria-label="Loading. Please wait"><div></div></wup-spin></body>"`
    );

    el.$options.inline = false;
    jest.advanceTimersToNextTimer();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body aria-busy="true"><wup-spin style="position: absolute; transform: translate(285px,185px);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-285px,-185px); width: 600px; height: 400px;"></div></wup-spin></body>"`
    );
  });

  test("$options.overflowFade", async () => {
    el.$options.inline = false;
    el.$options.overflowFade = false;
    jest.advanceTimersToNextTimer();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body aria-busy="true"><wup-spin style="position: absolute; transform: translate(285px,185px);" aria-label="Loading. Please wait"><div></div></wup-spin></body>"`
    );
    await nextFrame();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body aria-busy="true"><wup-spin style="position: absolute; transform: translate(285px,185px);" aria-label="Loading. Please wait"><div></div></wup-spin></body>"`
    );
  });

  test("$options.overflowTarget", () => {
    const trg = targetAppend();
    el.$options.inline = false;
    el.$options.overflowTarget = trg;
    jest.advanceTimersToNextTimer();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-spin style="position: absolute; transform: translate(35px,-5px) scale(0.4);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-35px,5px) scale(2.5); width: 100px; height: 20px;"></div></wup-spin><button aria-busy="true">someText</button></body>"`
    );
  });

  test("$options.fit", async () => {
    const trg = targetAppend();
    el.$options.overflowTarget = trg;

    el.$options.inline = false;
    el.$options.fit = true;
    jest.advanceTimersToNextTimer();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-spin style="position: absolute; transform: translate(35px,-5px) scale(0.4);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-35px,5px) scale(2.5); width: 100px; height: 20px;"></div></wup-spin><button aria-busy="true">someText</button></body>"`
    );

    el.$options.fit = false;
    jest.advanceTimersToNextTimer();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-spin style="position: absolute; transform: translate(35px,-5px);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-35px,5px); width: 100px; height: 20px;"></div></wup-spin><button aria-busy="true">someText</button></body>"`
    );

    trg.appendChild(el);
    el.$options.inline = true;
    el.$options.fit = false;
    jest.advanceTimersToNextTimer();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><button aria-busy="true">someText<wup-spin style="" aria-label="Loading. Please wait"><div></div></wup-spin></button></body>"`
    );

    el.$options.fit = true;
    jest.advanceTimersToNextTimer();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><button aria-busy="true">someText<wup-spin style="--spin-size: 20px; --spin-item-size: calc(30px * 0.6666666666666666);" aria-label="Loading. Please wait"><div></div></wup-spin></button></body>"`
    );
    await nextFrame();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><button aria-busy="true">someText<wup-spin style="--spin-size: 20px; --spin-item-size: calc(30px * 0.6666666666666666);" aria-label="Loading. Please wait"><div></div></wup-spin></button></body>"`
    );
  });

  test("$refresh()", () => {
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body aria-busy="true"><wup-spin style="position: absolute; transform: translate(285px,185px);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-285px,-185px); width: 600px; height: 400px;"></div></wup-spin></body>"`
    );
    el.$refresh();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body aria-busy="true"><wup-spin style="position: absolute; transform: translate(285px,185px);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-285px,-185px); width: 600px; height: 400px;"></div></wup-spin></body>"`
    );
  });

  test("target hidden", () => {
    const trg = document.body.appendChild(document.createElement("button"));
    el.$options.overflowTarget = trg;
    el.$options.inline = false;
    jest.advanceTimersToNextTimer();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<wup-spin style="position: absolute; display: none;" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-285px,-185px); width: 600px; height: 400px;"></div></wup-spin><button aria-busy="true"></button>"`
    );
  });

  test("target with position:relative", () => {
    const trg = targetAppend();
    // trg.style.position = "relative";
    jest.spyOn(el, "offsetParent", "get").mockReturnValue(trg); // simulate relative position
    el.$options.overflowTarget = trg;
    el.$options.inline = false;
    jest.advanceTimersToNextTimer();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<wup-spin style="position: absolute; transform: translate(35px,-5px) scale(0.4);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-35px,5px) scale(2.5); width: 100px; height: 20px;"></div></wup-spin><button aria-busy="true">someText</button>"`
    );

    // simulate hasRelativeParent case
    jest.spyOn(el, "offsetParent", "get").mockReturnValue(document.body); // simulate relative position
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === document.body) {
        /** @type CSSStyleDeclaration */
        return { position: "relative" };
      }
      return orig(elem);
    });
    el.$options.inline = true;
    el.$options.inline = false;
    jest.advanceTimersToNextTimer();
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<wup-spin style="position: absolute; transform: translate(35px,-5px) scale(0.4);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-35px,5px) scale(2.5); width: 100px; height: 20px;"></div></wup-spin><button aria-busy="true">someText</button>"`
    );
  });

  test("style > spinUseDualRing", () => {
    document.head.firstChild.textContent = "";
    document.body.innerHTML = "";
    class SpinA extends WUPSpinElement {}
    customElements.define("spin-a", SpinA);
    spinUseDualRing(SpinA);
    document.body.appendChild(document.createElement("spin-a"));
    jest.advanceTimersToNextTimer();

    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<spin-a style="position: absolute; transform: translate(300px,200px);" aria-label="Loading. Please wait"><div></div><div fade="" style="transform: translate(-300px,-200px); width: 600px; height: 400px;"></div></spin-a>"`
    );
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
            @keyframes WUP-SPIN-1 {
              100% { transform: rotate(360deg); }
            }
            SPIN-A {
              contain: style;
              z-index: 100;
              width: var(--spin-size);
              height: var(--spin-size);
              top:0; left:0;
              pointer-events: none;
            }
            SPIN-A,
            SPIN-A div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-A div {
              animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-A div[fade] {
               display: block;
               position: absolute;
               left:0; top:0;
               animation: none;
               border: none;
               border-radius: var(--border-radius);
               transform: none;
               z-index: -1;
               background: var(--spin-fade);
            }
            SPIN-A div[fade]::after { content: none; }
            :root { --spin-2: transparent; }
             SPIN-A div {
               border: var(--spin-item-size) solid;
               border-color: var(--spin-2) var(--spin-1) var(--spin-2) var(--spin-1);
            }</style>"
    `);
  });

  test("style > spinUseTwinDualRing", () => {
    document.head.firstChild.textContent = "";
    document.body.innerHTML = "";
    class SpinB extends WUPSpinElement {}
    customElements.define("spin-b", SpinB);
    spinUseTwinDualRing(SpinB);
    document.body.appendChild(document.createElement("spin-b"));
    jest.advanceTimersToNextTimer();

    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<spin-b style="position: absolute; transform: translate(300px,200px);" aria-label="Loading. Please wait"><div></div><div></div><div fade="" style="transform: translate(-300px,-200px); width: 600px; height: 400px;"></div></spin-b>"`
    );
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
            @keyframes WUP-SPIN-1 {
              100% { transform: rotate(360deg); }
            }
            SPIN-B {
              contain: style;
              z-index: 100;
              width: var(--spin-size);
              height: var(--spin-size);
              top:0; left:0;
              pointer-events: none;
            }
            SPIN-B,
            SPIN-B div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-B div {
              animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-B div[fade] {
               display: block;
               position: absolute;
               left:0; top:0;
               animation: none;
               border: none;
               border-radius: var(--border-radius);
               transform: none;
               z-index: -1;
               background: var(--spin-fade);
            }
            SPIN-B div[fade]::after { content: none; }
            @keyframes WUP-SPIN-2-2 {
                0% { transform: translate(-50%, -50%) rotate(360deg); }
                100% { transform: translate(-50%, -50%) rotate(0deg); }
             }
             :root {
                --spin-2: #b35e03;
                --spin-item-size: max(1px, calc(var(--spin-size) / 12));
             }
             SPIN-B { position: relative; }
             SPIN-B div:nth-child(1) {
                border: var(--spin-item-size) solid;
                border-color: transparent var(--spin-1) transparent var(--spin-1);
             }
             SPIN-B div:nth-child(2) {
                border: var(--spin-item-size) solid;
                border-color: var(--spin-2) transparent var(--spin-2) transparent;
                position: absolute;
                width: calc(100% - var(--spin-item-size) * 3);
                height: calc(100% - var(--spin-item-size) * 3);
                left: 50%; top: 50%;
                transform: translate(-50%,-50%);
                animation: WUP-SPIN-2-2 var(--spin-speed) linear infinite;
             }</style>"
    `);
  });

  test("style > spinUseRoller", () => {
    document.head.firstChild.textContent = "";
    document.body.innerHTML = "";
    class SpinC extends WUPSpinElement {}
    customElements.define("spin-c", SpinC);
    spinUseRoller(SpinC);
    document.body.appendChild(document.createElement("spin-c"));
    jest.advanceTimersToNextTimer();

    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<spin-c style="position: absolute; transform: translate(300px,200px);" aria-label="Loading. Please wait"><div></div><div></div><div></div><div></div><div fade="" style="transform: translate(-300px,-200px); width: 600px; height: 400px;"></div></spin-c>"`
    );
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
            @keyframes WUP-SPIN-1 {
              100% { transform: rotate(360deg); }
            }
            SPIN-C {
              contain: style;
              z-index: 100;
              width: var(--spin-size);
              height: var(--spin-size);
              top:0; left:0;
              pointer-events: none;
            }
            SPIN-C,
            SPIN-C div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-C div {
              animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-C div[fade] {
               display: block;
               position: absolute;
               left:0; top:0;
               animation: none;
               border: none;
               border-radius: var(--border-radius);
               transform: none;
               z-index: -1;
               background: var(--spin-fade);
            }
            SPIN-C div[fade]::after { content: none; }
            SPIN-C { position: relative; }
                  SPIN-C div {
                    animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
                    position: absolute;
                    border: var(--spin-item-size) solid;
                    border-color: var(--spin-1) transparent transparent transparent;
                  }
                  SPIN-C div:nth-child(1) { animation-delay: -0.45s }
              SPIN-C div:nth-child(2) { animation-delay: -0.30s }
              SPIN-C div:nth-child(3) { animation-delay: -0.15s }
              </style>"
    `);
  });

  test("style > spinUseDotRoller", () => {
    document.head.firstChild.textContent = "";
    document.body.innerHTML = "";
    class SpinD extends WUPSpinElement {}
    customElements.define("spin-d", SpinD);
    spinUseDotRoller(SpinD);
    document.body.appendChild(document.createElement("spin-d"));
    jest.advanceTimersToNextTimer();

    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<spin-d style="position: absolute; transform: translate(300px,200px);" aria-label="Loading. Please wait"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div fade="" style="transform: translate(-300px,-200px); width: 600px; height: 400px;"></div></spin-d>"`
    );
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
            @keyframes WUP-SPIN-1 {
              100% { transform: rotate(360deg); }
            }
            SPIN-D {
              contain: style;
              z-index: 100;
              width: var(--spin-size);
              height: var(--spin-size);
              top:0; left:0;
              pointer-events: none;
            }
            SPIN-D,
            SPIN-D div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-D div {
              animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-D div[fade] {
               display: block;
               position: absolute;
               left:0; top:0;
               animation: none;
               border: none;
               border-radius: var(--border-radius);
               transform: none;
               z-index: -1;
               background: var(--spin-fade);
            }
            SPIN-D div[fade]::after { content: none; }
            :root { --spin-step: 24deg; }
                  SPIN-D { position: relative; }
                  SPIN-D div {
                    animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
                    position: absolute;
                  }
                  SPIN-D div::after {
                    content: " ";
                    display: block;
                    position: absolute;
                    left: 0;
                    top: calc(50% - var(--spin-item-size) / 2);
                    transform-origin: calc(var(--spin-size) / 2);
                    width: var(--spin-item-size);
                    height: var(--spin-item-size);
                    border-radius: 50%;
                    background: var(--spin-1);
                  }
                  SPIN-D div:nth-child(1) { animation-delay: -0.036s; }
                  SPIN-D div:nth-child(1)::after { transform: rotate(calc(45deg + var(--spin-step) * 0)); }
                  SPIN-D div:nth-child(2) { animation-delay: -0.072s; }
                  SPIN-D div:nth-child(2)::after { transform: rotate(calc(45deg + var(--spin-step) * 1)); }
                  SPIN-D div:nth-child(3) { animation-delay: -0.10799999999999998s; }
                  SPIN-D div:nth-child(3)::after { transform: rotate(calc(45deg + var(--spin-step) * 2)); }
                  SPIN-D div:nth-child(4) { animation-delay: -0.144s; }
                  SPIN-D div:nth-child(4)::after { transform: rotate(calc(45deg + var(--spin-step) * 3)); }
                  SPIN-D div:nth-child(5) { animation-delay: -0.18s; }
                  SPIN-D div:nth-child(5)::after { transform: rotate(calc(45deg + var(--spin-step) * 4)); }
                  SPIN-D div:nth-child(6) { animation-delay: -0.21599999999999997s; }
                  SPIN-D div:nth-child(6)::after { transform: rotate(calc(45deg + var(--spin-step) * 5)); }
                  SPIN-D div:nth-child(7) { animation-delay: -0.252s; }
                  SPIN-D div:nth-child(7)::after { transform: rotate(calc(45deg + var(--spin-step) * 6)); }
                  </style>"
    `);
  });

  test("style > spinUseDotRing", () => {
    document.head.firstChild.textContent = "";
    document.body.innerHTML = "";
    class SpinE extends WUPSpinElement {}
    customElements.define("spin-e", SpinE);
    spinUseDotRing(SpinE);
    document.body.appendChild(document.createElement("spin-e"));
    jest.advanceTimersToNextTimer();

    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<spin-e style="position: absolute; transform: translate(300px,200px);" aria-label="Loading. Please wait"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div fade="" style="transform: translate(-300px,-200px); width: 600px; height: 400px;"></div></spin-e>"`
    );
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
            @keyframes WUP-SPIN-1 {
              100% { transform: rotate(360deg); }
            }
            SPIN-E {
              contain: style;
              z-index: 100;
              width: var(--spin-size);
              height: var(--spin-size);
              top:0; left:0;
              pointer-events: none;
            }
            SPIN-E,
            SPIN-E div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-E div {
              animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-E div[fade] {
               display: block;
               position: absolute;
               left:0; top:0;
               animation: none;
               border: none;
               border-radius: var(--border-radius);
               transform: none;
               z-index: -1;
               background: var(--spin-fade);
            }
            SPIN-E div[fade]::after { content: none; }
            @keyframes WUP-SPIN-2 {
                    0%,20%,80%,100% { transform: scale(1); background: var(--spin-1) }
                    50% { transform: scale(1.4); background: var(--spin-2) }
                  }
                  :root { --spin-2: #ff5200; }
                  SPIN-E { position: relative; }
                  SPIN-E div {
                    position: absolute;
                    width: calc(100% / 1.4142135623730951);
                    height: calc(100% / 1.4142135623730951);
                    animation: none;
                    top:50%; left:50%;
                  }
                  SPIN-E div::after {
                    animation: WUP-SPIN-2 var(--spin-speed) linear infinite;
                    content: " ";
                    display: block;
                    width: var(--spin-item-size);
                    height: var(--spin-item-size);
                    border-radius: 50%;
                    background: var(--spin-1);
                  }
                  SPIN-E div:nth-child(1)::after { animation-delay: 0s; }
                  SPIN-E div:nth-child(1) { transform: translate(-50%,-50%) rotate(0deg) }
                  SPIN-E div:nth-child(2)::after { animation-delay: 0.1s; }
                  SPIN-E div:nth-child(2) { transform: translate(-50%,-50%) rotate(36deg) }
                  SPIN-E div:nth-child(3)::after { animation-delay: 0.2s; }
                  SPIN-E div:nth-child(3) { transform: translate(-50%,-50%) rotate(72deg) }
                  SPIN-E div:nth-child(4)::after { animation-delay: 0.30000000000000004s; }
                  SPIN-E div:nth-child(4) { transform: translate(-50%,-50%) rotate(108deg) }
                  SPIN-E div:nth-child(5)::after { animation-delay: 0.4s; }
                  SPIN-E div:nth-child(5) { transform: translate(-50%,-50%) rotate(144deg) }
                  SPIN-E div:nth-child(6)::after { animation-delay: 0.5s; }
                  SPIN-E div:nth-child(6) { transform: translate(-50%,-50%) rotate(180deg) }
                  SPIN-E div:nth-child(7)::after { animation-delay: 0.6000000000000001s; }
                  SPIN-E div:nth-child(7) { transform: translate(-50%,-50%) rotate(216deg) }
                  SPIN-E div:nth-child(8)::after { animation-delay: 0.7000000000000001s; }
                  SPIN-E div:nth-child(8) { transform: translate(-50%,-50%) rotate(252deg) }
                  SPIN-E div:nth-child(9)::after { animation-delay: 0.8s; }
                  SPIN-E div:nth-child(9) { transform: translate(-50%,-50%) rotate(288deg) }
                  SPIN-E div:nth-child(10)::after { animation-delay: 0.9s; }
                  SPIN-E div:nth-child(10) { transform: translate(-50%,-50%) rotate(324deg) }
                  </style>"
    `);
  });

  test("style > spinUseSpliceRing", () => {
    document.head.firstChild.textContent = "";
    document.body.innerHTML = "";
    class SpinF extends WUPSpinElement {}
    customElements.define("spin-f", SpinF);
    spinUseSpliceRing(SpinF);
    document.body.appendChild(document.createElement("spin-f"));
    jest.advanceTimersToNextTimer();

    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<spin-f style="position: absolute; transform: translate(300px,200px);" aria-label="Loading. Please wait"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div fade="" style="transform: translate(-300px,-200px); width: 600px; height: 400px;"></div></spin-f>"`
    );
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
            @keyframes WUP-SPIN-1 {
              100% { transform: rotate(360deg); }
            }
            SPIN-F {
              contain: style;
              z-index: 100;
              width: var(--spin-size);
              height: var(--spin-size);
              top:0; left:0;
              pointer-events: none;
            }
            SPIN-F,
            SPIN-F div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-F div {
              animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-F div[fade] {
               display: block;
               position: absolute;
               left:0; top:0;
               animation: none;
               border: none;
               border-radius: var(--border-radius);
               transform: none;
               z-index: -1;
               background: var(--spin-fade);
            }
            SPIN-F div[fade]::after { content: none; }
            @keyframes WUP-SPIN-3 {
                    100% { opacity: 0; background: var(--spin-2); }
                  }
                  :root { --spin-item-size: calc(var(--spin-size) / 10); }
                  SPIN-F { position: relative; }
                  SPIN-F div {
                    animation: WUP-SPIN-3 var(--spin-speed) linear infinite;
                    position: absolute;
                    width: calc(var(--spin-size) / 4);
                    height: var(--spin-item-size);
                    left: 0;
                    top: calc(50% - var(--spin-item-size) / 2);
                    transform-origin: calc(var(--spin-size) / 2);
                    background: var(--spin-1);
                    border-radius: calc(var(--spin-item-size) / 2);
                  }
                  SPIN-F div:nth-child(1) {
                      animation-delay: -1.1s;
                      transform: rotate(0deg);
                    }
                  SPIN-F div:nth-child(2) {
                      animation-delay: -1s;
                      transform: rotate(30deg);
                    }
                  SPIN-F div:nth-child(3) {
                      animation-delay: -0.9s;
                      transform: rotate(60deg);
                    }
                  SPIN-F div:nth-child(4) {
                      animation-delay: -0.8s;
                      transform: rotate(90deg);
                    }
                  SPIN-F div:nth-child(5) {
                      animation-delay: -0.7000000000000001s;
                      transform: rotate(120deg);
                    }
                  SPIN-F div:nth-child(6) {
                      animation-delay: -0.6000000000000001s;
                      transform: rotate(150deg);
                    }
                  SPIN-F div:nth-child(7) {
                      animation-delay: -0.5s;
                      transform: rotate(180deg);
                    }
                  SPIN-F div:nth-child(8) {
                      animation-delay: -0.4s;
                      transform: rotate(210deg);
                    }
                  SPIN-F div:nth-child(9) {
                      animation-delay: -0.30000000000000004s;
                      transform: rotate(240deg);
                    }
                  SPIN-F div:nth-child(10) {
                      animation-delay: -0.2s;
                      transform: rotate(270deg);
                    }
                  SPIN-F div:nth-child(11) {
                      animation-delay: -0.1s;
                      transform: rotate(300deg);
                    }
                  SPIN-F div:nth-child(12) {
                      animation-delay: -0s;
                      transform: rotate(330deg);
                    }
                  </style>"
    `);
  });

  test("style > spinUseHash", () => {
    document.head.firstChild.textContent = "";
    document.body.innerHTML = "";
    class SpinG extends WUPSpinElement {}
    customElements.define("spin-g", SpinG);
    spinUseHash(SpinG);
    document.body.appendChild(document.createElement("spin-g"));
    jest.advanceTimersToNextTimer();

    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<spin-g style="position: absolute; transform: translate(300px,200px);" aria-label="Loading. Please wait"><div></div><div></div><div fade="" style="transform: translate(-300px,-200px); width: 600px; height: 400px;"></div></spin-g>"`
    );
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
            @keyframes WUP-SPIN-1 {
              100% { transform: rotate(360deg); }
            }
            SPIN-G {
              contain: style;
              z-index: 100;
              width: var(--spin-size);
              height: var(--spin-size);
              top:0; left:0;
              pointer-events: none;
            }
            SPIN-G,
            SPIN-G div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-G div {
              animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-G div[fade] {
               display: block;
               position: absolute;
               left:0; top:0;
               animation: none;
               border: none;
               border-radius: var(--border-radius);
               transform: none;
               z-index: -1;
               background: var(--spin-fade);
            }
            SPIN-G div[fade]::after { content: none; }
            @keyframes WUP-SPIN-4-1 {
                  0% {
                    width: var(--spin-item-size);
                    box-shadow: var(--spin-1) var(--spin-end) var(--spin-pad2), var(--spin-1) var(--spin-start) var(--spin-pad);
                  }
                  35% {
                    width: var(--spin-size);
                    box-shadow: var(--spin-1) 0 var(--spin-pad2), var(--spin-1) 0 var(--spin-pad);
                  }
                  70% {
                    width: var(--spin-item-size);
                    box-shadow: var(--spin-1) var(--spin-start) var(--spin-pad2), var(--spin-1) var(--spin-end) var(--spin-pad);
                  }
                  100% { box-shadow: var(--spin-1) var(--spin-end) var(--spin-pad2), var(--spin-1) var(--spin-start) var(--spin-pad); }
                }
                @keyframes WUP-SPIN-4-2 {
                  0% {
                    height: var(--spin-item-size);
                    box-shadow: var(--spin-2) var(--spin-pad) var(--spin-end), var(--spin-2) var(--spin-pad2) var(--spin-start);
                  }
                  35% {
                    height: var(--spin-size);
                    box-shadow: var(--spin-2) var(--spin-pad) 0, var(--spin-2) var(--spin-pad2) 0;
                  }
                  70% {
                    height: var(--spin-item-size);
                    box-shadow: var(--spin-2) var(--spin-pad) var(--spin-start), var(--spin-2) var(--spin-pad2) var(--spin-end);
                  }
                  100% { box-shadow: var(--spin-2) var(--spin-pad) var(--spin-end), var(--spin-2) var(--spin-pad2) var(--spin-start); }
                }
                :root {
                  --spin-2: #b35e03;
                  --spin-item-size: calc(var(--spin-size) / 8);
                  --spin-end: calc((var(--spin-size) - var(--spin-item-size)) / 2);
                  --spin-start: calc((var(--spin-end)) * -1);
                  --spin-pad: calc(var(--spin-size) / 2 - var(--spin-size) / 3 + var(--spin-item-size) / 3);
                  --spin-pad2: calc(-1 * var(--spin-pad));
                }
                SPIN-G {
                  position: relative;
                  padding: 3px;
                }
                SPIN-G>div {
                  position: absolute;
                  transform: translate(-50%, -50%) rotate(165deg);
                  top:50%; left:50%;
                  width: var(--spin-item-size);
                  height: var(--spin-item-size);
                  border-radius: calc(var(--spin-item-size) / 2);
                }
                SPIN-G>div:nth-child(1) {
                  animation: var(--spin-speed) ease 0s infinite normal none running WUP-SPIN-4-1;
                }
                SPIN-G>div:nth-child(2) {
                  animation: var(--spin-speed) ease 0s infinite normal none running WUP-SPIN-4-2;
                }</style>"
    `);
  });
});
