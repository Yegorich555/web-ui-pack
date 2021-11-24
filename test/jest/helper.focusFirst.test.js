/**
 * @jest-environment jsdom
 */
import focusFirst from "web-ui-pack/helpers/focusFirst";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("helper.focusFirst", () => {
  test("focus direct", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    expect(focusFirst(el)).toBe(true);
    expect(document.activeElement).toBe(el);
  });

  test("focus nested", () => {
    const el = document.createElement("input");
    const container = document.createElement("div");
    container.appendChild(el);
    document.body.appendChild(container);
    expect(focusFirst(container)).toBe(true);
    expect(document.activeElement).toBe(el);
  });

  test("focus child with disabled element", () => {
    const el = document.createElement("input");
    el.disabled = true;
    const el2 = document.createElement("input");
    const container = document.createElement("div");
    container.appendChild(el);
    container.appendChild(el2);
    document.body.appendChild(container);
    expect(focusFirst(container)).toBe(true);
    expect(document.activeElement).toBe(el2);
  });

  test("focus object with propery focus", () => {
    expect(focusFirst({})).toBe(false);
    const focus = jest.fn();
    expect(focusFirst({ focus })).toBe(true);
    expect(focus).toBeCalledTimes(1);
  });

  test("focus again on focused", () => {
    const el = document.createElement("input");
    const el2 = document.createElement("input");
    const container = document.createElement("div");
    container.appendChild(el);
    container.appendChild(el2);
    document.body.appendChild(container);
    expect(focusFirst(container)).toBe(true);
    expect(document.activeElement).toBe(el);
    expect(focusFirst(container)).toBe(true);
    expect(document.activeElement).toBe(el);
  });

  // testing child with invisible element see in test/browser/..
});
