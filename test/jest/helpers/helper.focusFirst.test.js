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

    document.body.innerHTML = "<div><input disabled/></div>";
    const was = document.activeElement;
    expect(focusFirst(document.querySelector("div"))).toBe(false);
    expect(document.activeElement).toBe(was);
  });

  test("focus object with property focus", () => {
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

  test("focus on self - infinite loop", () => {
    let i = 0;
    class TestElement extends HTMLElement {
      constructor() {
        super();
        this.focus = this.focus.bind(this);
      }

      focus() {
        if (++i > 2) {
          throw new Error("Infinite loop");
        }
        return focusFirst(this);
      }
    }
    customElements.define("test-inher-el", TestElement);
    const el = document.body.appendChild(document.createElement("test-inher-el"));
    const inp = el.appendChild(document.createElement("input"));
    expect(() => el.focus()).not.toThrow();
    expect(document.activeElement).toBe(inp);
    inp.blur();
    i = 0;
    expect(() => el.focus()).not.toThrow(); // checking again
    expect(document.activeElement).toBe(inp);
  });

  test("option: isFocusLast", () => {
    document.body.innerHTML = `
      <main>
        <button id='a1'>Submit</button>
        <input id='b2' ></input>
        <a id="c3" href='somelink'>Some link</a>
      </main>
    `;
    focusFirst(document.body.firstElementChild, { isFocusLast: true });
    expect(document.activeElement.id).toBe("c3");

    focusFirst(document.body.firstElementChild, { isFocusLast: false });
    expect(document.activeElement.id).toBe("a1");

    focusFirst(document.body.firstElementChild, {});
    expect(document.activeElement.id).toBe("a1");

    // test when element can't be focused
    const brokenFocus = document.body.querySelector("a");
    brokenFocus.focus = () => {}; // prevent default focus behavior
    brokenFocus.focus();
    expect(document.activeElement.id).not.toBe(brokenFocus.id);
    focusFirst(document.body.firstElementChild, { isFocusLast: true });
    expect(document.activeElement.id).toBe("b2");
  });
  // testing child with invisible element see in test/browser/..
});
