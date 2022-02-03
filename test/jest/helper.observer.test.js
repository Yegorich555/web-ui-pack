/* eslint-disable no-self-assign */
import observer from "web-ui-pack/helpers/observer";

// watchfix jest issue unhandledRejection handler is not testable: https://github.com/facebook/jest/issues/5620
const catchIn = () => console.warn("got");

beforeAll(() => {
  // todo hook on jest env
  process.on("unhandledRejection", catchIn);
  // window.addEventListener("unhandledrejection", catchIn);
});
afterAll(() => {
  process.off("unhandledRejection", catchIn);
  // window.removeEventListener("unhandledrejection", catchIn);
});

beforeEach(() => {
  // https://stackoverflow.com/questions/51126786/jest-fake-timers-with-promises
  jest.useFakeTimers(); // legacy required to work with Promises correctly
  jest.clearAllMocks();
  jest.clearAllTimers();
});

describe("helper.observer", () => {
  test("simple object with props null,undefined,boolean,number,string,function", () => {
    const prevFunc = () => "hello";
    const obj = observer.make({
      nullVal: null,
      undefVal: undefined,
      boolVal: false,
      numberVal: 0,
      stringVal: "",
      func: prevFunc,
    });

    // check if make works fine if will do it several times
    const objAgain = observer.make(obj);
    expect(objAgain).toBe(obj);

    const fn = jest.fn();
    const fn2 = jest.fn();
    observer.onPropChanged(obj, fn);
    observer.onChanged(obj, fn2);
    jest.advanceTimersToNextTimer();
    expect(fn).not.toBeCalled();

    obj.nullVal = "";
    expect(obj.nullVal).toBe("");
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: null, next: "", target: obj, prop: "nullVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["nullVal"], target: obj });

    obj.undefVal = null;
    expect(obj.undefVal).toBe(null);
    expect(fn).toBeCalledTimes(2);
    expect(fn).lastCalledWith({ prev: undefined, next: null, target: obj, prop: "undefVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(2);
    expect(fn2).lastCalledWith({ props: ["undefVal"], target: obj });

    obj.boolVal = true;
    expect(obj.boolVal).toBe(true);
    expect(fn).toBeCalledTimes(3);
    expect(fn).lastCalledWith({ prev: false, next: true, target: obj, prop: "boolVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(3);
    expect(fn2).lastCalledWith({ props: ["boolVal"], target: obj });

    obj.numberVal = 123;
    expect(obj.numberVal).toBe(123);
    expect(fn).toBeCalledTimes(4);
    expect(fn).lastCalledWith({ prev: 0, next: 123, target: obj, prop: "numberVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(4);
    expect(fn2).lastCalledWith({ props: ["numberVal"], target: obj });

    obj.stringVal = "str";
    expect(obj.stringVal).toBe("str");
    expect(fn).toBeCalledTimes(5);
    expect(fn).lastCalledWith({ prev: "", next: "str", target: obj, prop: "stringVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(5);
    expect(fn2).lastCalledWith({ props: ["stringVal"], target: obj });

    obj.numberVal = 123;
    jest.clearAllMocks();
    expect(obj.numberVal).toBe(123);
    expect(fn).not.toBeCalled(); // no changes - no events
    jest.advanceTimersToNextTimer();
    expect(fn2).not.toBeCalled();

    obj.stringVal = "str";
    expect(obj.stringVal).toBe("str");
    expect(fn).not.toBeCalled(); // no changes - no events
    jest.advanceTimersToNextTimer();
    expect(fn2).not.toBeCalled();

    obj.boolVal = true;
    expect(obj.boolVal).toBe(true);
    expect(fn).not.toBeCalled(); // no changes - no events
    jest.advanceTimersToNextTimer();
    expect(fn2).not.toBeCalled();

    obj.boolVal = false;
    expect(fn).toBeCalledTimes(1); // check if it's called again
    expect(fn).lastCalledWith({ prev: true, next: false, target: obj, prop: "boolVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["boolVal"], target: obj });

    expect(obj.func()).toBe("hello");
    const nextFunc = () => "good";
    obj.func = nextFunc;
    expect(obj.func()).toBe("good");
    expect(fn).toBeCalledTimes(2);
    expect(fn).lastCalledWith({ prev: prevFunc, next: nextFunc, target: obj, prop: "func" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(2);
    expect(fn2).lastCalledWith({ props: ["func"], target: obj });

    // checking if onChanged happend once
    jest.clearAllMocks();
    obj.boolVal = "strBoolVal";
    obj.stringVal = 5;
    expect(fn).toBeCalledTimes(2);
    expect(fn2).not.toBeCalled();
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["boolVal", "stringVal"], target: obj });
  });

  test("assign/delete property", () => {
    const obj = observer.make({ val: 1 });
    const fn = jest.fn();
    observer.onPropChanged(obj, fn);

    obj.addedProp = "str";
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: undefined, next: "str", target: obj, prop: "addedProp" });

    delete obj.addedProp;
    expect(fn).toBeCalledTimes(2);
    expect(fn).lastCalledWith({ prev: "str", next: undefined, target: obj, prop: "addedProp" });
  });

  test("remove listeners", () => {
    const obj = observer.make({ val: 1 });
    const fn = jest.fn();
    const fn2 = jest.fn();
    const r1 = observer.onPropChanged(obj, fn);
    const r2 = observer.onChanged(obj, fn2);

    r1();

    obj.val = 123;
    jest.advanceTimersToNextTimer();
    expect(fn).not.toBeCalled(); // because removed
    expect(fn2).toBeCalledTimes(1);

    jest.clearAllMocks();
    obj.val = 3; // => onPropChanged
    r2(); // checking before timer callback is fired
    expect(jest.advanceTimersToNextTimer).not.toThrow(); // => onChanged after timeout (checking if no exceptions here)
    expect(fn2).not.toBeCalled();
  });

  test("this context", () => {
    class TestClass {
      #testMe = 4;
      callMe() {
        return this.#testMe;
      }
    }
    const v = new TestClass();
    const obj = observer.make(v);
    const fn = jest.fn();
    observer.onPropChanged(obj, fn);

    expect(v.callMe()).toBe(4);
  });

  test("for array", () => {
    const arr = observer.make([1, 2, 3]);
    const fn = jest.fn();
    const fn2 = jest.fn();
    observer.onPropChanged(arr, fn);
    observer.onChanged(arr, fn2);

    // access via index
    arr[0] = "v";
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: 1, next: "v", target: arr, prop: "0" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["0"], target: arr });

    // add new via index
    jest.clearAllMocks();
    const arrLast = arr.length;
    arr[arrLast] = 999;
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev: undefined, next: 999, target: arr, prop: `${arrLast}` });
    // in this case arr length doesn't fire changes
    // expect(fn).lastCalledWith({ prev: 3, next: 4, target: arr, prop: "length" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: [`${arrLast}`], target: arr });

    // push single
    jest.clearAllMocks();
    arr.push(12);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev: undefined, next: 12, target: arr, prop: "4" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["4"], target: arr });

    // push several at once
    arr.length = 0;
    jest.advanceTimersToNextTimer();
    jest.clearAllMocks();
    arr.push(55, 66);
    expect(fn).toBeCalledTimes(2);
    expect(fn).toBeCalledWith({ prev: undefined, next: 55, target: arr, prop: "0" });
    expect(fn).toBeCalledWith({ prev: undefined, next: 66, target: arr, prop: "1" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["0", "1"], target: arr });

    arr.length = 0;
    arr.push(1, 2, 3);
    jest.clearAllMocks();
    // removing via splice
    arr.splice(0, 2);
    expect(fn).toBeCalled(); // splice produces delete, changing each index and changing length
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);

    // adding via splice
    jest.clearAllMocks();
    arr.splice(2, 0, 88);
    expect(fn).toBeCalledTimes(1); // splice produces append if nothing removed previously
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);

    // replace via splice
    jest.clearAllMocks();
    arr.splice(2, 1, 89);
    expect(fn).toBeCalled(); // splice produces delete, changing each index and changing length
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);

    arr.length = 0;
    arr.push(1, 2, 3);
    jest.advanceTimersToNextTimer();
    jest.clearAllMocks();
    // removing last via pop
    arr.pop();
    expect(fn).toBeCalledTimes(2);
    expect(fn).toBeCalledWith({ prev: 3, next: undefined, target: arr, prop: "2" });
    expect(fn).toBeCalledWith({ prev: 3, next: 2, target: arr, prop: "length" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["2", "length"], target: arr });

    arr.push(99, 100);
    jest.advanceTimersToNextTimer();
    jest.clearAllMocks();
    // removing first via shift
    arr.shift(); // shift produces delete, changing each index and changing length
    expect(fn).toBeCalled();
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);

    // add several via unshift (at first position)
    arr.length = 0;
    arr.push(1, 2, 3);
    jest.advanceTimersToNextTimer();
    jest.clearAllMocks();
    arr.unshift(98, 99); // unshift produces changing each index and set at first
    expect(fn).toBeCalled();
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);

    // changing via sort
    jest.clearAllMocks();
    arr.sort(); // sort produces changing indexes so event-per-change index
    expect(fn).toBeCalled();
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);

    // changing via reverse
    jest.clearAllMocks();
    arr.reverse(); // reverse produces changing indexes so event-per-change index
    expect(fn).toBeCalled();
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);

    // clearing with length: 0
    arr.length = 0;
    arr.push(1, 2, 3);
    jest.advanceTimersToNextTimer();
    jest.clearAllMocks();
    arr.length = 1;
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: 3, next: 1, target: arr, prop: "length" });
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["length"], target: arr });

    arr.length = 0;
    expect(fn).lastCalledWith({ prev: 1, next: 0, target: arr, prop: "length" });
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(2);
    expect(fn2).lastCalledWith({ props: ["length"], target: arr });
  });

  test("for Date (valueof)", () => {
    let obj = observer.make(new Date());
    const fn = jest.fn();
    const fn2 = jest.fn();
    observer.onPropChanged(obj, fn);

    let prev = obj.valueOf();
    let next = obj.setHours(0, 0, 0, 0);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev, next, target: obj, prop: "valueOf" });

    fn.mockClear();
    prev = obj.valueOf();
    next = obj.setDate(12);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev, next, target: obj, prop: "valueOf" });

    expect(() => obj.getTime()).not.toThrow();
    expect(() => obj.getFullYear()).not.toThrow();

    // date as part of object
    jest.clearAllMocks();
    obj = observer.make({
      dateVal: new Date(Date.now() - 1),
    });
    const prevDateVal = obj.dateVal; // it's important because wrapped to proxy
    observer.onPropChanged(obj, fn);
    observer.onChanged(obj, fn2);
    const dtVal = Date.now();

    // date (valueof and ref) is changed
    const nextDateVal = new Date(dtVal);
    obj.dateVal = nextDateVal;
    expect(obj.dateVal.valueOf()).toBe(dtVal);
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: prevDateVal, next: nextDateVal, target: obj, prop: "dateVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["dateVal"], target: obj });
    // date as object is changed but valueOf isn't changed
    jest.clearAllMocks();
    obj.dateVal = new Date(dtVal);
    expect(fn).not.toBeCalled();
    jest.advanceTimersToNextTimer();
    expect(fn2).not.toBeCalled();
  });

  test("for Set, Map", () => {
    const fn = jest.fn();
    // for Set
    const set = observer.make(new Set());
    observer.onPropChanged(set, fn);

    expect(() => set.add("s1")).not.toThrow();
    expect(set.has("s1")).toBeTruthy();
    expect(fn).toBeCalledTimes(1);
    // watch jest issue with Set/Map equality: https://github.com/facebook/jest/issues/7975
    expect(fn).toBeCalledWith(expect.objectContaining({ prev: 0, next: 1, prop: "size" }));
    expect(fn.mock.calls[0][0].target).toBe(set);

    // set the same not to be called
    fn.mockClear();
    expect(() => set.add("s1")).not.toThrow();
    expect(fn).not.toBeCalled();

    fn.mockClear();
    expect(set.clear).not.toThrow();
    expect(set.has("s1")).toBeFalsy();
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(expect.objectContaining({ prev: 1, next: 0, prop: "size" }));
    expect(fn.mock.calls[0][0].target).toBe(set);

    // for Map
    fn.mockClear();
    const map = observer.make(new Map());
    observer.onPropChanged(map, fn);

    expect(() => map.set("k1", 111)).not.toThrow();
    expect(map.has("k1", 111)).toBeTruthy();
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(expect.objectContaining({ prev: 0, next: 1, prop: "size" }));
    expect(fn.mock.calls[0][0].target).toBe(map);

    fn.mockClear();
    expect(() => map.clear()).not.toThrow();
    expect(set.has("k1")).toBeFalsy();
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(expect.objectContaining({ prev: 1, next: 0, prop: "size" }));
    expect(fn.mock.calls[0][0].target).toBe(map);

    fn.mockClear();
    const weakSet = new WeakSet();
    const obj = observer.make({ weakSet });
    observer.onPropChanged(obj, fn);
    const ref = {};
    expect(() => weakSet.add(ref)).not.toThrow();
    expect(weakSet.has(ref)).toBeTruthy();
    expect(fn).not.toBeCalled(); // because WeakSet & WeakMap not supported
  });

  test("Object.assign", () => {
    const obj = observer.make({ v: 1 });
    const fn = jest.fn();
    const fn2 = jest.fn();
    observer.onPropChanged(obj, fn);
    observer.onChanged(obj, fn2);

    Object.assign(obj, { v: 2 });
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev: 1, next: 2, target: obj, prop: "v" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).toBeCalledWith({ props: ["v"], target: obj });

    jest.clearAllMocks();
    Object.assign(obj, { v: 3, nVal: "str" });
    expect(fn).toBeCalledTimes(2);
    expect(fn).toBeCalledWith({ prev: 2, next: 3, target: obj, prop: "v" });
    expect(fn).toBeCalledWith({ prev: undefined, next: "str", target: obj, prop: "nVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).toBeCalledWith({ props: ["v", "nVal"], target: obj });
  });

  test("method isObserver(), exceptions etc.", () => {
    expect(observer.isObserved({ v: 1 })).toBeFalsy(); // on notObserved object
    const prev = { v: 1 };
    const obj = observer.make(prev);
    expect(observer.isObserved(obj)).toBeTruthy();
    expect(prev).not.toBe(obj); // IMPORTANT: because after assigning it's converted to proxy object
    expect(observer.isObserved(prev)).toBeFalsy();

    const next = {};
    obj.next = next;
    expect(observer.isObserved(obj.next)).toBeTruthy();

    // on empty callback
    expect(() => observer.onPropChanged(obj)).toThrow();
    expect(() => (obj.v = 2)).not.toThrow();
    // on empty callback
    expect(() => observer.onChanged(obj)).toThrow();
    jest.advanceTimersToNextTimer(); // onChanged has timeout
    expect(() => (obj.v = 3)).not.toThrow();

    expect(() => observer.onPropChanged({ v: 1 })).toThrow(); // throw because notObserved
    expect(() => observer.onChanged({ v: 1 })).toThrow(); // throw because notObserved

    // checking assign again
    jest.clearAllMocks();
    jest.clearAllTimers();
    const ref = { val: 1 };
    obj.ref = ref;

    // try to assign again
    expect(() => (obj.ref = ref)).not.toThrow();
    expect(() => (obj.ref = obj.ref)).not.toThrow();
    expect(observer.isObserved(ref)).toBeFalsy();
    expect(ref).not.toBe(obj.ref); // IMPORTANT: because after assigning it's converted to proxy object
    const fn = jest.fn();
    observer.onChanged(obj, fn);
    expect(observer.isObserved(obj.ref)).toBeTruthy();
    obj.ref.val += 1;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
  });

  test("exception in event > callback doesn't affect on another", async () => {
    await Promise.resolve();
    const obj = observer.make({ ref: { val: 1 } });
    observer.onPropChanged(obj.ref, () => {
      throw new Error("Test prop message");
    });
    observer.onChanged(obj.ref, () => {
      throw new Error("Test message");
    });
    const fn = jest.fn();
    const fn2 = jest.fn();
    observer.onPropChanged(obj, fn);
    observer.onChanged(obj, fn2);
    obj.ref.val += 1;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
    expect(fn2).toBeCalledTimes(1);
  });

  test("collission on several", () => {
    const obj1 = observer.make({ v: 1 });
    const onChange1 = jest.fn();
    const onPropChange1 = jest.fn();
    observer.onChanged(obj1, onChange1);
    observer.onPropChanged(obj1, onPropChange1);

    const obj2 = observer.make({ v: 2 });
    const onChange2 = jest.fn();
    const onPropChange2 = jest.fn();
    observer.onChanged(obj2, onChange2);
    observer.onPropChanged(obj2, onPropChange2);

    obj1.v = 999;
    jest.advanceTimersToNextTimer();
    jest.advanceTimersToNextTimer();
    expect(onChange1).toBeCalledTimes(1);
    expect(onPropChange1).toBeCalledTimes(1);
    expect(obj1.v).toBe(999);
    expect(onChange2).not.toBeCalled();
    expect(onPropChange2).not.toBeCalled();
    expect(obj2.v).toBe(2);

    jest.clearAllMocks();
    obj1.v = "s1";
    obj2.v = "s2";
    jest.advanceTimersToNextTimer();
    jest.advanceTimersToNextTimer();
    expect(onChange1).toBeCalledTimes(1);
    expect(onChange1).toBeCalledWith({ props: ["v"], target: obj1 });
    expect(onPropChange1).toBeCalledTimes(1);
    expect(onPropChange1).toBeCalledWith({ prev: 999, next: "s1", prop: "v", target: obj1 });

    expect(onChange2).toBeCalledTimes(1);
    expect(onChange2).toBeCalledWith({ props: ["v"], target: obj2 });
    expect(onPropChange2).toBeCalledTimes(1);
    expect(onPropChange2).toBeCalledWith({ prev: 2, next: "s2", prop: "v", target: obj2 });
  });

  test("recursive", () => {
    const obj = observer.make({ val: 1, inObj: { val: "sIn" } });
    const fn = jest.fn();
    const fn2 = jest.fn();
    observer.onPropChanged(obj, fn);
    observer.onChanged(obj, fn2);

    obj.inObj.val = 999;
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev: obj.inObj, next: obj.inObj, prop: "inObj", target: obj });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).toBeCalledWith({ props: ["inObj"], target: obj });

    const fnIn = jest.fn();
    const fnIn2 = jest.fn();
    const r1 = observer.onPropChanged(obj.inObj, fnIn);
    const r2 = observer.onChanged(obj.inObj, fnIn2);
    obj.inObj.val = 123;
    expect(fnIn).toBeCalledTimes(1);
    expect(fnIn).toBeCalledWith({ prev: 999, next: 123, prop: "val", target: obj.inObj });
    jest.advanceTimersToNextTimer();
    expect(fnIn2).toBeCalledTimes(1);
    expect(fnIn2).toBeCalledWith({ props: ["val"], target: obj.inObj });
    r1();
    r2();

    // checking how it works for newProp
    obj.inObj2 = {};
    expect(observer.isObserved(obj.inObj2)).toBeTruthy();
    jest.clearAllMocks();
    jest.clearAllTimers();
    obj.inObj2.v2 = 123;
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev: obj.inObj2, next: obj.inObj2, prop: "inObj2", target: obj });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).toBeCalledWith({ props: ["inObj2"], target: obj });

    // checking delete
    const { inObj } = obj;
    delete obj.inObj; // it will fire events
    jest.clearAllMocks();
    jest.clearAllTimers();
    expect(observer.isObserved(inObj)).toBeTruthy();
    observer.onPropChanged(obj.inObj, fnIn);
    observer.onChanged(obj.inObj, fnIn2);
    inObj.txt = "345"; // expected that previousParent not tied anymore
    jest.advanceTimersToNextTimer();
    expect(fn).not.toBeCalled(); // because it doesn't tied with obj anymore
    expect(fn2).not.toBeCalled(); // because it doesn't tied with obj anymore
    expect(fnIn).toBeCalled();
    expect(fnIn2).toBeCalled();
  });

  test("recusrive; change parent/unassign/reassign", () => {
    const obj1 = observer.make({ ref: { val: 1 } });
    const { ref } = obj1;
    const fn = jest.fn();
    const fn2 = jest.fn();
    observer.onPropChanged(obj1, fn);
    observer.onChanged(obj1, fn2);
    ref.val += 1;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalled();
    expect(fn2).toBeCalled();

    obj1.ref = {};
    expect(observer.isObserved(ref)).toBeTruthy();
    jest.clearAllMocks();
    jest.clearAllTimers();
    const fnRef = jest.fn();
    const fnRef2 = jest.fn();
    observer.onPropChanged(obj1.ref, fnRef);
    observer.onChanged(obj1.ref, fnRef2);
    const fnRefOrig = jest.fn();
    observer.onChanged(ref, fnRefOrig);
    ref.val += 1;
    jest.advanceTimersToNextTimer();
    expect(fnRefOrig).toBeCalled();
    expect(fnRef).not.toBeCalled(); // because previous ref was removed from object
    expect(fnRef2).not.toBeCalled();
    expect(fn).not.toBeCalled();
    expect(fn2).not.toBeCalled();

    // assign again to another object
    jest.clearAllMocks();
    const obj2 = observer.make({});
    obj2.ref = ref;
    expect(observer.isObserved(obj2.ref)).toBeTruthy();
    const fnObj2 = jest.fn();
    observer.onChanged(obj2, fnObj2);
    ref.val += 3;
    jest.advanceTimersToNextTimer();
    expect(fnRefOrig).toBeCalled();
    expect(fn).not.toBeCalled(); // because previous ref was removed from object
    expect(fn2).not.toBeCalled();
    expect(fnRef).not.toBeCalled();
    expect(fnRef2).not.toBeCalled();
  });

  test("same on several parents", () => {
    // checking single refObj with several parents
    const obj1 = observer.make({ ref: { val: 1 } });
    const { ref } = obj1;
    const obj2 = observer.make({ ref });

    expect(observer.isObserved(ref)).toBeTruthy();
    jest.clearAllMocks();
    jest.clearAllTimers();
    const fn = jest.fn();
    const fn2 = jest.fn();
    const fnRef = jest.fn();
    const fnRef2 = jest.fn();
    observer.onPropChanged(obj1, fn);
    observer.onChanged(obj1, fn2);
    observer.onPropChanged(obj2, fnRef);
    observer.onChanged(obj2, fnRef2);

    ref.value = 99;
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev: ref, next: ref, prop: "ref", target: obj1 });
    expect(fnRef).toBeCalledTimes(1);
    expect(fnRef).toBeCalledWith({ prev: ref, next: ref, prop: "ref", target: obj2 });
    jest.advanceTimersToNextTimer();
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).toBeCalledWith({ props: ["ref"], target: obj1 });
    expect(fnRef2).toBeCalledTimes(1);
    expect(fnRef2).toBeCalledWith({ props: ["ref"], target: obj2 });
  });
});
