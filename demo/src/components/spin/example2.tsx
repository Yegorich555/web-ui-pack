import Example from "src/elements/example";

export default function Example2() {
  return (
    <Example header="Without position: relative" link="demo/src/components/spin/example2.tsx">
      <small>
        <strong>Try to scroll</strong> - spinner overflows header because there is no any parent with{" "}
        <b>position:relative</b>
        <br />
        To fix this set:
        <ul>
          <li>
            <b>position: relative</b> to any parent <b>OR</b>
          </li>
          <li>
            <b>z-index 100+ </b> for the header
          </li>
        </ul>
      </small>
      <button className="btn" type="button">
        Button without relative position
        <wup-spin />
      </button>
    </Example>
  );
}
