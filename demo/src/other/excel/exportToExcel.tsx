import Page from "src/elements/page";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";

export default function ExportToExcelView() {
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
      <Example1 />
      <Example2 />
      <Example3 />
    </Page>
  );
}
