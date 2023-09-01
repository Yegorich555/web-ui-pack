/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-standalone-expect */
/* eslint-disable no-prototype-builtins */
/* eslint-disable jest/no-export */
import WUPBaseElement from "web-ui-pack/baseElement";

const origConsoleWarn = console.warn;
export function mockConsoleWarn() {
  console.warn = jest.fn();
  return console.warn;
}

export function unMockConsoleWarn() {
  console.warn = origConsoleWarn;
}

const origConsoleError = console.error;
export function mockConsoleError() {
  const f = jest.fn();
  console.error = f;
  return f;
}

export function unMockConsoleError() {
  console.error = origConsoleError;
}

export function wrapConsoleWarn(fn: () => void) {
  const mockConsole = mockConsoleWarn();
  try {
    fn();
  } catch (ex) {
    unMockConsoleWarn();
    throw ex;
  }
  unMockConsoleWarn();
  return mockConsole;
}

const skipNames = new Set(["apply", "bind", "call", "toString", "click", "focus", "blur"]);
function setHTMLProps(t: HTMLElement) {
  const proto = Object.getPrototypeOf(t);
  if (proto && !Object.prototype.hasOwnProperty.call(proto, "__proto__")) {
    Object.getOwnPropertyNames(proto).forEach((a) => {
      if (typeof Object.getOwnPropertyDescriptor(proto, a)!.value === "function") {
        skipNames.add(a as string);
      }
    });
    setHTMLProps(proto);
  }
}
setHTMLProps(HTMLElement.prototype);

function findOwnFunctions(obj: any, proto: any) {
  const result = Object.getOwnPropertyNames(proto)
    .filter((a) => !skipNames.has(a as any))
    .filter((a) => typeof Object.getOwnPropertyDescriptor(proto, a)!.value === "function")
    .map((k) => ({
      name: k as string,
      isArrow: false,
      isBound: obj[k].name.startsWith("bound ") && !obj[k].hasOwnProperty("prototype"),
    }));
  return result;
}

