/* eslint-disable no-promise-executor-return */
import Code from "src/elements/code";
import Example from "src/elements/example";
import Page from "src/elements/page";
import { WUPModalElement, WUPSelectControl, WUPSpinElement } from "web-ui-pack";
import { ClearActions } from "web-ui-pack/controls/baseControl";
import { spinUseDualRing } from "web-ui-pack/spinElement";
import FAQ from "src/elements/faq";
import stylesCom from "./controls.scss";
import SelectControlDesc from "./select.desc";

WUPSelectControl.$use();

let ir = 10;
const items = [
  { text: "Item N 1", value: null },
  { text: "Item N 2", value: ++ir },
  { text: "Item N 3", value: ++ir },
  { text: "Item N 4", value: ++ir },
  { text: "Item N 5", value: ++ir },
  { text: "Donny 1", value: ++ir },
  { text: "Item N 7", value: ++ir },
  { text: "Donny 2", value: ++ir },
  { text: "Item N 9", value: ++ir },
  { text: "Item N 10", value: ++ir },
  // { text: (v, li, i) => li.append(v.toString()), value: 124 },
];

// for (let i = 20; i < 100; ++i) {
//   items.push({ text: `Item N #${i}`, value: i });
// }

// for (let i = 20; i < 1000; ++i) {
//   items.push({ text: `Test ${i}`, value: i });
// }

(window as any).inputSelect = {
  items,
  initArr: [items[0].value, items[1].value],
};

/** Items bound to custom HTML by index (item.text is used for input & filtering) */
const customItems: WUP.Select.MenuItem[] = [
  { text: "Donny", value: 1 },
  { text: "Mikky", value: 2 },
  { text: "Leo", value: 3 },
];

(window as any)._someSelectValidations = { required: true } as WUP.Select.Options["validations"];
(window as any)._someSelectValidations2 = { required: false } as WUP.Select.Options["validations"];

class WUPSpinSelElement extends WUPSpinElement {}
spinUseDualRing(WUPSpinSelElement);
const tagName = "wup-spin-sel";
customElements.define(tagName, WUPSpinSelElement);
declare global {
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpinSelElement;
  }
}

