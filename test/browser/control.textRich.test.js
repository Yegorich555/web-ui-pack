/** @type {import("web-ui-pack/controls/textRich").default} */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let el;

beforeEach(async () => {
  await page.evaluate(() => renderHtml(`<wup-textrich></wup-textrich>`));
  await page.waitForTimeout(20); // timeout required because of debounceFilters
  await page.evaluate(() => (window.el = document.querySelector("wup-textrich")));
});

/** Returns html of editor & selected text */
const getState = () => page.evaluate(() => [el.$refInput.innerHTML, window.getSelection().toString()]);

/** Sets value & clicks on text in editor (clickCount 2 selects word, 3 - line) */
async function clickText(html, text, clickCount) {
  const { x, y } = await page.evaluate(
    (h, s) => {
      el.$value = h;
      const w = document.createTreeWalker(el.$refInput, NodeFilter.SHOW_TEXT);
      let n = w.nextNode();
      while (!n.data.includes(s)) {
        n = w.nextNode();
      }
      const r = document.createRange();
      r.setStart(n, n.data.indexOf(s));
      r.setEnd(n, n.data.indexOf(s) + s.length);
      const b = r.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    },
    html,
    text
  );
  await page.mouse.click(x, y, { clickCount });
}

describe("control.textRich", () => {
  test("selected text is wrapped into typed quote or bracket", async () => {
    // double click selects word (with trailing space on Windows): whitespaces stay outside
    await clickText("<p>Some text here</p>", "text", 2);
    await page.keyboard.type('"');
    expect(await getState()).toEqual(['<div>Some "text" here</div>', "text"]); // selection is kept: to wrap again
    await page.keyboard.type("(");
    expect(await getState()).toEqual(['<div>Some "(text)" here</div>', "text"]);
    expect(await page.evaluate(() => el.$value)).toBe('Some "(text)" here');

    // every wrapping is a separate step of undo
    await page.keyboard.down("ControlLeft");
    await page.keyboard.press("KeyZ");
    await page.keyboard.up("ControlLeft");
    await page.waitForTimeout(10);
    expect(await getState()).toEqual(['<div>Some "text" here</div>', "text"]);

    // typed text replaces wrapped one
    await page.keyboard.type("new");
    expect(await getState()).toEqual(['<div>Some "new" here</div>', ""]);

    // triple click selects line with line break: closing char is placed at the end of line
    await clickText("<p>Some <strong>bold</strong></p><p>Next</p>", "Some", 3);
    await page.keyboard.type("[");
    expect(await getState()).toEqual(["<div>[Some <b>bold]</b></div><div>Next</div>", "Some bold"]);

    // char without pair replaces selection as usual
    await clickText("<p>Some text</p>", "text", 2);
    await page.keyboard.type(")");
    expect(await getState()).toEqual(["<div>Some )</div>", ""]);

    // selection without visible chars is replaced as well
    await page.evaluate(() => {
      el.$value = "<p>Some text</p>";
      el.$refInput.setSelectionRange(4, 5);
    });
    await page.keyboard.type('"');
    expect(await getState()).toEqual(['<div>Some"text</div>', ""]);
  });

  test("deleted line doesn't apply its tag to the next line", async () => {
    const html = "<h2>Head</h2><p>Text <b>bold</b></p>";
    // triple click selects line with line break: heading is removed & the next line keeps its tag
    await clickText(html, "Head", 3);
    await page.keyboard.press("Delete");
    await page.keyboard.type("X");
    expect(await getState()).toEqual(["<div>XText <b>bold</b></div>", ""]);

    /** Sets value & selection by chars */
    const select = (start, end) =>
      page.evaluate(
        (h, s, e) => {
          el.$value = h;
          el.$refInput.setSelectionRange(s, e);
        },
        html,
        start,
        end
      );
    // Delete in empty heading
    await select(0, 4);
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Delete");
    expect(await getState()).toEqual(["<div>Text <b>bold</b></div>", ""]);

    // select all: formats of the 1st & the last line are reset
    await page.evaluate(() => {
      el.$value = '<h2>Head</h2><ul><li style="text-align: center;">Item</li></ul>';
      el.$refInput.setSelectionRange(0, 99);
    });
    await page.keyboard.press("Delete");
    await page.keyboard.type("X");
    expect(await getState()).toEqual(["<div>X</div>", ""]);

    // otherwise the next line is merged into heading (without <span style> added by browser)
    await select(5, 5);
    await page.keyboard.press("Backspace");
    expect(await getState()).toEqual(["<h2>HeadText <b>bold</b></h2>", ""]);
  });

  test("ArrowRight at end of format: the 1st one keeps format for typed text, the 2nd one leaves it", async () => {
    /** Sets value, places caret before the last char of format, presses keys & types text
     * @returns html of editor & pressed buttons of toolbar before typing */
    const type = async (html, caret, keys, text) => {
      await page.evaluate(
        (h, pos) => {
          el.$value = h;
          el.$refInput.focus();
          el.$refInput.setSelectionRange(pos, pos);
        },
        html,
        caret
      );
      await keys.reduce((p, k) => p.then(() => page.keyboard.press(k)), Promise.resolve());
      await page.waitForTimeout(1); // toolbar is updated on selectionchange
      const pressed = await page.evaluate(() =>
        Array.from(el.querySelectorAll('[aria-pressed="true"]'), (b) => b.getAttribute("tool")).join()
      );
      await page.keyboard.type(text);
      return [(await getState())[0], pressed];
    };

    const link = '<p>Text <a href="https://x.com/">link</a> more</p>';
    const a = '<a href="https://x.com/" target="_blank" rel="noopener noreferrer">';
    // otherwise Chrome places text after link although toolbar shows link
    expect(await type(link, 8, ["ArrowRight"], "Z")).toEqual([`<div>Text ${a}linkZ</a> more</div>`, "link"]);
    // the 2nd ArrowRight doesn't move caret (otherwise it jumps over the next char)
    expect(await type(link, 8, ["ArrowRight", "ArrowRight"], "Z")).toEqual([`<div>Text ${a}link</a>Z more</div>`, ""]);
    // the 3rd one moves caret as usual
    expect(await type(link, 8, ["ArrowRight", "ArrowRight", "ArrowRight"], "Z")).toEqual([
      `<div>Text ${a}link</a> Zmore</div>`,
      "",
    ]);
    // ArrowLeft returns into format
    expect(await type(link, 8, ["ArrowRight", "ArrowRight", "ArrowLeft"], "Z")).toEqual([
      `<div>Text ${a}linkZ</a> more</div>`,
      "link",
    ]);
    // format at the end of line
    expect(await type("<p>Text <a href='https://x.com/'>link</a></p>", 8, ["ArrowRight", "ArrowRight"], "Z")).toEqual([
      `<div>Text ${a}link</a>Z</div>`,
      "",
    ]);

    // the same for other formats: all formats ending at caret are left at once
    const nested = "<p>Text <strong>bo<em>ld</em></strong> more</p>";
    expect(await type(nested, 8, ["ArrowRight"], "Z")).toEqual([
      "<div>Text <b>bo<em>ldZ</em></b> more</div>",
      "bold,italic",
    ]);
    expect(await type(nested, 8, ["ArrowRight", "ArrowRight"], "Z")).toEqual([
      "<div>Text <b>bo<em>ld</em></b>Z more</div>",
      "",
    ]);
  });
});
