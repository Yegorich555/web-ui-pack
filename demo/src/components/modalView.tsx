import Page from "src/elements/page";
import { WUPModalElement } from "web-ui-pack";
import Code from "src/elements/code";
import styles from "./modalView.scss";

WUPModalElement.$use();
WUPModalElement.$useConfirmHook();

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

function SameFooter() {
  return (
    <footer>
      <button
        type="submit"
        w-confirm="Close me?"
        ref={(el) => {
          if (el) {
            el.$onRenderModal = (m) => {
              m.$options.replace = true;
            };
          }
        }}
      >
        Close with confirm-replace
      </button>
      <button type="submit" w-confirm="Close me?">
        Close with confirm
      </button>
    </footer>
  );
}

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
<wup-modal
  w-target
  w-autofocus
  w-autoclose
  w-placement="center"
  w-selfremove="false"
  w-replace="false"
  w-confirmunsaved
>
  <h2>Login form</h2>
   <wup-form>
      <wup-text w-name="email"></wup-text>
      <wup-pwd w-name="password"></wup-pwd>
      <footer>
        <button type="button" data-close="modal">Close</button>
        <button type="submit">Submit</button>
      </footer>
   </wup-form>
</wup-modal>`,
        ],
      }}
      features={[
        "Close by: outside click, button[close] click, key Escape",
        "Built-in styles & animation for different screen sizes",
        "Accessibility: autofocus, tab-cycling, focus-back on closing etc.",
        "Built-in modal-in-modal behavior",
        "Confirm modal (use .$useConfirmHook() + attr [w-confirm='Confirm message'] on buttons)",
        <>
          Integrated with <b>{"<wup-form/>"}</b> (pending + close after submitEnd + confirm modal if unsaved changes)
        </>,
      ]}
    >
      <section>
        <h3>Different placements</h3>
        <small>Use $options.placement or attribute [w-placement]</small>
        {DEV && false ? dbgSmall : null}
        <div className={styles.block}>
          <button className={`btn ${styles.left}`} type="button">
            Left
          </button>
          <wup-modal w-target="prev" w-placement="left">
            <h2>Modal with placement: left</h2>
            <div>{bigContent}</div>
            <SameFooter />
          </wup-modal>
          {/*  */}
          <button className={`btn ${styles.top}`} type="button">
            Top
          </button>
          <wup-modal w-target="prev" w-placement="top">
            <h2>Modal with placement: top</h2>
            <div>{bigContent}</div>
            <SameFooter />
          </wup-modal>
          {/*  */}
          <button className={`btn ${styles.center}`} type="button">
            Center
          </button>
          <wup-modal w-target="prev" w-placement="center">
            <h2>Modal with placement: center</h2>
            <div>{bigContent}</div>
            <SameFooter />
          </wup-modal>
          {/*  */}
          <button className={`btn ${styles.right}`} type="button">
            Right
          </button>
          <wup-modal w-target="prev" w-placement="right">
            <h2>Modal with placement: right</h2>
            <div>{bigContent}</div>
            <SameFooter />
          </wup-modal>
        </div>
      </section>
      <section>
        <h3>Built-in form support</h3>
        <small>Just place {"<wup-form/>"} with controls inside</small>
        <br />
        <button className="btn" type="button">
          Sign Up
        </button>
        <wup-modal w-target="prev" w-placement="center">
          <h2>Ordinary form</h2>
          <wup-form
            ref={(el) => {
              if (el) {
                el.$onSubmit = ({ detail }) => {
                  console.warn("submit detail:", detail);
                  // return Promise.reject();
                  // eslint-disable-next-line no-promise-executor-return
                  return new Promise((res) => setTimeout(() => res(true), 1500));
                };
              }
            }}
          >
            <wup-text w-name="email" w-initValue="yegor.golubchik@mail.com" />
            <wup-pwd w-name="password" w-initValue="123456" />
            <wup-date w-name="dob" w-label="Date of birthday" />
            <footer>
              <button type="button" data-close="modal">
                Close
              </button>
              <button type="submit">Submit</button>
            </footer>
          </wup-form>
        </wup-modal>
      </section>
      <section>
        <h3>Confirm modal with hook</h3>
        <small>It wraps click event on buttons with attribute [w-confirm]</small>
        <Code code={confirmHookJS} />
        <Code code={confirmHookHTML} />
        <button
          className="btn"
          type="button"
          w-confirm="Do you want to click me?"
          onClick={() => console.warn("Click is fired")}
        >
          Button with confirm modal
        </button>
      </section>
    </Page>
  );
}

const confirmHookJS = `js
import { WUPModalElement } from "web-ui-pack";
WUPModalElement.$use();
WUPModalElement.$useConfirmHook();`;

const confirmHookHTML = `html
<button type="button" w-confirm="Do you want to click me?">
  Click event will be called only after buttonConfirm click
