// ES5 import is required otherwise jest-env conflicts with puppeeter-env
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WUPFormElement = require("web-ui-pack/formElement").default;
const WUPTextControl = require("web-ui-pack/controls/text").default;

/** @type WUPFormElement */
let testEl;
beforeEach(async () => {
  jest.spyOn(document, "createElement").getMockImplementation(() => ({ append: () => {} }));
  await page.evaluate(() => {
    !WUPFormElement && !WUPTextControl && console.error("missed");
    renderHtml(
      `<wup-form>
        <wup-text name="firstName" id="inp1"></wup-text>
        <wup-text name="lastName" id="inp2"></wup-text>
        <button type="submit">Submit</button>
      </wup-form>`
    );
  });
  await page.waitForTimeout(2); // timeout required because of debounceFilters
  await page.evaluate(() => (window.testEl = document.querySelector("wup-form")));

  page.getInfo = () =>
    page.evaluate(() => ({
      html: testEl.outerHTML,
      $isValid: testEl.$isValid,
      activeId: document.activeElement?.id,
      inputId1: document.querySelector("#inp1 input").id,
      inputId2: document.querySelector("#inp2 input").id,
    }));
});

describe("formElement", () => {
  test("ordinary submit behavior", async () => {
    await page.type("input", "Katty");
    await page.click("[type='submit']");
    const t = await page.getInfo();
    expect(t.html).toMatchInlineSnapshot(`
      "<wup-form role="form">
              <wup-text name="firstName" id="inp1"><label for="wup1"><span><input placeholder=" " type="text" id="wup1" autocomplete="off"><strong>First Name</strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text>
              <wup-text name="lastName" id="inp2"><label for="wup2"><span><input placeholder=" " type="text" id="wup2" autocomplete="off"><strong>Last Name</strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text>
              <button type="submit">Submit</button>
            </wup-form>"
    `);
  });

  test("scrollIntoView to invalid input", async () => {
    await page.evaluate(() => {
      const arr = document.querySelectorAll("wup-text");
      arr.forEach((c) => (c.$options.validations = { required: true }));
    });

    await page.click("[type='submit']");
    await page.waitForTimeout(500); // timeout to wait for scrolling
    let t = await page.getInfo();
    expect(t.activeId).toBe(t.inputId1);
    expect(t.$isValid).toBe(false);
    expect(t.html).toMatchInlineSnapshot(`
      "<wup-form role="form">
              <wup-text name="firstName" id="inp1" required="" invalid=""><label for="wup3"><span><input placeholder=" " type="text" id="wup3" autocomplete="off" aria-required="true" aria-describedby="wup5"><strong>First Name</strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup error="" aria-live="off" aria-atomic="true" id="wup5" role="alert" style="display: block; max-width: 500px; transform: translate(150px, 56px);" position="bottom"><span class="wup-hidden">Error for First Name:</span><span>This field is required</span></wup-popup></wup-text>
              <wup-text name="lastName" id="inp2" required=""><label for="wup4"><span><input placeholder=" " type="text" id="wup4" autocomplete="off" aria-required="true"><strong>Last Name</strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text>
              <button type="submit">Submit</button>
            </wup-form>"
    `);

    await page.type("#inp1 input", "Katty");
    await page.click("[type='submit']");
    await page.waitForTimeout(500); // timeout to wait for scrolling
    t = await page.getInfo();
    expect(t.activeId).toBe(t.inputId2);
    expect(t.$isValid).toBe(false);
    expect(t.html).toMatchInlineSnapshot(`
      "<wup-form role="form">
              <wup-text name="firstName" id="inp1" required=""><label for="wup3"><span><input placeholder=" " type="text" id="wup3" autocomplete="off" aria-required="true"><strong>First Name</strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text>
              <wup-text name="lastName" id="inp2" required="" invalid=""><label for="wup4"><span><input placeholder=" " type="text" id="wup4" autocomplete="off" aria-required="true" aria-describedby="wup6"><strong>Last Name</strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label><wup-popup error="" aria-live="off" aria-atomic="true" id="wup6" role="alert" style="display: block; max-width: 500px; transform: translate(150px, 126px);" position="bottom"><span class="wup-hidden">Error for Last Name:</span><span>This field is required</span></wup-popup></wup-text>
              <button type="submit">Submit</button>
            </wup-form>"
    `);

    await page.type("#inp2 input", "Newton");
    await page.click("[type='submit']");
    await page.waitForTimeout(500); // timeout to wait for scrolling
    t = await page.getInfo();
    expect(t.$isValid).toBe(true);
    expect(t.html).toMatchInlineSnapshot(`
      "<wup-form role="form">
              <wup-text name="firstName" id="inp1" required=""><label for="wup3"><span><input placeholder=" " type="text" id="wup3" autocomplete="off" aria-required="true"><strong>First Name</strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text>
              <wup-text name="lastName" id="inp2" required=""><label for="wup4"><span><input placeholder=" " type="text" id="wup4" autocomplete="off" aria-required="true"><strong>Last Name</strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text>
              <button type="submit">Submit</button>
            </wup-form>"
    `);
  });
});
