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
      /** Page options; skip this if renderin onInit doesn't required  */
      pages?: {
        /** Current page index */
        current: number;
        /** Total count of pages; skip this for infinite-scroll */
        total?: number;
        /** Whether scrolling must be cycled: when `pageIndex < 0 || pageIndex > total - 1` */
        cycled?: boolean;
        /** Visible/rendered pages together with current page */
        before?: number;
        /** Visible/rendered pages together with current page */
        after?: number;
      };
      /** Scroll to item that click is fired */
      scrollToClick?: boolean;
      /**
       * Render callback that must return new items or null if it's ended up
       * @param dir render direction: `1`-next, `-1`-prev
       * @param ind rendered page index
       * @param prev previous/current pageState
       * @param next next/expected pageState
       */
      onRender: (dir: number, ind: number, prev: State, next: State) => HTMLElement[] | null;
    }
  }
}

/** Makes pointed element as scrollable-carousel */
export default class WUPScrolled {
  /** Current/centered page */
  state: WUP.Scrolled.State;
  /** All rendered pages */
  pages: WUP.Scrolled.State[] = [];

  /**
   * @param el target to that custom scroll must be applied
   */
  constructor(protected el: HTMLElement, public options: WUP.Scrolled.Options) {
    this.state = {
      index: options.pages?.current || 0,
      items: [],
    };

    // render first visible pages if user pointed option
    const p = options.pages;
    if (p) {
      const from = -1 * (p.before ?? 0);
      const to = p.after ?? p.current;
      let curItems: HTMLElement[];

      for (let i = from; i <= to; ++i) {
        const index = this.incrementPage(p.current, i);
        const nextState = i === 1 ? { index: this.state.index, items: curItems! } : this.state;
        const items = options.onRender(1, index, this.state, nextState)!; // WARN visible must be <= total
        this.el.append(...items);
        this.pages.push({ index, items });
        if (index === p.current) {
          curItems = items;
        }
      }
      this.state.items = curItems!;
    } else {
      this.state.items = Array.prototype.slice.call(el.children) as HTMLElement[];
      this.pages.push(this.state);
    }
    // wait for next frame otherwise parent height can be wrong
    window.requestAnimationFrame(() => this.scrollToRange(false, this.state.items));

    this.disposeLst.push(onScroll(el, (d) => this.goTo(this.state.index + d), options));
    this.disposeLst.push(onEvent(el, "keydown", (e) => this.gotKeyDown(e), { passive: false }));
    options.scrollToClick && this.disposeLst.push(onEvent(el, "click", (e) => this.gotClick(e), { passive: false }));
  }

  /** Called on keydown event and processed if event isn't prevented */
  gotKeyDown(e: KeyboardEvent): void {
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
      inc && e.preventDefault();
      this.goTo(this.state.index + inc);
    }
  }

  /** Get next page according to options.pages */
  incrementPage(pIndex: number, inc: number): number {
    pIndex += inc;
    const p = this.options.pages;
    if (p) {
      if (p.cycled) {
        if (!p.total) {
          throw new Error("option [pages.cycled] doesn't work without [pages.total]");
        }
        pIndex = (p.total + pIndex) % p.total;
      } else {
        pIndex = Math.min(p.total ? p.total - 1 : pIndex, Math.max(0, pIndex));
      }
    }
    return pIndex;
  }

  gotClick(e: MouseEvent): void {
    if (!e.defaultPrevented && !e.button) {
      const { target } = e;
      const iNext = this.pages.findIndex((pg) =>
        pg.items.some((a) => a === target || a.contains(target as HTMLElement))
      );
      if (iNext > -1) {
        e.preventDefault();
        // 11 => 9: inc: -2
        // 11 => 0: inc: +1
        let next = this.pages[iNext].index;
        if (next === this.state.index) {
          return; // click on the same
        }
        if (this.options.pages?.cycled) {
          const iPrev = this.pages.findIndex((pr) => pr.index === this.state.index);
          if (next < this.state.index && iNext > iPrev) {
            next += this.options.pages.total!; // when 11 => 0 and 11 rendered after 0
          } else if (this.state.index === 0 && iNext < iPrev) {
            next -= this.options.pages.total!; // when 0 => 11 and 11 rendered before 0
          }
        }
        this.goTo(next);
      }
    }
  }

  /** Set maxHeight, maxWidth otherwise new items affects on scroll-appearance */
  tryFixSize(): void {
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

  // WARN expected goTo possible only to visible/rendered pages
  /** Go to next/prev pages */
  goTo(isNext: boolean): Promise<void>;
  /** Go to specific page */
  goTo(pageIndex: number): Promise<void>;
  goTo(pi: number | boolean): Promise<void> {
    if (pi === true) {
      pi = this.state.index + 1;
    } else if (pi === false) {
      pi = this.state.index - 1;
    }

    this.tryFixSize();
    // const prevScroll = { h: this.el.scrollHeight, w: this.el.scrollWidth };
    const restoreScroll = this.saveScroll();

    const inc = pi - this.state.index;
    const isNext = pi > this.state.index;

    const pagesRemove: WUP.Scrolled.State[] = [];
    let wasAdded = false;
    // -2: -1: -2,
    for (let i = 1; i <= Math.abs(inc); ++i) {
      const dinc = isNext ? 1 : -1;
      pi = this.incrementPage(this.state.index, dinc);
      if (this.state.index === pi) {
        break; // no-render if no changes
      }
      const renderIndex = this.incrementPage(
        pi,
        isNext ? this.options.pages?.after || 0 : (this.options.pages?.before || 0) * -1
      );

      const nextState: WUP.Scrolled.State = {
        index: pi,
        // eslint-disable-next-line no-loop-func
        items: this.pages.find((p) => p.index === pi)?.items || [],
      };

      const itemsAdd = this.options.onRender(dinc, renderIndex, this.state, nextState);
      if (!itemsAdd?.length) {
        break; // return Promise.resolve(); // if no new items
      }
      wasAdded = true;
      const pageRemove = isNext ? this.pages.shift()! : this.pages.pop()!;
      pageRemove.items.forEach((a) => ((a as any).__scrollRemove = true));
      pagesRemove.push(pageRemove);

      const pageAdd: WUP.Scrolled.State = {
        index: renderIndex,
        items: itemsAdd,
      };

      pageAdd.items.forEach((a) => delete (a as any).__scrollRemove);
      if (isNext) {
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

    return this.scrollToRange(true, this.state.items).then(() => {
      pagesRemove.forEach((p) => p.items.forEach((a) => (a as any).__scrollRemove && a.remove())); // some items can be re-appended
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