export function findAllFunctions(obj: any) {
  // const proto = Object.getPrototypeOf(obj);
  // const result = findOwnFunctions(obj, proto);
  /** @type ReturnType<typeof findOwnFunctions(obj, proto)> */
  const result: Array<{ name: string; isArrow: boolean; isBound: boolean }> = [];
  const search = (v: any) => {
    const proto = Object.getPrototypeOf(v);
    if (!!proto && !Object.prototype.hasOwnProperty.call(proto, "__proto__")) {
      result.push(...findOwnFunctions(obj, proto));
      search(proto);
    }
  };

  search(obj);

  // find arrow functions
  const arrowRegex = /^[^{]+?=>/;
  (Object.getOwnPropertyNames(obj) as Array<string>)
    .filter((a) => !skipNames.has(a))
    .filter((a) => typeof Object.getOwnPropertyDescriptor(obj, a)!.value === "function")
    .filter((a) => arrowRegex.test(obj[a].toString()))
    .forEach((k) =>
      result.push({
        name: k,
        isArrow: true,
        isBound: true, // it's not actually true but for testing it's ok
      })
    );

  return {
    all: result,
    names: result.map((r) => r.name),
    arrow: result.filter((r) => r.isArrow).map((r) => r.name),
    bound: result.filter((r) => r.isBound && !r.isArrow).map((r) => r.name),
    notBound: result.filter((r) => !r.isBound && !r.isArrow).map((r) => r.name),
  };
}

export interface BaseTestOptions {
  skipAttrs?: boolean;
  attrs: Record<
    string,
    {
      /** @deprecated Set true if removing attr doesn't remove option but rollbacks to default */
      onRemove?: boolean;
      skip?: boolean;
      value?: string | number | boolean | object;
      /** Corrected internally attribute value after changing
       * @example `disabled='true'` changes to `disabled=''` */
      equalValue?: string;
      /** Expected value parsed from attribute; point if custom parser implemented here */
      parsedValue?: any;
      /** With removing attr option reverted to default till nullValue is defined here */
      nullValue?: any;
    }
  >;
}

export function baseTestComponent(createFunction: () => any, opts: BaseTestOptions) {
  describe("common tests", () => {
    jest.useFakeTimers();
    const obj = createFunction() as WUPBaseElement | HTMLElement;
    const c = Object.getPrototypeOf(obj).constructor;
    jest.advanceTimersByTime(1);

    test("no arrow functions", () => {
      const fns = findAllFunctions(obj);
      // doesn't for work for deep-inheritted: const arrowFunc = objNames.filter(a => !protoNames.includes(a));
      expect(fns.arrow).toHaveLength(0);
    });

    if (obj instanceof WUPBaseElement) {
      test("render + styles", () => {
        expect(obj).toMatchSnapshot();
        expect(c.$refStyle).toMatchSnapshot();
      });

      test("memoryLeak", () => {
        const spy = spyEventListeners([]);
        spy.check(); // checking memory leak

        const el = document.body.appendChild(createFunction());
        jest.advanceTimersByTime(1);
        el.remove();
        spy.check(); // checking memory leak
      });

      test("snapshot of $defaults", () => {
        expect(c.$defaults).toMatchSnapshot();
        expect(c.observedOptions?.sort()).toMatchSnapshot();
        expect(c.observedAttributes?.sort()).toMatchSnapshot();
      });
    }

    if (!opts?.skipAttrs && obj instanceof WUPBaseElement) {
      test("observedAttributes & options", () => {
        // every attribute must be mentioned in cfg
        const pointed = opts.attrs || {};
        const pointedAttr = Object.keys(pointed)
          .filter((k) => pointed[k] != null)
          .map((k) => k)
          .sort();

        const observedAttrs = (((c as any).observedAttributes || []) as string[]).sort();
        expect(pointedAttr).toEqual(observedAttrs);

        if (!obj.isConnected) {
          document.body.appendChild(obj);
          expect(obj.parentElement).toBeDefined();
          jest.advanceTimersByTime(1); // wait for ready
        }
        const map: Record<string, string> = {};
        Object.keys(c.$defaults).forEach((k) => {
          map[(k as string).toLowerCase()] = k as string;
        });

        observedAttrs.forEach((attrName) => {
          const pa = pointed[attrName];
          if (pa.skip) {
            return;
          }
          const propName = map[attrName] ?? attrName;
          const defVal = c.$defaults[propName];
          let attrVal = pa.value?.toString();
          delete (window as any)._myTestKey;
          if (typeof pa.value === "object") {
            (window as any)._myTestKey = pa.value;
            attrVal = "window._myTestKey";
          }

          // changing attribute affects on option
          obj.setAttribute(attrName, attrVal);
          jest.advanceTimersByTime(1);
          expect({ propName, propVal: obj.$options[propName] }).toStrictEqual({
            propName,
            propVal: pa.parsedValue ?? pa.value,
          });
          expect({ attrName, attrVal: obj.getAttribute(attrName) }).toStrictEqual({
            attrName,
            attrVal: pa.equalValue ?? attrVal,
          });

          // removing attribute must reset option to default value
          obj.removeAttribute(attrName);
          jest.advanceTimersByTime(1);
          expect({ propName, propVal: obj.$options[propName] }).toStrictEqual({
            propName,
            propVal: pa.nullValue ?? defVal,
          });

          // changing option must remove attribute
          obj.setAttribute(attrName, attrVal);
          obj.$options[propName] = undefined;
          jest.advanceTimersByTime(1);
          expect({ attrName, attrVal: obj.getAttribute(attrName) }).toStrictEqual({ attrName, attrVal: null });
        });
        delete (window as any)._myTestKey;
      });
      delete (window as any)._myTestKey;
      obj.remove();
    }
  });
}

const skipNamesStatic = new Set(["length", "prototype", "name"]);
export function testStaticInheritence(Type: any) {
  describe("componentStatic", () => {
    const stat = Object.getOwnPropertyNames(Type) //
      .filter((a) => !skipNamesStatic.has(a as string));
    const statProto = Object.getOwnPropertyNames(Object.getPrototypeOf(Type)) //
      .filter((a) => !skipNamesStatic.has(a as string));
    it("overrides static", () => {
      const arrowNotOverrided = statProto.filter((a) => !stat.includes(a));
      expect(arrowNotOverrided).toHaveLength(0);
    });
  });
}

export const keys = {
  Enter: 13,
  Esc: 27,
  End: 35,
  Home: 36,
  ArrowUp: 38,
  ArrowLeft: 37,
  ArrowRight: 39,
  ArrowDown: 40,
};

/** Handle process.on("unhandledRejection"); @type jest.MockedFunction;
 * WARN: it can't provide mock.calls because processFires after test-execution */
export function handleRejection() {
  const fn = jest.fn();
  const rst = fn.mockClear;
  (fn.mockClear as any) = () => {
    rst();
    (global as any).setUnhandledReject(null as any);
  };
  (global as any).setUnhandledReject(fn);
  return fn;
}

export function spyEventListeners(otherElements: Array<any>) {
  const spyArr = [document, document.body, HTMLElement.prototype, ...(otherElements ?? [])].map((s) => {
    const me = {
      on: jest.spyOn(s, "addEventListener"),
      onCalls: [{ el: HTMLElement.prototype, name: "array names" }],
      off: jest.spyOn(s, "removeEventListener"),
      offCalls: [{ el: HTMLElement.prototype, name: "array names" }],
      itemName: s.toString(),
    };
    Object.defineProperty(me, "onCalls", {
      get: () =>
        me.on.mock.calls
          .filter((c) => (c as any)[2]?.once !== true)
          .map((c, i) => ({
            el: me.on.mock.instances[i],
            name: `${c[0]} ${me.on.mock.instances[i].constructor.name || me.itemName}`,
          })),
      // .sort(),
    });
    Object.defineProperty(me, "offCalls", {
      get: () =>
        me.off.mock.calls.map((c, i) => ({
          el: me.off.mock.instances[i],
          name: `${c[0]} ${me.off.mock.instances[i].constructor.name || me.itemName}`,
        })), // .sort(),
    });
    return me;
  });

  const check = () => {
    spyArr.forEach((s) => {
      const strict = false;
      // checking if removed every listener that was added
      let onCalls = s.onCalls
        .filter((c) => c.el.isConnected) // skip for elements that's removed itself
        .map((c) => c.name)
        .sort();
      let offCalls = s.offCalls
        .filter((c) => c.el.isConnected) // skip for elements that's removed itself
        .map((c) => c.name)
        .sort();
      if (!strict) {
        // show only missed offCalls: possible when onCalls.length < offCalls.length
        let from = 0;
        onCalls = onCalls.filter((c) => {
          const i = offCalls.indexOf(c, from);
          if (i > -1) {
            from = i + 1;
            return false;
          }
          return true;
        });
        offCalls = [];
      }

      expect(onCalls).toEqual(offCalls);
    });
  };

  return Object.assign(spyArr, { check });
}

/** Mock window.requestAnimationFrame */
export function useFakeAnimation() {
  const step = 1000 / 60; // simulate 60Hz frequency
  jest.useFakeTimers();
  let i = 0;
  const animateFrames: Array<Function> = [];
  const nextFrame = async (count = 1) => {
    for (let c = 0; c < count; ++c) {
      await Promise.resolve();
      jest.advanceTimersByTime(step);
      ++i;
      const old = [...animateFrames];
      animateFrames.length = 0;
      // eslint-disable-next-line no-loop-func
      old.forEach((f) => f(i * step));
      await Promise.resolve();
    }
  };

  jest.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => {
    animateFrames.push(fn);
    return fn as any;
  });

  jest.spyOn(window, "cancelAnimationFrame").mockImplementation((fn) => {
    const ind = animateFrames.indexOf(fn as any);
    ind > -1 && animateFrames.splice(ind, 1);
  });

  return { nextFrame, step };
}

