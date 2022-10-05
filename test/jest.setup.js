let un = null;
global.setUnhandledReject = (fnOrNull) => {
  un = fnOrNull;
};

process.on("unhandledRejection", (err) => {
  if (un) {
    un(err);
  } else {
    console.error("UnhandledRejection\r\n", err);
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

window.matchMedia = window.matchMedia || (() => ({ matches: false }));
