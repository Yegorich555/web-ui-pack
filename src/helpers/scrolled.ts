import onEvent from "./onEvent";
import onScroll, { IScrollOptions } from "./onScroll";
import onScrollStop from "./onScrollStop";

declare global {
  namespace WUP.Scrolled {
    interface State {
      /** Page index/value */
      index: number;
      /** Items related to page */
      items: HTMLElement[];
    }
    /** @index index of current/centered page, renderIndex - index of page the will be added */
    interface NextStateRender extends State {
      /** Index of added/rendered page; */
      renderIndex: number;
    }
    interface Options extends IScrollOptions {
      /** Scroll to target of click event;
       * @defaultValue false */
      scrollByClick?: boolean;
      /** Page options; skip this if rendering on init doesn't required  */
      pages?: {
        /** Current page index */
        current: number;
        /** Total count of pages; skip this for infinite-scroll */
        total?: number;
        /** Whether scrolling must be cycled: when `pageIndex < 0 || pageIndex > last` */
        cycled?: boolean;
        /** Visible/rendered pages together with current page;
         * @tutorial
         * if it's pointed then provide rendering empty-item for pageIndex < 0
         * @see {@link onRender} */
        before?: number;
        /** Visible/rendered pages together with current page;
         * @tutorial if pointed `after` & `total` & missed `cycled` then provide rendering empty-item for pageIndex > last
         * @see {@link onRender} */
        after?: number;
      };
      /** Render callback that must return new items or null if it's ended up
       * @param dir render direction: `1`-next, `-1`-prev
       * @param ind rendered page index
       * @param prev previous/current pageState
       * @param next next/expected pageState */
      onRender: (dir: number, ind: number, prev: State, next: State) => HTMLElement[] | null;
    }
  }
}

/** Makes pointed element as scrollable-carousel */
export default class WUPScrolled {
  /** Current/centered page */
  // @ts-expect-error because TS doesn't know about init-method
  state: WUP.Scrolled.State;
  /** All rendered pages */
  pages: WUP.Scrolled.State[] = [];

  /** @param el target to that custom scroll must be applied */
  constructor(protected el: HTMLElement, public options: WUP.Scrolled.Options) {
    this.init();

    this.disposeLst.push(onScroll(el, (v) => this.goTo(v === 1), options));
    this.disposeLst.push(onEvent(el, "keydown", (e) => this.gotKeyDown(e), { passive: false }));
    options.scrollByClick && this.disposeLst.push(onEvent(el, "click", (e) => this.gotClick(e), { passive: false }));
  }

  init(): void {
    this.pages.forEach((p) => p.items.forEach((a) => a.remove()));
    this.state = {
      index: this.options.pages?.current || 0,
      items: [],
    };
    this.pages = [];

    // render first visible pages if user pointed option
    const p = this.options.pages;
    if (p) {
      const from = -1 * (p.before ?? 0);
      const to = p.after ?? 0;
      let curItems: HTMLElement[];

      for (let i = from; i <= to; ++i) {
        const index = this.incrementPage(p.current, i);
        const nextState = i === 1 ? { index: this.state.index, items: curItems! } : this.state;
        const items = this.options.onRender(1, index, this.state, nextState)!; // WARN visible must be <= total
        this.el.append(...items);
        this.pages.push({ index, items });
        if (index === p.current) {
          curItems = items;
        }
      }
      this.state.items = curItems!;
    } else {
      this.state.items = Array.prototype.slice.call(this.el.children) as HTMLElement[];
      this.pages.push(this.state);
    }

    // wait for next frame otherwise parent height can be wrong
    window.requestAnimationFrame(() => this.scrollToRange(false, this.state.items));
  }