/** Wait for pointed time via Promise + jest.advanceTimersByTime */
export async function wait(t = 1000) {
  const cnt = 5;
  for (let i = 0; i < cnt; ++i) {
    await Promise.resolve();
    jest.advanceTimersByTime(t / cnt);
    await Promise.resolve();
  }
}

/** Simulate user types text (send values to the end of input): focus + keydown+ keyup + keypress + input events */
export async function userTypeText(
  el: HTMLInputElement,
  text: string,
  opts = { clearPrevious: true, slow: false }
): Promise<string> {
  el.focus();
  await wait(10);
  if (opts?.clearPrevious) {
    el.value = "";
  }

  const inputType = "insertText";
  for (let i = 0; i < text.length; ++i) {
    const key = text[i];
    if (!el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))) {
      continue;
    }
    el.dispatchEvent(new KeyboardEvent("keypress", { key, bubbles: true }));
    if (!el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, data: key, inputType }))) {
      continue;
    }
    const v = el.value;
    const { selectionStart, selectionEnd } = el;
    let caretPos = selectionStart ?? el.value.length;
    el.value = v.substring(0, caretPos) + key + v.substring(selectionEnd ?? caretPos);
    el.selectionStart = ++caretPos;
    el.selectionEnd = el.selectionStart;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: key, inputType }));
    el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));

    if (opts.slow && i !== text.length - 1) {
      await Promise.resolve();
      jest.advanceTimersByTime(20);
      await Promise.resolve();
    }
  }

  await wait(1);
  return getInputCursor(el);
}

