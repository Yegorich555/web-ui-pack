import Page from "src/elements/page";
import { WUPModalElement } from "web-ui-pack";

WUPModalElement.$use();

export default function ModalView() {
  return (
    <Page //
      header="ModalElement"
      link="src/modalElement.ts"
      details={{
        tag: "wup-modal",
        linkDemo: "demo/src/components/modalView.tsx",
      }}
      features={
        [
          // todo add features
        ]
      }
      // className={styles.page}
    >
      Todo implement
      <wup-modal />
    </Page>
  );
}
