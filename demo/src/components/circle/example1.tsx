import Example from "src/elements/example";

// the attribute w-items points to the global variable: so it must be declared before the render
(window as any).circleItems = [{ value: 60 }];

export default function Example1() {
  return (
    <Example header="Default" link="demo/src/components/circle/example1.tsx">
      <small>single full circle segment with corners 3 and background circle</small>
      <wup-circle
        style={{ maxWidth: "100px" }}
        w-back
        w-from={0}
        w-to={360}
        w-space={2}
        w-minSize={10}
        w-min={0}
        w-max={100}
        w-width={14}
        w-corner={0.25}
        w-items="window.circleItems"
      />
    </Example>
  );
}