/** Simulate user inserts text */
export async function userInsertText(el: HTMLInputElement, text: string): Promise<string> {
  el.focus();
  await wait(10);
  const inputType = "insertFromPaste";

  if (el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, data: text, inputType }))) {
    const v = el.value;
    const caretPos = el.selectionStart ?? v.length;
    el.value = v.substring(0, caretPos) + text + v.substring(el.selectionEnd ?? caretPos);
    el.selectionStart = caretPos + text.length;
    el.selectionEnd = el.selectionStart;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType }));

    await Promise.resolve();
    jest.advanceTimersByTime(20);
    await Promise.resolve();
  }

  return getInputCursor(el);
}

/** Get caret of input according in pattern "abc|def" where '|' - cursor position */
export function getInputCursor(el: HTMLInputElement) {
  const v = el.value;
  if (el.selectionStart == null || el.selectionEnd == null) {
    return v;
  }
  const p1 = v.substring(0, el.selectionStart);
  const p2 = v.substring(el.selectionStart, el.selectionEnd);
  const p3 = v.substring(el.selectionEnd);
  return `${p1}|${p2 ? `${p2}|` : ""}${p3}`;
}

/** Set cursor & value to input according to pattern "abc|def" where '|' - cursor position */
export function setInputCursor(el: HTMLInputElement, cursorPattern: string, opts?: { skipEvent: boolean }) {
  const was = el.value;
  const gotValue = cursorPattern.replace(/[|]/g, "");
  // expect(el.value).toBe(gotValue);
  el.focus();
  el.value = gotValue;
  const pos1 = cursorPattern.indexOf("|");
  let pos2 = cursorPattern.indexOf("|", pos1 + 1);
  if (pos2 === -1) {
    pos2 = pos1;
  } else {
    --pos2;
  }
  el.selectionStart = pos1;
  el.selectionEnd = pos2;
  was !== gotValue &&
    !opts?.skipEvent &&
    el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true })) &&
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

/** Simulates user removes text via backspace: focus + keydown+ keyup + keypress + input events;
 * @return cursor snapshot (getInputCursor) */
export async function userRemove(
  el: HTMLInputElement,
  opts?: { removeCount: number; key: "Backspace" | "Delete" }
): Promise<string> {
  await wait(10);
  el.focus();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opts = { removeCount: 1, key: "Backspace", ...opts };
  const { key } = opts;

  for (let i = 0; i < opts.removeCount; ++i) {
    if (!el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))) {
      continue;
    }
    // keypress not fired on not-char keys
    const inputType = `deleteContent${key === "Backspace" ? "Back" : "For"}ward`;
    if (!el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, data: null, inputType }))) {
      continue;
    }

    let v = el.value;
    let caretPos = el.selectionStart ?? v.length;
    const isNothing =
      el.selectionStart === el.selectionEnd &&
      ((key === "Backspace" && caretPos === 0) || (key === "Delete" && caretPos === v.length));
    if (!isNothing) {
      if (key === "Backspace" && caretPos > 0 && caretPos === el.selectionEnd) {
        --caretPos;
      }
      if (el.selectionStart !== el.selectionEnd) {
        v = v.substring(0, el.selectionStart!) + v.substring(el.selectionEnd!);
      } else {
        v = v.substring(0, caretPos) + v.substring(caretPos + 1);
      }
      if (el.value !== v) {
        el.value = v;
        el.selectionEnd = caretPos;
        el.selectionStart = caretPos;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, data: null, inputType }));
      }
    }
    jest.advanceTimersByTime(20);
    await Promise.resolve();
  }
  el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));

  return getInputCursor(el);
}

