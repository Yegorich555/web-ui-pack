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
      onRemove?: boolean;
      skip?: boolean;
      value?: string;
      /** test when attr has key of window */
      refGlobal: any;
    }
  >;
  $options: Record<
    string,
    {
      skip?: boolean;
      ignoreInput?: boolean;
    }
  >;
}

export function baseTestComponent(createFunction: () => any, opts: BaseTestOptions) {
  describe("common tests", () => {
    jest.useFakeTimers();
    const obj = createFunction() as WUPBaseElement | HTMLElement;
    jest.advanceTimersByTime(1);

    test("no arrow functions", () => {
      const fns = findAllFunctions(obj);
      // doesn't for work for deep-inheritted: const arrowFunc = objNames.filter(a => !protoNames.includes(a));
      expect(fns.arrow).toHaveLength(0);
    });

    // it doesn't required anymore because bind costs memory
    // it("each function are bound", () => {
    //   expect(fns.notBound).toHaveLength(0);
    // });
    if (obj instanceof WUPBaseElement) {
      test("render + styles", () => {
        expect(obj).toMatchSnapshot();
        const c = Object.getPrototypeOf(obj).constructor as typeof WUPBaseElement;
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
    }

    if (!opts?.skipAttrs && obj instanceof WUPBaseElement) {
      const c = Object.getPrototypeOf(obj).constructor as typeof WUPBaseElement;
      const attrs = ((c as any).observedAttributes || []) as string[];
      if (attrs.length) {
        describe("observedAttributes affects on options", () => {
          attrs.forEach((a) => {
            const isSkip = opts?.attrs && opts.attrs[a]?.skip;
            test(`attr [${a}]${isSkip ? " - skipped" : ""}`, () => {
              expect(a.toLowerCase()).toBe(a); // all observed attrs must be in lowercase otherwise it doesn't work

              if (isSkip) {
                return;
              }
              obj.removeAttribute(a);
              if (!obj.isConnected) {
                document.body.appendChild(obj);
                jest.advanceTimersByTime(1); // wait for ready
              }

              delete (window as any)._myTestKey;
              const oa = opts?.attrs[a];
              if (oa?.refGlobal) {
                (window as any)._myTestKey = oa?.refGlobal;
              }
              obj.setAttribute(a, oa?.value ?? (oa?.refGlobal ? "window._myTestKey" : "true"));
              jest.advanceTimersByTime(1);
              const key = Object.keys(obj.$options).find((k) => k.toLowerCase() === a) as string;
              expect(key).toBeDefined();
              expect(obj.$options[key]).toBeDefined();
              expect(obj.$options[key]).not.toBeFalsy();

              obj.removeAttribute(a);
              jest.advanceTimersByTime(1);
              if (opts?.attrs && opts.attrs[a]?.onRemove) {
                expect(obj.$options[key]).toBeTruthy();
              } else {
                expect(obj.$options[key]).toBeFalsy();
              }
              delete (window as any)._myTestKey;
            });
          });
        });

        const os = (c as any).observedOptions as string[];
        if (os?.length) {
          describe("observerOptions affects on attributes", () => {
            os.forEach((o) => {
              const attr = attrs.find((a) => a === o.toLowerCase());
              if (attr) {
                const isSkip = opts?.$options && opts?.$options[attr]?.skip;
                if (isSkip) {
                  return;
                }
                test(`opt [${o}]`, () => {
                  if (!obj.isConnected) {
                    document.body.appendChild(obj);
                    jest.advanceTimersByTime(1); // wait for ready
                  }

                  delete (window as any)._myTestKey;
                  const oa = opts?.attrs[attr];
                  if (oa?.refGlobal) {
                    (window as any)._myTestKey = oa?.refGlobal;
                  }
                  obj.setAttribute(attr, oa?.value ?? (oa?.refGlobal ? "window._myTestKey" : "true"));
                  jest.advanceTimersByTime(1);
                  expect(obj.$options[o]).toBeDefined();

                  obj.$options[o] = null;
                  jest.advanceTimersByTime(1);
                  expect(obj.getAttribute(attr)).toBeNull();
                });
              }
            });
          });
        }
      }

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
    global.setUnhandledReject(null as any);
  };
  global.setUnhandledReject(fn);
  return fn;
}

export function spyEventListeners(otherElements: Array<any>) {
  const spy = [document, document.body, HTMLElement.prototype, ...(otherElements ?? [])].map((s) => {
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
          .map((c, i) => ({ el: me.on.mock.instances[i], name: `${c[0]} ${me.on.mock.instances[i] || me.itemName}` })),
      // .sort(),
    });
    Object.defineProperty(me, "offCalls", {
      get: () =>
        me.off.mock.calls.map((c, i) => ({
          el: me.on.mock.instances[i],
          name: `${c[0]} ${me.off.mock.instances[i] || me.itemName}`,
        })), // .sort(),
    });
    return me;
  });

  const check = () => {
    spy.forEach((s) => {
      // checking if removed every listener that was added
      const onCalls = s.onCalls
        .filter((c) => c.el.isConnected) // skip for elements that's removed itself
        .map((c) => c.name)
        .sort();
      const offCalls = s.offCalls
        .filter((c) => c.el.isConnected) // skip for elements that's removed itself
        .map((c) => c.name)
        .sort();

      expect(onCalls).toEqual(offCalls);
    });
  };

  return Object.assign(spy, { check });
}

/** Mock window.requestAnimationFrame */
export function useFakeAnimation() {
  const step = 1000 / 60; // simulate 60Hz frequency
  jest.useFakeTimers();
  let i = 0;
  const animateFrames: Array<Function> = [];
  const nextFrame = async () => {
    await Promise.resolve();
    jest.advanceTimersByTime(step);
    ++i;
    const old = [...animateFrames];
    animateFrames.length = 0;
    old.forEach((f) => f(i * step));
    await Promise.resolve();
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

/** Simulate user type text (send values to the end of input): focus + keydown+ keyup + keypress + input events */
export async function userTypeText(el: HTMLInputElement, text: string, opts = { clearPrevious: true }) {
  jest.useFakeTimers();
  el.focus();
  if (opts?.clearPrevious) {
    el.value = "";
  }

  const inputType = "insertText";
  for (let i = 0; i < text.length; ++i) {
    const key = text[i];
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keypress", { key, bubbles: true }));
    el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, data: key, inputType }));
    const v = el.value;
    let carretPos = el.selectionStart ?? el.value.length;
    el.value = v.substring(0, carretPos) + key + v.substring(carretPos);
    el.selectionStart = ++carretPos;
    el.selectionEnd = el.selectionStart;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: key, inputType }));
    el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));

    if (i !== text.length - 1) {
      jest.advanceTimersByTime(20);
      await Promise.resolve();
    }
  }

  if (text === "") {
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }
}

