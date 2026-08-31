import { useState } from "react";
import Page from "src/elements/page";
import Code from "src/elements/code";
import exportToExcel, { IExcelSheet } from "web-ui-pack/helpers/exportToExcel";
import { stringPrettify } from "web-ui-pack/indexHelpers";
import styles from "./exportToExcel.scss";

/** Saves Blob into file via hidden <a download> */
function saveAs(blob: Blob, fileName: string): Promise<void> {
  const href = window.URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.setAttribute("href", href);
  el.setAttribute("download", fileName || "downloadedFile");
  el.click();

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      el.remove();
      window.URL.revokeObjectURL(href);
      resolve();
    }, 100);
  });
}

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
    name: "Кирилл Ще́рба",
    email: "kirill@почта.рф",
    age: 45,
    isActive: true,
    registeredAt: new Date("2019-01-31T00:00:00"),
    roles: [],
    notes: null,
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

/** The same columns but with a custom header-font per column */
const styledColumns: IExcelSheet<IUser>["mapping"] = userColumns.map((c, i) => ({
  ...c,
  headerFont: i % 2 ? { color: "#ffffff", backgroundColor: "#4472c4" } : { color: "#4472c4", style: "underline" },
}));

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
    label: "Without name",
    fileName: "default-names.xlsx",
    details: "Tabs are named Sheet1, Sheet2... Forbidden chars []:*?/\\ are replaced & name is cut by 31 chars",
    getSheets: () => [
      { data: departments, mapping: departmentColumns },
      { data: departments, mapping: departmentColumns, name: "Bad[name]:with*forbidden?chars/and\\too long" },
    ],
  },
  {
    label: "Custom fonts",
    fileName: "fonts.xlsx",
    details:
      "Font per sheet (size, family, color) & per header-column (style, color, backgroundColor); " +
      "missed options are inherited from the sheet-font & $defaults; column width is scaled by the font-size",
    getSheets: () => [
      { data: users, mapping: styledColumns, name: "Styled", font: { size: 14, family: "Segoe UI", color: "#333333" } },
      { data: departments, mapping: departmentColumns, name: "Defaults" },
    ],
  },
  {
    label: "Empty data",
    fileName: "empty.xlsx",
    details: "Only header-row is exported: Excel treats an empty table as a broken content, so table-part is skipped",
    getSheets: () => [{ data: [], mapping: userColumns, name: "No rows" }],
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
      const blob = await exportToExcel(sheets);
      const ms = Math.round(performance.now() - start);
      await saveAs(blob, e.fileName);
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
      link="src/helpers/exportToExcel.ts"
      features={[
        "Creates a valid *.xlsx (OpenXML) document without any heavy dependencies",
        "Several sheets (tabs) per document; every sheet has own columns mapping",
        "Auto-detects column width, applies autoFilter & table styling",
        "Custom font per sheet & per header-column: size, family, style, color, backgroundColor",
        "Formats values by type: Date via localeInfo, boolean, number, string[] (joined by new-line + wrapText)",
        "Escapes XML-specific symbols & sanitizes a sheet-name according to Excel rules",
        "Returns Blob: save it to a file, upload to a server or attach to an email",
      ]}
    >
      <section>
        <h3>Usage</h3>
        <small>
          Import directly from <b>web-ui-pack/helpers/exportToExcel</b> to avoid pulling <b>fflate</b> into a bundle
          that doesn&apos;t need it (or use <b>WUPHelpers.exportToExcel</b>)
        </small>
        <Code code={codeJS} />
      </section>
      <section>
        <h3>Export prepared data</h3>
        <small>Click a button to generate & download the document</small>
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
        <small>
          The same values as expected in the exported document (see <b>users</b> in the demo-code)
        </small>
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
import createExcelDoc from "web-ui-pack/helpers/exportToExcel";

const users = [
  { name: "John Doe", age: 32, isActive: true, registeredAt: new Date(), roles: ["Admin", "Developer"] },
  // ...
];

const blob = await createExcelDoc([
  {
    name: "Users", // optional; default is 'Sheet{number}'
    data: users,
    font: { size: 12, family: "Segoe UI", color: "#333333" }, // optional; default is { size: 11, family: "Calibri" }
    mapping: [
      { propName: "name" }, // header text is prettified propName: 'Name'
      { propName: "registeredAt", headerText: "Registered at" }, // custom header text
      { propName: "roles", maxWidth: 30 }, // limit column width
      // header is bold by default; missed options are inherited from the sheet-font
      { propName: "notes", headerFont: { color: "#ffffff", backgroundColor: "#4472c4" } },
    ],
  },
  // ...next sheet here
]);

saveAs(blob, "users.xlsx");

/** Saves Blob into file via hidden <a download> */
function saveAs(blob, fileName) {
  const href = window.URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.setAttribute("href", href);
  el.setAttribute("download", fileName || "downloadedFile");
  el.click();

  return new Promise((resolve) => {
    setTimeout(() => {
      el.remove();
      window.URL.revokeObjectURL(href);
      resolve();
    }, 100);
  });
}`;
