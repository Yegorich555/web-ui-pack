import Code from "src/elements/code";
import { WUPRadioControl } from "web-ui-pack";

WUPRadioControl.$use();

export default function RadioCustomJS() {
  return (
    <>
      <wup-radio
        ref={(el) => {
          if (el) {
            el.$options.name = "customViewJS";
            el.$options.items = () => {
              const renderText: WUP.Select.MenuItem<number>["text"] = (value, li, i) => {
                li.innerHTML = `<span><b>Value</b>: ${value}, <span style="color: red">index</span>: ${i}</span>`;
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
    </>
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
          li.innerHTML = \`<span><b>Value</b>: \${value},
            <span style="color: red">index</span>: \${i}</span>\`;
          return value.toString();
      };

  return [
    { value: 1, text: renderText },
    { value: 2, text: renderText },
  ];
};
document.body.appendChild(el);`;