/** Simulate user mouse click with 100ms between mouseDown and mouseUp */
export async function userClick(el: HTMLElement, opts?: MouseEventInit, timeoutMouseUp = 100) {
  const o = () => ({ bubbles: true, cancelable: true, pageX: 1, pageY: 1, ...opts });
  const mouseEvent = (type = "click") => {
    const args = o();
    const e = new MouseEvent(type, args);
    // otherwise pageX, pageY doesn't work via constructor
    // @ts-ignore
    e.pageX = args.pageX;
    // @ts-ignore

    e.pageY = args.pageY;
    return e;
  };
  el.dispatchEvent(mouseEvent("pointerdown"));
  const isOk = el.dispatchEvent(mouseEvent("mousedown"));
  if (isOk) {
    el.focus();
    if (document.activeElement !== el) {
      // case when click on div moves focus to body
      (document.activeElement as HTMLElement)?.blur.call(document.activeElement);
    }
    document.activeElement?.dispatchEvent(new Event("focusin", { bubbles: true }));
  }
  timeoutMouseUp && (await wait(timeoutMouseUp));
  el.dispatchEvent(mouseEvent("pointerup"));
  el.dispatchEvent(mouseEvent("mouseup"));
  el.dispatchEvent(mouseEvent("click"));
}

/** Simulate user touch click with 100ms between mouseDown and mouseUp */
export async function userTap(el: HTMLElement, opts?: MouseEventInit) {
  const o = () => ({ bubbles: true, cancelable: true, pageX: 1, pageY: 1, ...opts });
  const mouseEvent = (type = "click") => {
    const args = o();
    const e = new MouseEvent(type, args);
    // otherwise pageX, pageY doesn't work via constructor
    // @ts-ignore
    e.pageX = args.pageX;
    // @ts-ignore
    e.pageY = args.pageY;
    return e;
  };
  el.dispatchEvent(new MouseEvent("pointerdown", o()));
  el.dispatchEvent(
    new TouchEvent("touchstart", {
      touches: [
        {
          clientX: 1,
          clientY: 1,
          force: 1,
          identifier: 0,
          pageX: 1,
          pageY: 1,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          screenX: 1,
          screenY: 1,
          target: el,
        },
      ],
      ...o,
    })
  );
  el.dispatchEvent(mouseEvent("pointerup"));
  el.dispatchEvent(new TouchEvent("touchend", { touches: [], ...o() }));

  const isOk = el.dispatchEvent(mouseEvent("mousedown"));
  isOk && el.focus();
  el.dispatchEvent(mouseEvent("mouseup"));
  el.dispatchEvent(mouseEvent("click"));
}

/** Simulate user press Ctrl+Z on input;
 * WARN: in reality onBeforeInput event calls only if history.legth >= 1
 * @return cursor snapshot (getInputCursor) */
export async function userUndo(el: HTMLInputElement): Promise<string> {
  await wait(10);

  el.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "я",
      code: "KeyZ",
      ctrlKey: true,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
  ) &&
    el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "historyUndo", cancelable: true })) &&
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "historyUndo" }));

  await wait(20);
  el.dispatchEvent(new KeyboardEvent("keyup", { key: "я", code: "KeyZ", bubbles: true }));
  return getInputCursor(el);
}

/** Simulate user press Ctrl+Y on input;
 * WARN: in reality onBeforeInput event calls only if history.legth >= 1
 * @return cursor snapshot (getInputCursor) */
export async function userRedo(el: HTMLInputElement, opts?: { useCtrlY?: boolean }): Promise<string> {
  await wait(10);

  const okCtrlY =
    opts?.useCtrlY &&
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "н", code: "KeyY", ctrlKey: true, bubbles: true, cancelable: true })
    );
  const okCtrlShiftZ =
    !opts?.useCtrlY &&
    el.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Я",
        code: "KeyZ",
        ctrlKey: true,
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
  (okCtrlY || okCtrlShiftZ) &&
    el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "historyRedo", cancelable: true })) &&
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "historyRedo" }));
  await wait(20);

  opts?.useCtrlY && el.dispatchEvent(new KeyboardEvent("keyup", { key: "н", code: "KeyY", bubbles: true }));
  !opts?.useCtrlY && el.dispatchEvent(new KeyboardEvent("keyup", { key: "Я", code: "KeyZ", bubbles: true }));

  return getInputCursor(el);
}

