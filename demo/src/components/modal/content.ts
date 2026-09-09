/** Long texts used by the examples to show scrollable content inside the modal */
const smallContentRaw = [
  `Let's explain the popup element. During the 10+ years, I've worked with 10s libraries included popup. Every library has huge amount of issues!`,
  `* almost with every library impossible to place popup inside parent with position relative. In web-ui-pack it's possible.`,
  `* almost in every library popup time to time is wrongly positioned when there is not enough space (sometimes outside the viewport). In web-ui-pack it works like a charm.`,
  `* most of popups are extremely difficult to position/resize on the fly, or even impossible to set position priorities
when there is not enough space for the popup at the first pointed position. In web-ui-pack it's very flexible!`,
];
export const smallContent = smallContentRaw.map((s) => s.replace(/\n/g, " ")).join("\r\n\r\n");

export const bigContent = [
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

  ...smallContentRaw,

  `So every element/helper is the result of many years of experience collected in one place to help the web community develop faster, easier and better overall.
This library is a wonderful solution that must fit the requirements of every developer, every user, and the highest standards nowadays!`,
]
  .map((s) => s.replace(/\n/g, " "))
  .join("\r\n\r\n");
