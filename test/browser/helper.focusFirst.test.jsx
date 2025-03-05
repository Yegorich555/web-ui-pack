/* eslint-disable jsx-a11y/no-autofocus */
const focusFirst = require("web-ui-pack/helpers/focusFirst");

beforeAll(async () => {
  await page.evaluate(async () => {
    await renderIt(
      <div id="main">
        <input id="c1" hidden />
        <input id="c2" style={{ display: "none" }} />
        <input id="v1" style={{ visibility: "hidden" }} />
        <fieldset disabled>
          <input id="c3" />
        </fieldset>
        <input id="c4" />
      </div>
    );
  });
});

describe("helper.focusFirst", () => {
  test("ordinary behavior", async () => {
    const id = await page.evaluate(() => {
      focusFirst(document.querySelector("#c4"));
      return document.activeElement.id;
    });
    expect(id).toBe("c4");
  });

  test("focus child with disabled and hidden elements", async () => {
    const id = await page.evaluate(() => {
      focusFirst(document.querySelector("#main"));
      return document.activeElement.id;
    });
    expect(id).toBe("c4");
  });
});
