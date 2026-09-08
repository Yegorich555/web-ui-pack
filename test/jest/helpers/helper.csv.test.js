import { csvDefineDelimiter, csvFromData, csvToData } from "web-ui-pack/helpers/files/csv";
import localeInfo from "web-ui-pack/objects/localeInfo";

describe("helper.csv", () => {
  describe("csvDefineDelimiter", () => {
    test("every possible delimiter", () => {
      [";", "|", "\t", ","].forEach((d) => {
        expect(csvDefineDelimiter(`a${d}b\n1${d}2`)).toBe(d);
        expect(csvDefineDelimiter(`a${d}b`)).toBe(d); // a single row in CSV
      });
    });

    test("row ends with CR", () => {
      expect(csvDefineDelimiter("a|b\r1|2")).toBe("|");
    });

    test("no delimiter at all => ';'", () => {
      expect(csvDefineDelimiter("")).toBe(";");
      expect(csvDefineDelimiter("ab\ncd")).toBe(";");
      expect(csvDefineDelimiter("ab")).toBe(";");
      expect(csvDefineDelimiter("ab\n1,2")).toBe(";"); // only the 1st row matters
    });
  });

  describe("csvToData", () => {
    test("ordinary csv", () => {
      expect(csvToData("a;b\n1;2\n3;4")).toEqual([
        { a: "1", b: "2" },
        { a: "3", b: "4" },
      ]);
      // delimiter is auto-defined
      expect(csvToData("a|b\n1|2")).toEqual([{ a: "1", b: "2" }]);
      expect(csvToData("a\tb\n1\t2")).toEqual([{ a: "1", b: "2" }]);
      // ...or pointed itself
      expect(csvToData("a,b\n1,2", ",")).toEqual([{ a: "1", b: "2" }]);
      expect(csvToData("a;b\n1;2", ",")).toEqual([{ "a;b": "1;2" }]); // wrong delimiter: the whole row is a value
    });

    test("empty values", () => {
      expect(csvToData("")).toEqual([]);
      expect(csvToData("\n")).toEqual([]);
      expect(csvToData("a;b")).toEqual([]); // header only
      expect(csvToData("a;b\n;")).toEqual([]); // a row without any value is skipped
      expect(csvToData("a;b\n1;")).toEqual([{ a: "1", b: "" }]);
      expect(csvToData("a;b\n;2")).toEqual([{ a: "", b: "2" }]);
      expect(csvToData("a;b;c\n1;2")).toEqual([{ a: "1", b: "2" }]); // the missed value isn't defined at all
      expect(csvToData("a\n1;2")).toEqual([{ a: "1", 1: "2" }]); // an extra value gets its index as a prop-name
    });

    test("new-lines", () => {
      expect(csvToData("a;b\r\n1;2\r\n3;4")).toEqual([
        { a: "1", b: "2" },
        { a: "3", b: "4" },
      ]);
      expect(csvToData("a;b\r1;2\r3;4")).toEqual([
        { a: "1", b: "2" },
        { a: "3", b: "4" },
      ]);
      // spare new-lines
      expect(csvToData("a;b\n1;2\n")).toEqual([{ a: "1", b: "2" }]);
      expect(csvToData("a;b\r\n1;2\r\n")).toEqual([{ a: "1", b: "2" }]);
      expect(csvToData("a;b\n\n1;2\n\n\n3;4\n")).toEqual([
        { a: "1", b: "2" },
        { a: "3", b: "4" },
      ]);
    });

    test("quotes aren't supported: a `\"` is an ordinary char", () => {
      expect(csvToData('a;b\n"1";"2"')).toEqual([{ a: '"1"', b: '"2"' }]);
      // a delimiter inside quotes is still a delimiter, so such a value is split
      expect(csvToData('a;b\n"1;5";2')).toEqual([{ a: '"1', b: '5"', 2: "2" }]);
    });

    test("BOM", () => {
      expect(csvToData("\ufeffa;b\n1;2")).toEqual([{ a: "1", b: "2" }]);
    });
  });

  describe("csvFromData", () => {
    const mapAB = [{ propName: "a" }, { propName: "b" }];

    test("ordinary data", () => {
      // '|' is a delimiter by default & every row (the header-row either) ends with CRLF
      expect(csvFromData([{ a: 1, b: "str" }], mapAB)).toBe("A|B\r\n1|str\r\n");
      expect(csvFromData([{ a: 1, b: "str" }], mapAB, { delimiter: ";" })).toBe("A;B\r\n1;str\r\n");
      expect(
        csvFromData(
          [
            { a: 1, b: "str" },
            { a: 2, b: "str2" },
          ],
          mapAB
        )
      ).toBe("A|B\r\n1|str\r\n2|str2\r\n");
    });

    test("no data => the header-row only", () => {
      expect(csvFromData([], [{ propName: "name" }])).toBe("Name\r\n");
      expect(csvFromData([{ a: 1 }], [])).toBe("\r\n"); // no column is mapped at all
      expect(csvFromData([], [])).toBe("\r\n");
    });

    test("mapping", () => {
      const data = [
        { name: "some name", someCnt: 5, extra: "skipped" },
        { name: "another", someCnt: 6, extra: "skipped" },
      ];
      // only the mapped props become columns & in the pointed order
      expect(csvFromData(data, [{ propName: "someCnt" }, { propName: "name" }])).toBe(
        "Some Cnt|Name\r\n5|some name\r\n6|another\r\n"
      );
      // headerText is applied as it is; without it the propName is prettified
      expect(csvFromData(data, [{ propName: "name", headerText: "Full name" }, { propName: "someCnt" }])).toBe(
        "Full name|Some Cnt\r\nsome name|5\r\nanother|6\r\n"
      );
      expect(csvFromData(data, [{ propName: "name", headerText: "" }])).toBe("\r\nsome name\r\nanother\r\n"); // empty header
      // a prop that no item has is an empty column
      expect(csvFromData(data, [{ propName: "missed" }])).toBe("Missed\r\n\r\n\r\n");
      // a column can be mapped twice
      expect(csvFromData([{ a: 1 }], [{ propName: "a" }, { propName: "a", headerText: "A2" }])).toBe("A|A2\r\n1|1\r\n");
    });

    test("no escaping: pick a delimiter that the data doesn't contain", () => {
      // a value is never quoted, so the delimiter inside it breaks the structure of the file
      expect(csvFromData([{ a: "1|5", b: 2 }], mapAB)).toBe("A|B\r\n1|5|2\r\n");
      // ...but it's an ordinary char for another delimiter
      expect(csvFromData([{ a: "1|5" }], [{ propName: "a" }], { delimiter: ";" })).toBe("A\r\n1|5\r\n");
      // a header isn't escaped either
      expect(csvFromData([{ a: 2 }], [{ propName: "a", headerText: "h|1" }])).toBe("h|1\r\n2\r\n");
      expect(csvFromData([{ "a|1": 2 }], [{ propName: "a|1" }])).toBe("A|1\r\n2\r\n");
      // a quote & a new-line are ordinary chars as well
      expect(csvFromData([{ a: 'say "hi"' }], [{ propName: "a" }])).toBe('A\r\nsay "hi"\r\n');
      expect(csvFromData([{ a: "1\n5" }], [{ propName: "a" }])).toBe("A\r\n1\n5\r\n");
      expect(csvFromData([{ a: "1\r5" }], [{ propName: "a" }])).toBe("A\r\n1\r5\r\n");
    });

    test("null & boolean", () => {
      const mapABC = [...mapAB, { propName: "c" }];
      expect(csvFromData([{ a: null, b: undefined, c: 1 }], mapABC)).toBe("A|B|C\r\n||1\r\n");
      expect(csvFromData([{ a: null }], [{ propName: "a" }], { format: { nullFormat: "null" } })).toBe("A\r\nnull\r\n");
      expect(csvFromData([{ a: true, b: false }], mapAB)).toBe("A|B\r\ntrue|false\r\n");
      expect(csvFromData([{ a: true, b: false }], mapAB, { format: { boolFormat: (v) => (v ? "1" : "0") } })).toBe(
        "A|B\r\n1|0\r\n"
      );
    });

    test("date", () => {
      const dt = new Date(2022, 1, 3, 16, 5, 6);
      expect(localeInfo.dateTime).toBe("YYYY-MM-DD hh:mm:ss A"); // the default of localeInfo
      expect(csvFromData([{ a: dt }], [{ propName: "a" }])).toBe("A\r\n2022-02-03 04:05:06 PM\r\n");
      expect(csvFromData([{ a: dt }], [{ propName: "a" }], { format: { dateTimeFormat: "yyyy-MM-dd" } })).toBe(
        "A\r\n2022-02-03\r\n"
      );
      expect(csvFromData([{ a: new Date(NaN) }], [{ propName: "a" }])).toBe("A\r\nNaN\r\n");
    });

    test("other types are stringified by toString()", () => {
      expect(csvFromData([{ a: 1.5, b: NaN, c: Infinity }], [...mapAB, { propName: "c" }])).toBe(
        "A|B|C\r\n1.5|NaN|Infinity\r\n"
      );
      expect(csvFromData([{ a: [1, 2] }], [{ propName: "a" }], { delimiter: ";" })).toBe("A\r\n1,2\r\n");
      expect(csvFromData([{ a: { toString: () => "obj" } }], [{ propName: "a" }])).toBe("A\r\nobj\r\n");
    });

    test("result is parsed back by csvToData", () => {
      const data = [
        { name: "some name", cnt: "5", when: "2022-02-03" },
        { name: "another", cnt: "", when: "2022-02-04" },
      ];
      // headerText keeps the prop-names as they are: otherwise the prettified header renames the parsed props
      const mapping = Object.keys(data[0]).map((propName) => ({ propName, headerText: propName }));
      expect(csvToData(csvFromData(data, mapping, { delimiter: ";" }), ";")).toEqual(data);
    });
  });
});
