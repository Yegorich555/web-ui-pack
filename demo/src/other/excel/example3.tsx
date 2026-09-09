import Example from "src/elements/example";
import { stringPrettify } from "web-ui-pack/indexHelpers";
import { IUser, userColumns, users } from "./data";
import styles from "./exportToExcel.scss";

/** Renders value as it's expected to be in Excel */
function previewValue(v: IUser[keyof IUser]): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleString();
  if (Array.isArray(v)) return v.join("\n");
  return v.toString();
}

export default function Example3() {
  return (
    <Example header="Prepared data" link="demo/src/other/excel/example3.tsx">
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
  );
}
