import { WUPModalElement } from "web-ui-pack";
import * as h from "../testHelper";

/** @type WUPModalElement */
let el;

beforeEach(() => {
  WUPModalElement.$use();
  jest.useFakeTimers();
  el = document.body.appendChild(document.createElement("wup-modal"));
  el.appendChild(document.createElement("h2"));
  jest.spyOn(WUPModalElement, "$uniqueId", "get").mockImplementation(() => "sID");
  jest.advanceTimersToNextTimer(); // gotReady has timeout
  jest.spyOn(window, "matchMedia").mockReturnValue({ matches: true }); // simulate 'prefers-reduced-motion'
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("modalElement", () => {
  h.baseTestComponent(
    () => {
      const a = document.createElement("wup-modal");
      a.appendChild(document.createElement("h2"));
      return a;
    },
    {
      attrs: {
        "w-autofocus": { value: true },
        "w-placement": { value: "center" },
        "w-target": { value: "body", parsedValue: document.body },
      },
      // onCreateNew: (e) => (e.$options.items = getItems()),
    }
  );

  test("open & close", async () => {
    // re-init
    document.body.innerHTML = `<wup-modal><h2></h2></wup-modal>`;
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
    expect(document.body.outerHTML).toMatchInlineSnapshot(`"<body><wup-modal><h2></h2></wup-modal></body>"`);
    jest.advanceTimersToNextTimer(); // gotReady has timeout
    // start opening
    expect(el.$isOpened).toBe(true);
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(false);
    expect(el.$isOpening).toBe(true);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body class="wup-modal-open"><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" open=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" open=""></div></body>"`
    );
    el.$open().then(thenOpen); // despite on opening it shouldn't trigger open again but must return prev-saved promise
    await h.wait(1);
    expect(onWillOpen).toBeCalledTimes(1);
    expect(onOpen).toBeCalledTimes(0);
    expect(onWillClose).toBeCalledTimes(0);
    expect(onClose).toBeCalledTimes(0);
    expect(thenOpen).toBeCalledTimes(0);
    // end opening: opened
    await h.wait();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body class="wup-modal-open"><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" open="" show=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" open="" show=""></div></body>"`
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
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(true);
    expect(el.$isOpened).toBe(true);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" open=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" open=""></div></body>"`
    );
    await h.wait(1);
    expect(onWillOpen).toBeCalledTimes(0);
    expect(onOpen).toBeCalledTimes(0);
    expect(onWillClose).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);
    expect(thenClose).toBeCalledTimes(0);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" open=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" open=""></div></body>"`
    );
    await h.wait();
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center"><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal></body>"`
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
    expect(el.$isClosed).toBe(false);
    expect(el.$isClosing).toBe(false);
    expect(onWillOpen).toBeCalledTimes(1);
    expect(onOpen).toBeCalledTimes(1);
    expect(onWillClose).toBeCalledTimes(0);
    expect(onClose).toBeCalledTimes(0);

    jest.clearAllMocks();
    el.$close();
    await h.wait(10);
    expect(el.$isOpened).toBe(false);
    expect(el.$isOpening).toBe(false);
    expect(el.$isClosed).toBe(true);
    expect(el.$isClosing).toBe(false);
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
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center"><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal></body>"`
    );
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body class="wup-modal-open"><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" open="" show=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" open="" show=""></div></body>"`
    );

    el.$onWillClose = jest.fn().mockImplementationOnce((e) => e.preventDefault());
    el.$close();
    await h.wait();
    expect(el.$isClosed).toBe(false);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body class="wup-modal-open"><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" open="" show=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" open="" show=""></div></body>"`
    );
    el.$close();
    await h.wait();
    expect(el.$isClosed).toBe(true);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center"><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal></body>"`
    );
  });

  test("focus behavior", async () => {
    document.body.innerHTML = `
      <wup-modal><h2></h2></wup-modal>
      <button id='out'>...</button>
    `;
    el = document.body.firstElementChild;
    const btn = document.getElementById("out");
    btn.focus();
    await h.wait(10);
    expect(el.$isOpened).toBe(true);
    expect(document.activeElement).toBe(el.$refClose);

    // no tab-cycling because modal has single focusable item: $refClose
    await h.userPressTab(btn);
    expect(document.activeElement).toBe(el.$refClose);
    await h.userPressTab(btn, { shiftKey: true });
    expect(document.activeElement).toBe(el.$refClose);

    el.$close();
    await h.wait(10);
    expect(document.activeElement).toBe(btn); // focus back

    // again with extra-focused content
    WUPModalElement.testMe = true;
    document.body.innerHTML = `
      <wup-modal>
        <h2></h2>
        <button id="b1"></button>
        <button id="b2"></button>
      </wup-modal>
      <button id="out">...</button>
    `;
    await h.wait();
    WUPModalElement.testMe = false;
    el = document.body.firstElementChild;
    expect(el.$isOpened).toBe(true);
    expect(el.innerHTML).toMatchInlineSnapshot(`
      "<button type="button" aria-label="close" wup-icon="" close=""></button>
              <h2 id="sID"></h2>
              <button id="b1"></button>
              <button id="b2"></button>
            "
    `);

    expect(document.activeElement.outerHTML).toMatchInlineSnapshot(`"<button id="b1"></button>"`);

    // todo continue with tab-cycling
  });
});
