import { Link } from "react-router-dom";
import Page from "src/elements/page";
import Code from "src/elements/code";
import WUPPopupElement from "web-ui-pack/popup/popupElement";
import styles from "./tooltipView.scss";

WUPPopupElement.$useTooltip({ delayMs: 500, arrowEnable: true });

const rows = ["Row 1", "Row 2", "Row 3"];
const cols = ["Col A", "Col B", "Col C", "Col D"];

export default function TooltipView() {
  return (
    <Page
      header="Tooltip"
      link="src/popup/popupElement.ts"
      details={{ linkDemo: "demo/src/components/popup/tooltipView.tsx" }}
      features={[
        "Shows tooltip on hover (with delay) for any element with attribute [w-tooltip]",
        "Uses [aria-label] content when [w-tooltip] is empty",
        "Single global listener: popup is rendered only on hover and removed after",
        <>
          Text is rendered as text (not HTML) so it&apos;s safe for user content. If you need HTML content inside
          tooltip see <Link to={`${process.env.BASE_URL || "/"}popup`}>Popup</Link>
        </>,
        "Supports all options of PopupElement (placement, arrow, animation etc.)",
      ]}
    >
      <section>
        <h3>Usage</h3>
        <small>
          Call <b>WUPPopupElement.$useTooltip()</b> once and point attribute <b>[w-tooltip]</b> on elements
        </small>
        <Code code={codeJS} />
        <Code code={codeHTML} />
        <div className={styles.tooltipBlock}>
          <button className="btn" type="button" w-tooltip="Tooltip text from the attribute">
            Hover me
          </button>
          <button className="btn" type="button" w-tooltip="" aria-label="Tooltip text from aria-label">
            &#9432;
          </button>
          <span w-tooltip="Tooltip works for any element">Hover this text</span>
        </div>
      </section>
      <section>
        <h3>Many elements</h3>
        <small>There are no hidden popups in the layout: the number of elements with tooltips is not important</small>
        <table className={styles.table}>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                {cols.map((c) => (
                  <td key={c} w-tooltip={`${r}, ${c}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  );
}

const codeJS = `js
import { WUPPopupElement } from "web-ui-pack";
// options of PopupElement are supported also
const { dispose } = WUPPopupElement.$useTooltip({ delayMs: 500, arrowEnable: true });
// call dispose() to remove listeners`;

const codeHTML = `html
<button type="button" w-tooltip="Some text here">Hover me</button>
<!-- empty [w-tooltip] uses [aria-label] content -->
<button type="button" w-tooltip="" aria-label="Some text here">&#9432;</button>`;
