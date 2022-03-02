import { findScrollParent } from "web-ui-pack";

describe("helper.findScrollParent", () => {
  test("deault behavior", () => {
    const el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParent(el)).toBeNull();
    expect(findScrollParent(document.body)).toBeNull();

    jest.spyOn(document.body, "scrollHeight", "get").mockReturnValue(10);
    jest.spyOn(document.body, "clientHeight", "get").mockReturnValue(8);
    expect(findScrollParent(el) === document.body).toBeTruthy();
  });
});
