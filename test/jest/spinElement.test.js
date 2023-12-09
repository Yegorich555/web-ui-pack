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
  h.setupLayout(trg, { x: 0, y: 0, h: height, w: width });

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
  WUPSpinElement.$use();
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
  h.baseTestComponent(() => document.createElement("wup-spin"), {
    attrs: {
      "w-fit": { value: true },
      "w-inline": { value: true },
      "w-overflowfade": { value: true },
      "w-overflowoffset": { value: [2, 3] },
      "w-overflowtarget": { value: "body", parsedValue: document.body },
    },
  });

  test("applied styles", () => {
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>:root {
                --base-focus: #00778d;
                --base-btn-bg: #009fbc;
                --base-btn-text: #fff;
                --base-btn-focus: #005766;
                --base-btn2-bg: #6c757d;
                --base-btn2-text: #fff;
                --base-btn3-bg: none;
                --base-btn3-text: inherit;
                --base-sep: #e4e4e4;
                --base-margin: 20px;
                --border-radius: 6px;
                --anim-t: 200ms;
                --anim: var(--anim-t) cubic-bezier(0, 0, 0.2, 1) 0ms;
                --icon-hover-r: 30px;
                --icon-hover-bg: #0001;
                --icon-focus-bg: #0000001a;
                --icon-size: 14px;
                --menu-hover-text: inherit;
                --menu-hover-bg: #f1f1f1;
                
      --wup-icon-cross: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M674.515 93.949a45.925 45.925 0 0 0-65.022 0L384.001 318.981 158.509 93.487a45.928 45.928 0 0 0-65.022 0c-17.984 17.984-17.984 47.034 0 65.018l225.492 225.494L93.487 609.491c-17.984 17.984-17.984 47.034 0 65.018s47.034 17.984 65.018 0l225.492-225.492 225.492 225.492c17.984 17.984 47.034 17.984 65.018 0s17.984-47.034 0-65.018L449.015 383.999l225.492-225.494c17.521-17.521 17.521-47.034 0-64.559z'/%3E%3C/svg%3E");
      --wup-icon-check: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M37.691 450.599 224.76 635.864c21.528 21.32 56.11 21.425 77.478 0l428.035-426.23c21.47-21.38 21.425-56.11 0-77.478s-56.11-21.425-77.478 0L263.5 519.647 115.168 373.12c-21.555-21.293-56.108-21.425-77.478 0s-21.425 56.108 0 77.478z'/%3E%3C/svg%3E");
      --wup-icon-dot: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='20'/%3E%3C/svg%3E");
      --wup-icon-back: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='m509.8 16.068-329.14 329.14c-21.449 21.449-21.449 56.174 0 77.567l329.14 329.14c21.449 21.449 56.174 21.449 77.567 0s21.449-56.174 0-77.567l-290.36-290.36 290.36-290.36c21.449-21.449 21.449-56.173 0-77.567-21.449-21.394-56.173-21.449-77.567 0z'/%3E%3C/svg%3E");
      --wup-icon-eye: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M384 122.182C209.455 122.182 60.392 230.749 0 384c60.392 153.251 209.455 261.818 384 261.818S707.608 537.251 768 384c-60.392-153.251-209.455-261.818-384-261.818zm0 436.363c-96.35 0-174.545-78.197-174.545-174.545S287.651 209.455 384 209.455 558.545 287.651 558.545 384 480.348 558.545 384 558.545zm0-279.272c-57.95 0-104.727 46.778-104.727 104.727S326.051 488.727 384 488.727 488.727 441.949 488.727 384 441.949 279.273 384 279.273z'/%3E%3C/svg%3E");
      --wup-icon-eye-off: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M384 209.375c96.393 0 174.625 78.232 174.625 174.625 0 22.701-4.54 44.005-12.573 63.913l101.981 101.981C700.77 505.889 742.331 448.961 767.826 384c-60.42-153.321-209.55-261.938-384.174-261.938-48.895 0-95.695 8.731-139.001 24.448l75.438 75.438c19.907-8.032 41.212-12.573 63.913-12.573zM34.75 114.03l95.695 95.695C72.469 254.778 27.067 314.85-.174 384.001 60.246 537.322 209.376 645.938 384 645.938c54.133 0 105.823-10.477 152.971-29.337l14.668 14.668 102.33 101.981 44.355-44.355L79.105 69.676 34.75 114.031zm193.135 193.135 54.133 54.133c-1.746 7.334-2.794 15.018-2.794 22.701 0 57.976 46.799 104.775 104.775 104.775 7.684 0 15.367-1.048 22.701-2.794l54.134 54.134c-23.4 11.525-49.244 18.51-76.835 18.51-96.393 0-174.625-78.232-174.625-174.625 0-27.591 6.985-53.435 18.51-76.835zm150.527-27.242 110.014 110.014.698-5.588c0-57.976-46.799-104.775-104.775-104.775l-5.937.349z'/%3E%3C/svg%3E");
      --wup-icon-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='m16.078 258.214 329.139 329.139c21.449 21.449 56.174 21.449 77.567 0l329.139-329.139c21.449-21.449 21.449-56.174 0-77.567s-56.174-21.449-77.567 0L384 471.003 93.644 180.647c-21.449-21.449-56.173-21.449-77.567 0s-21.449 56.173 0 77.567z'/%3E%3C/svg%3E");
      --wup-icon-date: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M652.801 76.8c42.24 0 76.8 34.56 76.8 76.8v537.601c0 42.24-34.56 76.8-76.8 76.8H115.2c-42.624 0-76.8-34.56-76.8-76.8l.384-537.601c0-42.24 33.792-76.8 76.416-76.8h38.4V0h76.8v76.8h307.2V0h76.8v76.8h38.4zM192 345.6h76.8v76.8H192v-76.8zm230.4 0v76.8h-76.8v-76.8h76.8zm153.601 0h-76.8v76.8h76.8v-76.8zM115.2 691.2h537.601V268.8H115.2v422.4z'/%3E%3C/svg%3E");
      --wup-icon-time-lg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M383.615 0C171.647 0 0 172.032 0 384s171.648 384 383.615 384c212.352 0 384.383-172.032 384.383-384S595.966 0 383.615 0zM384 691.199C214.272 691.199 76.801 553.727 76.801 384S214.273 76.801 384 76.801c169.728 0 307.199 137.472 307.199 307.199S553.727 691.199 384 691.199zm-38.401-499.198h57.6v201.6l172.8 102.528-28.8 47.232-201.6-120.96v-230.4z' /%3E%3C/svg%3E");
      --wup-icon-time: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAABOAAAATgGxzR8zAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAASxJREFUOI2V00kuRFEUBuCvXqLMrEBIRBeKxCIMrcFAYguMRMz13QYwESxAMxIjXYKEiIHYAQYSTRncU1JRT+FPbnLfOf9/unsetejHPK7wHOcSsyjl8L/QiBW84wMnWItzGrY3LKKYJz5AGZtoy0nQjq3g7H0PshqOiXolBiaDu1Ax9EXZmznkY4zm2LeldnozjKCA8T9kr2AMGUYyDEpDuvtHgFucYzBDC27+Ia7gGq2ZNJDCD6QXDKMnx1cg9fGArh8CDOFM2olpNFX5unEPc9KStNcpdwBHOIzvztDMkNbzTVqSeiigOe47oflqbVmaxeQvQWAquPPVxiL2w7GNjhxhZ2QuYxcN3wlFLEVpH9Lw1rER9zJepZnViKtRkn7dSzzhERfSK9Q85ye76kkmcVhDgAAAAABJRU5ErkJggg==');
              }
              [wupdark] {
                --base-btn-focus: #bdbdbd;
                --base-sep: #141414;
                --icon: #fff;
                --icon-hover-bg: #fff1;
                --icon-focus-bg: #fff2;
                --scroll: #fff2;
                --scroll-hover: #fff3;
                --menu-hover-text: inherit;
                --menu-hover-bg: #222a36;
              }
      .wup-hidden, [wup-hidden] {
      position: absolute;
      height:1px; width:1px;
      overflow:hidden;
      clip:rect(1px,1px,1px,1px);
      min-width:initial;
      padding:0;}

      [wup-icon] {
        display: inline-block;
        cursor: pointer;
        box-shadow: none;
        border: none;
        margin: 0;
        padding: 0;
        width: var(--icon-hover-r, 2em);
        height: var(--icon-hover-r, 2em);
        background: none;
        outline: none;
        border-radius: 50%;
      }
      [wup-icon]:after {
        content: "";
        display: inline-block;
        border-radius: 50%;
        width: 100%;
        height: 100%;
        background: var(--icon, #000);
        -webkit-mask-size: var(--icon-size, 1em);
        mask-size: var(--icon-size, 1em);
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;

        -webkit-mask-image: var(--icon-img);
        mask-image: var(--icon-img);
      }
      [wup-icon]:focus {
         box-shadow: inset 0 0 0 99999px var(--icon-focus-bg);
      }
      [wup-icon]:focus:after {
         background: var(--icon-hover, var(--icon, #000));
      }
      @media (hover: hover) and (pointer: fine) {
        [wup-icon]:hover {
          box-shadow: inset 0 0 0 99999px var(--icon-hover-bg);
        }
        [wup-icon]:hover:after {
          background: var(--icon-hover, var(--icon, #000));
        }
        [wup-icon]:focus:hover {
         opacity: 0.9;
        }
      }
      :root {
                --spin-1: #ffa500;
                --spin-2: #fff;
                --spin-t: 1.2s;
                --spin-size: 3em;
                --spin-item-size: calc(var(--spin-size) / 8);
                --spin-fade: rgba(255,255,255,0.43);
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
            WUP-SPIN>div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            WUP-SPIN>div {
              animation: WUP-SPIN-1 var(--spin-t) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            WUP-SPIN>div[fade] {
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
            WUP-SPIN>div[fade]:after { content: none; }
            WUP-SPIN>div {
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
      `"<body aria-busy="true"><wup-spin style="" aria-label="Loading. Please wait"><div></div></wup-spin></body>"`
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
            SPIN-A>div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-A>div {
              animation: WUP-SPIN-1 var(--spin-t) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-A>div[fade] {
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
            SPIN-A>div[fade]:after { content: none; }
            :root { --spin-2: transparent; }
             SPIN-A>div {
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
            SPIN-B>div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-B>div {
              animation: WUP-SPIN-1 var(--spin-t) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-B>div[fade] {
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
            SPIN-B>div[fade]:after { content: none; }
            @keyframes WUP-SPIN-2-2 {
                0% { transform: translate(-50%, -50%) rotate(360deg); }
                100% { transform: translate(-50%, -50%) rotate(0deg); }
             }
             :root {
                --spin-2: #b35e03;
                --spin-item-size: max(1px, calc(var(--spin-size) / 12));
             }
             SPIN-B { position: relative; }
             SPIN-B>div:nth-child(1) {
                border: var(--spin-item-size) solid;
                border-color: transparent var(--spin-1) transparent var(--spin-1);
             }
             SPIN-B>div:nth-child(2) {
                border: var(--spin-item-size) solid;
                border-color: var(--spin-2) transparent var(--spin-2) transparent;
                position: absolute;
                width: calc(100% - var(--spin-item-size) * 3);
                height: calc(100% - var(--spin-item-size) * 3);
                left: 50%; top: 50%;
                transform: translate(-50%,-50%);
                animation: WUP-SPIN-2-2 var(--spin-t) linear infinite;
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
            SPIN-C>div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-C>div {
              animation: WUP-SPIN-1 var(--spin-t) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-C>div[fade] {
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
            SPIN-C>div[fade]:after { content: none; }
            SPIN-C { position: relative; }
                  SPIN-C>div {
                    animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
                    position: absolute;
                    border: var(--spin-item-size) solid;
                    border-color: var(--spin-1) transparent transparent transparent;
                  }
                  SPIN-C>div:nth-child(1) { animation-delay: -0.45s }
              SPIN-C>div:nth-child(2) { animation-delay: -0.30s }
              SPIN-C>div:nth-child(3) { animation-delay: -0.15s }
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
            SPIN-D>div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-D>div {
              animation: WUP-SPIN-1 var(--spin-t) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-D>div[fade] {
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
            SPIN-D>div[fade]:after { content: none; }
            :root { --spin-step: 24deg; }
                  SPIN-D { position: relative; }
                  SPIN-D>div {
                    animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
                    position: absolute;
                  }
                  SPIN-D>div:after {
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
                  SPIN-D>div:nth-child(1) { animation-delay: -0.036s; }
                  SPIN-D>div:nth-child(1):after { transform: rotate(calc(45deg + var(--spin-step) * 0)); }
                  SPIN-D>div:nth-child(2) { animation-delay: -0.072s; }
                  SPIN-D>div:nth-child(2):after { transform: rotate(calc(45deg + var(--spin-step) * 1)); }
                  SPIN-D>div:nth-child(3) { animation-delay: -0.10799999999999998s; }
                  SPIN-D>div:nth-child(3):after { transform: rotate(calc(45deg + var(--spin-step) * 2)); }
                  SPIN-D>div:nth-child(4) { animation-delay: -0.144s; }
                  SPIN-D>div:nth-child(4):after { transform: rotate(calc(45deg + var(--spin-step) * 3)); }
                  SPIN-D>div:nth-child(5) { animation-delay: -0.18s; }
                  SPIN-D>div:nth-child(5):after { transform: rotate(calc(45deg + var(--spin-step) * 4)); }
                  SPIN-D>div:nth-child(6) { animation-delay: -0.21599999999999997s; }
                  SPIN-D>div:nth-child(6):after { transform: rotate(calc(45deg + var(--spin-step) * 5)); }
                  SPIN-D>div:nth-child(7) { animation-delay: -0.252s; }
                  SPIN-D>div:nth-child(7):after { transform: rotate(calc(45deg + var(--spin-step) * 6)); }
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
            SPIN-E>div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-E>div {
              animation: WUP-SPIN-1 var(--spin-t) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-E>div[fade] {
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
            SPIN-E>div[fade]:after { content: none; }
            @keyframes WUP-SPIN-2 {
                    0%,20%,80%,100% { transform: scale(1); background: var(--spin-1) }
                    50% { transform: scale(1.4); background: var(--spin-2) }
                  }
                  :root { --spin-2: #ff5200; }
                  SPIN-E { position: relative; }
                  SPIN-E>div {
                    position: absolute;
                    width: calc(100% / 1.4142135623730951);
                    height: calc(100% / 1.4142135623730951);
                    animation: none;
                    top:50%; left:50%;
                  }
                  SPIN-E>div:after {
                    animation: WUP-SPIN-2 var(--spin-t) linear infinite;
                    content: " ";
                    display: block;
                    width: var(--spin-item-size);
                    height: var(--spin-item-size);
                    border-radius: 50%;
                    background: var(--spin-1);
                  }
                  SPIN-E>div:nth-child(1):after { animation-delay: 0s; }
                  SPIN-E>div:nth-child(1) { transform: translate(-50%,-50%) rotate(0deg) }
                  SPIN-E>div:nth-child(2):after { animation-delay: 0.1s; }
                  SPIN-E>div:nth-child(2) { transform: translate(-50%,-50%) rotate(36deg) }
                  SPIN-E>div:nth-child(3):after { animation-delay: 0.2s; }
                  SPIN-E>div:nth-child(3) { transform: translate(-50%,-50%) rotate(72deg) }
                  SPIN-E>div:nth-child(4):after { animation-delay: 0.30000000000000004s; }
                  SPIN-E>div:nth-child(4) { transform: translate(-50%,-50%) rotate(108deg) }
                  SPIN-E>div:nth-child(5):after { animation-delay: 0.4s; }
                  SPIN-E>div:nth-child(5) { transform: translate(-50%,-50%) rotate(144deg) }
                  SPIN-E>div:nth-child(6):after { animation-delay: 0.5s; }
                  SPIN-E>div:nth-child(6) { transform: translate(-50%,-50%) rotate(180deg) }
                  SPIN-E>div:nth-child(7):after { animation-delay: 0.6000000000000001s; }
                  SPIN-E>div:nth-child(7) { transform: translate(-50%,-50%) rotate(216deg) }
                  SPIN-E>div:nth-child(8):after { animation-delay: 0.7000000000000001s; }
                  SPIN-E>div:nth-child(8) { transform: translate(-50%,-50%) rotate(252deg) }
                  SPIN-E>div:nth-child(9):after { animation-delay: 0.8s; }
                  SPIN-E>div:nth-child(9) { transform: translate(-50%,-50%) rotate(288deg) }
                  SPIN-E>div:nth-child(10):after { animation-delay: 0.9s; }
                  SPIN-E>div:nth-child(10) { transform: translate(-50%,-50%) rotate(324deg) }
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
            SPIN-F>div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-F>div {
              animation: WUP-SPIN-1 var(--spin-t) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-F>div[fade] {
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
            SPIN-F>div[fade]:after { content: none; }
            @keyframes WUP-SPIN-3 {
                    100% { opacity: 0; background: var(--spin-2); }
                  }
                  :root { --spin-item-size: calc(var(--spin-size) / 10); }
                  SPIN-F { position: relative; }
                  SPIN-F>div {
                    animation: WUP-SPIN-3 var(--spin-t) linear infinite;
                    position: absolute;
                    width: calc(var(--spin-size) / 4);
                    height: var(--spin-item-size);
                    left: 0;
                    top: calc(50% - var(--spin-item-size) / 2);
                    transform-origin: calc(var(--spin-size) / 2);
                    background: var(--spin-1);
                    border-radius: calc(var(--spin-item-size) / 2);
                  }
                  SPIN-F>div:nth-child(1) {
                      animation-delay: -1.1s;
                      transform: rotate(0deg);
                    }
                  SPIN-F>div:nth-child(2) {
                      animation-delay: -1s;
                      transform: rotate(30deg);
                    }
                  SPIN-F>div:nth-child(3) {
                      animation-delay: -0.9s;
                      transform: rotate(60deg);
                    }
                  SPIN-F>div:nth-child(4) {
                      animation-delay: -0.8s;
                      transform: rotate(90deg);
                    }
                  SPIN-F>div:nth-child(5) {
                      animation-delay: -0.7000000000000001s;
                      transform: rotate(120deg);
                    }
                  SPIN-F>div:nth-child(6) {
                      animation-delay: -0.6000000000000001s;
                      transform: rotate(150deg);
                    }
                  SPIN-F>div:nth-child(7) {
                      animation-delay: -0.5s;
                      transform: rotate(180deg);
                    }
                  SPIN-F>div:nth-child(8) {
                      animation-delay: -0.4s;
                      transform: rotate(210deg);
                    }
                  SPIN-F>div:nth-child(9) {
                      animation-delay: -0.30000000000000004s;
                      transform: rotate(240deg);
                    }
                  SPIN-F>div:nth-child(10) {
                      animation-delay: -0.2s;
                      transform: rotate(270deg);
                    }
                  SPIN-F>div:nth-child(11) {
                      animation-delay: -0.1s;
                      transform: rotate(300deg);
                    }
                  SPIN-F>div:nth-child(12) {
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
            SPIN-G>div {
              display: inline-block;
              box-sizing: border-box;
              border-radius: 50%;
            }
            SPIN-G>div {
              animation: WUP-SPIN-1 var(--spin-t) linear infinite;
              width: 100%; height: 100%;
              left:0; top:0;
            }
            SPIN-G>div[fade] {
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
            SPIN-G>div[fade]:after { content: none; }
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
                  animation: var(--spin-t) ease 0s infinite normal none running WUP-SPIN-4-1;
                }
                SPIN-G>div:nth-child(2) {
                  animation: var(--spin-t) ease 0s infinite normal none running WUP-SPIN-4-2;
                }</style>"
    `);
  });
});