  /** Called on keydown event and processed if event isn't prevented */
  protected gotKeyDown(e: KeyboardEvent): void {
    // PageUp/PageDown to
    if (!e.altKey && !e.shiftKey && !e.ctrlKey && !e.defaultPrevented) {
      let inc = 0;
      switch (e.key) {
        case "PageUp":
          inc = -1;
          break;
        case "PageDown":
          inc = 1;
          break;
        case "ArrowUp":
          inc = this.options.isXScroll ? 0 : -1;
          break;
        case "ArrowDown":
          inc = this.options.isXScroll ? 0 : 1;
          break;
        case "ArrowLeft":
          inc = !this.options.isXScroll ? 0 : -1;
          break;
        case "ArrowRight":
          inc = !this.options.isXScroll ? 0 : 1;
          break;
        default:
          break;
      }
      if (inc) {
        e.preventDefault();
        this.goTo(inc === 1);
      }
    }
  }

  /** Called on click event */
  protected gotClick(e: MouseEvent): void {
    if (!e.defaultPrevented && !e.button) {
      const { target } = e;
      const iNext = this.pages.findIndex((pg) =>
        pg.items.some((a) => a === target || a.contains(target as HTMLElement))
      );
      if (iNext > -1) {
        e.preventDefault();
        // 11 => 9: inc: -2
        // 11 => 0: inc: +1
        const next = this.pages[iNext].index;
        next !== this.state.index && this.goTo(next);
      }
    }
  }

  /** Get next page according to options.pages */
  incrementPage(pIndex: number, inc: number, allowOverflow?: boolean): number {
    pIndex += inc;
    const p = this.options.pages;
    if (p) {
      if (p.cycled) {
        if (!p.total) {
          throw new Error("option [pages.cycled] doesn't work without [pages.total]");
        }
        pIndex = (p.total + pIndex) % p.total;
      } else if (!allowOverflow) {
        pIndex = Math.min(Math.max(pIndex, 0), p.total ? p.total - 1 : Number.MAX_SAFE_INTEGER);
      }
    }
    return pIndex;
  }

  /** Set maxHeight, maxWidth otherwise new items affects on scroll-appearance */
  protected tryFixSize(): void {
    const { el } = this;
    const { isXScroll } = this.options;

    if ((!isXScroll && el.style.maxHeight) || (isXScroll && el.style.maxWidth)) {
      return;
    }
    const { maxHeight, maxWidth } = getComputedStyle(el);

    /* istanbul ignore else */
    if (el.offsetHeight && !isXScroll && !maxHeight?.endsWith("px")) el.style.maxHeight = `${el.offsetHeight}px`;
    /* istanbul ignore else */
    if (el.offsetWidth && isXScroll && !maxWidth?.endsWith("px")) el.style.maxWidth = `${el.offsetWidth}px`;
  }

  /** Returns nearest way between prev & next if cycled */
  getNearest(prev: number, next: number, total: number): { isForward: boolean; count: number } {
    const diff1 = next - prev;
    const cnt1 = Math.abs(diff1);
    const diff2 = total - cnt1;
    const cnt2 = Math.abs(diff2);
    if (cnt1 <= cnt2) {
      return { isForward: diff1 > 0, count: cnt1 };
    }
    return { isForward: diff1 < diff2, count: cnt2 };
  }