/** Get cursor of input according in pattern "abc|def" where '|' - cursor position */
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
export function setInputCursor(el: HTMLInputElement, cursorPattern: string) {
  const gotValue = cursorPattern.replace(/[|]/g, "");
  // expect(el.value).toBe(gotValue);
  el.focus();
  el.value = gotValue;
  el.selectionStart = cursorPattern.indexOf("|");
  el.selectionEnd = cursorPattern.lastIndexOf("|");
  el.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

/** Simulates user removes text via backspace: focus + keydown+ keyup + keypress + input events;
 * Returns cursor snapshot (getInputCursor) */
export async function userRemove(
  el: HTMLInputElement,
  opts?: { removeCount: number; key: "Backspace" | "Delete" }
): Promise<string> {
  jest.useFakeTimers();
  el.focus();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opts = { removeCount: 1, key: "Backspace", ...opts };
  const { key } = opts;

  for (let i = 0; i < opts.removeCount; ++i) {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    // keypress not fired on not-char keys
    const inputType = `deleteContent${key === "Backspace" ? "Back" : "For"}ward`;
    el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, data: null, inputType }));

    let v = el.value;
    let carretPos = el.selectionStart ?? v.length;
    if (key === "Backspace" && carretPos > 0) {
      --carretPos;
    }
    v = v.substring(0, carretPos) + v.substring(carretPos + 1);
    if (el.value !== v) {
      el.value = v;
      el.selectionEnd = carretPos;
      el.selectionStart = carretPos;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: null, inputType }));
    }
    jest.advanceTimersByTime(20);
    await Promise.resolve();
  }
  el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));

  return getInputCursor(el);
}

/** Simulate user mouse click with 100ms between mouseDown and mouseUp */
export async function userClick(el: HTMLElement, opts?: MouseEventInit) {
  jest.useFakeTimers();
  const o = () => ({ bubbles: true, cancelable: true, pageX: 1, pageY: 1, ...opts });
  el.dispatchEvent(new MouseEvent("mousedown", o()));
  await wait(100);
  el.dispatchEvent(new MouseEvent("mouseup", o()));
  el.dispatchEvent(new MouseEvent("click", o()));
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
