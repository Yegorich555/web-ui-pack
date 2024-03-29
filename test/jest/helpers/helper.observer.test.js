import observer from "web-ui-pack/helpers/observer";
// import observer from "../../src/helpers/observer";
import * as h from "../../testHelper";

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

  test("onChanged onPropChanged doesn't affect on each other", () => {
    let obj = observer.make({ val: 1 });
    const fn = jest.fn();
    observer.onPropChanged(obj, fn);
    delete obj.val;
    expect(fn).toBeCalledTimes(1);

    fn.mockClear();
    obj = observer.make({ v: 1 });
    observer.onChanged(obj, fn);
    obj.v += 1;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
  });

  test("assign/delete property", () => {
    const obj = observer.make({ val: 1 });
    const fn = jest.fn();
    const remove = observer.onPropChanged(obj, fn);

    obj.addedProp = "str";
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: undefined, next: "str", target: obj, prop: "addedProp" });

    delete obj.addedProp;
    expect(fn).toBeCalledTimes(2);
    expect(fn).lastCalledWith({ prev: "str", next: undefined, target: obj, prop: "addedProp" });

    // test case for coverage
    remove();
    fn.mockClear();
    delete obj.val;
    expect(fn).not.toBeCalled();
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
    let obj = observer.make(new Date("2007-10-05 00:00"));
    const fn = jest.fn();
    const fn2 = jest.fn();
    observer.onPropChanged(obj, fn);

    obj.setHours(0, 0, 0, 0);
    expect(fn).toBeCalledTimes(0); // because no changes

    let prev = obj.valueOf();
    let next = obj.setHours(1, 2, 3, 4);
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
    expect(obj.dateVal !== nextDateVal).toBe(true); // because Date converts into observed
    expect(obj.dateVal.valueOf()).toBe(dtVal);
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: prevDateVal, next: obj.dateVal, target: obj, prop: "dateVal" });
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).lastCalledWith({ props: ["dateVal"], target: obj });
    // date as object is changed but valueOf isn't changed
    jest.clearAllMocks();
    obj.dateVal = new Date(dtVal);
    expect(fn).not.toBeCalled();
    jest.advanceTimersToNextTimer();
    expect(fn2).not.toBeCalled();

    jest.clearAllMocks();
    obj.dateVal = new Date("NaN here");
    expect(fn).toBeCalledTimes(1);
    jest.advanceTimersToNextTimer();
    expect(fn2).toBeCalledTimes(1);
    jest.clearAllMocks();
    obj.dateVal = new Date("NaN again here");
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
    expect(set.has("s1")).toBe(true);
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
    expect(set.has("s1")).toBe(false);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(expect.objectContaining({ prev: 1, next: 0, prop: "size" }));
    expect(fn.mock.calls[0][0].target).toBe(set);

    // for Map
    fn.mockClear();
    const map = observer.make(new Map());
    observer.onPropChanged(map, fn);

    expect(() => map.set("k1", 111)).not.toThrow();
    expect(map.has("k1", 111)).toBe(true);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(expect.objectContaining({ prev: 0, next: 1, prop: "size" }));
    expect(fn.mock.calls[0][0].target).toBe(map);

    fn.mockClear();
    expect(() => map.clear()).not.toThrow();
    expect(set.has("k1")).toBe(false);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(expect.objectContaining({ prev: 1, next: 0, prop: "size" }));
    expect(fn.mock.calls[0][0].target).toBe(map);

    fn.mockClear();
    const weakSet = new WeakSet();
    const obj = observer.make({ weakSet });
    observer.onPropChanged(obj, fn);
    const ref = {};
    expect(() => weakSet.add(ref)).not.toThrow();
    expect(weakSet.has(ref)).toBe(true);
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
    expect(observer.isObserved({ v: 1 })).toBe(false); // on notObserved object
    const prev = { v: 1 };
    const obj = observer.make(prev);
    expect(observer.isObserved(obj)).toBe(true);
    expect(prev).not.toBe(obj); // IMPORTANT: because after assigning it's converted to proxy object
    expect(observer.isObserved(prev)).toBe(false);

    const next = {};
    obj.next = next;
    expect(observer.isObserved(obj.next)).toBe(true);

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
    jest.clearAllTimers();
    const fn = jest.fn();
    observer.onChanged(obj, fn);
    const raw = { val: 1 };
    obj.ref = raw;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
    jest.clearAllMocks();
    expect(raw !== obj.ref).toBe(true); // IMPORTANT: because after assigning it's converted to proxy object

    // try to assign again
    expect(() => (obj.ref = raw)).not.toThrow();
    expect(raw !== obj.ref).toBe(true); // IMPORTANT: because after assigning it's converted to proxy object
    jest.advanceTimersToNextTimer();
    expect(fn).not.toBeCalled(); // IMPORTANT: because stored proxy-object but assigned raw that has proxy
    jest.clearAllMocks();
    // try to assign again
    // eslint-disable-next-line no-self-assign
    expect(() => (obj.ref = obj.ref)).not.toThrow();
    jest.advanceTimersToNextTimer();
    expect(fn).not.toBeCalled(); // stay the same because no changes
    expect(observer.isObserved(raw)).toBe(false);
    expect(raw !== obj.ref).toBe(true); // IMPORTANT: because after assigning it's converted to proxy object

    // try basic logic
    expect(observer.isObserved(obj.ref)).toBe(true);
    obj.ref.val += 1;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);

    // checking observer make on the same object returns previous observedItem
    const a = observer.make(raw);
    const b = observer.make(raw);
    expect(a === b).toBe(true);
    expect(a.valueOf() === raw.valueOf()).toBe(true);
    const dt = new Date();
    const d = observer.make(dt);
    expect(d.valueOf() === dt.valueOf()).toBe(true);
  });

  test("exception in event > callback doesn't affect on another", () => {
    const obj = observer.make({ ref: { val: 1 } });
    h.handleRejection();
    observer.onPropChanged(obj.ref, () => {
      throw new Error("Test prop message"); // UnhandledPromiseRejectionWarning
    });

    observer.onChanged(obj.ref, () => {
      throw new Error("Test message"); // UnhandledPromiseRejectionWarning
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
    expect(observer.isObserved(obj.inObj2)).toBe(true);
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
    expect(observer.isObserved(inObj)).toBe(true);
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
    expect(observer.isObserved(ref)).toBe(true);
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
    expect(observer.isObserved(obj2.ref)).toBe(true);
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

    expect(observer.isObserved(ref)).toBe(true);
    ref.value = 11; // it's important (for coverage) to call value change before listeners applied
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

  test("valueOf is equal; Object keys are same", () => {
    let raw = { v: 1 };
    let obj = observer.make(raw);
    expect(obj.valueOf() === raw.valueOf()).toBe(true);
    expect(Object.keys(raw)).toEqual(Object.keys(obj));

    raw = { s: "str", valueOf: () => 5 };
    obj = observer.make(raw);
    expect(obj.valueOf() === raw.valueOf()).toBe(true);
    expect(Object.keys(raw)).toHaveLength(2);
    expect(Object.keys(obj)).toHaveLength(2);
  });

  test("ignore complex instanses", async () => {
    const raw = { pr: Promise.resolve(null), el: document.createElement("div") };
    const obj = observer.make(raw);
    await expect(obj.pr).resolves.not.toThrow();
    expect(observer.isObserved(obj.pr)).toBe(false);
    expect(observer.isObserved(obj.el)).toBe(false);
  });

  test("option 'excludeNested'", async () => {
    const getRaw = () => ({ v: 1, items: [{ v: 2 }, { v: 3 }], vobj: { v: 4, s: "str" }, dateVal: new Date() });
    let obj = observer.make(getRaw(), { excludeNested: ["items"] });
    expect(observer.isObserved(obj.items)).toBe(true);
    expect(observer.isObserved(obj.items[0])).toBe(false);
    expect(observer.isObserved(obj.vobj)).toBe(true);

    const fn = jest.fn();
    observer.onPropChanged(obj, fn);
    obj.v = 6;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);

    fn.mockClear();
    obj.items[0].v = 22;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(0);
    obj.items = [{ v: "h" }];
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
    expect(observer.isObserved(obj.items)).toBe(true);
    expect(observer.isObserved(obj.items[0])).toBe(false);

    // 'true' excludes every nested
    obj = observer.make(getRaw(), { excludeNested: true });
    observer.onPropChanged(obj, fn);
    fn.mockClear();
    expect(observer.isObserved(obj)).toBe(true);
    expect(observer.isObserved(obj.items)).toBe(false);
    expect(observer.isObserved(obj.vobj)).toBe(false);
    expect(observer.isObserved(obj.items[0])).toBe(false);
    obj.vobj.v += 1;
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(0);
    obj.vobj = "nothing new";
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);

    // reassigned should be not observed
    fn.mockClear();
    obj.items = getRaw().items;
    expect(observer.isObserved(obj)).toBe(true);
    expect(observer.isObserved(obj.items)).toBe(false);
    expect(fn).toBeCalledTimes(1);
    // changing value
    fn.mockClear();
    obj.items[0] = {};
    await h.wait(1);
    expect(fn).toBeCalledTimes(0);
    // deleting
    delete obj.items;
    await h.wait(1);
    expect(fn).toBeCalledTimes(1);

    // same for Date object
    fn.mockClear();
    expect(observer.isObserved(obj.dateVal)).toBe(false);
    obj.dateVal = new Date();
    expect(observer.isObserved(obj.dateVal)).toBe(false);
    expect(fn).toBeCalledTimes(1);
    // changing value
    fn.mockClear();
    obj.dateVal.setHours(0, 23, 56);
    await h.wait(1);
    expect(fn).toBeCalledTimes(0);
    // deleting
    delete obj.dateVal;
    await h.wait(1);
    expect(fn).toBeCalledTimes(1);
  });
});
