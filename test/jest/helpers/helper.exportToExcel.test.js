import { TextEncoder, TextDecoder } from "util";
import exportToExcel, { ExcelCellTypes, ExcelFontStyles } from "web-ui-pack/helpers/exportToExcel";
import zip from "web-ui-pack/helpers/zip";

// zip() is mocked: it returns the prepared files as-is, so every xml is checked directly & without unzipping;
// WARN: only the default export is mocked - exportToExcel takes strToU8() from the very same module
jest.mock("web-ui-pack/helpers/zip", () => ({
  ...jest.requireActual("web-ui-pack/helpers/zip"),
  __esModule: true,
  default: jest.fn(),
}));

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

  /** `s` of the pointed cell: the index of its cell-format in cellXfs */
  const cellStyleId = (ref, sheetNum = 1) =>
    files[`xl/worksheets/sheet${sheetNum}.xml`].match(new RegExp(`<c r="${ref}" s="(\\d+)"`))[1];
  /** xf-xml of the pointed cell-format */
  const xfById = (styleId) => {
    const xfs = files["xl/styles.xml"].match(/<cellXfs count="\d+">(.*)<\/cellXfs>/)[1];
    return [...xfs.matchAll(/<xf [^>]*\/>|<xf .*?<\/xf>/g)].map((m) => m[0])[+styleId];
  };
  /** font-xml that the pointed cell-format is rendered by */
  const fontById = (styleId) =>
    [...files["xl/styles.xml"].matchAll(/<font>(.*?)<\/font>/g)][+xfById(styleId).match(/fontId="(\d+)"/)[1]][1];

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
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="Z2" s="1" t="inlineStr"><is><t>z</t></is></c>`);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="AA2" s="1" t="inlineStr"><is><t>aa</t></is></c>`);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="AB2" s="1" t="inlineStr"><is><t>ab</t></is></c>`);
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
      expected += `<row r="${i + 2}"><c r="A${i + 2}" s="1" t="inlineStr"><is><t>${item.v}</t></is></c></row>`;
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
    const style = {
      fontSize: 14,
      fontFamily: "Arial",
      color: "#00ff00",
      backgroundColor: "#ff0000",
      fontStyle: undefined,
    };
    await exportToExcel([
      {
        name: "Fonts",
        // the sheet-style is inherited by every cell & by the header (that adds 'bold' from $defaults.headerStyle)
        style,
        data: [{ v: "a", arr: ["a", "b"], custom: "c", bad: "d" }],
        mapping: [
          { propName: "v" },
          { propName: "arr" }, // an array-cell has the same font but with wrapText => an own cell-format
          {
            propName: "custom",
            headerStyle: { fontStyle: ExcelFontStyles.italic, fontFamily: "A&B", backgroundColor: "#0000ff" },
          },
          // 'red' & '#f00' aren't parsable => ignored, so the header keeps the colors of the sheet-font
          { propName: "bad", headerStyle: { color: "red", backgroundColor: "#f00" } },
        ],
      },
      // the 2nd sheet has the same font => no new records in styles.xml
      { name: "Fonts2", style: { ...style }, data: [{ v: "b" }], mapping: [{ propName: "v" }] },
    ]);
    // 4 fonts: the default one (never used here), the sheet-font, the bold header & the italic header
    expect(files["xl/styles.xml"]).toContain(`<fonts count="4">`);
    expect(files["xl/styles.xml"]).toContain(`<fills count="4">`); // 2 reserved by Excel + red + blue
    expect(files["xl/styles.xml"]).toMatchSnapshot("xl/styles.xml");
    expect(files["xl/worksheets/sheet1.xml"]).toMatchSnapshot("xl/worksheets/sheet1.xml");
    // the unparsable colors of 'bad' are ignored => its header re-uses the style of the ordinary headers
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="D1" s="4" t="inlineStr"><is><t>Bad</t></is></c>`);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="A1" s="4" t="inlineStr"><is><t>V</t></is></c>`);
    // WARN: a stored cell MUST carry an own `s` - Excel applies the format of `<col>` only to a cell that isn't
    // stored in the sheet at all (checked against the real Excel), so the sheet-font is repeated per cell
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="A2" s="2" t="inlineStr"><is><t>a</t></is></c>`);
    // ...an array-cell has the same font but with wrapText => an own cell-format
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="B2" s="3" t="inlineStr"><is><t>a\nb</t></is></c>`);
    // the same style is set on every column & on the range of the columns that the mapping doesn't cover:
    // that's the only way to apply the sheet-font to a cell around the data (the one a user types in later).
    // WARN: `width` must be pointed there - a `<col>` without it collapses the columns & Excel hides them
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<col min="1" max="1" width="5.21" style="2"`);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<col min="5" max="16384" width="9.15" style="2"/>`);
    // the 2nd sheet re-uses the styles of the 1st one
    expect(files["xl/worksheets/sheet2.xml"]).toContain(`<col min="2" max="16384" width="9.15" style="2"/>`);
    expect(files["xl/worksheets/sheet2.xml"]).toContain(`<c r="A1" s="4" t="inlineStr"><is><t>V</t></is></c>`);
    expect(files["xl/worksheets/sheet2.xml"]).toContain(`<c r="A2" s="2" t="inlineStr"><is><t>b</t></is></c>`);
  });

  test("fonts: the alignment of a cell", async () => {
    await exportToExcel([
      {
        name: "Align",
        style: { horizontalAlign: "right", verticalAlign: "center" },
        data: [{ v: "a", arr: ["a", "b"] }],
        // an array-cell keeps the alignment together with its wrapText
        mapping: [{ propName: "v" }, { propName: "arr" }],
      },
    ]);
    const styles = files["xl/styles.xml"];
    const sheet = files["xl/worksheets/sheet1.xml"];
    expect(styles).toContain(`<alignment horizontal="right" vertical="center"/>`);
    expect(styles).toContain(`<alignment horizontal="right" vertical="center" wrapText="1"/>`);
    // WARN: cellXfs[0] is bound to the built-in `Normal` style & Excel applies it to no cell at all, so the
    // index 0 is reserved by the plain xf & EVERY stored cell refers to its own format - a cell without `s`
    // gets the Excel-defaults instead (the bottom alignment among them) & loses the whole style of the column
    expect(styles).toContain(`<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`);
    expect(sheet.match(/<c r="[^"]*"(?! s=")/g)).toBeNull();
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
    const { style, headerStyle } = exportToExcel.$defaults;
    exportToExcel.$defaults.style = { fontSize: 12, fontFamily: "Georgia" };
    exportToExcel.$defaults.headerStyle = { fontStyle: ExcelFontStyles.bold, color: "#ff0000" };
    try {
      await exportToExcel([
        // no own style at all => the document-font everywhere
        { name: "S1", data: [{ v: "a" }], mapping: [{ propName: "v" }] },
        // an own style: the missed fontSize is inherited from the document-font & the header follows its family
        { name: "S2", style: { fontFamily: "Verdana" }, data: [{ v: "a" }], mapping: [{ propName: "v" }] },
        {
          name: "S3",
          style: { fontFamily: "Verdana" },
          // the header-style of the sheet wins over $defaults.headerStyle, but keeps its missed options
          headerStyle: { fontStyle: ExcelFontStyles.italic },
          // ...and the column wins over the sheet
          data: [{ v: "a", v2: "b" }],
          mapping: [{ propName: "v" }, { propName: "v2", headerStyle: { color: "#0000ff" } }],
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
      // IExcelSheet.headerStyle replaces the fontStyle of $defaults.headerStyle & keeps its color
      expect(fontOf(3, "A2")).toBe(verdana);
      expect(fontOf(3, "A1")).toBe(`<i/><sz val="12"/><color rgb="FFFF0000"/><name val="Verdana"/><family val="2"/>`);
      // IExcelColumnMap.headerStyle is the last one: it re-colors the header but keeps everything else
      expect(fontOf(3, "B1")).toBe(`<i/><sz val="12"/><color rgb="FF0000FF"/><name val="Verdana"/><family val="2"/>`);
    } finally {
      exportToExcel.$defaults.style = style;
      exportToExcel.$defaults.headerStyle = headerStyle;
    }
  });

  test("fonts: per-column style & the auto-width that follows it", async () => {
    const sheetXml = () => files["xl/worksheets/sheet1.xml"];
    const colOf = (n) => sheetXml().match(new RegExp(`<col min="${n}" max="${n}" width="([\\d.]+)"( style="(\\d+)")?`));
    const styleOfCell = (ref) => sheetXml().match(new RegExp(`<c r="${ref}"( s="(\\d+)")? `))[2];

    await exportToExcel([
      {
        name: "PerColumn",
        style: { fontFamily: "Arial" },
        data: [{ a: "wwwwwwwwww", b: "wwwwwwwwww", c: ["x", "y"] }],
        mapping: [
          { propName: "a", headerText: "A" }, // the sheet-style
          { propName: "b", headerText: "B", style: { fontFamily: "Verdana" } }, // an own style
          { propName: "c", headerText: "C", style: { fontFamily: "Verdana" } }, // + a wrapped (array) cell
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

    // a column-style is inherited by the header of the column either
    await exportToExcel([
      {
        name: "H",
        style: { fontFamily: "Calibri" },
        data: [{ a: "x", b: "x" }],
        mapping: [
          { propName: "a", headerText: "Wide header" },
          { propName: "b", headerText: "Wide header", style: { fontFamily: "Verdana" } },
        ],
      },
    ]);
    expect(+colOf(2)[1]).toBeGreaterThan(+colOf(1)[1]);
  });

  test("fonts: several styles at once (the bitmask)", async () => {
    const fontsOf = () => [...files["xl/styles.xml"].matchAll(/<font>(.*?)<\/font>/g)].map((m) => m[1]);
    await exportToExcel([
      {
        name: "S",
        style: { fontStyle: ExcelFontStyles.italic | ExcelFontStyles.underline },
        data: [{ v: "a", v2: "b" }],
        mapping: [
          { propName: "v" },
          // the header adds 'bold' of $defaults.headerStyle to the styles of the sheet-style
          { propName: "v2", headerStyle: { fontStyle: ExcelFontStyles.bold | ExcelFontStyles.underline } },
        ],
      },
    ]);
    const fonts = fontsOf();
    // WARN: the order of the tags is required by the file-format & doesn't depend on the order of the bits
    expect(fonts).toContain(`<i/><u/><sz val="11"/><name val="Calibri"/><family val="2"/>`);
    expect(fonts).toContain(`<b/><u/><sz val="11"/><name val="Calibri"/><family val="2"/>`);

    // an unknown bit is ignored & 'none' is the same as no style at all
    await exportToExcel([
      {
        name: "S",
        style: { fontStyle: ExcelFontStyles.bold | 8 },
        data: [{ v: "a", v2: "b" }],
        mapping: [{ propName: "v" }, { propName: "v2", style: { fontStyle: ExcelFontStyles.none } }],
      },
    ]);
    expect(fontsOf()).toContain(`<b/><sz val="11"/><name val="Calibri"/><family val="2"/>`);
    expect(fontsOf()).toContain(`<sz val="11"/><name val="Calibri"/><family val="2"/>`);
  });

  test("fonts: $defaults.style & $defaults.headerStyle can be overridden", async () => {
    const { style, headerStyle } = exportToExcel.$defaults;
    exportToExcel.$defaults.style = { fontSize: 12, fontFamily: "Times New Roman", fontStyle: ExcelFontStyles.italic };
    exportToExcel.$defaults.headerStyle = { fontStyle: ExcelFontStyles.underline, color: "#123456" };
    try {
      await exportToExcel([{ name: "Def", data: [{ v: 1 }], mapping: [{ propName: "v" }] }]);
      // the document-font must be the 1st: Excel measures a column width in the widest digit of the font[0]
      expect(files["xl/styles.xml"]).toContain(
        `<fonts count="2"><font><i/><sz val="12"/><name val="Times New Roman"/><family val="2"/></font>`
      );
      expect(files["xl/styles.xml"]).toMatchSnapshot("xl/styles.xml");
    } finally {
      exportToExcel.$defaults.style = style;
      exportToExcel.$defaults.headerStyle = headerStyle;
    }
    // defaults are restored
    await exportToExcel([{ name: "Def", data: [{ v: 1 }], mapping: [{ propName: "v" }] }]);
    expect(files["xl/styles.xml"]).toContain(`<sz val="11"/><name val="Calibri"/>`);
  });

  test("auto-width: font-scale, non-latin chars & multiline", async () => {
    const colWidth = () => +files["xl/worksheets/sheet1.xml"].match(/<col [^>]*width="([\d.]+)"/)[1];
    // 'Ж' isn't latin => the averaged non-latin width of the font (9px for Calibri); the longest line wins
    const sheet = (style) => ({
      name: "W",
      style,
      data: [{ v: ["ЖЖЖЖЖЖЖЖЖЖ", "i", "ii"] }],
      mapping: [{ propName: "v" }],
    });

    await exportToExcel([sheet()]);
    // 10 chars * 9px + 7px of the cell-padding, converted into the Excel-units (7px each)
    expect(colWidth()).toBe(13.86);

    await exportToExcel([sheet({ fontSize: 22 })]);
    // the double font-size makes the content ~2x wider (the constant cell-padding isn't scaled)
    expect(colWidth()).toBeGreaterThan(13.86 * 1.85);
    expect(colWidth()).toBeLessThan(13.86 * 2);
  });

  test("auto-width: per-family & per-face char metrics", async () => {
    const colWidth = () => +files["xl/worksheets/sheet1.xml"].match(/<col [^>]*width="([\d.]+)"/)[1];
    const sheet = (style, v = "wwwwwwwwww") => ({ name: "W", style, data: [{ v }], mapping: [{ propName: "v" }] });
    const widthOf = async (style, v) => {
      await exportToExcel([sheet(style, v)]);
      return colWidth();
    };

    // Calibri: the font that every other one is compared to here
    const baseW = await widthOf(undefined, "wwwwwwwwww");
    const baseDigits = await widthOf(undefined, "0123456789");

    // the document-font stays Calibri, so the Excel-unit isn't changed & only the wider text is applied
    expect(await widthOf({ fontFamily: "Verdana" }, "wwwwwwwwww")).toBeGreaterThan(baseW * 1.1);
    // WARN: a single per-family ratio can't describe a font - the glyphs aren't scaled proportionally.
    // `Arial` is the case that the ratio used to get wrong: its `w` is exactly as wide as the Calibri one,
    // while its digits are ~13% wider (so a date/number column was measured too narrow & got cut off)
    expect(await widthOf({ fontFamily: "Arial" }, "wwwwwwwwww")).toBe(baseW);
    expect(await widthOf({ fontFamily: "Arial" }, "0123456789")).toBeGreaterThan(baseDigits * 1.1);
    // a monospace font measures every char the same
    expect(await widthOf({ fontFamily: "Courier New" }, "0123456789")).toBe(
      await widthOf({ fontFamily: "Courier New" }, "wwwwwwwwww")
    );
    // an unknown font is measured as Calibri; a name is case-insensitive
    expect(await widthOf({ fontFamily: "SomeUnknownFont" }, "wwwwwwwwww")).toBe(baseW);
    expect(await widthOf({ fontFamily: "vErDaNa" }, "wwwwwwwwww")).toBeGreaterThan(baseW * 1.1);

    // `bold` is measured by the own face of the family & isn't a ratio either: it doesn't widen Calibri at all,
    // while the same text of Tahoma gets ~17% wider
    expect(await widthOf({ fontStyle: ExcelFontStyles.bold }, "Active")).toBe(await widthOf(undefined, "Active"));
    expect(await widthOf({ fontFamily: "Tahoma", fontStyle: ExcelFontStyles.bold }, "Active")).toBeGreaterThan(
      await widthOf({ fontFamily: "Tahoma" }, "Active")
    );
    // `italic` & `underline` don't change the advances, so they share the regular face
    expect(await widthOf({ fontStyle: ExcelFontStyles.italic }, "Active")).toBe(await widthOf(undefined, "Active"));

    // the document-font defines the Excel-unit: the same font on the both sides almost cancels the scale out
    const { style } = exportToExcel.$defaults;
    exportToExcel.$defaults.style = { fontSize: 11, fontFamily: "Verdana" };
    try {
      // ~18% narrower than Calibri: Verdana digits (the unit) are wider than its letters
      const w = await widthOf({ fontFamily: "Verdana" }, "wwwwwwwwww");
      expect(w).toBeLessThan(baseW);
      expect(w).toBeGreaterThan(baseW * 0.75);
    } finally {
      exportToExcel.$defaults.style = style;
    }
  });

  test("$defaults.getCellValue can be overridden", async () => {
    const orig = exportToExcel.$defaults.getCellValue;
    // null isn't expected from getCellValue but it must not produce 'null' in a cell
    exportToExcel.$defaults.getCellValue = (v) => (v === 2 ? null : { type: ExcelCellTypes.text, stringVal: `v:${v}` });
    try {
      await exportToExcel([{ name: "Custom", data: [{ v: 1 }, { v: 2 }], mapping: [{ propName: "v" }] }]);
      expect(files["xl/worksheets/sheet1.xml"]).toMatchSnapshot("xl/worksheets/sheet1.xml");
    } finally {
      exportToExcel.$defaults.getCellValue = orig;
    }
    // default is restored: a number is stored as a number again
    await exportToExcel([{ name: "Custom", data: [{ v: 1 }], mapping: [{ propName: "v" }] }]);
    expect(files["xl/worksheets/sheet1.xml"]).toContain(`<c r="A2" s="1" t="n"><v>1</v></c>`);
  });

  test("numbers: stored as numbers & not as a text", async () => {
    await exportToExcel([
      {
        name: "Numbers",
        data: [
          { int: 30, float: 1234.56, negative: -7, zero: 0, str: "123", special: Number.NaN },
          { int: -0, float: 1e21, negative: -0.5, zero: 0.1, str: "0012", special: Number.POSITIVE_INFINITY },
        ],
        mapping: [
          { propName: "int" },
          { propName: "float" },
          { propName: "negative" },
          { propName: "zero" },
          { propName: "str" }, // a numeric string stays a text: a leading zero etc. must not be lost
          { propName: "special" }, // NaN/Infinity can't be stored as a number => a text
        ],
      },
    ]);
    const xml = files["xl/worksheets/sheet1.xml"];
    // `t="n"` + a raw <v>: only such a cell is summed/sorted/filtered by Excel as a number
    expect(xml).toContain(`<c r="A2" s="1" t="n"><v>30</v></c>`);
    expect(xml).toContain(`<c r="B2" s="1" t="n"><v>1234.56</v></c>`);
    expect(xml).toContain(`<c r="C2" s="1" t="n"><v>-7</v></c>`);
    expect(xml).toContain(`<c r="D2" s="1" t="n"><v>0</v></c>`);
    expect(xml).toContain(`<c r="A3" s="1" t="n"><v>0</v></c>`); // -0 is stringified as '0'
    expect(xml).toContain(`<c r="B3" s="1" t="n"><v>1e+21</v></c>`); // the exponent-form is a valid xsd:double
    expect(xml).toContain(`<c r="C3" s="1" t="n"><v>-0.5</v></c>`);
    // a string is never converted into a number, so '0012' keeps its leading zeros
    expect(xml).toContain(`<c r="E2" s="1" t="inlineStr"><is><t>123</t></is></c>`);
    expect(xml).toContain(`<c r="E3" s="1" t="inlineStr"><is><t>0012</t></is></c>`);
    // NaN & Infinity have no representation in the format (Excel reports such a file as corrupted)
    expect(xml).toContain(`<c r="F2" s="1" t="inlineStr"><is><t>Invalid number</t></is></c>`);
    expect(xml).toContain(`<c r="F3" s="1" t="inlineStr"><is><t>Invalid number</t></is></c>`);
    // the auto-width follows the number as it's rendered: 7 chars of '1234.56' are wider than 2 of 'Int'
    const widthOf = (n) => +xml.match(new RegExp(`<col min="${n}" max="${n}" width="([\\d.]+)"`))[1];
    expect(widthOf(2)).toBeGreaterThan(widthOf(1));
    expect(xml).toMatchSnapshot("xl/worksheets/sheet1.xml");
  });

  test("dates: stored as a date-serial + a number-format", async () => {
    await exportToExcel([
      {
        name: "Dates",
        // WARN: Excel has no timezone, so a date is stored as the local time & must be created as a local one
        data: [{ dt: new Date(2024, 2, 5, 13, 45, 30), day: new Date(2024, 2, 5), bad: new Date("wrong") }],
        mapping: [
          { propName: "dt" }, // the default format: localeInfo.dateTime
          { propName: "day", dateTimeFormat: "dd/MM/yyyy" }, // an own format of the column
          { propName: "bad" },
        ],
      },
    ]);
    const xml = files["xl/worksheets/sheet1.xml"];
    // `t="n"` + `s` that points to a date-format: only such a cell is sorted/filtered by Excel as a date.
    // 45356 = days between 1899-12-30 (the epoch of Excel) & 2024-03-05; .5732 = 13:45:30
    expect(xml).toContain(`<c r="A2" s="4" t="n"><v>45356.57326388889</v></c>`);
    expect(xml).toContain(`<c r="B2" s="5" t="n"><v>45356</v></c>`);
    // an Invalid Date has no numeric representation at all, so it stays a text
    expect(xml).toContain(`<c r="C2" s="1" t="inlineStr"><is><t>Invalid date</t></is></c>`);
    // the format is registered once per pointed one & only if a date-cell really occurs (so 'bad' adds nothing)
    expect(files["xl/styles.xml"]).toContain(
      `<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm:ss AM/PM"/>` +
        `<numFmt numFmtId="165" formatCode="dd\\/mm\\/yyyy"/></numFmts>`
    );
    // the auto-width of a date-column is defined by the format & not by the stored number
    const widthOf = (n) => +xml.match(new RegExp(`<col min="${n}" max="${n}" width="([\\d.]+)"`))[1];
    expect(widthOf(1)).toBeGreaterThan(widthOf(2));
    expect(xml).toMatchSnapshot("xl/worksheets/sheet1.xml");
    expect(files["xl/styles.xml"]).toMatchSnapshot("xl/styles.xml");
  });

  test("dates: the format of the sheet & of $defaults", async () => {
    const orig = exportToExcel.$defaults.dateTimeFormat;
    exportToExcel.$defaults.dateTimeFormat = "yyyy/M/d";
    try {
      await exportToExcel([
        { name: "S1", data: [{ v: new Date(2024, 2, 5) }], mapping: [{ propName: "v" }] },
        // the format of the sheet wins over $defaults & is inherited by every column of it
        { name: "S2", data: [{ v: new Date(2024, 2, 5) }], mapping: [{ propName: "v" }], dateTimeFormat: "MMM d, yy" },
      ]);
    } finally {
      exportToExcel.$defaults.dateTimeFormat = orig;
    }
    expect(files["xl/styles.xml"]).toContain(
      `<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\/m\\/d"/>` +
        `<numFmt numFmtId="165" formatCode="mmm d, yy"/></numFmts>`
    );
  });

  test("dates: the format-tokens of dateToString are converted into the Excel ones", async () => {
    // the formats that localeInfo.getDateFormat() returns for the real locales + all the supported tokens
    const formats = [
      "YYYY-MM-DD hh:mm:ss A", // localeInfo default
      "M/D/YYYY, h:mm:ss A", // en-US
      "DD.MM.YYYY, hh:mm:ss", // de-DE, ru-RU
      "YYYY/M/D h:mm:ss", // ja-JP
      "MMM d, yy hh:mm:ss.fff Z", // the short name of the month + the fractions + the UTC-flag
      "dddd", // WARN: 'ddd'+ is the name of the week-day in Excel, so it's cut by 2
    ];
    await exportToExcel([
      {
        data: [{ v: new Date(2024, 2, 5) }],
        mapping: formats.map((dateTimeFormat) => ({ propName: "v", dateTimeFormat })),
      },
    ]);
    // WARN: a slash is the locale date-separator of Excel & must be escaped to stay a literal one
    expect(files["xl/styles.xml"]).toContain(
      `<numFmts count="6">` +
        `<numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm:ss AM/PM"/>` +
        `<numFmt numFmtId="165" formatCode="m\\/d\\/yyyy, h:mm:ss AM/PM"/>` +
        `<numFmt numFmtId="166" formatCode="dd.mm.yyyy, hh:mm:ss"/>` +
        `<numFmt numFmtId="167" formatCode="yyyy\\/m\\/d h:mm:ss"/>` +
        `<numFmt numFmtId="168" formatCode="mmm d, yy hh:mm:ss.000 "/>` + // the space of the dropped Z stays
        `<numFmt numFmtId="169" formatCode="dd"/>` +
        `</numFmts>`
    );
  });

  test("getCellValue: the type of a cell is defined by the mapper & not by the value", async () => {
    const orig = exportToExcel.$defaults.getCellValue;
    // the mapper owns both parts of a cell: a stringified number can be forced into a number-cell, a real
    // number - into a text & any value - into a wrapped (multiline) one
    exportToExcel.$defaults.getCellValue = (v) => {
      if (v === "12.5") return { type: ExcelCellTypes.number, stringVal: (+v).toFixed(2) }; // + an own format
      if (v === "a") return { type: ExcelCellTypes.textWrap, stringVal: `${v}\nsecond line` };
      return { type: ExcelCellTypes.text, stringVal: `${v}` };
    };
    try {
      await exportToExcel([
        {
          name: "Custom",
          data: [{ asNum: "12.5", asText: 3, asWrap: "a" }],
          mapping: [{ propName: "asNum" }, { propName: "asText" }, { propName: "asWrap" }],
        },
      ]);
      const xml = files["xl/worksheets/sheet1.xml"];
      expect(xml).toContain(`<c r="A2" s="1" t="n"><v>12.50</v></c>`);
      expect(xml).toContain(`<c r="B2" s="1" t="inlineStr"><is><t>3</t></is></c>`);
      // ...a wrapped cell gets an own cell-format (with wrapText) even if the value isn't an array at all
      expect(xml).toContain(`<c r="C2" s="2" t="inlineStr"><is><t>a\nsecond line</t></is></c>`);
    } finally {
      exportToExcel.$defaults.getCellValue = orig;
    }
  });

  test("cellCallback: an own value & style of a cell", async () => {
    // WARN: a shared style-object is resolved once per column, an object-literal per cell - every time
    const red = { color: "#ff0000" };
    const calls = [];
    await exportToExcel(
      [
        {
          name: "Cb",
          data: [
            { v: 1, s: "a" },
            { v: -2, s: "b" },
            { v: -3, s: "c" },
          ],
          mapping: [{ propName: "v" }, { propName: "s" }],
        },
      ],
      (value, itemIndex, mapping) => {
        calls.push(`${mapping.propName}${itemIndex}:${value.stringVal}`);
        // an own value only: the style of the column is kept
        if (mapping.propName === "s") {
          return itemIndex === 0 ? { value: { type: ExcelCellTypes.text, stringVal: "first" } } : undefined;
        }
        // an own style only: the mapped value is kept
        return value.stringVal.startsWith("-") ? { style: red } : undefined;
      }
    );
    // it's called for every data-cell (& never for a header) with the value that getCellValue has mapped
    expect(calls).toEqual(["v0:1", "s0:a", "v1:-2", "s1:b", "v2:-3", "s2:c"]);
    const xml = files["xl/worksheets/sheet1.xml"];
    // the pointed value replaces the mapped one & keeps the style of the column
    expect(xml).toContain(`<c r="B2" s="${cellStyleId("A2")}" t="inlineStr"><is><t>first</t></is></c>`);
    expect(xml).toContain(`<c r="B3" s="${cellStyleId("A2")}" t="inlineStr"><is><t>b</t></is></c>`);
    // ...a cell with an own style gets an own cell-format, but the mapped value stays applied
    expect(xml).toContain(`<c r="A3" s="${cellStyleId("A3")}" t="n"><v>-2</v></c>`);
    expect(cellStyleId("A3")).not.toBe(cellStyleId("A2"));
    // the very same style-object is resolved once per column => a single cell-format & a single font
    expect(cellStyleId("A4")).toBe(cellStyleId("A3"));
    expect(files["xl/styles.xml"]).toContain(`<fonts count="3">`); // the document one + the bold header + the red
    // ...the pointed style is merged into the font of the column: only the color differs
    expect(fontById(cellStyleId("A3"))).toBe(
      `<sz val="11"/><color rgb="FFFF0000"/><name val="Calibri"/><family val="2"/>`
    );
    expect(fontById(cellStyleId("A2"))).toBe(`<sz val="11"/><name val="Calibri"/><family val="2"/>`);
    // the `<col>` belongs to the column & is never affected by a cell
    expect(xml).toMatch(new RegExp(`<col min="1" max="1" width="[\\d.]+" style="${cellStyleId("A2")}"`));

    // a callback that returns nothing at all changes nothing
    const noCb = () => files["xl/worksheets/sheet1.xml"];
    const sheets = [{ name: "Cb2", data: [{ v: 1 }], mapping: [{ propName: "v" }] }];
    await exportToExcel(sheets);
    const expected = noCb();
    await exportToExcel(sheets, () => undefined);
    expect(noCb()).toBe(expected);
  });

  test("cellCallback: the auto-width follows the style of a cell", async () => {
    const widthOf = (n) =>
      +files["xl/worksheets/sheet1.xml"].match(new RegExp(`<col min="${n}" max="${n}" width="([\\d.]+)"`))[1];
    const bold = { fontStyle: ExcelFontStyles.bold };
    const run = (cb) =>
      exportToExcel(
        [
          {
            name: "W",
            style: { fontFamily: "Tahoma" },
            data: [{ v: "Active", fix: "Active" }],
            mapping: [
              { propName: "v", headerText: "V" },
              { propName: "fix", headerText: "F", width: 5 },
            ],
          },
        ],
        cb
      );

    await run();
    const base = widthOf(1);
    // the bold face of Tahoma is ~17% wider, so such a cell widens the column
    await run(() => ({ style: bold }));
    expect(widthOf(1)).toBeGreaterThan(base * 1.1);
    // ...an explicit width still wins: such a column isn't measured at all
    expect(widthOf(2)).toBe(5);
  });

  test("cellCallback: a wrapped & a date cell of an own style", async () => {
    const big = { fontSize: 22 };
    const sheets = [
      {
        name: "DW",
        // WARN: the content must be long enough - otherwise the header defines the width & nothing is checked
        data: [
          { d: new Date(2024, 2, 5, 13, 45, 30), arr: ["wwwwwwwwww", "b"] },
          { d: new Date(2024, 2, 6, 1, 2, 3), arr: ["wwwwwwwwww", "d"] },
        ],
        mapping: [{ propName: "d" }, { propName: "arr" }],
      },
    ];
    const widthOf = (n) =>
      +files["xl/worksheets/sheet1.xml"].match(new RegExp(`<col min="${n}" max="${n}" width="([\\d.]+)"`))[1];

    await exportToExcel(sheets);
    const [baseDate, baseWrap] = [widthOf(1), widthOf(2)];

    await exportToExcel(sheets, (_v, itemIndex) => (itemIndex === 0 ? { style: big } : undefined));
    // a date-cell keeps the number-format of the column & a wrapped one - its wrapText, both with the own font
    expect(xfById(cellStyleId("A2"))).toContain(`numFmtId="164"`);
    expect(fontById(cellStyleId("A2"))).toContain(`<sz val="22"/>`);
    expect(xfById(cellStyleId("B2"))).toContain(`wrapText="1"`);
    expect(fontById(cellStyleId("B2"))).toContain(`<sz val="22"/>`);
    // ...the 2nd row has no own font => the ordinary styles of the columns
    expect(xfById(cellStyleId("A3"))).toContain(`numFmtId="164"`);
    expect(fontById(cellStyleId("A3"))).toContain(`<sz val="11"/>`);
    expect(cellStyleId("B3")).not.toBe(cellStyleId("B2"));
    // the number-format is registered once even though both fonts refer to it
    expect(files["xl/styles.xml"]).toContain(`<numFmts count="1">`);
    // a date is measured by its format & not by the stored number, so the doubled font widens the column ~2x
    expect(widthOf(1)).toBeGreaterThan(baseDate * 1.85);
    expect(widthOf(2)).toBeGreaterThan(baseWrap * 1.85);
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
