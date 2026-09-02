import { useState } from "react";
import Page from "src/elements/page";
import Code from "src/elements/code";
import exportToExcel, {
  ExcelFontStyles,
  IExcelCellCallback,
  IExcelStyle,
  IExcelSheet,
} from "web-ui-pack/helpers/files/exportToExcel";
import saveAsFile from "web-ui-pack/helpers/files/saveAsFile";
import { stringPrettify } from "web-ui-pack/indexHelpers";
import styles from "./exportToExcel.scss";

interface IUser {
  name: string;
  email: string;
  age: number;
  isActive: boolean;
  registeredAt: Date;
  roles: string[];
  notes: string | null;
}

const users: IUser[] = [
  {
    name: "John Doe",
    email: "john.doe@google.com",
    age: 32,
    isActive: true,
    registeredAt: new Date("2021-04-13T10:24:00"),
    roles: ["Admin", "Developer"],
    notes: "Regular text without any special symbols",
  },
  {
    name: 'Anna "The Great" O\'Brian',
    email: "anna<obrian>@mail.com",
    age: 27,
    isActive: false,
    registeredAt: new Date("2023-11-02T18:03:45"),
    roles: ["Guest & Reader", "<b>Tester</b>"],
    notes: "Checks escaping of & < > \" ' ` symbols",
  },
  {
    name: "Very long name that must be cut by column maxWidth option",
    email: "long@mail.com",
    age: 0,
    isActive: false,
    registeredAt: new Date("2024-06-07T23:59:59"),
    roles: ["Reader"],
    notes:
      "Very long note to check that column width is limited by maxWidth: 30 and the rest of the text is wrapped by the cell style",
  },
  {
    name: "Multi\nline\nvalue",
    email: "multi@mail.com",
    age: 19,
    isActive: true,
    registeredAt: new Date("2025-02-14T12:00:00"),
    roles: ["Owner", "Manager", "Developer"],
    notes: "Array values are joined by new-line & cell gets wrapText style",
  },
];

const userColumns: IExcelSheet<IUser>["mapping"] = [
  { propName: "name" },
  { propName: "email", headerText: "E-mail" },
  { propName: "age" },
  { propName: "isActive", headerText: "Active" },
  { propName: "registeredAt", headerText: "Registered at" },
  { propName: "roles" },
  { propName: "notes", maxWidth: 30 },
];

interface IDepartment {
  title: string;
  headCount: number;
  budget: number;
}

const departments: IDepartment[] = [
  { title: "Development", headCount: 24, budget: 1200000 },
  { title: "Sales", headCount: 8, budget: 340000 },
  { title: "Support", headCount: 13, budget: 210000 },
];

const departmentColumns: IExcelSheet<IDepartment>["mapping"] = [
  { propName: "title", headerText: "Department" },
  { propName: "headCount" },
  { propName: "budget", maxWidth: 20 },
];

/** The same columns but with a custom header-style per column */
const styledColumns: IExcelSheet<IUser>["mapping"] = userColumns.map((c, i) => ({
  ...c,
  headerStyle:
    i % 2
      ? { color: "#ffffff", backgroundColor: "#4472c4" }
      : { color: "#4472c4", fontStyle: ExcelFontStyles.underline },
}));

/** Styles of a highlighted cell.
 * WARN: such a style must be a shared object - it's merged & measured once per (style-object, column) pair,
 * while an object-literal that is built inside the callback is re-resolved for every single cell */
const styleInactive: IExcelStyle = { color: "#c00000", fontStyle: ExcelFontStyles.italic };
const styleYoung: IExcelStyle = { backgroundColor: "#ffe699", fontStyle: ExcelFontStyles.bold };

/** Points an own value &/or style per cell: a row of an inactive user is red-italic, an age below 30 is
 * highlighted & a boolean is rendered as Yes/No */
const userCellCallback: IExcelCellCallback<IUser> = (value, itemIndex, mapping) => {
  const user = users[itemIndex];
  let style: IExcelStyle | undefined;
  if (!user.isActive) style = styleInactive;
  else if (mapping.propName === "age" && user.age < 30) style = styleYoung;

  if (mapping.propName !== "isActive") return style ? { style } : undefined;
  // WARN: never mutate the pointed value - return an own one instead
  return { style, value: { ...value, stringVal: user.isActive ? "Yes" : "No" } };
};

/** Generates a huge dataset to check performance & memory */
function generateUsers(cnt: number): IUser[] {
  const result: IUser[] = new Array(cnt);
  for (let i = 0; i < cnt; ++i) {
    const src = users[i % users.length];
    result[i] = { ...src, name: `${i + 1}. ${src.name}`, age: src.age + (i % 40) };
  }
  return result;
}

interface IExample {
  label: string;
  fileName: string;
  details: string;
  getSheets: () => Array<IExcelSheet<any>>;
  cellCallback?: IExcelCellCallback<any>;
}

const examples: IExample[] = [
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

  const exportAndSave = async (e: IExample): Promise<void> => {
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
        "Auto-detects column width, applies autoFilter & table styling",
        "Custom style per sheet/columns/headers/cell: fontSize, fontFamily, fontStyle, color, backgroundColor",
        "Saves the result into a file at once or returns Blob: save it later, upload to a server or attach to an email",
      ]}
    >
      <section>
        <h3>Usage</h3>
        <Code code={codeJS} />
      </section>
      <section>
        <h3>Export prepared data</h3>
        <div className={styles.examples}>
          {examples.map((e) => (
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
      </section>
      <section>
        <h3>Prepared data</h3>
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
      </section>
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

  return undefined; // nothing is overridden: the cell keeps the value & the style of the column
});`;
