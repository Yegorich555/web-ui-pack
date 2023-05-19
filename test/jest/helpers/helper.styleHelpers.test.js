import { getBoundingInternalRect, px2Number, styleTransform } from "web-ui-pack/helpers/styleHelpers";
import { useBuiltinStyle, WUPcssScrollSmall, WUPcssButton } from "web-ui-pack/styles";

/** @type HTMLElement */
let el;
beforeEach(() => {
  el = document.body.appendChild(document.createElement("div"));
});

afterEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = "";
});

describe("helper.styleHelpers", () => {
  test("styleTransform", () => {
    el.style.transform = "smt(2) translate(-10px, 20%) scaleY(120%)";
    styleTransform(el, "translate", "1.2");
    expect(el.style.transform).toBe("smt(2) translate(1.2) scaleY(120%)");

    el.style.transform = "smt(2) translate(-10px, 20%) scaleY(120%)";
    styleTransform(el, "translate", "");
    expect(el.style.transform).toBe("smt(2) scaleY(120%)");
    el.style.transform = "translate(20%)";
    styleTransform(el, "translate", null);
    expect(el.style.transform).toBe("");

    styleTransform(el, "translate", `12px, 50px`);
    expect(el.style.transform).toBe("translate(12px, 50px)");
    styleTransform(el, "translate", `1px, 5px`);
    expect(el.style.transform).toBe("translate(1px, 5px)");

    el.style.transform = "scaleY(120%)";
    styleTransform(el, "translate", `23%`);
    expect(el.style.transform).toBe("scaleY(120%) translate(23%)");

    styleTransform(el, "scaleY", 15);
    expect(el.style.transform).toBe("scaleY(15) translate(23%)");
    styleTransform(el, "scaleY", 0);
    expect(el.style.transform).toBe("scaleY(0) translate(23%)");

    el.style.transform = "";
    styleTransform(el, "translate", `12px, 50px`);
    expect(el.style.transform).toBe("translate(12px, 50px)");

    el.style.transform = "translate(190px, 100px) scaleY(0)";
    styleTransform(el, "scaleY", "");
    expect(el.style.transform).toBe("translate(190px, 100px)");

    el.style.transform = "scaleY(0) translate(190px, 100px)";
    styleTransform(el, "scaleY", "");
    expect(el.style.transform).toBe("translate(190px, 100px)");
  });

  test("px2Number", () => {
    expect(px2Number("23px")).toBe(23);
  });

  test("getBoundingInternalRect", () => {
    // just for coverage
    expect(getBoundingInternalRect(el)).toMatchInlineSnapshot(`
      {
        "bottom": 0,
        "height": 0,
        "left": 0,
        "right": 0,
        "top": 0,
        "width": 0,
      }
    `);
    expect(getBoundingInternalRect(el, { ignoreCache: true })).toBeDefined();
    expect(getBoundingInternalRect(el)).toBeDefined();
  });

  test("useBuiltinStyle", () => {
    useBuiltinStyle(WUPcssScrollSmall(".scrolled"));
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
      .scrolled::-webkit-scrollbar {
        width: 10px; height: 10px;
        cursor: pointer;
      }
      .scrolled::-webkit-scrollbar-corner {
        background: none;
        cursor: pointer;
      }
      .scrolled::-webkit-scrollbar-thumb {
        border: 3px solid rgba(0,0,0,0);
        background-clip: padding-box;
        background-color: var(--scroll, rgba(0,0,0,0.2));
        border-radius: 999px;
        cursor: pointer;
      }
      .scrolled::-webkit-scrollbar-track-piece:vertical:start,
      .scrolled::-webkit-scrollbar-track-piece:vertical:end,
      .scrolled::-webkit-scrollbar-track-piece:horizontal:start,
      .scrolled::-webkit-scrollbar-track-piece:horizontal:end {
        margin: 0;
        cursor: pointer;
      }
      @media (hover) {
        .scrolled::-webkit-scrollbar-thumb:hover {
          background-color: var(--scroll-hover, rgba(0,0,0,0.5));
          cursor: pointer;
        }
      }</style>"
    `);

    useBuiltinStyle(WUPcssButton(".btn"));
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      "<style>
      .scrolled::-webkit-scrollbar {
        width: 10px; height: 10px;
        cursor: pointer;
      }
      .scrolled::-webkit-scrollbar-corner {
        background: none;
        cursor: pointer;
      }
      .scrolled::-webkit-scrollbar-thumb {
        border: 3px solid rgba(0,0,0,0);
        background-clip: padding-box;
        background-color: var(--scroll, rgba(0,0,0,0.2));
        border-radius: 999px;
        cursor: pointer;
      }
      .scrolled::-webkit-scrollbar-track-piece:vertical:start,
      .scrolled::-webkit-scrollbar-track-piece:vertical:end,
      .scrolled::-webkit-scrollbar-track-piece:horizontal:start,
      .scrolled::-webkit-scrollbar-track-piece:horizontal:end {
        margin: 0;
        cursor: pointer;
      }
      @media (hover) {
        .scrolled::-webkit-scrollbar-thumb:hover {
          background-color: var(--scroll-hover, rgba(0,0,0,0.5));
          cursor: pointer;
        }
      }
      .btn {
        box-shadow: none;
        border: 1px solid var(--base-btn-bg);
        border-radius: var(--border-radius);
        box-sizing: border-box;
        padding: 0.5em;
        margin: 1em 0;
        min-width: 10em;
        cursor: pointer;
        font: inherit;
        font-weight: bold;
        background: var(--base-btn-bg);
        color: var(--base-btn-text);
        outline: none;
      }
      .btn:focus {
        border-color: var(--base-btn-focus);
      }
      @media (hover: hover) and (pointer: fine) {
        .btn:hover {
          box-shadow: inset 0 0 0 99999px rgba(0,0,0,0.2);
        }
      }
      .btn[disabled] {
        opacity: 0.3;
        cursor: not-allowed;
        -webkit-user-select: none;
        user-select: none;
      }
      .btn[aria-busy] {
        cursor: wait;
      }</style>"
    `);
  });
});
