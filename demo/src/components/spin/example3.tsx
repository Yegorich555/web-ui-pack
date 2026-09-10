import Example from "src/elements/example";

export default function Example3() {
  return (
    <Example
      header="Outside target"
      link="demo/src/components/spin/example3.tsx"
      style={{ position: "relative" }} // required: spinner is placed outside the button
    >
      <small>
        Spinner placed outside button (option <b>overflowTarget</b>) and parent has <b>position: relative</b>
      </small>
      <button className="btn" type="button" id="spinTarget">
        Button without relative position
      </button>
      <wup-spin
        w-overflowTarget="#spinTarget"
        ref={(el) => {
          if (el) {
            // el.$options.overflowTarget = el.previousElementSibling as HTMLElement;
            el.$options.overflowFade = false;
          }
        }}
      />
    </Example>
  );
}
