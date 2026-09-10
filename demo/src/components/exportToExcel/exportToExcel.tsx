import { useState } from "react";
import Code from "src/elements/code";
import Example from "src/elements/example";
import Page from "src/elements/page";
import exportToExcel, { IExcelCellCallback, IExcelSheet } from "web-ui-pack/helpers/files/exportToExcel";
import saveAsFile from "web-ui-pack/helpers/files/saveAsFile";
import { stringPrettify } from "web-ui-pack/indexHelpers";
import {
  departmentColumns,
  departments,
  generateUsers,
  IUser,
  styledColumns,
  tooltipCellCallback,
  userCellCallback,
  userColumns,
  users,
} from "./data";
import styles from "./exportToExcel.scss";

interface IExportCase {
  label: string;
  fileName: string;
  details: string;
  getSheets: () => Array<IExcelSheet<any>>;
  cellCallback?: IExcelCellCallback<any>;
}

const cases: IExportCase[] = [
  {
    label: "Single sheet",
    fileName: "users.xlsx",
    details: "Prepared data below: strings, numbers, boolean, Date, string[], null & escaped symbols",
    getSheets: () => [{ data: users, mapping: userColumns, name: "Users" }],
  },
  {
    label: "Several sheets",
    fileName: "users-and-departments.xlsx",
    details: "Every item of the array is a separate Excel tab (with its own columns mapping)",
    getSheets: () => [
      { data: users, mapping: userColumns, name: "Users" },
      { data: departments, mapping: departmentColumns, name: "Departments" },
    ],
  },
  {
    label: "Cell styles",
    fileName: "cell-styles.xlsx",
    details:
      "cellCallback points an own value &/or style per cell: a row of an inactive user is red-italic, " +
      "an age below 30 is highlighted & a boolean is rendered as Yes/No; column width follows such a style either",
    getSheets: () => [{ data: users, mapping: userColumns, name: "Users" }],
    cellCallback: userCellCallback,
  },
  {
    label: "Cell tooltips",
    fileName: "cell-tooltips.xlsx",
    details:
      "cellCallback points a note per cell (the 'Review > Notes' of Excel): such a cell is marked with a red " +
      "corner in the 'Name' column (its header included) & the text pops up while the mouse is over it",
    getSheets: () => [{ data: users, mapping: userColumns, name: "Users" }],
    cellCallback: tooltipCellCallback,
  },
  {
    label: "Table styles",
    fileName: "table-styles.xlsx",
    details:
      "tableStyle points a built-in style of Excel per sheet (the gallery 'Home > Format as Table'): " +
      "'Light'1..21, 'Medium'1..28, 'Dark'1..11 or 'None' for an unstyled range",
    getSheets: () => [
      { data: users, mapping: userColumns, name: "Light16 (default)" },
      { data: users, mapping: userColumns, name: "Medium9", tableStyle: "Medium9" },
      { data: users, mapping: userColumns, name: "Dark2", tableStyle: "Dark2" },
      // no style at all: the sheet keeps only the fonts & the colors of its own style
      { data: users, mapping: styledColumns, name: "None", tableStyle: "None" },
    ],
  },
  {
    label: "10 000 rows",
    fileName: "big.xlsx",
    details: "Performance check: elapsed time is shown below",
    getSheets: () => [{ data: generateUsers(10000), mapping: userColumns, name: "Users" }],
  },
];

/** Renders value as it's expected to be in Excel */
function previewValue(v: IUser[keyof IUser]): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleString();
  if (Array.isArray(v)) return v.join("\n");
  return v.toString();
}