</button>
`;

const bigContent = [
  `I've been in development since 2010. And nowadays, I'm really impressed that web browsers don't suggest good
elements with rich functionality, perfect styles and easy customizable at the same time.
Browsers provide ugly elements that need wrapping and spend a lot of time to make something presentative.
For example, think about <input/>. It's a perfect tag that has different types and behaviors,
but the built-in functionality is poor and the native style is ugly. That is why we know such popular libraries as Material-ui, Bootstrap etc.`,

  `But these libraries are not universal (depend on framework OR difficult to customize), have poor functionality,
and are mostly focused on styling. For example, with Bootstrap you need to learn classes, practice them, and use quite a lot of divs & classes together.
As a result, you have a large bundle size. At the same time, Material-ui possible to use only with React and very difficult
to customize if you need something out of the box. Moreover, any element doesn't contain enough functionality to fit our modern requirements.
Also, web-accessibility exists but is poor in the libraries...`,

  `Ok. We want something universal that blows our mind. What library do we need? What are the requirements?`,
  `1. It must be independent of any other library/framework, so it can be used anywhere with & without any framework (so need to use some JS native logic).`,
  `2. It must contain rich built-in functionality that covers all possible requirements (so need good internal structure + bunch of options per element).`,
  `3. Developers must use it superfast and easily. It must be intuitive, like native HTML tags (so need to use custom Web components and a very good naming convention).`,
  `4. It must be well documented and understandable during the coding. Developers shouldn't spend time on searching for solutions on websites
(so need to use the full power of JSDoc and describe every option/method/variable & cover everything with examples that can be shown by intellisense).`,
  `5. Developers must easily distinguish properties/attributes between native & custom
(so need to name every method/property/option to start with '$...' and attributes to start with 'w-...')`,
  `6. Every element must be highly customizable, so developers can rewrite anything if something is missed in the options, or even fix it yourself.`,
  `7. Every element must look pretty, contain built-in styles, and at the same time be easily modifiable.
Developers shouldn't spend much time on digging into HTML structure
(so need to use css-variables that cover most possible cases and try not to use css-class till possible;
then developers can change styles completely with a single custom class without difficult nested selectors).`,
  `8. The whole library must be developed with a focus on browser performance, small bundle size, low-memory consumption, and very fast initialization
(so it must contain the full power OOP: inheritance, prototypes + adopted for tree shaking + as little as possible arrow functions).`,
  `9. Every element must be easily accessible. Every input/control must fit the highest accessibility requirements (full support keyboard/focus/history etc.).`,
  `10. The library must be extra reliable and ideally contain 0 bugs and 0 dependencies on other libraries (so it needs 1000s unit & e2e tests)`,
  `11. Every element must be well tested in production before it goes to publicity`,

  `THE LIBRARY WEB-UI-PACK FITS ALL REQUIREMENTS ABOVE!`,

  `Let's explain the popup element. During the 10+ years, I've worked with 10s libraries included popup. Every library has huge amount of issues!`,
  `* almost with every library impossible to place popup inside parent with position relative. In web-ui-pack it's possible.`,
  `* almost in every library popup time to time is wrongly positioned when there is not enough space (sometimes outside the viewport). In web-ui-pack it works like a charm.`,
  `* most of popups are extremely difficult to position/resize on the fly, or even impossible to set position priorities
when there is not enough space for the popup at the first pointed position. In web-ui-pack it's very flexible`,

  `So every element/helper is the result of many years of experience collected in one place to help the web community develop faster, easier and better overall.
This library is a wonderful solution that must fit the requirements of every developer, every user, and the highest standards nowadays!`,
]
  .map((s) => s.replace(/\n/g, " "))
  .join("\r\n\r\n");
