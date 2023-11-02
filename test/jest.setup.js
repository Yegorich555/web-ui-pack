let un = null;
global.setUnhandledReject = (fnOrNull) => {
  un = fnOrNull;
};

process.on("unhandledRejection", (err) => {
  if (un) {
    un(err);
  } else {
    err?.message !== "test reject" && console.error("UnhandledRejection\r\n", err);
  }
});

const fixOverflow = (el) => {
  el.scrollTop = Math.max(el.scrollTop, 0);
  el.scrollLeft = Math.max(el.scrollLeft, 0);
};

Element.prototype.scroll =
  Element.prototype.scroll ||
  function scrollMock(opts) {
    if (opts.behavior === "smooth") {
      setTimeout(() => {
        this.scrollTop = opts.top ?? this.scrollTop;
        this.scrollLeft = opts.left ?? this.scrollLeft;
        fixOverflow(this);
      }, 500);
    } else {
      this.scrollTop = opts.top ?? this.scrollTop;
      this.scrollLeft = opts.left ?? this.scrollLeft;
      fixOverflow(this);
    }
  }; // it's not implemented in jsdom

Element.prototype.scrollTo =
  Element.prototype.scrollTo ||
  function scrollToMock(opts) {
    if (opts.behavior === "smooth") {
      setTimeout(() => {
        this.scrollTop = opts.top ?? this.scrollTop;
        this.scrollLeft = opts.left ?? this.scrollLeft;
        fixOverflow(this);
      }, 500);
    } else {
      this.scrollTop = opts.top ?? this.scrollTop;
      this.scrollLeft = opts.left ?? this.scrollLeft;
      fixOverflow(this);
    }
  }; // it's not implemented in jsdom

Element.prototype.scrollBy =
  Element.prototype.scrollBy ||
  function scrollByMock(opts) {
    if (opts.behavior === "smooth") {
      setTimeout(() => {
        this.scrollTop += opts.top || 0;
        this.scrollLeft += opts.left || 0;
        fixOverflow(this);
      }, 500);
    } else {
      this.scrollTop += opts.top || 0;
      this.scrollLeft += opts.left || 0;
      fixOverflow(this);
    }
  }; // it's not implemented in jsdom

// JSDOM doesn't contain definition for innerText
Object.defineProperty(Element.prototype, "innerText", {
  configurable: true,
  get: function getV() {
    return this.innerHTML;
  },
  set: function setV(v) {
    this.innerHTML = v;
  },
});

window.matchMedia = window.matchMedia || (() => ({ matches: false }));
window.DOMRect = {
  fromRect: (other) => {
    const x = other?.x || 0;
    const y = other?.y || 0;
    const width = other?.width || 0;
    const height = other?.height || 0;
    return { x, y, left: x, top: y, width, height, right: width + x, bottom: height + y };
  },
};

const origDispatch = HTMLElement.prototype.dispatchEvent;
HTMLElement.prototype.dispatchEvent = function dispatchEventFix(/** @type Event */ e) {
  const needFix = e.type === "beforeinput" && this.onbeforeinput;
  if (needFix) {
    const n = this.onbeforeinput;
    this.onbeforeinput = () => {
      throw new Error("Event 'beforeinput' is fixed internally. Please remove this fix");
    };

    this.addEventListener(
      "beforeinput",
      (ev) => {
        this.onbeforeinput = n;
        return this.onbeforeinput?.call(this, ev);
      },
      { once: true }
    );

    return origDispatch.call(this, e);
  }

  return origDispatch.call(this, e);
};
