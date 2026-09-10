import Example from "src/elements/example";
import styles from "./spinView.scss";

export default function Example4() {
  return (
    <Example header="Inline" link="demo/src/components/spin/example4.tsx">
      <small>
        Use attr <b>inline</b> or <b>$options.inline=true</b>
        <br />
        <strong>Attention</strong>: spinner does not reduce size to fit target in this case (by default)
        <br />
        (use option <b>fit</b> OR css to fix: <b>{`button>wup-spin{ --spin-size: 14px; -spin-item-size: 6px}`}</b>)
      </small>
      <button type="submit" className={[styles.btnAlign, "btn"].join(" ")}>
        <wup-spin w-inline />
        Pending...
      </button>
      <br />
      <button type="submit" className={[styles.btnAlign, "btn"].join(" ")}>
        <wup-spin w-inline="" w-fit="" />
        With option &apos;fit&apos;
      </button>
    </Example>
  );
}
