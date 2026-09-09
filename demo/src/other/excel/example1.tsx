import Code from "src/elements/code";
import Example from "src/elements/example";

export default function Example1() {
  return (
    <Example header="Usage" link="demo/src/other/excel/example1.tsx">
      <Code code={codeJS} />
    </Example>
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
