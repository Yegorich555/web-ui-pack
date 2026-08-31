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
    // the 2nd sheet re-uses the styles of the 1st one
    expect(files["xl/worksheets/sheet2.xml"]).toContain(`<c r="A1" s="3" t="inlineStr"><is><t>V</t></is></c>`);
    expect(files["xl/worksheets/sheet2.xml"]).toContain(`<c r="A2" s="1" t="inlineStr"><is><t>b</t></is></c>`);
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
    // 'Ж' isn't latin => 8px per char (as the default one); the longest line of a multiline value wins
    const sheet = (font) => ({
      name: "W",
      font,
      data: [{ v: ["ЖЖЖЖЖЖЖЖЖЖ", "i", "ii"] }],
      mapping: [{ propName: "v" }],
    });

    await exportToExcel([sheet()]);
    // 10 chars * 8px + 7px of the cell-padding, converted into the Excel-units (7px each)
    expect(colWidth()).toBe(12.43);

    await exportToExcel([sheet({ size: 22 })]);
    // the double font-size makes the content ~2x wider (the constant cell-padding isn't scaled)
    expect(colWidth()).toBeGreaterThan(12.43 * 1.85);
    expect(colWidth()).toBeLessThan(12.43 * 2);
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
