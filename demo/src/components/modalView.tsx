import Page from "src/elements/page";
import { WUPModalElement } from "web-ui-pack";
import styles from "./modalView.scss";

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
      features={["Built-in close by: outside click, button[close] click, key Escape"]}
      // className={styles.page}
    >
      <h3>Different placemenets</h3>
      <small>Use $options.placement or attribute [w-placement]</small>
      <div className={styles.block}>
        <button className={`btn ${styles.center}`} type="button">
          Center
        </button>
        <wup-modal w-target="prev" w-placement="center">
          <h2>Modal with placement: center</h2>
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.top}`} type="button">
          Top
        </button>
        <wup-modal w-target="prev" w-placement="top">
          <h2>Modal with placement: top</h2>
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.left}`} type="button">
          Left
        </button>
        <wup-modal w-target="prev" w-placement="left">
          <h2>Modal with placement: left</h2>
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.right}`} type="button">
          Right
        </button>
        <wup-modal w-target="prev" w-placement="right">
          <h2>Modal with placement: right</h2>
        </wup-modal>
      </div>
    </Page>
  );
}
