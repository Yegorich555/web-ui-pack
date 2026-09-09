import Page from "src/elements/page";
import { WUPModalElement } from "web-ui-pack";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";

WUPModalElement.$use();
WUPModalElement.$useConfirmHook();

export default function ModalView() {
  return (
    <Page //
      header="ModalElement"
      link="src/modalElement.ts"
      details={{
        tag: "wup-modal",
        linkDemo: "demo/src/components/modal/modalView.tsx",
        customHTML: [
          `html
<wup-modal
  w-target
  w-autofocus
  w-autoclose
  w-placement="center"
  w-selfremove="false"
  w-replace="false"
  w-confirmunsaved
>
  <h2>Login form</h2>
   <wup-form>
      <wup-text w-name="email"></wup-text>
      <wup-pwd w-name="password"></wup-pwd>
      <footer>
        <button type="button" data-close="modal">Close</button>
        <button type="submit">Submit</button>
      </footer>
   </wup-form>
</wup-modal>`,
        ],
      }}
      features={[
        "Close by: outside click, button[close] click, key Escape",
        "Built-in styles & animation for different screen sizes",
        "Accessibility: autofocus, tab-cycling, focus-back on closing etc.",
        "Built-in modal-in-modal behavior",
        "Confirm modal (use .$useConfirmHook() + attr [w-confirm='Confirm message'] on buttons)",
        <>
          Integrated with <b>{"<wup-form/>"}</b> (pending + close after submitEnd + confirm modal if unsaved changes)
        </>,
      ]}
    >
      <Example1 />
      <Example2 />
      <Example3 />
    </Page>
  );
}
