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
  {
    text: "Notifications (parent without checkbox)",
    value: undefined,
    checkable: false, // parent is title of nested items
    items: [
      { text: "Email", value: "notifications.email" },
      { text: "SMS", value: "notifications.sms" },
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
/** Parents without checkboxes (titles) on several levels */
const titleItems: WUP.CheckTree.Item[] = [
  {
    text: "Notifications",
    value: undefined,
    checkable: false,
    items: [
      {
        text: "Email",
        value: undefined,
        checkable: false,
        items: [
          { text: "News", value: "email.news" },
          { text: "Security alerts", value: "email.security" },
        ],
      },
      {
        text: "SMS (parent with checkbox)",
        value: "sms",
        items: [
          { text: "Reminders", value: "sms.reminders" },
          { text: "Promotions", value: "sms.promotions" },
        ],
      },
    ],
  },
  {
    text: "Privacy",
    value: undefined,
    checkable: false,
    items: [
      { text: "Show profile", value: "privacy.profile" },
      { text: "Show activity", value: "privacy.activity" },
    ],
  },
];

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
  {
    text: "",
    value: undefined, // parent without [icon] in HTML is title (ignored value)
    items: [
      { text: "", value: "notifications.email" },
      { text: "", value: "notifications.sms" },
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
        "Parent without checkbox as title of nested items (item.checkable: false)",
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
          w-collapsible="false"
          w-checkable="true"
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
        <Example
          header="Without checkboxes for parents (option checkable & item.checkable: false)"
          link="demo/src/components/controls/checkTree.tsx"
        >
          <wup-checktree
            w-name="titles"
            w-checkable="false"
            ref={(el) => {
              if (el) {
                el.$options.items = titleItems;
              }
            }}
          />
        </Example>
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
                    {/* spread because React doesn't declare [readonly] & [disabled] for <span> (and renders [disabled] without value) */}
                    <span item="" {...{ readonly: "" }}>
                      <span icon="" />
                      Create (readonly via HTML)
                    </span>
                  </li>
                </ul>
              </li>
              <li>
                <span item="">
                  <b>Notifications</b> <small>(title via HTML: without icon)</small>
                </span>
                <ul>
                  <li>
                    <span item="">
                      <span icon="" />
                      Email
                    </span>
                  </li>
                  <li>
                    <span item="" {...{ disabled: true }}>
                      <span icon="" />
                      SMS (disabled via HTML)
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
        <li><span item readonly><span icon></span>Create (readonly via HTML)</span></li>
      </ul>
    </li>
    <li>
      <!-- parent without [icon] is title: the same as item.checkable: false -->
      <span item><b>Notifications</b> <small>(title via HTML: without icon)</small></span>
      <ul>
        <li><span item><span icon></span>Email</span></li>
        <!-- the same as item.disabled: true; point value as reason for tooltip: [disabled="Only for admins"] -->
        <li><span item disabled><span icon></span>SMS (disabled via HTML)</span></li>
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
  { text: "", value: undefined, items: [{ text: "", value: "notifications.email" }, { text: "", value: "notifications.sms" }] },
  { text: "", value: "settings" },
];
// item.checkable, item.disabled & item.readOnly have priority over HTML attrs if they're defined
// WARN: it's important to update .$options.items with html-changes`;
