import { zip, strToU8 } from "./zip";
import { stringPrettify } from "./string";
import dateToString from "./dateToString";
import localeInfo from "../objects/localeInfo";

interface HeaderKey<T = any> {
  /** Item property name to map on excel cell per column */
  propName: keyof T;
  /** Text of header, if `undefined` then extacted from propName via stringPrettify() */
  text?: string;
  /** Limit max width for column */
  maxWidth?: number;
}

export interface IExcelSheet<T = any> {
  /** Items to paste into excel according to mapping in columns */
  data: Array<T>;
  /** Mapping config */
  columns: HeaderKey<T>[];
  /** Name of the Excel tab; default is `Sheet{number}` */
  sheetName?: string;
}

interface IExportConfig {
  columns: Array<string>;
  mappedColumns: Array<{ value: string; style: string; width: number; maxWidth?: number }>;
  rows: Array<Array<string>>;
  mappedRows: Array<Array<{ value: string; style: string }>>;
}

const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

const escape = (str: string): string => str.replace(/[&<>"'`]/g, (m) => escapeMap[m as keyof typeof escapeMap]);

/** Static parts of the document: defined once to avoid re-allocating on every export */
const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const styleSheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"><fonts><font></font></fonts><fills><fill></fill></fills><borders><border></border></borders><cellStyleXfs><xf/></cellStyleXfs><cellXfs><xf><alignment vertical="top"/></xf><xf><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs/><tableStyles defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/><extLst><ext uri="{EB79DEF2-80B8-43e5-95BD-54CBDDF9020C}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:slicerStyles defaultSlicerStyle="SlicerStyleLight1"/></ext><ext uri="{9260A510-F301-46a8-8635-F512D64BE5F5}" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main"><x15:timelineStyles defaultTimelineStyle="TimeSlicerStyleLight1"/></ext></extLst></styleSheet>`;

function getCellValue<T>(_headerKey: HeaderKey<T>, v: T[keyof T]): string {
  if (v == null) return "";
  // Not used anymore if (headerKey.type === "email") return <a href={`mailto:${value}`}>{value}</a>;
  if (v instanceof Date) return dateToString(v, localeInfo.dateTime);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return v.toString();
  return v as string;
}

export default async function createExcelDoc<T>(sheetsData: Array<IExcelSheet<T>>): Promise<Blob> {
  const newLine = String.fromCharCode(10);
  const styles = {
    default: 's="0" ',
    array: 's="1" ',
    getStyle(value: string) {
      return Array.isArray(value) ? styles.array : styles.default;
    },
  };

  const formatIfArray = (value: string): string => {
    if (Array.isArray(value)) return value.join(newLine);
    return value;
  };
  const formatToString = (value: string): string => {
    const v = formatIfArray(value);
    if (v == null) return "";
    return v.toString();
  };

  const arrayMax = (array: number[]): number => {
    let result = 0;
    array.forEach((v) => {
      if (v > result) result = v;
    });
    return result;
  };

  const getCellLength = (cell: { value: string; style: string }): number => {
    if (!cell.value) return 0;
    const v = cell.value.split(newLine);
    const t = arrayMax(v.map((a) => a.length));
    return t;
  };

  const getHeaderText = (header: HeaderKey): string => {
    if (header.text !== undefined) {
      return header.text as string;
    }

    return stringPrettify(header.propName as string);
  };

  const getSheetConfig = (sheet: IExcelSheet): IExportConfig => {
    const headerKeys = sheet.columns;

    const config: IExportConfig = {
      columns: headerKeys.map((h) => getHeaderText(h)),
      mappedRows: [],
      mappedColumns: [],
      rows: sheet.data.map((item) => headerKeys.map((h) => getCellValue(h, item[h.propName]))),
    };

    config.mappedRows = config.rows.map((row) =>
      row.map((value) => ({ value: formatToString(value), style: styles.getStyle(value) }))
    );

    config.mappedColumns = config.columns.map((value, i) => {
      const asString = value as string;
      return {
        value: asString,
        style: styles.default,
        maxWidth: headerKeys[i].maxWidth,
        width: Math.max(arrayMax(config.mappedRows.map((row) => getCellLength(row[i]))), asString.length + 4) || 10,
      };
    });

    return config;
  };

  const generateColumnLetter = (colIndex: number): string => {
    const prefix = Math.floor(colIndex / 26);
    const letter = String.fromCharCode(97 + (colIndex % 26)).toUpperCase();
    if (prefix === 0) {
      return letter;
    }
    return generateColumnLetter(prefix - 1) + letter;
  };

  /** Excel doesn't allow []:*?/\ in a tab name and cuts it by 31 chars */
  const getSheetName = (sheetName: string | undefined, num: number): string =>
    escape((sheetName || `Sheet${num}`).replace(/[[\]:*?/\\]/g, " ").substring(0, 31));

  const sheets = sheetsData.map((sheet, i) => {
    const num = i + 1;
    const config = getSheetConfig(sheet);
    return {
      num,
      config,
      name: getSheetName(sheet.sheetName, num),
      // an empty table (a header row without data) is treated by Excel as a broken content, so skip it at all
      hasTable: config.mappedRows.length > 0,
    };
  });

  const generatorCellNumber = (index: number, rowNumber: number): string =>
    `${generateColumnLetter(index)}${rowNumber}`;
  const generatorStringCell = (index: number, cell: IExportConfig["mappedRows"]["0"]["0"], rowIndex: number): string =>
    `<c r="${generatorCellNumber(index, rowIndex)}" ${cell.style}t="inlineStr"><is><t>${escape(
      cell.value
    )}</t></is></c>`;
  // var generatorNumberCell = (index, value, rowIndex) => (`<c r="${generatorCellNumber(index, rowIndex)}"><v>${value}</v></c>`);

  const formatCell = (cell: { value: string; style: string }, index: number, rowIndex: number): string =>
    // return typeof value === 'number' ?
    //     generatorNumberCell(index, value, rowIndex) :
    generatorStringCell(index, cell, rowIndex);

  const formatRow = (row: { value: string; style: string }[], index: number): string => {
    // To ensure the row number starts as in excel.
    const rowIndex = index + 1;
    const rowCells = row.map((cell, cellIndex) => formatCell(cell, cellIndex, rowIndex)).join("");
    return `<row r="${rowIndex}">${rowCells}</row>`;
  };

  const workbookXML =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mx="http://schemas.microsoft.com/office/mac/excel/2008/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><workbookPr/><sheets>` +
    `${sheets
      .map((s) => `<sheet state="visible" name="${s.name}" sheetId="${s.num}" r:id="rId${s.num + 2}"/>`)
      .join("")}</sheets><definedNames/><calcPr/></workbook>`;

  const workbookXMLRels =
    `<?xml version="1.0" ?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `${sheets
      .map(
        (s) =>
          `<Relationship Id="rId${s.num + 2}" Target="worksheets/sheet${
            s.num
          }.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>`
      )
      .join(
        ""
      )}<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const contentTypes =
    `<?xml version="1.0" ?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default ContentType="application/xml" Extension="xml"/><Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/>` +
    `${sheets
      .map(
        (s) =>
          `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" PartName="/xl/worksheets/sheet${
            s.num
          }.xml"/>${
            s.hasTable
              ? `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml" PartName="/xl/tables/table${s.num}.xml"/>`
              : ""
          }`
      )
      .join(
        ""
      )}<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" PartName="/xl/workbook.xml"/><Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" PartName="/xl/styles.xml"/></Types>`;

  const getWorkSheet = (
    columns: IExportConfig["mappedColumns"],
    rows: IExportConfig["mappedRows"],
    hasTable: boolean
  ): string =>
    `<?xml version="1.0" ?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:mx="http://schemas.microsoft.com/office/mac/excel/2008/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><cols>` +
    `${columns
      .map(
        (col, i) =>
          `<col min="${i + 1}" max="${i + 1}" width="${
            col.width > (col.maxWidth || Number.MAX_SAFE_INTEGER) ? col.maxWidth : col.width + 1
          }" bestFit="1" customWidth="1"/>`
      )
      .join("")}</cols><sheetData>${
      formatRow(columns, 0) + rows.map((row, index) => formatRow(row, index + 1)).join("")
    }</sheetData>${hasTable ? `<tableParts count="1"><tablePart r:id="rId1"/></tableParts>` : ""}</worksheet>`;

  const getTableTemplate = (
    columns: IExportConfig["mappedColumns"],
    rows: IExportConfig["mappedRows"],
    num: number
  ): string => {
    const lastNum = generateColumnLetter(columns.length - 1) + (rows.length + 1);
    return (
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${num}" name="Table${num}" displayName="Table${num}" ref="A1:${lastNum}" insertRow="1" totalsRowShown="0"><autoFilter ref="A1:${lastNum}"/><tableColumns count="${columns.length}">` +
      `${columns
        .map((item, i) => `<tableColumn id="${i + 1}" name="${escape(item.value)}"/>`)
        .join(
          ""
        )}</tableColumns><tableStyleInfo name="TableStyleLight16" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`
    );
  };

  const getTableRelationShip = (num: number): string =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${num}.xml"/></Relationships>`;

  // Create a flat file structure for fflate
  const files: Record<string, Uint8Array> = {
    "xl/workbook.xml": strToU8(workbookXML),
    "xl/_rels/workbook.xml.rels": strToU8(workbookXMLRels),
    "xl/styles.xml": strToU8(styleSheet),
    "_rels/.rels": strToU8(rels),
    "[Content_Types].xml": strToU8(contentTypes),
  };

  sheets.forEach(({ num, config, hasTable }) => {
    files[`xl/worksheets/sheet${num}.xml`] = strToU8(getWorkSheet(config.mappedColumns, config.mappedRows, hasTable));
    if (hasTable) {
      files[`xl/tables/table${num}.xml`] = strToU8(getTableTemplate(config.mappedColumns, config.mappedRows, num));
      files[`xl/worksheets/_rels/sheet${num}.xml.rels`] = strToU8(getTableRelationShip(num));
    }
  });

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

  return new Blob([new Uint8Array(zipped)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
