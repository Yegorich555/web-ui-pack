/* eslint-disable no-prototype-builtins */
/* eslint-disable jest/no-export */

import WUPBaseElement from "web-ui-pack/baseElement";

export function mockSetState(el) {
  return jest.fn((state, callback) =>
    setTimeout(() => {
      Object.assign(el.state, state);
      callback && callback();
    })
  );
}

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
  console.error = jest.fn();
  return console.error;
}

export function unMockConsoleError() {
  console.error = origConsoleError;
}

export function wrapConsoleWarn(fn) {
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
function setHTMLProps(t) {
  const proto = Object.getPrototypeOf(t);
  if (proto && !Object.prototype.hasOwnProperty.call(proto, "__proto__")) {
    Object.getOwnPropertyNames(proto).forEach((a) => {
      if (typeof Object.getOwnPropertyDescriptor(proto, a).value === "function") {
        skipNames.add(a);
      }
    });
    setHTMLProps(proto);
  }
}
setHTMLProps(HTMLElement.prototype);

function findOwnFunctions(obj, proto) {
  const result = Object.getOwnPropertyNames(proto)
    .filter((a) => !skipNames.has(a))
    .filter((a) => typeof Object.getOwnPropertyDescriptor(proto, a).value === "function")
    .map((k) => ({
      name: k,
      isArrow: false,
      isBound: obj[k].name.startsWith("bound ") && !obj[k].hasOwnProperty("prototype"),
    }));
  return result;
}

export function findAllFunctions(obj) {
  // const proto = Object.getPrototypeOf(obj);
  // const result = findOwnFunctions(obj, proto);
  /** @type ReturnType<typeof findOwnFunctions(obj, proto)> */
  const result = [];
  const search = (v) => {
    const proto = Object.getPrototypeOf(v);
    if (!!proto && !Object.prototype.hasOwnProperty.call(proto, "__proto__")) {
      result.push(...findOwnFunctions(obj, proto));
      search(proto);
    }
  };

  search(obj);

  // find arrow functions
  const arrowRegex = /^[^{]+?=>/;
  Object.getOwnPropertyNames(obj)
    .filter((a) => !skipNames.has(a))
    .filter((a) => typeof Object.getOwnPropertyDescriptor(obj, a).value === "function")
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

export function baseTestComponent(obj, skipAttrs, attrOptions) {
  describe("common tests", () => {
    const fns = findAllFunctions(obj);
    it("no arrow functions", () => {
      // doesn't for work for deep-inheritted: const arrowFunc = objNames.filter(a => !protoNames.includes(a));
      expect(fns.arrow).toHaveLength(0);
    });

    // it doesn't required anymore because bind costs memory
    // it("each function are bound", () => {
    //   expect(fns.notBound).toHaveLength(0);
    // });

    if (!skipAttrs && obj instanceof WUPBaseElement) {
      const c = Object.getPrototypeOf(obj).constructor;
      /** @type string[] */
      const attrs = c?.observedAttributes || [];
      if (!attrs.length) {
        return;
      }

      describe("observedAttributes affects on options", () => {
        jest.useFakeTimers();
        /* eslint-disable jest/no-standalone-expect */
        obj.testMe = true;
        attrs.forEach((a) => {
          it(`attr [${a}]`, () => {
            expect(a.toLowerCase()).toBe(a); // all observed attrs must be in lowercase otherwise it doesn't work

            obj.removeAttribute(a);
            if (!obj.isConnected) {
              document.body.appendChild(obj);
              jest.advanceTimersByTime(1); // wait for ready
            }

            obj.setAttribute(a, "");
            jest.advanceTimersByTime(1);
            const key = Object.keys(obj.$options).find((k) => k.toLowerCase() === a);
            expect(key).toBeDefined();
            expect(obj.$options[key]).toBeDefined();
            expect(obj.$options[key]).not.toBeFalsy();

            obj.removeAttribute(a);
            jest.advanceTimersByTime(1);
            if (attrOptions && attrOptions[a]?.onRemove) {
              // eslint-disable-next-line jest/no-conditional-expect
              expect(obj.$options[key]).toBeTruthy();
            } else {
              // eslint-disable-next-line jest/no-conditional-expect
              expect(obj.$options[key]).toBeFalsy();
            }
          });
        });
        /* eslint-enable jest/no-standalone-expect */
      });
      obj.remove();
    }
  });
}

const skipNamesStatic = new Set(["length", "prototype", "name"]);
export function testStaticInheritence(Type) {
  describe("componentStatic", () => {
    const stat = Object.getOwnPropertyNames(Type) //
      .filter((a) => !skipNamesStatic.includes(a));
    const statProto = Object.getOwnPropertyNames(Object.getPrototypeOf(Type)) //
      .filter((a) => !skipNamesStatic.includes(a));

    it("overrides static", () => {
      const arrowNotOverrided = statProto.filter((a) => !stat.includes(a));
      expect(arrowNotOverrided).toHaveLength(0);
    });
  });
}

export function testControlCommon(Type) {
  baseTestComponent(Type);
  testStaticInheritence(Type);
  test("returnEmptyValue & isEmpty", () => {
    expect(Type.isEmpty(Type.returnEmptyValue)).toBe(true);
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
 * WARN: it can't provide mock.calls because processFires after test-execution
 */
export function handleRejection() {
  const fn = jest.fn();
  const rst = fn.mockClear;
  fn.mockClear = () => {
    rst();
    global.setUnhandledReject(null);
  };
  global.setUnhandledReject(fn);
  return fn;
}

/** @type ReturnType typeof spyEventListeners & {check: ()=>void } */
export function spyEventListeners(otherElements) {
  const spy = [document, document.body, HTMLElement.prototype, ...(otherElements ?? [])].map((s) => {
    const me = {
      on: jest.spyOn(s, "addEventListener"),
      onCalls: ["array names"],
      off: jest.spyOn(s, "removeEventListener"),
      offCalls: ["array names"],
      itemName: s.toString(),
    };
    Object.defineProperty(me, "onCalls", {
      get: () =>
        me.on.mock.calls
          .filter((c) => c[2]?.once !== true)
          .map((c, i) => `${c[0]} ${me.on.mock.instances[i] || me.itemName}`)
          .sort(),
    });
    Object.defineProperty(me, "offCalls", {
      get: () => me.off.mock.calls.map((c, i) => `${c[0]} ${me.off.mock.instances[i] || me.itemName}`).sort(),
    });
    return me;
  });

  spy.check = () => {
    spy.forEach((s) => {
      // checking if removed every listener that was added
      expect(s.onCalls).toEqual(s.offCalls);
    });
  };

  return spy;
}

export function useFakeAnimation() {
  const step = 1000 / 60; // simulate 60Hz frequency
  jest.useFakeTimers();
  let i = 0;
  const animateFrames = [];
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
    return fn;
  });

  jest.spyOn(window, "cancelAnimationFrame").mockImplementation((fn) => {
    const ind = animateFrames.indexOf(fn);
    ind > -1 && animateFrames.splice(ind, 1);
  });

  return { nextFrame, step };
}

export async function wait(t = 1000) {
  await Promise.resolve();
  jest.advanceTimersByTime(t);
  await Promise.resolve();
}
