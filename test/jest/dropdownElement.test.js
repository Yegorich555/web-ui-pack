import { WUPDropdownElement, WUPPopupElement } from "web-ui-pack";
import * as h from "../testHelper";
/** @type WUPDropdownElement */
let el;
/** @type HTMLButtonElement */
let trg;

!WUPDropdownElement && console.error("missed");
beforeEach(async () => {
  jest.useFakeTimers();
  // fix case when popup rect must be changed according to transform
  function mockPopupRect() {
    /** @type WUPPopupElement */
    const a = this;
    const tr = /translate\(([^)]+)\)/.exec(a.style.transform);
    const [x, y] = tr ? tr[1].split(",").map((s) => Number.parseFloat(s.trim())) : [0, 0];
    return {
      x,
      y,
      top: y,
      left: x,
      bottom: 0,
      height: a.offsetHeight,
      width: a.offsetWidth,
      right: 0,
      toJSON: () => "",
    };
  }
  jest.spyOn(WUPPopupElement.prototype, "getBoundingClientRect").mockImplementation(mockPopupRect);

  // jest.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
  //   x: 0,
  //   y: 0,
  //   top: 0,
  //   left: 0,
  //   bottom: 400,
  //   height: 400,
  //   width: 600,
  //   right: 600,
  //   toJSON: () => "",
  // });
  // jest.spyOn(document.body, "clientHeight", "get").mockReturnValue(400);
  // jest.spyOn(document.body, "clientWidth", "get").mockReturnValue(600);

  document.body.innerHTML = `
  <wup-dropdown>
    <button>Click me</button>
    <wup-popup>
      <ul>
        <li><button>A</button></li>
        <li><button>B</button></li>
      </ul>
    </wup-popup>
  </wup-dropdown>
  `;
  el = document.body.querySelector("wup-dropdown");
  trg = el.firstElementChild;

  const height = 50;
  const width = 100;
  const x = 140;
  const y = 100;
  jest.spyOn(trg, "getBoundingClientRect").mockReturnValue({
    x,
    left: x,
    y,
    top: y,
    bottom: y + height,
    right: x + width,
    height,
    width,
    toJSON: () => "",
  });

  await h.wait(1);
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

describe("dropdownElement", () => {
  test("basic usage", async () => {
    expect(el.$refPopup).toBeDefined();
    expect(el.$refPopup.$isShown).toBe(false);
    expect(el.$refPopup.$options.animation).toBe(1);
    expect(el.$refPopup.$options.placement).toBe(el.constructor.$defaults.placement);
    await h.userClick(trg);
    expect(el.$refPopup.$isShown).toBe(true);
    expect(el.outerHTML).toMatchInlineSnapshot(`
      "<wup-dropdown>
          <button aria-owns="wup1" aria-controls="wup1" aria-haspopup="listbox" aria-expanded="true">Click me</button>
          <wup-popup style="min-width: 100px; min-height: 50px;" menu="">
            <ul id="wup1" tabindex="-1">
              <li><button>A</button></li>
              <li><button>B</button></li>
            </ul>
          </wup-popup>
        </wup-dropdown>"
    `);

    await h.userClick(trg);
    expect(el.$refPopup.$isShown).toBe(false);
    expect(el.outerHTML).toMatchInlineSnapshot(`
      "<wup-dropdown>
          <button aria-owns="wup1" aria-controls="wup1" aria-haspopup="listbox" aria-expanded="false">Click me</button>
          <wup-popup style="min-width: 100px; min-height: 50px;" menu="">
            <ul id="wup1" tabindex="-1">
              <li><button>A</button></li>
              <li><button>B</button></li>
            </ul>
          </wup-popup>
        </wup-dropdown>"
    `);

    // attrs from popupEl must overide defaults from dropdownEl
    document.body.innerHTML = `
      <wup-dropdown>
        <button>Click me</button>
        <wup-popup w-placement="left-middle" w-animation="stack">
          <ul>
            <li><button>A</button></li>
            <li><button>B</button></li>
          </ul>
        </wup-popup>
      </wup-dropdown>
      `;
    el = document.body.querySelector("wup-dropdown");
    await h.wait();
    expect(el.$refPopup).toBeDefined();
    expect(el.$refPopup.$isShown).toBe(false);
    expect(el.$refPopup.$options.animation).toBe(2);
    expect(el.$refPopup.$options.placement).toStrictEqual(el.$refPopup.constructor.$placementAttrs("left-middle"));
  });

  test("menu is popup itself", async () => {
    document.body.innerHTML = `
        <wup-dropdown>
          <button>Click me</button>
          <wup-popup>
            <button>A</button>
            <button>B</button>
          </wup-popup>
        </wup-dropdown>`;
    await h.wait(1);
    expect(document.body.innerHTML).toMatchInlineSnapshot(`
      "
              <wup-dropdown>
                <button aria-owns="wup4" aria-controls="wup4" aria-haspopup="listbox" aria-expanded="false">Click me</button>
                <wup-popup style="opacity: 0;" menu="" id="wup4" tabindex="-1">
                  <button>A</button>
                  <button>B</button>
                </wup-popup>
              </wup-dropdown>"
    `);
  });

  test("option: hideOnClick", async () => {
    const item = el.$refPopup.querySelector("button");

    el.$options.hideOnPopupClick = true;
    await h.wait(1);
    await h.userClick(trg);
    expect(el.$refPopup.$isShown).toBe(true);
    await h.userClick(item);
    expect(el.$refPopup.$isShown).toBe(false);

    el.$options.hideOnPopupClick = false;
    await h.wait(1);
    await h.userClick(trg);
    expect(el.$refPopup.$isShown).toBe(true);
    await h.userClick(item);
    expect(el.$refPopup.$isShown).toBe(true);
    await h.userClick(trg);
    expect(el.$refPopup.$isShown).toBe(false);
  });

  test("invalid structure", async () => {
    document.body.innerHTML = `
        <wup-dropdown>
          <wup-popup>
            <button>A</button>
            <button>B</button>
          </wup-popup>
        </wup-dropdown>`;
    expect(() => jest.advanceTimersByTime(1)).toThrowErrorMatchingInlineSnapshot(
      `"WUP-POPUP. Target as HTMLElement|SVGElement is not defined''"`
    );

    document.body.innerHTML = `
        <wup-dropdown>
          <button>Click me</button>
          <div>
            <button>A</button>
            <button>B</button>
          </div>
        </wup-dropdown>`;
    expect(() => jest.advanceTimersByTime(1)).toThrowErrorMatchingInlineSnapshot(
      `"WUP-DROPDOWN. Invalid structure. Expected 1st element: <any/>, last element: <wup-popup/>"`
    );
  });
});
