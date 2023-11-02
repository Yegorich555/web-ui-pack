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
        "w-selfremove": { value: true },
        "w-autoclose": { value: true },
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
      `"<body class="wup-modal-open"><wup-modal open="" tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center"><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade"></div></body>"`
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
      `"<body class="wup-modal-open"><wup-modal open="" tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" show=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" show=""></div></body>"`
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
      `"<body><wup-modal open="" tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center"><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade"></div></body>"`
    );
    await h.wait(1);
    expect(onWillOpen).toBeCalledTimes(0);
    expect(onOpen).toBeCalledTimes(0);
    expect(onWillClose).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);
    expect(thenClose).toBeCalledTimes(0);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-modal open="" tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center"><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade"></div></body>"`
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
      `"<body class="wup-modal-open"><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" open="" show=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" show=""></div></body>"`
    );

    el.$onWillClose = jest.fn().mockImplementationOnce((e) => e.preventDefault());
    el.$close();
    await h.wait();
    expect(el.$isClosed).toBe(false);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body class="wup-modal-open"><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center" open="" show=""><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal><div class="wup-modal-fade" show=""></div></body>"`
    );
    el.$close();
    await h.wait();
    expect(el.$isClosed).toBe(true);
    expect(document.body.outerHTML).toMatchInlineSnapshot(
      `"<body><wup-modal tabindex="-1" aria-modal="true" aria-labelledby="sID" w-placement="center"><button type="button" aria-label="close" wup-icon="" close=""></button><h2 id="sID"></h2></wup-modal></body>"`
    );

    // open & close in short time
    jest.clearAllMocks();
    h.setupCssCompute(el, { transitionDuration: "0.4s" });
    el.$open();
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    el.$close().then(thenClose);
    await h.wait(1);
    expect(thenClose).toBeCalledTimes(1);
    el.$open();
    el.$close();
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    el.$close();
    await h.wait(10);
    el.$open();
    expect(el.$isOpened).toBe(true);
    await h.wait();
    jest.clearAllMocks();
    el.$open().then(thenOpen);
    await h.wait(10);
    expect(thenOpen).toBeCalledTimes(1);
    el.$close();
    await h.wait(10);
    expect(el.$isClosing).toBe(true);
    thenClose.mockClear();
    el.$close().then(thenClose);
    await h.wait();
    expect(thenClose).toBeCalledTimes(1);

    // open & remove after without closing
    el.$open();
    await h.wait(1);
    expect(el.$isOpening).toBe(true);
    el.remove();
    expect(() => jest.advanceTimersByTime(1000)).not.toThrow();
    await h.wait();
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
    expect(document.activeElement).toBe(el.$refClose); // when nothing to focus: then focus on btnClose

    // no tab-cycling because modal has single focusable item: $refClose
    await h.userPressTab(btn);
    expect(document.activeElement).toBe(el.$refClose);
    await h.userPressTab(btn, { shiftKey: true });
    expect(document.activeElement).toBe(el.$refClose);

    el.$close();
    await h.wait(10);
    expect(document.activeElement).toBe(btn); // focus back

    // again with extra-focused content
    document.body.innerHTML = `
      <wup-modal>
        <h2></h2>
        <button id="b1"></button>
        <button id="b2"></button>
      </wup-modal>
      <button id="out">...</button>
    `;
    document.getElementById("out").focus();
    await h.wait();
    el = document.body.firstElementChild;
    expect(el.$isOpened).toBe(true);
    expect(el.innerHTML).toMatchInlineSnapshot(`
      "<button type="button" aria-label="close" wup-icon="" close=""></button>
              <h2 id="sID"></h2>
              <button id="b1"></button>
              <button id="b2"></button>
            "
    `);
    el.$refClose.id = "bclose";
    el.id = "idModal";
    expect(document.activeElement.id).toBe("b1");

    await h.userPressTab(document.getElementById("b2"));
    expect(document.activeElement.id).toBe("b2");
    await h.userPressTab(document.getElementById("out"));
    expect(document.activeElement.id).toBe("bclose"); // focus must retutn to 1st element
    await h.userPressTab(document.getElementById("b1"));
    expect(document.activeElement.id).toBe("b1");
    // back
    await h.userPressTab(document.getElementById("bclose"), { shiftKey: true });
    expect(document.activeElement.id).toBe("bclose");
    await h.userPressTab(document.body, { shiftKey: true });
    expect(document.activeElement.id).toBe("b2");

    el.$close();
    await h.wait();
    expect(document.activeElement.id).toBe("out"); // focus back

    // autofocus: false - focus on itself
    el.$options.autoFocus = false; // revert logic
    el.$open();
    await h.wait();
    expect(document.activeElement.id).toBe("bclose"); // WARN: it's wrong here actually modal with tabindex="-1" is focusable

    el.$close();
    await h.wait();
    expect(document.activeElement.id).toBe("out"); // focus back
    el.focus(); // no action when modal closed
    expect(document.activeElement.id).toBe("out"); // focus back
    el.focusAny(); // no action when modal closed
    expect(document.activeElement.id).toBe("out"); // focus back

    // focus back when item missed/changed
    const btnOut = document.activeElement;
    btnOut.id = "";
    el.$open();
    document.getElementById("b2").focus();
    await h.wait();
    expect(document.activeElement.id).toBe("b2"); // no re-focus if content is focused already outside built-in logic
    el.$close();
    await h.wait();
    expect(document.activeElement).toBe(btnOut); // ordinary when id missed

    // simulate when model opened, data is refreshed & re-rendered behind modal and need to find such button
    btnOut.id = "out";
    el.$open();
    await h.wait();
    btnOut.id = "miss";
    const btnN = document.body.appendChild(document.createElement("button"));
    btnN.id = "out";
    expect(document.activeElement.id).not.toBe("out");
    el.$close();
    await h.wait();
    expect(document.activeElement.id).toBe("out");
    // same case but id not pointed
    btnN.id = "";
    el.$open();
    await h.wait();
    expect(document.activeElement).not.toBe(btnN);
    btnN.remove();
    expect(() => el.$close()).not.toThrow();
    expect(() => jest.advanceTimersByTime(1)).toThrow(); // because prev-focused item is missed
    await h.wait();
    expect(el.$isClosed).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });

  test("close in diff ways", async () => {
    const onClose = jest.fn();
    el.$onClose = onClose;
    await h.wait();
    expect(el.$isOpened).toBe(true);

    await h.userClick(el);
    await h.wait();
    expect(el.$isOpened).toBe(true);

    // click outside
    expect(onClose).toBeCalledTimes(0);
    await h.userClick(`.${WUPModalElement.$classFade}`);
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(onClose).toBeCalledTimes(1);

    // click on btnClose
    jest.clearAllMocks();
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    await h.userClick(el.$refClose);
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(onClose).toBeCalledTimes(1);

    // close by Esc
    jest.clearAllMocks();
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    await h.userPressKey(el, { key: "Space" }); // for coverage default: in switch
    expect(el.$isOpened).toBe(true);
    await h.userPressKey(el, { key: "Escape" });
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(onClose).toBeCalledTimes(1);

    // again with key-modifiers
    el.$open();
    await h.wait();
    await h.userPressKey(el, { key: "Escape", shiftKey: true });
    await h.userPressKey(el, { key: "Escape", altKey: true });
    await h.userPressKey(el, { key: "Escape", ctrlKey: true });
    await h.userPressKey(el, { key: "Escape", metaKey: true });
    await h.wait();
    expect(el.$isOpened).toBe(true);
  });

  test("options: target", async () => {
    document.body.innerHTML = `
      <button id='tar2'>...</button>
      <button id='tar'>...</button>
      <wup-modal w-target="prev"><h2></h2></wup-modal>
    `;
    await h.wait();
    el = document.body.querySelector("wup-modal");
    expect(el.$isOpened).toBe(false);

    const btn = document.getElementById("tar");
    await h.userClick(btn);
    await h.wait();
    expect(el.$isOpened).toBe(true);

    await h.userPressKey(el, { key: "Escape" });
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(document.activeElement.id).toBe("tar");

    const btn2 = document.getElementById("tar2");
    el.$options.target = btn2;
    await h.wait(1);
    await h.userClick(btn);
    await h.wait();
    expect(el.$isOpened).toBe(false);
    await h.userClick(btn2);
    await h.wait();
    expect(el.$isOpened).toBe(true);

    await h.userPressKey(el, { key: "Escape" });
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(document.activeElement.id).toBe("tar2");

    btn2.onclick = (e) => e.preventDefault();
    await h.userClick(btn2);
    await h.wait();
    expect(el.$isOpened).toBe(false); // close because default action is prevented
  });

  test("with different content/form", async () => {
    // without h2
    const warn = h.mockConsoleWarn();
    document.body.innerHTML = `<wup-modal>Hello</wup-modal>`;
    await h.wait();
    expect(warn).toBeCalledTimes(1);

    // close on Escape + when control is in edit mode + when dropdown is opened

    document.body.innerHTML = `
      <wup-modal>
        <wup-form>
          <wup-date w-initvalue="2023-10-16"></wup-date>
        </wup-form>
      </wup-modal>`;
    await h.wait();
    el = document.querySelector("wup-modal");
    expect(el.$isOpened).toBe(true);

    const dp = document.querySelector("wup-date");
    dp.focus();
    await h.wait();
    expect(dp.$isOpened).toBe(true);
    expect(dp.$isEmpty).toBe(false);
    await h.userPressKey(dp, { key: "Escape" });
    await h.wait();
    expect(dp.$isOpened).toBe(false);
    expect(dp.$isEmpty).toBe(false);
    expect(el.$isOpened).toBe(true);
    await h.userPressKey(dp, { key: "Escape" });
    await h.wait();
    expect(dp.$isOpened).toBe(false);
    expect(el.$isOpened).toBe(false);
    expect(dp.$isEmpty).toBe(false);
  });

  test("option: autoclose", async () => {
    document.body.innerHTML = `
      <wup-modal>
        <wup-form>
          <wup-text w-name='txt' w-initvalue='hello'></wup-text>
        </wup-form>
      </wup-modal>`;
    await h.wait();

    el = document.querySelector("wup-modal");
    expect(el.$isOpened).toBe(true);

    // when success on submitEnd
    const form = document.querySelector("wup-form");
    form.$onWillSubmit = jest.fn();
    form.$onSubmit = () => new Promise((res) => setTimeout(() => res(true), 300));
    await h.userPressKey(form, { key: "Enter" });
    expect(form.$onWillSubmit).toBeCalledTimes(1);
    await h.wait(100);
    expect(el.$isOpened).toBe(true);
    await h.wait();
    expect(el.$isOpened).toBe(false);

    // when rejects on submitEnd
    jest.clearAllMocks();
    el.$open();
    await h.wait();
    expect(el.$isOpened).toBe(true);
    form.$onSubmit = () => Promise.reject();
    await h.userPressKey(form, { key: "Enter" });
    expect(form.$onWillSubmit).toBeCalledTimes(1);
    await h.wait();
    expect(el.$isOpened).toBe(true);
    await h.wait();
    expect(el.$isOpened).toBe(true);
  });

  test("option: selfRemove", async () => {
    expect(el.$isOpened).toBe(true);
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.isConnected).toBe(true);

    el.$options.selfRemove = true;
    el.$open();
    await h.wait();
    el.$close();
    await h.wait();
    expect(el.$isOpened).toBe(false);
    expect(el.isConnected).toBe(false);
  });
});
