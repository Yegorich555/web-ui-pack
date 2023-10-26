import Page from "src/elements/page";
import { WUPModalElement } from "web-ui-pack";
import styles from "./modalView.scss";

WUPModalElement.$use();

const dbgSmall = (
  <>
    <div className={styles.block}>
      <button className={`btn ${styles.left}`} type="button">
        Left
      </button>
      <wup-modal w-target="prev" w-placement="left">
        <h2>Modal with placement: left</h2>
      </wup-modal>
      {/*  */}
      <button className={`btn ${styles.top}`} type="button">
        Top
      </button>
      <wup-modal w-target="prev" w-placement="top">
        <h2>Modal with placement: top</h2>
      </wup-modal>
      {/*  */}
      <button className={`btn ${styles.center}`} type="button">
        Center
      </button>
      <wup-modal w-target="prev" w-placement="center">
        <h2>Modal with placement: center</h2>
      </wup-modal>
      {/*  */}
      <button className={`btn ${styles.right}`} type="button">
        Right
      </button>
      <wup-modal w-target="prev" w-placement="right">
        <h2>Modal with placement: right</h2>
      </wup-modal>
    </div>

    <small>The same with big scrollable content</small>
  </>
);

export default function ModalView() {
  return (
    <Page //
      header="ModalElement"
      link="src/modalElement.ts"
      details={{
        tag: "wup-modal",
        linkDemo: "demo/src/components/modalView.tsx",
        customHTML: [
          `html
<wup-modal w-target w-placement="center">
  Some content here...
</wup-modal>`,
        ],
      }}
      features={[
        "Close by: outside click, button[close] click, key Escape",
        "Built-in styles & animation for different screen sizes",
        "Accessibility: autofocus, tab-cycling, focus-back on closing etc.",
        // todo uncomment when will be implemented
        // <>
        //   Integrated with <b>wup-form</b> (pending + close after submit-end + confirm window if unsaved changes)
        // </>,
      ]}
    >
      <h3>Different placemenets</h3>
      <small>Use $options.placement or attribute [w-placement]</small>
      {DEV ? dbgSmall : null}
      <div className={styles.block}>
        <button className={`btn ${styles.left}`} type="button">
          Left
        </button>
        <wup-modal w-target="prev" w-placement="left">
          <h2>Modal with placement: left</h2>
          <div>{bigContent}</div>
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.top}`} type="button">
          Top
        </button>
        <wup-modal w-target="prev" w-placement="top">
          <h2>Modal with placement: top</h2>
          <div>{bigContent}</div>
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.center}`} type="button">
          Center
        </button>
        <wup-modal w-target="prev" w-placement="center">
          <h2>Modal with placement: center</h2>
          <div>{bigContent}</div>
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.right}`} type="button">
          Right
        </button>
        <wup-modal w-target="prev" w-placement="right">
          <h2>Modal with placement: right</h2>
          <div>{bigContent}</div>
        </wup-modal>
      </div>

      <h3>Built-in form support</h3>
      <small>Just place wup-form with controls inside</small>
      <br />
      <button className="btn" type="button">
        Sign Up
      </button>
      <wup-modal w-target="prev" w-placement="center">
        <h2>Ordinary form</h2>
        <wup-form>
          <wup-text w-name="email" w-initValue="yegor.golubchik@mail.com" />
          <wup-pwd w-name="password" w-initValue="123456" />
          <wup-date w-name="dob" w-label="Date of birthday" />
          {/* <wup-selectmany w-name="selectMany" w-items="inputSelectMany.items" /> */}
          <button type="submit">Submit </button>
        </wup-form>
      </wup-modal>
    </Page>
  );
}

const bigContent = `I LOOKED AT MY NOTES AND I DIDN’T LIKE THEM. I’d spent three days at U. S. Robots and might as
well have spent them at home with the Encyclopedia Tellurica.

Susan Calvin had been born in the year 1982, they said, which made her seventy-five now.
Everyone knew that. Appropriately enough, U. S. Robot and Mechanical Men, Inc. was seventyfive also, since it had been in the year of Dr. Calvin’s birth that Lawrence Robertson had first taken
out incorporation papers for what eventually became the strangest industrial giant in man’s history.
Well, everyone knew that, too.

At the age of twenty, Susan Calvin had been part of the particular Psycho-Math seminar at which
Dr. Alfred Lanning of U. S. Robots had demonstrated the first mobile robot to be equipped with a
voice. It was a large, clumsy unbeautiful robot, smelling of machine-oil and destined for the
projected mines on Mercury. But it could speak and make sense.

Susan said nothing at that seminar; took no part in the hectic discussion period that followed. She
was a frosty girl, plain and colorless, who protected herself against a world she disliked by a masklike expression and a hypertrophy of intellect. But as she watched and listened, she felt the stirrings
of a cold enthusiasm.

She obtained her bachelor’s degree at Columbia in 2003 and began graduate work in cybernetics.
All that had been done in the mid-twentieth century on “calculating machines” had been upset by
Robertson and his positronic brain-paths. The miles of relays and photocells had given way to the
spongy globe of plantinumiridium about the size of a human brain.

She learned to calculate the parameters necessary to fix the possible variables within the “positronic
brain”; to construct “brains” on paper such that the responses to given stimuli could be accurately
predicted.

In 2008, she obtained her Ph.D. and joined United States Robots as a “Robopsychologist,”
becoming the first great practitioner of a new science. Lawrence Robertson was still president of
the corporation; Alfred Lanning had become director of research.

For fifty years, she watched the direction of human progress change and leap ahead.
Now she was retiring — as much as she ever could. At least, she was allowing someone else’s
name to be inset upon the door of her office.

That, essentially, was what I had. I had a long list of her published papers, of the patents in her
name; I had the chronological details of her promotions. In short I had her professional “vita” in
full detail.

But that wasn’t what I wanted.

I needed more than that for my feature articles for Interplanetary Press. M`;
