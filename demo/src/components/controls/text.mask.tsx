/* eslint-disable react/no-unescaped-entities */
import Anchor from "src/elements/anchor";
import styles from "./text.scss";

export default function TextControlWithMask({ children }: React.PropsWithChildren<{}>) {
  return (
    <>
      <h3>
        <Anchor hash="mask">Masked inputs</Anchor>
      </h3>
      <section>
        {children}
        Features:
        <ul>
          <li>
            Formats example:
            <br /> $options.mask=<b className={styles.text2}>"+0 (000) 000-0000"</b> - for phone number
            <br /> $options.mask=<b className={styles.text2}>"##0.##0.##0.##0"</b> - for IP address
            <br /> $options.mask=<b className={styles.text2}>"*{"{1,5}"}"</b> - any 1..5 chars
            <br /> $options.mask=<b className={styles.text2}>"//[a-zA-Z]//{"{1,5}"}"</b> - regex /[a-zA-Z]/: 1..5
            letters
            <br /> where <b className={styles.text2}>#</b> - optional digit, <b className={styles.text2}>0</b> -
            required digit, <b className={styles.text2}>*</b> - any char
          </li>
          <li>prediction: all static chars append automatically</li>
          <li>lazy: press [Space] to add next separator and fill missed digits with zeros</li>
          <li>history undo/redo: use Ctrl+Z / Ctrl+Shift+Z, Ctrl+Y</li>
          <li>shows declined chars: if type wrong char it will rollback after 100ms</li>
          <li>possible to delete/append chars in the middle of text</li>
          <li>
            enables <b className={styles.text2}>validations.mask</b> by default with message{" "}
            <b style={{ color: "#ff5f5f", opacity: 0.8 }}>Incomplete value</b>
          </li>
          <li>usage details see during the coding (via jsdoc)</li>
        </ul>
      </section>
    </>
  );
}