export default function ExportToExcelView() {
  const [pending, setPending] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; isError?: boolean } | null>(null);

  const exportAndSave = async (e: IExportCase): Promise<void> => {
    setPending(e.fileName);
    setStatus(null);
    try {
      const start = performance.now();
      const sheets = e.getSheets();
      const blob = await exportToExcel(sheets, null, e.cellCallback);
      const ms = Math.round(performance.now() - start);
      saveAsFile(blob, e.fileName);
      setStatus({ text: `Saved '${e.fileName}': ${(blob.size / 1024).toFixed(1)}Kb, generated in ${ms}ms` });
    } catch (err) {
      console.error(err);
      setStatus({ text: `Error: ${(err as Error).message}`, isError: true });
    } finally {
      setPending(null);
    }
  };

  return (
    <Page //
      header="exportToExcel"
      link="src/helpers/files/exportToExcel.ts"
      features={[
        "Creates a valid *.xlsx (OpenXML) document without any dependencies",
        "Auto-detects column width, applies autoFilter & a built-in table-style of Excel (per sheet)",
        "Custom style per sheet/columns/headers/cell: fontSize, fontFamily, fontStyle, color, backgroundColor",
        "Note (hover-tooltip) per cell",
        "Saves the result into a file at once or returns Blob: save it later, upload to a server or attach to an email",
      ]}
    >
      <Example header="Usage" link="demo/src/components/exportToExcel/exportToExcel.tsx">
        <Code code={codeJS} />
      </Example>

      <Example header="Export prepared data" link="demo/src/components/exportToExcel/exportToExcel.tsx">
        <div className={styles.examples}>
          {cases.map((e) => (
            <div key={e.label}>
              <button className="btn" type="button" disabled={!!pending} onClick={() => exportAndSave(e)}>
                {pending === e.fileName ? "Generating..." : e.label}
              </button>
              <small>{e.details}</small>
            </div>
          ))}
        </div>
        <div className={styles.status} data-error={status?.isError ? "" : undefined}>
          {status?.text}
        </div>
      </Example>

      <Example header="Prepared data" link="demo/src/components/exportToExcel/exportToExcel.tsx">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {userColumns.map((c) => (
                  <th key={c.propName as string}>{c.headerText ?? stringPrettify(c.propName as string)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email}>
                  {userColumns.map((c) => {
                    const v = previewValue(u[c.propName]);
                    return (
                      <td key={c.propName as string} data-empty={v === "" ? "" : undefined}>
                        {v || "empty"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Example>
    </Page>
  );
}

const codeJS = `js
import createExcelDoc, { ExcelFontStyles } from "web-ui-pack/helpers/files/exportToExcel";
import saveAsFile from "web-ui-pack/helpers/files/saveAsFile";

const users = [
  { name: "John Doe", age: 32, isActive: true,
    registeredAt: new Date(), roles: ["Admin", "Developer"] },
  // ...
];

/** Style of a highlighted cell:
 *  it's merged into the style of the column, so only the difference is pointed */
const highlight = { backgroundColor: "#ffe699", fontStyle: ExcelFontStyles.bold };

createExcelDoc.$defaults.style.fontSize = 12;

const blob = await createExcelDoc([
  {
    name: "Users", // optional; default is 'Sheet{number}'
    data: users,
    mapping: [
      { propName: "name" }, // header text is prettified propName: 'Name'
      { propName: "registeredAt", headerText: "Registered at" }, // custom header text
      { propName: "roles", maxWidth: 30 }, // limit column width
      // header is bold by default; missed options are inherited from the sheet-style
      { propName: "notes", headerStyle: { color: "#ffffff", backgroundColor: "#4472c4" } },
    ],

    // optional styles
    style: { fontSize: 12, fontFamily: "Calibri", color: "#333333" },

     // missed font inheritted from 'style'
    headerStyle: { fontStyle: ExcelFontStyles.bold, color: "#4472c4" },

    // built-in style of Excel that colors the header & the banded rows; 'None' for an unstyled range
    tableStyle: "Medium9",
  },
  // ...next sheet here
],

 // optional: filename to save the result at once OR call saveAsFile(blob, "users.xlsx")
"users.xlsx",

// optional callback
(value, itemIndex, mapping) => {
  // object-literal that is built inside the callback is re-resolved for every single cell
  if (mapping.propName === "age" && users[itemIndex].age < 30)
     return { style: highlight };

  // ...an own value: WARN never mutate the pointed one - return a new object instead
  if (mapping.propName === "isActive")
     return { value: { ...value, stringVal: value.stringVal === "true" ? "Yes" : "No" } };

  // ...an own note: the cell gets a red corner & shows the text on hover ('Review > Notes')
  if (mapping.propName === "name")
     return { tooltip: \`Registered at \${users[itemIndex].registeredAt.toLocaleString()}\` };

  return undefined; // nothing is overridden: the cell keeps the value & the style of the column
});`;
