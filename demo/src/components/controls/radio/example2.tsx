import Code from "src/elements/code";
import Example from "src/elements/example";
import MyLink from "src/elements/myLink";
import { WUPRadioControl } from "web-ui-pack";

WUPRadioControl.$use();

export default function Example2() {
  return (
    <Example header="Customized via JS dynamically" link="demo/src/components/controls/radio/example2.tsx">
      <small>
        See details in <MyLink href="/demo/src/components/controls/radio/example2.tsx">radio/example2.tsx</MyLink>
      </small>
      <wup-radio
        ref={(el) => {
          if (el) {
            el.$options.name = "customViewJS";
            el.$options.items = () => {
              const renderText: WUP.Select.MenuItem<number>["text"] = (value, li, _i) => {
                li.innerHTML = `<span><b>Value</b>:<span style="color: red"> ${value}</span></span>`;
                return li.textContent as string;
              };

              return [
                { value: 1, text: renderText },
                { value: 2, text: renderText },
              ];
            };
          }
        }}
      />
      <Code code={code} />
    </Example>
  );
}

const code = `js
import WUPRadioControl from "web-ui-pack";

WUPRadioControl.$use(); // register control

const el = document.createElement("wup-radio");
el.$options.name = "customized";
el.$options.items = () => {
  // Define custom HTML content in JS
  const renderText: WUPSelect.MenuItemFn<number>["text"] =
      (value, li, i) => {
          li.innerHTML = \`<span><b>Value</b>:
             <span style="color: red">\${value}</span></span>\`;
          return value.toString();
      };

  return [
    { value: 1, text: renderText },
    { value: 2, text: renderText },
  ];
};
document.body.appendChild(el);`;
