import { ExcelFontStyles, IExcelCellCallback, IExcelStyle, IExcelSheet } from "web-ui-pack/helpers/files/exportToExcel";

export interface IUser {
  name: string;
  email: string;
  age: number;
  isActive: boolean;
  registeredAt: Date;
  roles: string[];
  notes: string | null;
}

export const users: IUser[] = [
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

export const userColumns: IExcelSheet<IUser>["mapping"] = [
  { propName: "name" },
  { propName: "email", headerText: "E-mail" },
  { propName: "age" },
  { propName: "isActive", headerText: "Active" },
  { propName: "registeredAt", headerText: "Registered at" },
  { propName: "roles" },
  { propName: "notes", maxWidth: 30 },
];

export interface IDepartment {
  title: string;
  headCount: number;
  budget: number;
}

export const departments: IDepartment[] = [
  { title: "Development", headCount: 24, budget: 1200000 },
  { title: "Sales", headCount: 8, budget: 340000 },
  { title: "Support", headCount: 13, budget: 210000 },
];

export const departmentColumns: IExcelSheet<IDepartment>["mapping"] = [
  { propName: "title", headerText: "Department" },
  { propName: "headCount" },
  { propName: "budget", maxWidth: 20 },
];

/** The same columns but with a custom header-style per column */
export const styledColumns: IExcelSheet<IUser>["mapping"] = userColumns.map((c, i) => ({
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
export const userCellCallback: IExcelCellCallback<IUser> = (value, itemIndex, mapping) => {
  const user = users[itemIndex];
  let style: IExcelStyle | undefined;
  if (!user.isActive) style = styleInactive;
  else if (mapping.propName === "age" && user.age < 30) style = styleYoung;

  if (mapping.propName !== "isActive") return style ? { style } : undefined;
  // WARN: never mutate the pointed value - return an own one instead
  return { style, value: { ...value, stringVal: user.isActive ? "Yes" : "No" } };
};

/** Points a note (the tooltip of Excel) per cell: the name-cell explains the whole row & an inactive user
 * gets a warning on top of it */
export const tooltipCellCallback: IExcelCellCallback<IUser> = (_value, itemIndex, mapping) => {
  if (mapping.propName !== "name") return undefined;
  const user = users[itemIndex];
  const tooltip = `${user.name}\nRegistered at ${user.registeredAt.toLocaleString()}\nRoles: ${user.roles.join(", ")}`;
  return { tooltip: user.isActive ? tooltip : `${tooltip}\n\nWARN: the user is deactivated!` };
};

/** Generates a huge dataset to check performance & memory */
export function generateUsers(cnt: number): IUser[] {
  const result: IUser[] = new Array(cnt);
  for (let i = 0; i < cnt; ++i) {
    const src = users[i % users.length];
    result[i] = { ...src, name: `${i + 1}. ${src.name}`, age: src.age + (i % 40) };
  }
  return result;
}
