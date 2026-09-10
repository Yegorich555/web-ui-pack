import Page from "src/elements/page";
import { WUPDropdownElement } from "web-ui-pack";
import Example1 from "./example1";
import Example2 from "./example2";

WUPDropdownElement.$use();

export default function DropdownView() {
  return (
    <Page //
      header="WUPDropdownElement"
      link="src/dropdownElement.ts"
      features={[
        "Built-in animations: opacity, drawer, stack",
        "Easy to customize behavior via options of <wup-dropdown> & <wup-popup>",
        "Accessibility support",
      ]}
      details={{
        tag: "wup-dropdown",
        linkDemo: "demo/src/components/dropdown/dropdownView.tsx",
        customHTML: [
          `html
<wup-dropdown>
  <button type="button">Click me</button>
  <wup-popup w-placement="left-start" w-animation="drawer">
      <ul>
        <li>Home</li>
        <li>Products</li>
        <li>Profile</li>
      </ul>
   </wup-popup>
</wup-dropdown>`,
        ],
      }}
    >
      <Example1 />
      <Example2 />
    </Page>
  );
}
