import { findScrollParent } from "web-ui-pack";

describe("helper.findScrollParent", () => {
  test("deault behavior", () => {
    const el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParent(el)).toBeNull();
    expect(findScrollParent(document.body)).toBeNull();

    jest.spyOn(document.body, "scrollHeight", "get").mockReturnValue(10);
    jest.spyOn(document.body, "clientHeight", "get").mockReturnValue(8);
    // check with overflowY
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      const o = orig(elem);
      if (elem === document.body) {
        o.overflowY = "auto";
      }
      return o;
    });
    expect(findScrollParent(el) === document.body).toBeTruthy();
  });
});
