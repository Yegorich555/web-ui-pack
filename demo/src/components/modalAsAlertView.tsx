import Page from "src/elements/page";
import { WUPModalElement } from "web-ui-pack";
import Code from "src/elements/code";
import styles from "./modalView.scss";

WUPModalElement.$use();

export default function ModalAsAlertView() {
  return (
    <Page
      className={styles.widePage}
      header="Modal As Alert"
      link="src/modalElement.ts"
      details={{
        linkDemo: "demo/src/components/modalAsAlertView.tsx",
      }}
      features={["This is ordinary modal. All features see on Modal page"]}
    >
      <section>
        <h3>Ordinary modal possible to use as alert</h3>
        <small>Use WUPModalElement.$showConfirm(...)</small>
        <Code code={codeJS} />
        <Code code={codeCSS} />
        <div className={styles.inlineCenter}>
          <button
            className="btn"
            type="button"
            onClick={() =>
              WUPModalElement.$showConfirm({
                className: styles.modalAlert,
                onRender: (el) => {
                  // const footer = el.querySelector("footer") as HTMLElement;
                  // const btnCloseFooter = footer.querySelector("button[data-close=modal]") as HTMLButtonElement;
                  // btnCloseFooter.style.display = "none";
                  const btnConfirm = el.querySelector("button[data-close=confirm]") as HTMLButtonElement;
                  btnConfirm.textContent = "OK";
                },
                question:
                  "I'm ordinary modal that possible to show from single method without any additional render logic",
              })
            }
          >
            Show Alert on click
          </button>
        </div>
      </section>
    </Page>
  );
}

const codeJS = `js
/* TS */
import { WUPModalElement } from "web-ui-pack";
WUPModalElement.$use();

WUPModalElement.$showConfirm({
  defaults: { ... }, // override init options here
  className: "modalAlert",
  onRender: (el) => {
    const btnConfirm = el.querySelector("[data-close=confirm]") as HTMLButtonElement;
    btnConfirm.textContent = "OK";
  },
  question: "I'm ordinary modal...",
})`;

const codeCSS = `css
/* SCSS */
.modalAlert {
  > footer {
    > button[data-close="confirm"] {
      margin: auto;
    }
    > button[data-close="modal"] {
      display: none;
    }
  }
}`;
