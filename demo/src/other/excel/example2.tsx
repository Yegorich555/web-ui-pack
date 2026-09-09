import { useState } from "react";
import Example from "src/elements/example";
import exportToExcel, { IExcelCellCallback, IExcelSheet } from "web-ui-pack/helpers/files/exportToExcel";
import saveAsFile from "web-ui-pack/helpers/files/saveAsFile";
import {
  departmentColumns,
  departments,
  generateUsers,
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
      "corner in the 'Name' column & the text pops up while the mouse is over it",
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

export default function Example2() {
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
    <Example header="Export prepared data" link="demo/src/other/excel/example2.tsx">
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
  );
}
