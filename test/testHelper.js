/* eslint-disable no-prototype-builtins */
/* eslint-disable jest/no-export */

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

export function testComponentFuncBind(obj) {
  describe("componentFuncBind", () => {
    const fns = findAllFunctions(obj);
    it("no arrow functions", () => {
      // doesn't for work for deep-inheritted: const arrowFunc = objNames.filter(a => !protoNames.includes(a));
      expect(fns.arrow).toHaveLength(0);
    });

    it("each function are bound", () => {
      expect(fns.notBound).toHaveLength(0);
    });
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
  testComponentFuncBind(Type);
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
  const spy = [document, document.body, HTMLElement.prototype, ...otherElements].map((s) => {
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