/** Simulate user swipe with 10ms between events */
export async function userSwipe(
  el: HTMLElement,
  opts: { movements: Array<{ dx: number; dy: number; delayMs?: number }> }
) {
  let clientX = el.offsetWidth / 2;
  let clientY = el.offsetHeight / 2;
  el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [{ clientX, clientY }] as any }));
  const t = { now: Date.now() };
  for (let i = 0; i < opts.movements.length; ++i) {
    const m = opts.movements[i];
    await wait(m?.delayMs ?? 10);
    t.now += m?.delayMs ?? 10;
    clientX += m.dx;
    clientY += m.dy;
    const ev = new TouchEvent("touchmove", { bubbles: true, touches: [{ clientX, clientY }] as any });
    jest.spyOn(ev, "timeStamp", "get").mockImplementation(() => t.now);
    el.dispatchEvent(ev);
  }
  await wait(10);
  el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [{ clientX, clientY }] as any }));
}

/* watchfix: https://github.com/jsdom/jsdom/issues/3209 */
export class TestMouseMoveEvent extends MouseEvent {
  movementX = 0;
  movementY = 0;

  constructor(type: "mousemove", init: MouseEventInit) {
    super(type, init);
    if (init?.movementX) {
      this.movementX = init.movementX ?? 0;
    }
    if (init?.movementY) {
      this.movementY = init.movementY ?? 0;
    }
  }
}

/** Setup width, height and layout position for pointed element */
export function setupLayout(el: HTMLElement, opts: { x: number; y: number; h: number; w: number }) {
  jest.spyOn(el, "offsetHeight", "get").mockReturnValue(Math.round(opts.h));
  jest.spyOn(el, "clientHeight", "get").mockReturnValue(Math.round(opts.h));

  jest.spyOn(el, "offsetWidth", "get").mockReturnValue(Math.round(opts.w));
  jest.spyOn(el, "clientWidth", "get").mockReturnValue(Math.round(opts.w));
  const rect = {
    x: opts.x,
    y: opts.y,
    left: opts.x,
    top: opts.y,
    height: opts.h,
    width: opts.w,
    bottom: opts.y + opts.h,
    right: opts.x + opts.w,
    toJSON: () => JSON.stringify(rect),
  };
  jest.spyOn(el, "getBoundingClientRect").mockReturnValue(rect);
}

/** Simulate mouse pointer move to pointed position */
export function userMouseMove(el: HTMLElement, { x, y }: { x: number; y: number }) {
  const opts = {
    clientX: x,
    clientY: y,
    movementX: x - userMouseMove.stored.x,
    movementY: y - userMouseMove.stored.y,
    cancelable: false,
    bubbles: true,
  };
  userMouseMove.stored = { x, y };
  el.dispatchEvent(new MouseEvent("mousemove", { ...opts }));
  el.dispatchEvent(new MouseEvent("pointermove", { ...opts }));
}

userMouseMove.stored = { x: 0, y: 0 };

/** Simulate pressing key */
export async function userPressKey(el: Element, opts: Partial<KeyboardEvent>, between?: () => void) {
  if (!el.dispatchEvent(new KeyboardEvent("keydown", { ...opts, bubbles: true, cancelable: true }))) {
    return;
  }
  el.dispatchEvent(new KeyboardEvent("keypress", { ...opts, bubbles: true }));
  between?.call(el);
  await wait(50);
  el.dispatchEvent(new KeyboardEvent("keyup", { ...opts, bubbles: true }));
}

/** Simulate pressing key Tab + focus event */
export async function userPressTab(next: HTMLElement | null) {
  const el = document.activeElement || document.body;
  userPressKey(el, { key: "Tab" }, () => {
    // el.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: next }));
    if (!next) {
      (document.activeElement as HTMLElement)?.blur?.call(document.activeElement);
    } else {
      next.focus();
      next.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    }
  });
}
