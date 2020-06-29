// todo ES6 import doesn't work with puppeteer.evaluate
const { ComboboxControl } = require("web-ui-pack");

describe("comboboxControl", () => {
  test("focus behavior", async () => {
    const id = await page.evaluate(() => {
      renderIt(
        <ComboboxControl
          htmlInputProps={{ id: "cb1" }}
          options={[
            { text: "t1", value: 11 },
            { text: "t2", value: 22 }
          ]}
        />
      );
      return document.activeElement.id;
    });
    expect(id).not.toBe("cb1");

    // click on the button opens menu and fires focus of the input
    await page.click("button");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("cb1");
    await page.waitFor("li", { timeout: 200 });

    // click on the option doesn't remove focus from the input and select value
    await page.click("li");
    await page.waitFor("li", { timeout: 200, hidden: true });
    expect(await page.evaluate(() => document.activeElement.id)).toBe("cb1");
    expect(await page.evaluate(() => document.querySelector("input").value)).toBe("t1");
  });
});
