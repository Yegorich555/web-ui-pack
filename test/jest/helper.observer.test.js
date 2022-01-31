import observer from "web-ui-pack/helpers/observer";

beforeEach(() => {
  jest.useFakeTimers();
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

  test("this context", () => {
    const v = {
      _testMe: 4,
      callMe() {
        return this._testMe;
      },
    };
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

  test("for date (valueof)", () => {
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
    const prevDateVal = new Date(Date.now() - 1);
    obj = observer.make({
      dateVal: prevDateVal,
    });
    observer.onPropChanged(obj, fn);
    observer.onChanged(obj, fn2);
    const dtVal = Date.now();
    const dt = new Date(dtVal);

    // date (valueof and ref) is changed
    obj.dateVal = new Date(dtVal);
    expect(obj.dateVal.valueOf()).toBe(dtVal);
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: prevDateVal, next: dt, target: obj, prop: "dateVal" });
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
    const obj = observer.make({ v: 1 });
    expect(observer.isObserved(obj)).toBeTruthy();

    // on empty callback
    observer.onPropChanged(obj);
    expect(() => (obj.v = 2)).not.toThrow();
    // on empty callback
    observer.onChanged(obj);
    jest.advanceTimersToNextTimer(); // onChanged has timeout
    expect(() => (obj.v = 3)).not.toThrow();

    expect(() => observer.onPropChanged({ v: 1 })).toThrow(); // throw because notObserved
    expect(() => observer.onChanged({ v: 1 })).toThrow(); // throw because notObserved
  });

  // todo check collission with changing props on several observed
  // todo check observer on Map/Set
});
