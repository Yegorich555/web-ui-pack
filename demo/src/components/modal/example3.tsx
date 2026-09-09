import Code from "src/elements/code";
import Example from "src/elements/example";

export default function Example3() {
  return (
    <Example header="Confirm modal with hook" link="demo/src/components/modal/example3.tsx">
      <small>It wraps click event on buttons with attribute [w-confirm]</small>
      <Code code={confirmHookJS} />
      <Code code={confirmHookHTML} />
      <button
        className="btn"
        type="button"
        w-confirm="Do you want to click me?"
        onClick={() => console.warn("Click is fired")}
      >
        Button with confirm modal
      </button>
    </Example>
  );
}

const confirmHookJS = `js
import { WUPModalElement } from "web-ui-pack";
WUPModalElement.$use();
WUPModalElement.$useConfirmHook();`;

const confirmHookHTML = `html
<button type="button" w-confirm="Do you want to click me?">
  Click event will be called only after buttonConfirm click
</button>
`;
