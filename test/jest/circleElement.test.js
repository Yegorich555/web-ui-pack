import { WUPCircleElement } from "web-ui-pack";
import * as h from "../testHelper";

let nextFrame = async () => {};
/** @type WUPCircleElement */
let el;

const getItems = () => [{ value: 50 }];

beforeEach(() => {
  WUPCircleElement.$use();
  jest.useFakeTimers();
  const a = h.useFakeAnimation();
  nextFrame = a.nextFrame;
  el = document.body.appendChild(document.createElement("wup-circle"));
  jest.advanceTimersToNextTimer(); // gotReady has timeout
  jest.spyOn(window, "matchMedia").mockReturnValue({ matches: true }); // simulate 'prefers-reduced-motion'
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("circleElement", () => {
  h.baseTestComponent(() => document.createElement("wup-circle"), {
    attrs: {
      "w-items": { value: getItems() },
      "w-width": { value: 10 },
      "w-corner": { value: 0.4 },
      "w-from": { value: -90 },
      "w-to": { value: 90 },
      "w-min": { value: 4 },
      "w-max": { value: 20 },
      "w-space": { value: 2 },
      "w-minsize": { value: 10 },
      "w-back": { value: true },
      "w-hoverclosetimeout": { value: 100 },
      "w-hoveropentimeout": { value: 107 },
    },
    onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("render single item", async () => {
    el.$options.items = [{ value: 0 }];
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="0%"><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path><g><path fill="#000" d="M 50 0 A 0 0 0 0 1 50 0 A 50 50 0 0 1 50 0 A 0 0 0 0 1 50 0 L 50 14 A 0 0 0 0 1 50 14 A 36 36 0 0 0 50 14 A 0 0 0 0 1 50 14 Z"></path></g></svg><strong>0%</strong>"`
    );

    const onErr = h.mockConsoleError();
    el.$options.items = [{ value: 2 }];
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="2%"><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path><g><path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 55.35049498668092 0.2871022430043553 A 3.5 3.5 0 0 1 58.197441517234004 4.228262513079883 L 56.96341806302674 11.11863159713237 A 3.5 3.5 0 0 1 52.876676627956726 14.115118342424935 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path></g></svg><strong>2%</strong>"`
    );
    expect(onErr).not.toBeCalled();

    el.$options.items = [{ value: 100 }];
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="100%"><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path><g><path fill="#000" d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path></g></svg><strong>100%</strong>"`
    );

    el.$options.items = [{ value: 50 }];
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="50%"><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path><g><path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 53.497142366876645 99.87755001266399 A 3.5 3.5 0 0 1 50 96.5 L 50 89.5 A 3.5 3.5 0 0 1 53.494488844972906 85.82999508390085 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path></g></svg><strong>50%</strong>"`
    );

    el.$options.back = false;
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="50%"><g><path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 53.497142366876645 99.87755001266399 A 3.5 3.5 0 0 1 50 96.5 L 50 89.5 A 3.5 3.5 0 0 1 53.494488844972906 85.82999508390085 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path></g></svg><strong>50%</strong>"`
    );

    el.$options.width += 5;
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="50%"><g><path fill="#000" d="M 50 4.75 A 4.75 4.75 0 0 1 54.742858431727875 0.22545536223773865 A 50 50 0 0 1 54.742858431727875 99.77454463776226 A 4.75 4.75 0 0 1 50 95.25 L 50 85.75 A 4.75 4.75 0 0 1 54.73143494008856 80.63680014961923 A 31 31 0 0 0 54.73143494008856 19.363199850380767 A 4.75 4.75 0 0 1 50 14.25 Z"></path></g></svg><strong>50%</strong>"`
    );

    el.$options.corner = 0.2;
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="50%"><g><path fill="#000" d="M 50 3.799999999999997 A 3.8000000000000003 3.8000000000000003 0 0 1 53.796342922990306 0.14433050884722576 A 50 50 0 0 1 53.79634292299028 99.85566949115278 A 3.8000000000000003 3.8000000000000003 0 0 1 50 96.2 L 50 84.8 A 3.8000000000000003 3.8000000000000003 0 0 1 53.79049067128474 80.76738826210153 A 31 31 0 0 0 53.790490671284736 19.232611737898463 A 3.8000000000000003 3.8000000000000003 0 0 1 50 15.200000000000003 Z"></path></g></svg><strong>50%</strong>"`
    );
    expect(el.hasAttribute("half")).toBe(false);

    el.$options.from = -90;
    el.$options.to = 90;
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="50%"><g><path fill="#000" d="M 3.799999999999997 49.99999999999999 A 3.8000000000000003 3.8000000000000003 0 0 1 0.14433050884722576 46.203657077009694 A 50 50 0 0 1 46.2036570770097 0.14433050884722576 A 3.8000000000000003 3.8000000000000003 0 0 1 50 3.799999999999997 L 50 15.200000000000003 A 3.8000000000000003 3.8000000000000003 0 0 1 46.20950932871527 19.232611737898463 A 31 31 0 0 0 19.232611737898463 46.20950932871528 A 3.8000000000000003 3.8000000000000003 0 0 1 15.200000000000003 49.99999999999999 Z"></path></g></svg><strong>50%</strong>"`
    );
    expect(el.hasAttribute("half")).toBe(true);
    expect(el.getAttribute("half")).toBe("");

    el.$options.min = 4;
    el.$options.max = 20;
    el.$options.items = [{ value: 16 }];
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="75%"><g><path fill="#000" d="M 3.799999999999997 49.99999999999999 A 3.8000000000000003 3.8000000000000003 0 0 1 0.14433050884722576 46.203657077009694 A 50 50 0 0 1 82.5688621532334 12.062298197654606 A 3.8000000000000003 3.8000000000000003 0 0 1 82.66833329081851 17.331666709181505 L 74.60731598529185 25.392684014708152 A 3.8000000000000003 3.8000000000000003 0 0 1 69.0755472218416 25.56388946277884 A 31 31 0 0 0 19.232611737898463 46.20950932871528 A 3.8000000000000003 3.8000000000000003 0 0 1 15.200000000000003 49.99999999999999 Z"></path></g></svg><strong>75%</strong>"`
    );

    el.$options.items = [{ value: 20, color: "#fff" }];
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="100%"><g><path fill="#fff" style="fill: #fff;" d="M 3.799999999999997 49.99999999999999 A 3.8000000000000003 3.8000000000000003 0 0 1 0.14433050884722576 46.203657077009694 A 50 50 0 0 1 99.85566949115278 46.2036570770097 A 3.8000000000000003 3.8000000000000003 0 0 1 96.2 50 L 84.8 50 A 3.8000000000000003 3.8000000000000003 0 0 1 80.76738826210153 46.20950932871527 A 31 31 0 0 0 19.232611737898463 46.20950932871528 A 3.8000000000000003 3.8000000000000003 0 0 1 15.200000000000003 49.99999999999999 Z"></path></g></svg><strong>100%</strong>"`
    );
  });

  test("render several items", async () => {
    el.$options.items = [{ value: 10 }, { value: 5 }, { value: 20 }];
    await nextFrame(20);
    expect(el).toMatchInlineSnapshot(`
      <wup-circle>
        <svg
          aria-label="Values: 10,5,20"
          role="img"
          viewBox="0 0 100 100"
        >
          <path
            d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"
          />
          <g>
            <path
              d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 99.61312102035971 56.2079161253307 A 3.5 3.5 0 0 1 95.62339982782902 58.98640017749322 L 88.75536114406981 57.63360875292435 A 3.5 3.5 0 0 1 85.82987240255204 53.49574650351527 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"
              fill="#000"
            />
            <path
              d="M 95.28198644199514 60.573159597157705 A 3.5 3.5 0 0 1 97.77588600117025 64.74668494283326 A 50 50 0 0 1 75.22368290820935 93.17135416623049 A 3.5 3.5 0 0 1 70.59241589365789 91.69175467238847 L 67.49248231826853 85.41557654966333 A 3.5 3.5 0 0 1 69.00037702936372 80.57753542622471 A 36 36 0 0 0 84.09689383521646 61.54997102983283 A 3.5 3.5 0 0 1 88.4653433216948 58.98150116317697 Z"
              fill="#000"
            />
            <path
              d="M 69.12485029557344 92.3850221324928 A 3.5 3.5 0 0 1 67.32632732218559 96.90200828881942 A 50 50 0 1 1 44.76428660556784 0.2748825516584219 A 3.5 3.5 0 0 1 48.37717340333367 3.528326543612053 L 48.62146988025118 10.524062332745721 A 3.5 3.5 0 0 1 45.257191107932286 14.313787482932241 A 36 36 0 1 0 61.551167850210966 84.09648840124527 A 3.5 3.5 0 0 1 66.24584057365915 86.00448116631108 Z"
              fill="#000"
            />
          </g>
        </svg>
      </wup-circle>
    `);

    el.$options.items = [
      { value: 10, color: "#ff1" },
      { value: 5, color: "#ff2" },
      { value: 20, color: "#ff3" },
      { value: 17, color: "#ff4" },
      { value: 12, color: "#ff5" },
    ];
    await nextFrame(20);
    expect(el).toMatchInlineSnapshot(`
      <wup-circle>
        <svg
          aria-label="Values: 10,5,20,17,12"
          role="img"
          viewBox="0 0 100 100"
        >
          <path
            d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"
          />
          <g>
            <path
              d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 88.67918147508456 18.315288853810348 A 3.5 3.5 0 0 1 87.94453482819486 23.121341613244404 L 82.2324543164236 27.167591262863525 A 3.5 3.5 0 0 1 77.21774891300583 26.43744190227705 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"
              fill="#ff1"
              style="fill: #ff1;"
            />
            <path
              d="M 88.85947169254078 24.46196053381109 A 3.5 3.5 0 0 1 93.60269682999095 25.529511056133412 A 50 50 0 0 1 99.24349787047106 41.33524856208149 A 3.5 3.5 0 0 1 96.24791228763976 45.164650060773305 L 89.28586097552194 45.89255220216227 A 3.5 3.5 0 0 1 85.27237405339017 42.798637029163956 A 36 36 0 0 0 81.86187255363001 33.24228305000236 A 3.5 3.5 0 0 1 83.00965874957765 28.30639658248469 Z"
              fill="#ff2"
              style="fill: #ff2;"
            />
            <path
              d="M 96.38849058831038 46.781624487689534 A 3.5 3.5 0 0 1 99.9999865954207 50.03661226230194 A 50 50 0 0 1 40.12094366031412 99.01432694465274 A 3.5 3.5 0 0 1 37.646750368349856 94.8290890331059 L 39.506379345157406 88.08062401736953 A 3.5 3.5 0 0 1 43.85027694589809 85.47084586470766 A 36 36 0 0 0 85.98593477538591 51.00622976584411 A 3.5 3.5 0 0 1 89.40527695136043 47.266111123951326 Z"
              fill="#ff3"
              style="fill: #ff3;"
            />
            <path
              d="M 36.08976298936481 94.37065816852343 A 3.5 3.5 0 0 1 31.74238600616536 96.54739016585285 A 50 50 0 0 1 2.025513360215207 35.91282030890815 A 3.5 3.5 0 0 1 6.409319301687823 33.81041828033243 L 12.971357256272455 36.24755961447594 A 3.5 3.5 0 0 1 15.195092734439292 40.80117234449307 A 36 36 0 0 0 35.94717217804374 83.14389883834508 A 3.5 3.5 0 0 1 38.18377716300881 87.6912042506812 Z"
              fill="#ff4"
              style="fill: #ff4;"
            />
            <path
              d="M 7.000881820428873 32.298987718797676 A 3.5 3.5 0 0 1 5.208866505014811 27.779415843987902 A 50 50 0 0 1 44.76428660556784 0.2748825516584219 A 3.5 3.5 0 0 1 48.37717340333367 3.528326543612053 L 48.62146988025118 10.524062332745721 A 3.5 3.5 0 0 1 45.257191107932286 14.313787482932241 A 36 36 0 0 0 18.197802085489975 33.12930920779074 A 3.5 3.5 0 0 1 13.47386735283743 34.96365623424749 Z"
              fill="#ff5"
              style="fill: #ff5;"
            />
          </g>
        </svg>
      </wup-circle>
    `);

    el.$options.from = -90;
    el.$options.to = 90;
    await nextFrame(20);
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#ff1" style="fill: #ff1;" d="M 3.5 49.99999999999999 A 3.5 3.5 0 0 1 0.12244998733601875 46.50285763312336 A 50 50 0 0 1 3.9286142981349528 30.572508666583204 A 3.5 3.5 0 0 1 8.522239168596897 28.979882102782526 L 14.766203164722093 32.144200926019565 A 3.5 3.5 0 0 1 16.460160555005793 36.920276378913414 A 36 36 0 0 0 14.170004916099138 46.50551115502707 A 3.5 3.5 0 0 1 10.5 49.99999999999999 Z"></path>",
        "<path fill="#ff2" style="fill: #ff2;" d="M 9.281097835043909 27.545134013298274 A 3.5 3.5 0 0 1 8.012231913790622 22.851752705953615 A 50 50 0 0 1 10.762152569720016 19.009818828569745 A 3.5 3.5 0 0 1 15.613982429660247 18.697415511618118 L 20.790372171431823 23.40963253137453 A 3.5 3.5 0 0 1 21.151884455619903 28.46430336538668 A 36 36 0 0 0 20.312047619648908 29.63764543423315 A 3.5 3.5 0 0 1 15.41082504267171 30.92543641989853 Z"></path>",
        "<path fill="#ff3" style="fill: #ff3;" d="M 16.727373906617046 17.516429493512703 A 3.5 3.5 0 0 1 16.753604271403972 12.654623163534794 A 50 50 0 0 1 53.53291219398981 0.12497086287008585 A 3.5 3.5 0 0 1 56.52177532688778 3.9596215633972207 L 55.5400026970337 10.89043122052022 A 3.5 3.5 0 0 1 51.56532449539042 14.034047222072225 A 36 36 0 0 0 26.803342912374795 22.469742101478104 A 3.5 3.5 0 0 1 21.736156329276845 22.406429354704336 Z"></path>",
        "<path fill="#ff4" style="fill: #ff4;" d="M 58.124588473001225 4.215274794486582 A 3.5 3.5 0 0 1 62.15807032615995 1.5007079851246843 A 50 50 0 0 1 89.26006259511735 19.037967039816863 A 3.5 3.5 0 0 1 88.43642333441427 23.829570862179313 L 82.65029509052395 27.769205356044793 A 3.5 3.5 0 0 1 77.64999110590381 26.94619354979659 A 36 36 0 0 0 59.70103605477782 15.331716231346256 A 3.5 3.5 0 0 1 56.901532143732226 11.107599018972472 Z"></path>",
        "<path fill="#ff5" style="fill: #ff5;" d="M 89.32634370923475 25.186925009924067 A 3.5 3.5 0 0 1 94.04895765533014 26.34224589106286 A 50 50 0 0 1 99.87755001266399 46.50285763312336 A 3.5 3.5 0 0 1 96.5 50 L 89.5 50 A 3.5 3.5 0 0 1 85.82999508390085 46.50551115502708 A 36 36 0 0 0 82.16713366735428 33.835980956873286 A 3.5 3.5 0 0 1 83.40624895730694 28.922226621333348 Z"></path>",
      ]
    `);

    el.$options.items = [{ value: 0 }, { value: 10 }];
    await nextFrame(20);
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 0 49.99999999999999 A 0 0 0 0 1 0 49.99999999999999 A 50 50 0 0 1 0 49.99999999999999 A 0 0 0 0 1 0 49.99999999999999 L 14 49.99999999999999 A 0 0 0 0 1 14 49.99999999999999 A 36 36 0 0 0 14 49.99999999999999 A 0 0 0 0 1 14 49.99999999999999 Z"></path>",
        "<path fill="#000" d="M 3.528326543612046 48.377173403333714 A 3.5 3.5 0 0 1 0.2748825516584219 44.76428660556785 A 50 50 0 0 1 99.87755001266399 46.50285763312336 A 3.5 3.5 0 0 1 96.5 50 L 89.5 50 A 3.5 3.5 0 0 1 85.82999508390085 46.50551115502708 A 36 36 0 0 0 14.313787482932241 45.25719110793229 A 3.5 3.5 0 0 1 10.524062332745714 48.621469880251226 Z"></path>",
      ]
    `);
  });

  test("animation", async () => {
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        /** @type CSSStyleDeclaration */
        return {
          getPropertyValue: (s) => {
            if (s === "--anim-t") {
              return `32ms`; // 3steps
            }
            return orig(elem).getPropertyValue(s);
          },
        };
      }
      return orig(elem);
    });
    jest.spyOn(window, "matchMedia").mockReturnValue({ matches: false }); // simulate 'no prefers-reduced-motion'

    // for single item
    el = document.body.appendChild(document.createElement("wup-circle"));
    el.$options.items = [{ value: 100 }];
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 50 0 A 0 0 0 0 1 50 0 A 50 50 0 0 1 50 0 A 0 0 0 0 1 50 0 L 50 14 A 0 0 0 0 1 50 14 A 36 36 0 0 0 50 14 A 0 0 0 0 1 50 14 Z"></path>",
      ]
    `);
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 46.95689714871428 99.90730933477076 A 3.5 3.5 0 0 1 43.93053206176761 96.10218605388218 L 44.84421540730797 89.16207202426551 A 3.5 3.5 0 0 1 48.78784018291175 85.97958683167215 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path>",
      ]
    `);
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path>",
      ]
    `);

    // for severals items
    el = document.body.appendChild(document.createElement("wup-circle"));
    el.$options.items = [{ value: 10 }, { value: 20 }];
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 50 0 A 0 0 0 0 1 50 0 A 50 50 0 0 1 50 0 A 0 0 0 0 1 50 0 L 50 14 A 0 0 0 0 1 50 14 A 36 36 0 0 0 50 14 A 0 0 0 0 1 50 14 Z"></path>",
      ]
    `);
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 95.44145422115497 70.85843326490934 A 3.5 3.5 0 0 1 90.80028100488806 72.30665976613645 L 84.65830321920598 68.94866797338473 A 3.5 3.5 0 0 1 83.11449981824265 64.12196522399088 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path>",
      ]
    `);
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 95.44145422115497 70.85843326490934 A 3.5 3.5 0 0 1 90.80028100488806 72.30665976613645 L 84.65830321920598 68.94866797338473 A 3.5 3.5 0 0 1 83.11449981824265 64.12196522399088 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path>",
        "<path fill="#000"></path>",
      ]
    `);
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 95.44145422115497 70.85843326490934 A 3.5 3.5 0 0 1 90.80028100488806 72.30665976613645 L 84.65830321920598 68.94866797338473 A 3.5 3.5 0 0 1 83.11449981824265 64.12196522399088 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path>",
        "<path fill="#000" d="M 93.00745739476827 75.50212948828377 A 0 0 0 0 1 93.00745739476827 75.50212948828377 A 50 50 0 0 1 93.00745739476827 75.50212948828377 A 0 0 0 0 1 93.00745739476827 75.50212948828377 L 80.96536932423315 68.36153323156431 A 0 0 0 0 1 80.96536932423315 68.36153323156431 A 36 36 0 0 0 80.96536932423315 68.36153323156431 A 0 0 0 0 1 80.96536932423315 68.36153323156431 Z"></path>",
      ]
    `);
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 95.44145422115497 70.85843326490934 A 3.5 3.5 0 0 1 90.80028100488806 72.30665976613645 L 84.65830321920598 68.94866797338473 A 3.5 3.5 0 0 1 83.11449981824265 64.12196522399088 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path>",
        "<path fill="#000" d="M 89.99693537713449 73.7169804241039 A 3.5 3.5 0 0 1 91.11844059292036 78.44773880656385 A 50 50 0 0 1 7.631215827760663 23.45030833011047 A 3.5 3.5 0 0 1 12.420502340737471 22.613299656996247 L 18.077631020626452 26.736028740889285 A 3.5 3.5 0 0 1 18.98546805943908 31.721630036900816 A 36 36 0 0 0 79.03680160011521 71.28060508621752 A 3.5 3.5 0 0 1 83.97589134186694 70.14668229574417 Z"></path>",
      ]
    `);
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 95.44145422115497 70.85843326490934 A 3.5 3.5 0 0 1 90.80028100488806 72.30665976613645 L 84.65830321920598 68.94866797338473 A 3.5 3.5 0 0 1 83.11449981824265 64.12196522399088 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path>",
        "<path fill="#000" d="M 89.99693537713449 73.7169804241039 A 3.5 3.5 0 0 1 91.11844059292036 78.44773880656385 A 50 50 0 1 1 44.76428660556784 0.2748825516584219 A 3.5 3.5 0 0 1 48.37717340333367 3.528326543612053 L 48.62146988025118 10.524062332745721 A 3.5 3.5 0 0 1 45.257191107932286 14.313787482932241 A 36 36 0 1 0 79.03680160011521 71.28060508621752 A 3.5 3.5 0 0 1 83.97589134186694 70.14668229574417 Z"></path>",
      ]
    `);

    // no-animation on 2nd render
    await nextFrame(10);
    const exp = Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML);
    el.$options.items = [...el.$options.items];
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toStrictEqual(exp);
    await nextFrame();
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toStrictEqual(exp);
  });

  test("option minsize", async () => {
    const map = (items = [5], minSize = 10, angleMin = 0, angleMax = 360, space = 2) =>
      WUPCircleElement.prototype.mapItems(
        null,
        null,
        angleMin,
        angleMax,
        space,
        minSize,
        400, // animtime
        items.map((value) => ({ value }))
      );

    expect(map([1, 100, 200])).toStrictEqual([
      { angleFrom: 0, angleTo: 10, ms: 11.299435028248588, v: 10 },
      { angleFrom: 12, angleTo: 125.19601328903653, ms: 127.90509976162319, v: 113.19601328903653 },
      { angleFrom: 127.19601328903653, angleTo: 358, ms: 260.79546521012816, v: 230.80398671096344 },
    ]);
    expect(map([4, 100, 200])).toStrictEqual([
      { angleFrom: 0, angleTo: 10, ms: 11.299435028248588, v: 10 },
      { angleFrom: 12, angleTo: 125.77631578947368, ms: 128.5608088016652, v: 113.77631578947368 },
      { angleFrom: 127.77631578947368, angleTo: 358, ms: 260.13975617008623, v: 230.2236842105263 },
    ]);

    // all values must be >= 10
    expect(map([1, 25, 170, 2, 1], 10, -90, 90)).toStrictEqual([
      { angleFrom: -90, angleTo: -80, ms: 23.25581395348837, v: 10 },
      { angleFrom: -78, angleTo: -68, ms: 23.25581395348837, v: 10 },
      { angleFrom: -66, angleTo: 66, ms: 306.9767441860465, v: 132 },
      { angleFrom: 68, angleTo: 78, ms: 23.25581395348837, v: 10 },
      { angleFrom: 80, angleTo: 90, ms: 23.25581395348837, v: 10 },
    ]);

    expect(map([1, 25, 170, 2, 1], 6, -90, 90)).toStrictEqual([
      { angleFrom: -90, angleTo: -84, ms: 13.953488372093023, v: 6 },
      { angleFrom: -82, angleTo: -67.66331658291458, ms: 33.34112422578006, v: 14.336683417085425 },
      { angleFrom: -65.66331658291458, angleTo: 74, ms: 324.79841065794085, v: 139.66331658291458 },
      { angleFrom: 76, angleTo: 82, ms: 13.953488372093023, v: 6 },
      { angleFrom: 84, angleTo: 90, ms: 13.953488372093023, v: 6 },
    ]);

    // test case when not enough space because minSize is too big - in this case minSize is ignored
    h.mockConsoleError();
    expect(map([1, 25, 170, 2, 1], 40, -90, 90)).toStrictEqual([
      { angleFrom: -90, angleTo: -89.1356783919598, ms: 2.0100502512562786, v: 0.8643216080401999 },
      { angleFrom: -87.1356783919598, angleTo: -65.52763819095478, ms: 50.25125628140703, v: 21.608040201005025 },
      { angleFrom: -63.527638190954775, angleTo: 83.4070351758794, ms: 341.70854271356785, v: 146.93467336683418 },
      { angleFrom: 85.4070351758794, angleTo: 87.1356783919598, ms: 4.020100502512557, v: 1.7286432160803997 },
      { angleFrom: 89.1356783919598, angleTo: 90, ms: 2.0100502512562786, v: 0.8643216080401999 },
    ]);
    h.unMockConsoleError();
  });

  test("tooltips", async () => {
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === el) {
        /** @type CSSStyleDeclaration */
        return {
          getPropertyValue: (s) => {
            switch (s) {
              case "--circle-0":
                return "#back-color";
              case "--circle-1":
                return "#1st-color";
              case "--circle-2":
                return "#2nd-color";
              default:
                return orig(elem).getPropertyValue(s);
            }
          },
        };
      }
      return orig(elem);
    });

    el.$options.back = false;
    el.$options.hoverCloseTimeout = 50;
    el.$options.hoverOpenTimeout = 200;
    el.$options.items = [
      { value: 5, tooltip: "Item 1; value {#}, percent {#%}" },
      {
        value: 24,
        tooltip: (item, popup) => {
          popup.style.background = "red";
          return `Value=${item.value}; perc=${item.percentage}%; color=${item.color}`;
        },
      },
    ];
    await nextFrame(20);
    expect(Array.prototype.slice.call(el.$refItems.children).map((v) => v.outerHTML)).toMatchInlineSnapshot(`
      [
        "<path fill="#1st-color" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 92.1078530260513 23.038384441275365 A 3.5 3.5 0 0 1 90.818167851057 27.72608760718187 L 84.67349742186562 31.079149687821157 A 3.5 3.5 0 0 1 79.77803903326033 29.769617123405094 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path>",
        "<path fill="#2nd-color" d="M 91.57065085817706 29.1641897871107 A 3.5 3.5 0 0 1 96.15716154583689 30.77718964273132 A 50 50 0 1 1 44.76428660556784 0.2748825516584219 A 3.5 3.5 0 0 1 48.37717340333367 3.528326543612053 L 48.62146988025118 10.524062332745721 A 3.5 3.5 0 0 1 45.257191107932286 14.313787482932241 A 36 36 0 1 0 83.59756391931091 37.06927307968277 A 3.5 3.5 0 0 1 85.31270341716117 32.30076336754565 Z"></path>",
      ]
    `);

    // default hover logic
    const onTooltip = jest.spyOn(WUPCircleElement.prototype, "renderTooltip");
    // hover on 1st item where tooltip is text
    el.$refItems.children[0].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(100);
    expect(onTooltip).toBeCalledTimes(0); // because waiting for 200ms
    await h.wait(200);
    expect(onTooltip).toBeCalledTimes(1);
    expect(el.querySelector("wup-popup").innerHTML).toMatchInlineSnapshot(`"Item 1; value 5, percent 17.2%"`);

    el.$refItems.children[0].dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(40);
    expect(el.querySelector("wup-popup")).toBeDefined(); // because waiting for 50ms
    await h.wait(50);
    expect(el.querySelector("wup-popup")).toBeFalsy();

    // hover on 1st item where tooltip is function
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(300);
    expect(onTooltip).toBeCalledTimes(2);
    expect(el.querySelector("wup-popup").outerHTML).toMatchInlineSnapshot(
      `"<wup-popup tooltip="" style="background: red; display: none;" open="" show="">Value=24; perc=82.75862068965517%; color=#2nd-color</wup-popup>"`
    );

    // callback must return proper color
    onTooltip.mockClear();
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(300);
    el.$options.items = [
      { value: 5 },
      {
        value: 24,
        color: "#efefef",
        tooltip: (item) => `Value=${item.value}; perc=${item.percentage}%; color=${item.color}`,
      },
    ];
    await nextFrame(20);
    await h.wait(300);
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait(300);
    expect(el.querySelector("wup-popup").outerHTML).toMatchInlineSnapshot(
      `"<wup-popup tooltip="" open="" style="display: none;" show="">Value=24; perc=82.75862068965517%; color=#efefef</wup-popup>"`
    );

    // checking debounce timeouts
    onTooltip.mockClear();
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(10);
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(el.querySelector("wup-popup")).toBeDefined(); // small time - no hidden
    await h.wait();
    expect(onTooltip).toBeCalledTimes(0); // no new actions because prev popup still here
    expect(el.querySelector("wup-popup")).toBeDefined();
    jest.spyOn(el.$refSVG, "getBoundingClientRect").mockReturnValue({ x: 5, y: 8, width: 300, height: 280 });
    expect(el.querySelector("wup-popup").getTargetRect({ x: 100, y: 40 })).toMatchInlineSnapshot(`
      {
        "bottom": 251.60999999999999,
        "height": 0.01,
        "left": 83.39999999999999,
        "right": 83.41,
        "top": 251.6,
        "width": 0.01,
        "x": 83.39999999999999,
        "y": 251.6,
      }
    `); // center of target

    // show-hide during the animation
    h.setupCssCompute((elt) => elt.tagName === "WUP-POPUP", {
      animationDuration: "0.3s",
      transitionDuration: "0.3s",
      borderRadius: "2px",
    });

    el._opts.hoverOpenTimeout = 0;
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await h.wait(el.$options.hoverCloseTimeout);
    expect(el.querySelector("wup-popup").$isClosing).toBe(true);
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(el.querySelector("wup-popup").$isClosing).toBe(false);
    expect(el.querySelector("wup-popup").$isOpened).toBe(true);

    // new items
    onTooltip.mockClear();
    el.$options.hoverOpenTimeout = 200;
    el.$options.items = [
      { value: 100, tooltip: "Item 1; {#}" },
      { value: 12, tooltip: "Item 2; {#}" },
      { value: 40 }, // without tooltip
    ];
    await nextFrame(20);
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(onTooltip).toBeCalledTimes(1); // only 1 listener must be

    onTooltip.mockClear();
    el.$refItems.children[2].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(onTooltip).not.toBeCalled(); // because no tooltip

    // dispose listener
    onTooltip.mockClear();
    el.$options.items = [{ value: 5 }, { value: 24 }];
    await nextFrame(20);
    el.$refItems.children[1].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await h.wait();
    expect(onTooltip).toBeCalledTimes(0); // no new actions because no tooltips anymore
  });

  test("custom label", async () => {
    // default behavior
    el.$options.items = [{ value: 23 }];
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="23%"><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path><g><path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 99.04594247203667 40.279119019879495 A 3.5 3.5 0 0 1 96.13333361112322 44.17200463925985 L 89.18853070192188 45.04933727420998 A 3.5 3.5 0 0 1 85.10948928416866 42.04237710086449 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path></g></svg><strong>23%</strong>"`
    );

    // must able to override default strong
    el = document.body.appendChild(document.createElement("wup-circle"));
    el.$options.items = [{ value: 23 }];
    const lbl = document.createElement("strong");
    lbl.textContent = "My Custom";
    el.appendChild(lbl);
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="My Custom"><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path><g><path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 99.04594247203667 40.279119019879495 A 3.5 3.5 0 0 1 96.13333361112322 44.17200463925985 L 89.18853070192188 45.04933727420998 A 3.5 3.5 0 0 1 85.10948928416866 42.04237710086449 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path></g></svg><strong>My Custom</strong>"`
    );

    // when several items
    el = document.body.appendChild(document.createElement("wup-circle"));
    el.$options.items = [{ value: 23 }, { value: 25 }];
    const lbl2 = document.createElement("strong");
    lbl2.textContent = "My Custom";
    el.appendChild(lbl2);
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label="Values: 23,25"><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path><g><path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 61.61062948523617 98.63325285189717 A 3.5 3.5 0 0 1 57.6080015954423 95.87339437761007 L 56.46271103268755 88.96772210571177 A 3.5 3.5 0 0 1 59.30964999347546 84.77542835104957 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path></g></svg><strong>My Custom</strong>"`
    );

    // just for coverage - when strong is empty
    el = document.body.appendChild(document.createElement("wup-circle"));
    el.$options.items = [{ value: 23 }];
    const lbl3 = document.createElement("strong");
    // lbl3.textContent = "My Custom";
    el.appendChild(lbl3);
    await nextFrame();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<svg viewBox="0 0 100 100" role="img" aria-label=""><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 M14 50 A36 36 0 1 0 86 50 A36 36 0 1 0 14 50 Z"></path><g><path fill="#000" d="M 50 3.5 A 3.5 3.5 0 0 1 53.497142366876645 0.12244998733601875 A 50 50 0 0 1 99.04594247203667 40.279119019879495 A 3.5 3.5 0 0 1 96.13333361112322 44.17200463925985 L 89.18853070192188 45.04933727420998 A 3.5 3.5 0 0 1 85.10948928416866 42.04237710086449 A 36 36 0 0 0 53.49448884497292 14.170004916099138 A 3.5 3.5 0 0 1 50 10.5 Z"></path></g></svg><strong></strong>"`
    );
  });
});
