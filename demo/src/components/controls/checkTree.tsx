// [item] & [icon] are custom attributes of <wup-checktree> - so eslint doesn't know about them
/* eslint-disable react/no-unknown-property */
import Code from "src/elements/code";
import Example from "src/elements/example";
import Page from "src/elements/page";
import { WUPCheckTreeControl } from "web-ui-pack";
import stylesCom from "./controls.scss";

WUPCheckTreeControl.$use();

const items: WUP.CheckTree.Item[] = [
  {
    text: "Users",
    value: "users",
    items: [
      { text: "Read", value: "users.read" },
      { text: "Create", value: "users.create" },
      { text: "Delete (disabled with reason)", value: "users.delete", disabled: "Only for admins" },
    ],
  },
  {
    text: "Reports (parent without value)",
    value: undefined, // parent isn't included in $value
    items: [
      {
        text: "Sales",
        value: "reports.sales",
        items: [
          { text: "Daily", value: "reports.sales.daily" },
          { text: "Monthly", value: "reports.sales.monthly" },
        ],
      },
      { text: "Finance (readonly)", value: "reports.finance", readOnly: true },
    ],
  },
  { text: "Settings", value: "settings" },
];

/** Generates 320 items: 5 roots > 3 > 4 > 4 */
function generateItems(sizes: number[], prefix = ""): WUP.CheckTree.Item[] {
  const [size, ...nested] = sizes;
  return Array.from({ length: size }, (_, i) => {
    const v = `${prefix}${i + 1}`;
    return { text: `Item ${v}`, value: v, items: nested.length ? generateItems(nested, `${v}.`) : undefined };
  });
}
const bigItems = generateItems([5, 3, 4, 4]);
bigItems[0].expanded = true;

(window as any).inputCheckTree = {
  items,
  initValue: ["users", "reports.sales.daily"], // parent value checks every nested item
};
/** Items bound to custom HTML by index in depth-first order (text is ignored) */
const customItems: WUP.CheckTree.Item[] = [
  {
    text: "",
    value: "users",
    items: [
      { text: "", value: "users.read" },
      { text: "", value: "users.create" },
    ],
  },
  { text: "", value: "settings" },
];

(window as any)._someCheckTreeValidations = { required: true, minCount: 2 } as WUP.CheckTree.Options["validations"];

export default function CheckTreeControlView() {
  return (
    <Page
      header="CheckTreeControl"
      link="src/controls/checkTree.ts"
      details={{
        tag: "wup-checktree",
        linkDemo: "demo/src/components/controls/checkTree.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Inheritted features from CheckControl",
        "The main checkbox checks/unchecks every item",
        "Parent is checked when every nested item is checked and partially checked when some of them",
        "Value of checked parent is included in $value (point item.value: undefined to exclude it)",
        "Disabled & readonly items (item.disabled, item.readOnly): the same as options of the control but for item with nested items",
        "Possible to customize items rendering via HTML (see example below...)",
        "Expand/collapse via option collapsible (nested items are rendered on first expanding)",
        "Keyboard support (role tree): Arrows (as for RadioControl), Space (check), Enter (expand/collapse)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        <wup-checktree
          w-name="permissions"
          w-items="window.inputCheckTree.items"
          w-initValue="window.inputCheckTree.initValue"
          w-validations="window._someCheckTreeValidations"
          ref={(el) => {
            if (el) {
              el.$onChange = (e) => console.warn("$change", { reason: e.detail.reason, value: el.$value });
            }
          }}
        />
        <div className={stylesCom.group}>
          <wup-checktree
            w-name="readonly"
            readonly
            w-items="window.inputCheckTree.items"
            w-initValue="window.inputCheckTree.initValue"
          />
          <wup-checktree
            w-name="disabled"
            disabled
            w-items="window.inputCheckTree.items"
            w-initValue="window.inputCheckTree.initValue"
          />
        </div>
        <wup-checktree
          w-name="collapsible"
          w-label="Collapsible with 320 items (option collapsible)"
          w-collapsible
          ref={(el) => {
            if (el) {
              el.$options.items = bigItems;
              el.$initValue = ["1.1", "2.3.4"];
            }
          }}
        />
        <wup-checktree
          w-name="saveUrlCheckTree"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey="true"
          w-storage="url"
          w-collapsible
          w-items="window.inputCheckTree.items"
        />
        <Example header="Customized via HTML" link="demo/src/components/controls/checkTree.tsx">
          <wup-checktree
            w-name="customViewHtml"
            w-collapsible
            ref={(el) => {
              if (el) {
                el.$options.items = customItems;
              }
            }}
          >
            <ul>
              <li>
                <span item="">
                  <span icon="" />
                  <b>Users</b> <small>(manage accounts)</small>
                </span>
                <ul>
                  <li>
                    <span item="">
                      <span icon="" />
                      Read
                    </span>
                  </li>
                  <li>
                    <span item="">
                      <span icon="" />
                      Create
                    </span>
                  </li>
                </ul>
              </li>
              <li>
                <span item="">
                  <span icon="" />
                  <b>Settings</b>
                </span>
              </li>
            </ul>
          </wup-checktree>
          <Code code={codeHtml} />
          <Code code={code} />
        </Example>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}

const codeHtml = `html
<!-- html -->
<wup-checktree w-name="customViewHtml" w-collapsible>
  <ul>
    <li>
      <span item><span icon></span><b>Users</b> <small>(manage accounts)</small></span>
      <ul>
        <li><span item><span icon></span>Read</span></li>
        <li><span item><span icon></span>Create</span></li>
      </ul>
    </li>
    <li><span item><span icon></span><b>Settings</b></span></li>
  </ul>
</wup-checktree>`;

const code = `js
// js
import WUPCheckTreeControl from "web-ui-pack";
WUPCheckTreeControl.$use(); // register control
const el = document.querySelector("wup-checktree");
// items are bound to <li> by index in depth-first order: nesting must be the same
el.$options.items = [
  { text: "", value: "users", items: [{ text: "", value: "users.read" }, { text: "", value: "users.create" }] },
  { text: "", value: "settings" },
];
// WARN: it's important to update .$options.items with html-changes`;
