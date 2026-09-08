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
    test("ordinary data", () => {
      expect(csvFromData([{ a: 1, b: "str" }])).toBe("a|b\r\n1|str"); // '|' by default
      expect(csvFromData([{ a: 1, b: "str" }], null, { delimiter: ";" })).toBe("a;b\r\n1;str");
      expect(
        csvFromData([
          { a: 1, b: "str" },
          { a: 2, b: "str2" },
        ])
      ).toBe("a|b\r\n1|str\r\n2|str2");
      // every own prop of every item becomes a column
      expect(csvFromData([{ a: 1 }, { b: 2 }])).toBe("a|b\r\n1|\r\n|2");
    });

    test("no data => empty string", () => {
      expect(csvFromData([])).toBe("");
      expect(csvFromData([{}, {}])).toBe("");
      expect(csvFromData([{ a: 1 }], [])).toBe(""); // no column is mapped at all
    });

    test("mapping", () => {
      const data = [
        { name: "some name", someCnt: 5, extra: "skipped" },
        { name: "another", someCnt: 6, extra: "skipped" },
      ];
      // only the mapped props become columns & in the pointed order
      expect(csvFromData(data, [{ propName: "someCnt" }, { propName: "name" }])).toBe(
        "Some Cnt|Name\r\n5|some name\r\n6|another"
      );
      // headerText is applied as it is; without it the propName is prettified
      expect(csvFromData(data, [{ propName: "name", headerText: "Full name" }, { propName: "someCnt" }])).toBe(
        "Full name|Some Cnt\r\nsome name|5\r\nanother|6"
      );
      expect(csvFromData(data, [{ propName: "name", headerText: "" }])).toBe("\r\nsome name\r\nanother"); // empty header
      // a prop that no item has is an empty column
      expect(csvFromData(data, [{ propName: "missed" }])).toBe("Missed\r\n\r\n");
      // a column can be mapped twice
      expect(csvFromData([{ a: 1 }], [{ propName: "a" }, { propName: "a", headerText: "A2" }])).toBe("A|A2\r\n1|1");
      // an empty data with the pointed mapping => the header-row only
      expect(csvFromData([], [{ propName: "name" }])).toBe("Name");
    });

    test("no escaping: pick a delimiter that the data doesn't contain", () => {
      // a value is never quoted, so the delimiter inside it breaks the structure of the file
      expect(csvFromData([{ a: "1|5", b: 2 }])).toBe("a|b\r\n1|5|2");
      // ...but it's an ordinary char for another delimiter
      expect(csvFromData([{ a: "1|5" }], null, { delimiter: ";" })).toBe("a\r\n1|5");
      expect(csvFromData([{ "a|1": 2 }])).toBe("a|1\r\n2"); // a prop-name isn't escaped either
      expect(csvFromData([{ a: 2 }], [{ propName: "a", headerText: "h|1" }])).toBe("h|1\r\n2"); // a header either
      // a quote & a new-line are ordinary chars as well
      expect(csvFromData([{ a: 'say "hi"' }])).toBe('a\r\nsay "hi"');
      expect(csvFromData([{ a: "1\n5" }])).toBe("a\r\n1\n5");
      expect(csvFromData([{ a: "1\r5" }])).toBe("a\r\n1\r5");
    });

    test("null & boolean", () => {
      expect(csvFromData([{ a: null, b: undefined, c: 1 }])).toBe("a|b|c\r\n||1");
      expect(csvFromData([{ a: null }], null, { format: { nullFormat: "null" } })).toBe("a\r\nnull");
      expect(csvFromData([{ a: true, b: false }])).toBe("a|b\r\ntrue|false");
      expect(csvFromData([{ a: true, b: false }], null, { format: { boolFormat: (v) => (v ? "1" : "0") } })).toBe(
        "a|b\r\n1|0"
      );
    });

    test("date", () => {
      const dt = new Date(2022, 1, 3, 16, 5, 6);
      expect(localeInfo.dateTime).toBe("YYYY-MM-DD hh:mm:ss A"); // the default of localeInfo
      expect(csvFromData([{ a: dt }])).toBe("a\r\n2022-02-03 04:05:06 PM");
      expect(csvFromData([{ a: dt }], null, { format: { dateTimeFormat: "yyyy-MM-dd" } })).toBe("a\r\n2022-02-03");
      expect(csvFromData([{ a: new Date(NaN) }])).toBe("a\r\nNaN");
    });

    test("other types are stringified by toString()", () => {
      expect(csvFromData([{ a: 1.5, b: NaN, c: Infinity }])).toBe("a|b|c\r\n1.5|NaN|Infinity");
      expect(csvFromData([{ a: [1, 2] }], null, { delimiter: ";" })).toBe("a\r\n1,2");
      expect(csvFromData([{ a: { toString: () => "obj" } }])).toBe("a\r\nobj");
    });

    test("result is parsed back by csvToData", () => {
      const data = [
        { name: "some name", cnt: "5", when: "2022-02-03" },
        { name: "another", cnt: "", when: "2022-02-04" },
      ];
      expect(csvToData(csvFromData(data, null, { delimiter: ";" }), ";")).toEqual(data);
    });
  });
});