  #scrollNum = 0;
  // WARN expected goTo possible only to visible/rendered pages
  /** Go to next/prev pages */
  goTo(isNext: boolean, smooth?: boolean): Promise<void>;
  /** Go to specific page */
  goTo(pageIndex: number, smooth?: boolean): Promise<void>;
  goTo(pi: number | boolean, smooth = true): Promise<void> {
    let isForward: boolean;
    let count = 1; // render count
    if (pi === true) {
      isForward = true;
    } else if (pi === false) {
      isForward = false;
    } else {
      const p = this.options.pages;
      pi = p ? Math.max(0, pi) : pi;
      pi = p?.total ? Math.min(pi, p.total) : pi; // don't allow goTo outside range
      if (p?.cycled) {
        const r = this.getNearest(this.state.index, pi, p.total!);
        isForward = r.isForward;
        count = r.count;
      } else {
        const diff = pi - this.state.index;
        isForward = diff > 0;
        count = Math.abs(diff);
      }
    }

    if (pi === this.state.index) {
      return Promise.resolve(); // no-changes
    }

    this.tryFixSize();
    // const prevScroll = { h: this.el.scrollHeight, w: this.el.scrollWidth };
    const restoreScroll = this.saveScroll();

    const pagesRemove: WUP.Scrolled.State[] = [];
    let wasAdded = false;

    // -2: -1: -2,
    for (let i = 1; i <= count; ++i) {
      const inc = isForward ? 1 : -1;
      pi = this.incrementPage(this.state.index, inc);
      if (this.state.index === pi) {
        break; // no-render if no changes
      }
      const renderIndex = this.incrementPage(
        pi,
        isForward ? this.options.pages?.after || 0 : (this.options.pages?.before || 0) * -1,
        true
      );

      const nextState: WUP.Scrolled.State = {
        index: pi,
        // eslint-disable-next-line no-loop-func
        items: this.pages.find((p) => p.index === pi)?.items || [],
      };

      const itemsAdd = this.options.onRender(inc, renderIndex, this.state, nextState);
      if (!itemsAdd?.length) {
        break; // return Promise.resolve(); // if no new items
      }
      wasAdded = true;
      const pageRemove = isForward ? this.pages.shift()! : this.pages.pop()!;
      pageRemove.items.forEach((a) => ((a as any).__scrollRemove = true));
      pagesRemove.push(pageRemove);

      const pageAdd: WUP.Scrolled.State = {
        index: renderIndex,
        items: itemsAdd,
      };

      pageAdd.items.forEach((a) => delete (a as any).__scrollRemove);
      if (isForward) {
        this.el.append(...pageAdd.items);
        this.pages.push(pageAdd);
      } else {
        this.el.prepend(...pageAdd.items);
        this.pages.unshift(pageAdd);
        // another way to save scroll doesn't work if goTo applied before previous not finished yet
        // this.el.scrollTop += this.el.scrollHeight - prevScroll.h;
        // this.el.scrollLeft += this.el.scrollWidth - prevScroll.w;
      }
      nextState.items = nextState.items.length ? nextState.items : pageAdd.items; // if only 1 page rendered at once
      this.state = nextState;
    }

    if (!wasAdded) {
      return Promise.resolve();
    }
    restoreScroll(); // WARN restore required even items is appended to the end
    let r = this.scrollToRange(smooth as true, this.state.items);

    ++this.#scrollNum;
    const rstMaxSize = (): void => {
      if (--this.#scrollNum === 0) {
        this.el.style.maxHeight = "";
        this.el.style.maxWidth = "";
      }
    };
    if (!smooth) {
      r = Promise.resolve();
      rstMaxSize();
    }

    return r.then(() => {
      pagesRemove.forEach((p) => p.items.forEach((a) => (a as any).__scrollRemove && a.remove())); // some items can be re-appended
      rstMaxSize();
    });
  }

  /** Returns function to restore scroll position related to elements */
  saveScroll(): () => void {
    const savedItems = [this.state.items[0], this.state.items[this.state.items.length - 1]];
    return () => this.scrollToRange(false, savedItems);
  }

  /** Scroll to center of pointed items */
  scrollToRange(isSmooth: true, items: HTMLElement[]): Promise<void>;
  scrollToRange(isSmooth: false, items: HTMLElement[]): void;
  scrollToRange(isSmooth: boolean, items: HTMLElement[]): void | Promise<void> {
    const y1 = items[0].offsetTop - this.el.offsetTop;
    const x1 = items[0].offsetLeft - this.el.offsetLeft;
    const $2 = items[items.length - 1];
    const y2 = $2.offsetTop + $2.offsetHeight - this.el.offsetTop;
    const x2 = $2.offsetLeft + $2.offsetWidth - this.el.offsetLeft;
    const top = y1 + (y2 - y1 - this.el.offsetHeight) / 2;
    const left = x1 + (x2 - x1 - this.el.offsetWidth) / 2;
    this.el.scroll({ top, left, behavior: isSmooth ? "smooth" : "auto" });
    if (isSmooth) {
      return new Promise<void>((resolve) => {
        onScrollStop(this.el, () => resolve(), { onceNotStarted: true });
      });
    }
    return undefined;
  }

  protected disposeLst: Array<() => void> = [];
  /** Remove event listeners */
  dispose(): void {
    this.disposeLst.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLst.length = 0;
  }
}
