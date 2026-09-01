import { TextEncoder, TextDecoder } from "util";
import exportToExcel from "web-ui-pack/helpers/exportToExcel";
import zip from "web-ui-pack/helpers/zip";

// zip() is mocked: it returns the prepared files as-is, so every xml is checked directly & without unzipping
jest.mock("web-ui-pack/helpers/zip");

// jsdom (jest 29) has neither of them, but exportToExcel & the real zip() require them
global.TextEncoder ??= TextEncoder;
global.TextDecoder ??= TextDecoder;

const blobType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("helper.exportToExcel", () => {
  /** files that exportToExcel has prepared for the archive */
  let files = {};

  beforeEach(() => {
    jest.restoreAllMocks(); // Date.now is faked by the last test
    files = {};
    zip.mockImplementation((f, cb) => {
      // exportToExcel hands over the UTF-8 bytes (zip() takes them as-is): decode back to assert on the xml
      const decoder = new TextDecoder();
      files = {};
      Object.keys(f).forEach((k) => {
        files[k] = decoder.decode(f[k]);
      });
      cb(null, new Uint8Array([1, 2, 3]));
    });
  });

  /** WARN: the order of the files inside the archive isn't a part of the format, so only the set is checked */
  const expectFiles = (names) => expect(Object.keys(files).sort()).toEqual([...names].sort());

  test("single sheet: every value type & the whole file-structure", async () => {
    const blob = await exportToExcel([
      {
        name: "Users",
        // WARN: Date is formatted by localeInfo.dateTime in the local timezone, so it must be created as local
        data: [
          { name: "John", age: 30, isActive: true, birthDate: new Date(2024, 2, 5, 13, 45, 30), tags: ["red", "blue"] },
          { name: "Ann", age: 0, isActive: false, birthDate: new Date(1990, 11, 31, 0, 5, 9), tags: ["green"] },
          // null & undefined & a missed property are all rendered as an empty cell
          { name: null, age: undefined, isActive: null, tags: [] },
        ],
        mapping: [
          { propName: "name" },
          { propName: "age" },
          { propName: "isActive" }, // text is prettified from propName => 'Is Active'
          { propName: "birthDate" },
          { propName: "tags" }, // array => joined by \n + wrapText style s="1"
        ],
      },
    ]);
    expect(blob.type).toBe(blobType);
    expectFiles([
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "_rels/.rels",
      "[Content_Types].xml",
      "xl/worksheets/sheet1.xml",
      "xl/tables/table1.xml",
      "xl/worksheets/_rels/sheet1.xml.rels",
    ]);
    Object.keys(files).forEach((k) => expect(files[k]).toMatchSnapshot(k));
  });

  test("several sheets: default names, sheet without data & tab-name normalization", async () => {
    await exportToExcel([
      // 1st: default name 'Sheet1'
      { data: [{ v: 1 }], mapping: [{ propName: "v" }] },
      // 2nd: no data => an empty table is treated by Excel as a broken content, so table-part is skipped
      { name: "Empty", data: [], mapping: [{ propName: "v" }] },
      // 3rd: []:*?/\ aren't allowed & the name is cut by 31 chars
      { name: `a[b]c:d*e?f/g\\h${"i".repeat(30)}`, data: [{ v: 3 }], mapping: [{ propName: "v" }] },
      // 4th: xml-escaping of the tab-name
      { name: "Q&A <\"'>", data: [{ v: 4 }], mapping: [{ propName: "v" }] },
    ]);
    expectFiles([
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "_rels/.rels",
      "[Content_Types].xml",
      "xl/worksheets/sheet1.xml",
      "xl/tables/table1.xml",
      "xl/worksheets/_rels/sheet1.xml.rels",
      "xl/worksheets/sheet2.xml", // no table2 & no rels for the sheet without data
      "xl/worksheets/sheet3.xml",
      "xl/tables/table3.xml",
      "xl/worksheets/_rels/sheet3.xml.rels",
      "xl/worksheets/sheet4.xml",
      "xl/tables/table4.xml",
      "xl/worksheets/_rels/sheet4.xml.rels",
    ]);
    expect(files["xl/workbook.xml"]).toMatchSnapshot("xl/workbook.xml");
    expect(files["xl/_rels/workbook.xml.rels"]).toMatchSnapshot("xl/_rels/workbook.xml.rels");
    expect(files["[Content_Types].xml"]).toMatchSnapshot("[Content_Types].xml");
    expect(files["xl/worksheets/sheet2.xml"]).toMatchSnapshot("xl/worksheets/sheet2.xml");
    expect(files["xl/worksheets/sheet4.xml"]).toMatchSnapshot("xl/worksheets/sheet4.xml");
    expect(files["xl/tables/table4.xml"]).toMatchSnapshot("xl/tables/table4.xml");
    expect(files["xl/worksheets/_rels/sheet4.xml.rels"]).toMatchSnapshot("xl/worksheets/_rels/sheet4.xml.rels");
  });

  test("no sheets at all", async () => {
    await exportToExcel([]);
    expectFiles([
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "_rels/.rels",
      "[Content_Types].xml",
    ]);
    expect(files["xl/workbook.xml"]).toMatchSnapshot("xl/workbook.xml");
    expect(files["xl/_rels/workbook.xml.rels"]).toMatchSnapshot("xl/_rels/workbook.xml.rels");
    expect(files["[Content_Types].xml"]).toMatchSnapshot("[Content_Types].xml");
  });

  test("columns: custom text, width, maxWidth & auto-width", async () => {
    await exportToExcel([
      {
        name: "Widths",
        data: [
          { fix: "12345678901234567890", auto: "iiiii", cut: "M".repeat(20), byHeader: "x" },
          { fix: "short", auto: "WWWWW", cut: "M".repeat(40), byHeader: "y" }, // the widest 'auto' & 'cut'
          { fix: "short", auto: ["ttt", "MMMMMMMMMM"], cut: "", byHeader: "z" }, // multiline: the widest line wins
        ],
        mapping: [
          { propName: "fix", width: 12.5 }, // an explicit width wins & skips scanning of the rows
          { propName: "auto" }, // by the widest content
          { propName: "cut", maxWidth: 15 }, // content is wider than maxWidth
          { propName: "byHeader", headerText: "A very long header text of the column" }, // header + filter-button wins
        ],
      },
    ]);
    expect(files["xl/worksheets/sheet1.xml"]).toMatchSnapshot("xl/worksheets/sheet1.xml");
    expect(files["xl/tables/table1.xml"]).toMatchSnapshot("xl/tables/table1.xml");
  });

  test("escaping of headers & values", async () => {
    await exportToExcel([
      {
        name: "Escape",
        data: [{ v: "<b>&\"'`</b>" }, { v: ["a&b", "c<d"] }],
        mapping: [{ propName: "v", headerText: "Q&A: <\"'`>" }],
      },
    ]);
    expect(files["xl/worksheets/sheet1.xml"]).toMatchSnapshot("xl/worksheets/sheet1.xml");
    expect(files["xl/tables/table1.xml"]).toMatchSnapshot("xl/tables/table1.xml");
  });

  test("column letters: A..Z, AA, AB", async () => {
    const mapping = Array.from({ length: 28 }, (_v, i) => ({ propName: `c${i}`, headerText: `${i}`, width: 3 }));
    await exportToExcel([{ name: "Letters", data: [{ c25: "z", c26: "aa", c27: "ab" }], mapping }]);
    // WARN: no snapshot here: 28 columns produce a huge & useless xml
    // NiceToKnow: a cell of the default format has no `s` at all (see the 'fonts' tests below)
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="Z2" t="inlineStr"><is><t>z</t></is></c>`);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="AA2" t="inlineStr"><is><t>aa</t></is></c>`);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="AB2" t="inlineStr"><is><t>ab</t></is></c>`);
    expect(files["xl/tables/table1.xml"]).toContain(`ref="A1:AB2"`);
  });

  test("big sheet: the rows are encoded chunk by chunk", async () => {
    // the writer flushes every 64Kb, so the xml below is joined from several chunks - this checks that they are
    // encoded & copied back in the right order. The values are packed with multi-byte chars (a cyrillic one &
    // an emoji, that is a surrogate pair) so that the chunk boundaries fall inside such a text all the time
    const data = [];
    for (let i = 0; i < 3000; ++i) data.push({ v: `${i}-\u0424-${"\u{1F642}".repeat(30)}-${"x".repeat(i % 40)}` });
    await exportToExcel([{ name: "Big", data, mapping: [{ propName: "v" }] }]);

    const xml = files["xl/worksheets/sheet1.xml"];
    expect(xml.length).toBeGreaterThan(200000); // otherwise a single chunk is enough & nothing is really checked

    // the whole <sheetData> must be exactly the same as if it was built as a single string
    let expected = "";
    data.forEach((item, i) => {
      expected += `<row r="${i + 2}"><c r="A${i + 2}" t="inlineStr"><is><t>${item.v}</t></is></c></row>`;
    });
    const body = xml.slice(xml.indexOf("</row>") + "</row>".length, xml.indexOf("</sheetData>"));
    expect(body).toBe(expected);
    // a surrogate pair cut in half would be decoded into it (flush() always encodes whole add()-ed pieces)
    expect(xml).not.toContain("\uFFFD");
    expect(xml.endsWith("</worksheet>")).toBe(true);
    expect(files["xl/tables/table1.xml"]).toContain(`ref="A1:A3001"`);
  });

  test("fonts: per-sheet, per-column & dedup of the styles", async () => {
    // an explicitly undefined option is skipped by the merge (so the inherited one wins)
    const font = { size: 14, family: "Arial", color: "#00ff00", backgroundColor: "#ff0000", style: undefined };
    await exportToExcel([
      {
        name: "Fonts",
        // the sheet-font is inherited by every cell & by the header (that adds 'bold' from $defaults.fontHeader)
        font,
        data: [{ v: "a", arr: ["a", "b"], custom: "c", bad: "d" }],
        mapping: [
          { propName: "v" },
          { propName: "arr" }, // an array-cell has the same font but with wrapText => an own cell-format
          { propName: "custom", headerFont: { style: "italic", family: "A&B", backgroundColor: "#0000ff" } },
          // 'red' & '#f00' aren't parsable => ignored, so the header keeps the colors of the sheet-font
          { propName: "bad", headerFont: { color: "red", backgroundColor: "#f00" } },
        ],
      },
      // the 2nd sheet has the same font => no new records in styles.xml
      { name: "Fonts2", font: { ...font }, data: [{ v: "b" }], mapping: [{ propName: "v" }] },
    ]);
    // 4 fonts: the default one (never used here), the sheet-font, the bold header & the italic header
    expect(files["xl/styles.xml"]).toContain(`<fonts count="4">`);
    expect(files["xl/styles.xml"]).toContain(`<fills count="4">`); // 2 reserved by Excel + red + blue
    expect(files["xl/styles.xml"]).toMatchSnapshot("xl/styles.xml");
    expect(files["xl/worksheets/sheet1.xml"]).toMatchSnapshot("xl/worksheets/sheet1.xml");
    // the unparsable colors of 'bad' are ignored => its header re-uses the style of the ordinary headers
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="D1" s="3" t="inlineStr"><is><t>Bad</t></is></c>`);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="A1" s="3" t="inlineStr"><is><t>V</t></is></c>`);
    // WARN: a stored cell MUST carry an own `s` - Excel applies the format of `<col>` only to a cell that isn't
    // stored in the sheet at all (checked against the real Excel), so the sheet-font is repeated per cell
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="A2" s="1" t="inlineStr"><is><t>a</t></is></c>`);
    // ...an array-cell has the same font but with wrapText => an own cell-format
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="B2" s="2" t="inlineStr"><is><t>a\nb</t></is></c>`);
    // the same style is set on every column & on the range of the columns that the mapping doesn't cover:
    // that's the only way to apply the sheet-font to a cell around the data (the one a user types in later).
    // WARN: `width` must be pointed there - a `<col>` without it collapses the columns & Excel hides them
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<col min="1" max="1" width="5.21" style="1"`);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<col min="5" max="16384" width="9.15" style="1"/>`);
    // the 2nd sheet re-uses the styles of the 1st one
    expect(files["xl/worksheets/sheet2.xml"]).toContain(`<col min="2" max="16384" width="9.15" style="1"/>`);
    expect(files["xl/worksheets/sheet2.xml"]).toContain(`<c r="A1" s="3" t="inlineStr"><is><t>V</t></is></c>`);
    expect(files["xl/worksheets/sheet2.xml"]).toContain(`<c r="A2" s="1" t="inlineStr"><is><t>b</t></is></c>`);
  });

  test("fonts: the inheritance chain of the document, the sheet & the column", async () => {
    /** font-xml that the pointed cell is really rendered by (resolved through `s` / the format of its `<col>`) */
    const fontOf = (sheetNum, cellRef) => {
      const xml = files[`xl/worksheets/sheet${sheetNum}.xml`];
      const cell = xml.match(new RegExp(`<c r="${cellRef}"( s="(\\d+)")? `));
      const col = xml.match(/<col min="1"[^>]* style="(\d+)"/);
      const styleId = cell[2] !== undefined ? +cell[2] : (col && +col[1]) || 0;
      const xfs = files["xl/styles.xml"].match(/<cellXfs count="\d+">(.*)<\/cellXfs>/)[1];
      const fontId = [...xfs.matchAll(/<xf numFmtId="0" fontId="(\d+)"/g)].map((m) => +m[1])[styleId];
      return [...files["xl/styles.xml"].matchAll(/<font>(.*?)<\/font>/g)][fontId][1];
    };
    const { font, fontHeader } = exportToExcel.$defaults;
    exportToExcel.$defaults.font = { size: 12, family: "Georgia" };
    exportToExcel.$defaults.fontHeader = { style: "bold", color: "#ff0000" };
    try {
      await exportToExcel([
        // no own font at all => the document-font everywhere
        { name: "S1", data: [{ v: "a" }], mapping: [{ propName: "v" }] },
        // an own font: the missed size is inherited from the document-font & the header follows the sheet-family
        { name: "S2", font: { family: "Verdana" }, data: [{ v: "a" }], mapping: [{ propName: "v" }] },
        {
          name: "S3",
          font: { family: "Verdana" },
          // the header-font of the sheet wins over $defaults.fontHeader, but keeps its missed options
          fontHeader: { style: "italic" },
          // ...and the column wins over the sheet
          data: [{ v: "a", v2: "b" }],
          mapping: [{ propName: "v" }, { propName: "v2", headerFont: { color: "#0000ff" } }],
        },
      ]);
      const georgia = `<sz val="12"/><name val="Georgia"/><family val="2"/>`;
      const verdana = `<sz val="12"/><name val="Verdana"/><family val="2"/>`;
      // the document-font is applied to a sheet that has no own one
      expect(fontOf(1, "A2")).toBe(georgia);
      expect(fontOf(1, "A1")).toBe(`<b/><sz val="12"/><color rgb="FFFF0000"/><name val="Georgia"/><family val="2"/>`);
      // the sheet-font overrides only the pointed options (the size is still inherited from the document-font)
      expect(fontOf(2, "A2")).toBe(verdana);
      // ...and the header of the sheet is built on top of the sheet-font, not of the document-font
      expect(fontOf(2, "A1")).toBe(`<b/><sz val="12"/><color rgb="FFFF0000"/><name val="Verdana"/><family val="2"/>`);
      // IExcelSheet.fontHeader replaces the style of $defaults.fontHeader & keeps its color
      expect(fontOf(3, "A2")).toBe(verdana);
      expect(fontOf(3, "A1")).toBe(`<i/><sz val="12"/><color rgb="FFFF0000"/><name val="Verdana"/><family val="2"/>`);
      // IExcelColumnMap.headerFont is the last one: it re-colors the header but keeps everything else
      expect(fontOf(3, "B1")).toBe(`<i/><sz val="12"/><color rgb="FF0000FF"/><name val="Verdana"/><family val="2"/>`);
    } finally {
      exportToExcel.$defaults.font = font;
      exportToExcel.$defaults.fontHeader = fontHeader;
    }
  });

  test("fonts: per-column font & the auto-width that follows it", async () => {
    const sheetXml = () => files["xl/worksheets/sheet1.xml"];
    const colOf = (n) => sheetXml().match(new RegExp(`<col min="${n}" max="${n}" width="([\\d.]+)"( style="(\\d+)")?`));
    const styleOfCell = (ref) => sheetXml().match(new RegExp(`<c r="${ref}"( s="(\\d+)")? `))[2];

    await exportToExcel([
      {
        name: "PerColumn",
        font: { family: "Arial" },
        data: [{ a: "wwwwwwwwww", b: "wwwwwwwwww", c: ["x", "y"] }],
        mapping: [
          { propName: "a", headerText: "A" }, // the sheet-font
          { propName: "b", headerText: "B", font: { family: "Verdana" } }, // an own font
          { propName: "c", headerText: "C", font: { family: "Verdana" } }, // + a wrapped (array) cell
        ],
      },
    ]);
    const [, widthA, , styleA] = colOf(1);
    const [, widthB, , styleB] = colOf(2);
    // the column-font is a separate cell-format: it's set on the `<col>` & on every cell of the column
    expect(styleA).not.toBe(styleB);
    expect(styleOfCell("A2")).toBe(styleA);
    expect(styleOfCell("B2")).toBe(styleB);
    // ...an array-cell of the column keeps the same font but adds wrapText => an own format again
    expect(styleOfCell("C2")).not.toBe(styleB);
    // the auto-width is measured by the font of the column, so the same text is wider in the Verdana one
    expect(+widthB).toBeGreaterThan(+widthA * 1.1);
    // the columns that the mapping doesn't cover belong to the sheet, so they keep the sheet-font & never
    // inherit the font of the last mapped column
    expect(sheetXml()).toContain(`<col min="4" max="16384" width="9.15" style="${styleA}"/>`);

    // a column-font is inherited by the header of the column either
    await exportToExcel([
      {
        name: "H",
        font: { family: "Calibri" },
        data: [{ a: "x", b: "x" }],
        mapping: [
          { propName: "a", headerText: "Wide header" },
          { propName: "b", headerText: "Wide header", font: { family: "Verdana" } },
        ],
      },
    ]);
    expect(+colOf(2)[1]).toBeGreaterThan(+colOf(1)[1]);
  });

  test("fonts: $defaults.font & $defaults.fontHeader can be overridden", async () => {
    const { font, fontHeader } = exportToExcel.$defaults;
    exportToExcel.$defaults.font = { size: 12, family: "Times New Roman", style: "italic" };
    exportToExcel.$defaults.fontHeader = { style: "underline", color: "#123456" };
    try {
      await exportToExcel([{ name: "Def", data: [{ v: 1 }], mapping: [{ propName: "v" }] }]);
      // the document-font must be the 1st: Excel measures a column width in the widest digit of the font[0]
      expect(files["xl/styles.xml"]).toContain(
        `<fonts count="2"><font><i/><sz val="12"/><name val="Times New Roman"/><family val="2"/></font>`
      );
      expect(files["xl/styles.xml"]).toMatchSnapshot("xl/styles.xml");
    } finally {
      exportToExcel.$defaults.font = font;
      exportToExcel.$defaults.fontHeader = fontHeader;
    }
    // defaults are restored
    await exportToExcel([{ name: "Def", data: [{ v: 1 }], mapping: [{ propName: "v" }] }]);
    expect(files["xl/styles.xml"]).toContain(`<sz val="11"/><name val="Calibri"/>`);
  });

  test("auto-width: font-scale, non-latin chars & multiline", async () => {
    const colWidth = () => +files["xl/worksheets/sheet1.xml"].match(/<col [^>]*width="([\d.]+)"/)[1];
    // 'Ж' isn't latin => the averaged non-latin width of the font (9px for Calibri); the longest line wins
    const sheet = (font) => ({
      name: "W",
      font,
      data: [{ v: ["ЖЖЖЖЖЖЖЖЖЖ", "i", "ii"] }],
      mapping: [{ propName: "v" }],
    });

    await exportToExcel([sheet()]);
    // 10 chars * 9px + 7px of the cell-padding, converted into the Excel-units (7px each)
    expect(colWidth()).toBe(13.86);

    await exportToExcel([sheet({ size: 22 })]);
    // the double font-size makes the content ~2x wider (the constant cell-padding isn't scaled)
    expect(colWidth()).toBeGreaterThan(13.86 * 1.85);
    expect(colWidth()).toBeLessThan(13.86 * 2);
  });

  test("auto-width: per-family & per-face char metrics", async () => {
    const colWidth = () => +files["xl/worksheets/sheet1.xml"].match(/<col [^>]*width="([\d.]+)"/)[1];
    const sheet = (font, v = "wwwwwwwwww") => ({ name: "W", font, data: [{ v }], mapping: [{ propName: "v" }] });
    const widthOf = async (font, v) => {
      await exportToExcel([sheet(font, v)]);
      return colWidth();
    };

    // Calibri: the font that every other one is compared to here
    const baseW = await widthOf(undefined, "wwwwwwwwww");
    const baseDigits = await widthOf(undefined, "0123456789");

    // the document-font stays Calibri, so the Excel-unit isn't changed & only the wider text is applied
    expect(await widthOf({ family: "Verdana" }, "wwwwwwwwww")).toBeGreaterThan(baseW * 1.1);
    // WARN: a single per-family ratio can't describe a font - the glyphs aren't scaled proportionally.
    // `Arial` is the case that the ratio used to get wrong: its `w` is exactly as wide as the Calibri one,
    // while its digits are ~13% wider (so a date/number column was measured too narrow & got cut off)
    expect(await widthOf({ family: "Arial" }, "wwwwwwwwww")).toBe(baseW);
    expect(await widthOf({ family: "Arial" }, "0123456789")).toBeGreaterThan(baseDigits * 1.1);
    // a monospace font measures every char the same
    expect(await widthOf({ family: "Courier New" }, "0123456789")).toBe(
      await widthOf({ family: "Courier New" }, "wwwwwwwwww")
    );
    // an unknown font is measured as Calibri; a name is case-insensitive
    expect(await widthOf({ family: "SomeUnknownFont" }, "wwwwwwwwww")).toBe(baseW);
    expect(await widthOf({ family: "vErDaNa" }, "wwwwwwwwww")).toBeGreaterThan(baseW * 1.1);

    // `bold` is measured by the own face of the family & isn't a ratio either: it doesn't widen Calibri at all,
    // while the same text of Tahoma gets ~17% wider
    expect(await widthOf({ style: "bold" }, "Active")).toBe(await widthOf(undefined, "Active"));
    expect(await widthOf({ family: "Tahoma", style: "bold" }, "Active")).toBeGreaterThan(
      await widthOf({ family: "Tahoma" }, "Active")
    );
    // `italic` & `underline` don't change the advances, so they share the regular face
    expect(await widthOf({ style: "italic" }, "Active")).toBe(await widthOf(undefined, "Active"));

    // the document-font defines the Excel-unit: the same font on the both sides almost cancels the scale out
    const { font } = exportToExcel.$defaults;
    exportToExcel.$defaults.font = { size: 11, family: "Verdana" };
    try {
      // ~18% narrower than Calibri: Verdana digits (the unit) are wider than its letters
      const w = await widthOf({ family: "Verdana" }, "wwwwwwwwww");
      expect(w).toBeLessThan(baseW);
      expect(w).toBeGreaterThan(baseW * 0.75);
    } finally {
      exportToExcel.$defaults.font = font;
    }
  });

  test("$defaults.getCellValue can be overridden", async () => {
    const orig = exportToExcel.$defaults.getCellValue;
    // null isn't expected from getCellValue but it must not produce 'null' in a cell
    exportToExcel.$defaults.getCellValue = (headerKey, v) => (v === 2 ? null : `${headerKey.propName}:${v}`);
    try {
      await exportToExcel([{ name: "Custom", data: [{ v: 1 }, { v: 2 }], mapping: [{ propName: "v" }] }]);
      expect(files["xl/worksheets/sheet1.xml"]).toMatchSnapshot("xl/worksheets/sheet1.xml");
    } finally {
      exportToExcel.$defaults.getCellValue = orig;
    }
    // default is restored
    await exportToExcel([{ name: "Custom", data: [{ v: 1 }], mapping: [{ propName: "v" }] }]);
    expect(files["xl/worksheets/sheet1.xml"]).toContain("<is><t>1</t></is>");
  });

  test("rejects when zipping is failed", async () => {
    const sheets = [{ data: [{ v: 1 }], mapping: [{ propName: "v" }] }];
    zip.mockImplementation((_f, cb) => cb(new Error("test zip"), null));
    await expect(exportToExcel(sheets)).rejects.toThrow("test zip");

    // callback without an error but without a result either
    zip.mockImplementation((_f, cb) => cb(null, null));
    await expect(exportToExcel(sheets)).rejects.toThrow("Zip failed");
  });

  test("binary result of the real zip", async () => {
    zip.mockImplementation(jest.requireActual("web-ui-pack/helpers/zip").default);
    // zip() stamps every entry with the current time, so the clock must be frozen to keep the binary stable
    jest.spyOn(Date, "now").mockReturnValue(new Date(2024, 2, 5, 6, 7, 8).valueOf());

    const blob = await exportToExcel([{ name: "Bin", data: [{ v: "value" }], mapping: [{ propName: "v" }] }]);
    expect(blob.type).toBe(blobType);
    const bytes = await new Promise((resolve, reject) => {
      const reader = new FileReader(); // jsdom (jest 29) implements Blob without arrayBuffer()
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    expect(Buffer.from(bytes).toString("base64")).toMatchSnapshot("xlsx-binary");
  });
});
