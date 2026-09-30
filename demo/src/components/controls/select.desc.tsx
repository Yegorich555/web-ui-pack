import Example from "src/elements/example";
import { WUPSelectControl } from "web-ui-pack";
import { SetValueReasons } from "web-ui-pack/controls/baseControl";
import WUPPopupElement from "web-ui-pack/popup/popupElement";

interface Plan {
  id: number;
  name: string;
  description: string;
}

const plans: Plan[] = [
  { id: 1, name: "Basic", description: "1 user, 10 GB storage, email support" },
  { id: 2, name: "Standard", description: "Up to 5 users, 100 GB storage, chat support during business hours" },
  { id: 3, name: "Premium", description: "Unlimited users, 1 TB storage, 24/7 phone support & dedicated manager" },
  { id: 4, name: "Enterprise", description: "Custom limits, on-premise installation, SLA 99.99%" },
];

/** SelectControl where menu items & input have 2 rows: value.name and value.description below */
export class WUPSelectDescControl extends WUPSelectControl<Plan> {
  static get $style(): string {
    return `${super.$style}
      :host label > span:has(> [desc]:not(:empty)) {
        margin-bottom: 1.1em;
      }
      :host [desc],
      :host [menu] li small {
        display: block;
        font-size: 0.85em;
        line-height: 1.2;
        color: var(--ctrl-label);
      }
      :host [desc] {
        position: absolute;
        top: calc(100% - 0.3em);
        left: 0;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        pointer-events: none;
        user-select: none;
      }
      :host [menu] li[aria-selected=true] small {
        color: inherit;
      }`;
  }

  /** Converts value to menu item with 2 rows */
  static $toItem(v: Plan): WUP.Select.MenuItem<Plan> {
    return {
      value: v,
      text: (p, li) => {
        const span = li.appendChild(document.createElement("span"));
        span.textContent = p.name;
        span.appendChild(document.createElement("small")).textContent = p.description;
        return p.name; // text for the input & filtering
      },
    };
  }

  /** Reference to description under the input */
  $refDesc = document.createElement("small");

  protected override renderControl(): void {
    super.renderControl();
    this.$refDesc.setAttribute("desc", "");
    this.$refDesc.setAttribute("aria-hidden", true); // it's duplicated in the menu
    this.$refInput.parentElement!.appendChild(this.$refDesc);
  }

  protected override renderPopup(menuId: string): WUPPopupElement {
    const p = super.renderPopup(menuId);
    p.$options.maxWidthByTarget = true; // long descriptions must wrap instead of stretching the menu
    return p;
  }

  protected override setValue(v: Plan | undefined, reason: SetValueReasons, skipInput = false): boolean | null {
    const r = super.setValue(v, reason, skipInput);
    this.$refDesc.textContent = this.$value?.description ?? "";
    return r;
  }
}

const tagName = "wup-select-desc";
customElements.define(tagName, WUPSelectDescControl);
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSelectDescControl;
  }
}

declare module "react" {
  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Base.ReactHTML<WUPSelectDescControl> & WUP.Select.JSXProps;
    }
  }
}

export default function SelectControlDesc() {
  return (
    <Example header="Item with description" link="demo/src/components/controls/select.desc.tsx">
      <wup-select-desc
        w-name="plan"
        w-label="Plan"
        ref={(el) => {
          if (el) {
            el.$options.items = plans.map((p) => WUPSelectDescControl.$toItem(p));
            el.$initValue = plans.find((p) => p.id === 2);
          }
        }}
      />
    </Example>
  );
}