export default function SelectControlView() {
  return (
    <Page
      header="SelectControl (Dropdown)"
      link="src/controls/select.ts"
      details={{
        tag: "wup-select",
        linkDemo: "demo/src/components/controls/select.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Inheritted features from TextControl",
        "Menu is opened outside parent with position: relative",
        "Perfect keyboard support",
        "Pending state with spinner if $options.items is a function with promise-result",
        "Possible to customize render of items (via $options.items; see below...)",
        "Possible to create any value not pointed in items (via $options.allowNewValue)",
        "Possible to select multiple items (via $options.multiple)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
            el.$initModel = { asDropdown: items[3].value };
          }
        }}
        w-autoFocus
      >
        <wup-select
          w-items="window.inputSelect.items"
          w-name="select"
          w-label="Select"
          w-initValue={items[items.length - 3].value!.toString()}
          w-multiple="false"
        />
        <div className={stylesCom.group}>
          <wup-select
            w-name="readonly"
            readonly
            w-items="window.inputSelect.items"
            w-initValue={items[2].value!.toString()}
          />
          <wup-select
            w-name="disabled"
            disabled
            w-items="window.inputSelect.items"
            w-initValue={items[2].value!.toString()}
          />
          <wup-select
            w-name="required"
            w-items="window.inputSelect.items"
            w-validations="window._someSelectValidations"
            ref={(el) => {
              if (el) {
                el.$onChange = () => console.warn("I changed", el?.$value);
              }
            }}
          />
        </div>
        <wup-select
          w-name="multiple"
          w-initValue="window.inputSelect.initArr"
          w-items="window.inputSelect.items"
          w-multiple
        />
        <wup-select
          w-name="testMe2"
          ref={(el) => {
            if (el) {
              el.$options.items ||= [];
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "withPending";
              el.$options.label = "With pending (set Promise to $options.items)";
              setTimeout(() => {
                el.$options.items = () => new Promise((res) => setTimeout(() => res(items), 3000));
                // manual testcase: el.$options.items = () => new Promise((_, rej) => setTimeout(() => rej("TestErr"), 3000));
                el.$initValue = 13; // was issue here - items not fetched yet
              }, 100);
            }
          }}
        />
        <wup-select
          w-initValue={13}
          ref={(el) => {
            if (el) {
              el.$options.name = "customSpin";
              el.$options.label = "CustomSpin: see WUPSpinElement types or override renderSpin() method";
              el.$options.items = () => new Promise((resolve) => setTimeout(() => resolve(items), 3000));
              el.renderSpin = function renderCustomSpin(this: WUPSelectControl) {
                const spin = document.createElement("wup-spin-sel");
                spin.$options.fit = true;
                spin.$options.overflowFade = true;
                spin.$options.overflowTarget = this;
                this.appendChild(spin);
                return spin;
              };
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "asDropdown";
              el.$options.label = "As dropdown ($options.readOnlyInput)";
              el.$options.items = items;
              // el.$initValue = ir - 3;
              el.$options.readOnlyInput = true;

              // el.$options.autoFocus = true;
              setTimeout(() => {
                el.$options.clearActions = ClearActions.clear;
                el.$options.items = [{ text: "Test", value: 1 }];
                el.$value = [1];

                el.$options.items = items;
                el.$value = items[items.length - 3].value;
              }, 10);
            }
          }}
        />
        <wup-select
          w-initValue="14"
          ref={(el) => {
            if (el) {
              el.$options.name = "allowNewValue";
              el.$options.label = "Allow New Value ($options.allowNewValue)";
              el.$options.items = items;
              el.$options.allowNewValue = true;
            }
          }}
        />
        <wup-select //
          w-name="saveUrlSelect"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey="true"
          w-storage="url"
          ref={(el) => {
            if (el) {
              el.$options.items = [
                { text: "Item 1", value: 1 },
                { text: "Item 2", value: { id: 2 } },
              ];
            }
          }}
        />
        <wup-select
          w-name="custom"
          w-label="With custom menu"
          ref={(el) => {
            if (el) {
              el.$options.items = [
                {
                  value: 1,
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  text: (_value, li, _i, _control) => {
                    const txt = "Item N 1";
                    li.className = stylesCom.flexInline;
                    li.innerHTML = `<button aria-label='delete' type='button' class='${stylesCom.btnIcon}'>&#8722;</button> ${txt}`;
                    const btn = li.firstElementChild as HTMLButtonElement;
                    btn.onclick = (e) => {
                      e.stopPropagation();
                      WUPModalElement.$showConfirm({
                        question:
                          "Selection on click is prevented. Implement custom action yourself and close menu if required yourself via el.$closeMenu()",
                      });
                    };
                    // li.onclick = (e) => e.preventDefault();
                    return txt;
                  },
                },
                {
                  text: "Add New",
                  value: 0,
                  onClick: (e) => {
                    e.preventDefault(); // prevent item selection
                    WUPModalElement.$showConfirm({
                      question:
                        "Selection on click is prevented. Implement custom action yourself and close menu if required yourself via el.$closeMenu()",
                    });
                  },
                },
              ];
            }
          }}
        />
        <Example header="Customized via HTML" link="demo/src/components/controls/select.tsx">
          <wup-select
            w-name="customViewHtml"
            w-label="Customized via HTML"
            ref={(el) => {
              if (el) {
                el.$options.items = customItems;
              }
            }}
          >
            <ul>
              <li>
                <span>
                  <b>Donny</b> <small>(admin)</small>
                </span>
              </li>
              <li>
                <span>
                  <b>Mikky</b> <small>(editor)</small>
                </span>
              </li>
              <li>
                <span>
                  <b>Leo</b> <small>(viewer)</small>
                </span>
              </li>
            </ul>
          </wup-select>
          <Code code={codeHtml} />
          <Code code={code} />
        </Example>
        <SelectControlDesc />
        <FAQ
          endString=""
          items={[
            {
              link: "troubleshooting",
              question: "Troubleshooting. Exception 'Not found in items'",
              answer: (
                <section>
                  <i>
                    Possible if $value/$initValue is object and item.value is object <br />
                    In this case control tries to find item related to $value. It searches by item.value.id &
                    item.value.valueOf(). Also you can check if $options.items set only once (in React possible it
                    re-creates on every render)
                  </i>
                </section>
              ),
            },
          ]}
        />

        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}

const codeHtml = `html
<!-- html -->
<wup-select w-name="customViewHtml">
  <!-- single wrapper inside <li> because selected item is [display: flex] (otherwise spaces between elements are lost) -->
  <ul>
    <li><span><b>Donny</b> <small>(admin)</small></span></li>
    <li><span><b>Mikky</b> <small>(editor)</small></span></li>
    <li><span><b>Leo</b> <small>(viewer)</small></span></li>
  </ul>
</wup-select>`;

const code = `js
// js
import WUPSelectControl from "web-ui-pack";
WUPSelectControl.$use(); // register control
const el = document.querySelector("wup-select");
// items are bound to <li> by index; item.text is used for input & filtering
el.$options.items = [
  { text: "Donny", value: 1 },
  { text: "Mikky", value: 2 },
  { text: "Leo", value: 3 },
];
// WARN: it's important to update .$options.items with html-changes`;
