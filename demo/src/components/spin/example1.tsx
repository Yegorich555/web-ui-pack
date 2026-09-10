import Example from "src/elements/example";

export default function Example1() {
  return (
    <Example header="With position: relative" link="demo/src/components/spin/example1.tsx">
      <small>
        Spinner reduces size to fit target via option <b>fit</b>(true when <b>inline: false </b>- by default)
        <br />
        By default parent is overlayed by shadowBox (option <b>overflowShadow</b>) <b />
      </small>
      <button className="btn" type="button" style={{ position: "relative" }}>
        Button with relative position
        <wup-spin //
          w-fit=""
          w-inline={false}
          w-overflowFade=""
          w-overflowTarget="auto"
          w-overflowOffset=""
        />
      </button>
    </Example>
  );
}
