import observer from "web-ui-pack/helpers/observer";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("helper.onObjectChanged", () => {
  test("simple object with props null,undefined,boolean,number,string,date,function", () => {
    const prevDateVal = new Date();
    const prevFunc = () => "hello";
    const obj = observer.make({
      nullVal: null,
      undefVal: undefined,
      boolVal: false,
      numberVal: 0,
      stringVal: "",
      dateVal: new Date(),
      func: prevFunc,
    });

    // check if make works fine if will do it several times
    const objAgain = observer.make(obj);
    expect(objAgain).toBe(obj);

    const fn = jest.fn();
    observer.onPropChanged(obj, fn);
    expect(fn).not.toBeCalled();

    obj.nullVal = "";
    expect(obj.nullVal).toBe("");
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: null, next: "", target: obj, prop: "nullVal" });

    obj.undefVal = null;
    expect(obj.undefVal).toBe(null);
    expect(fn).toBeCalledTimes(2);
    expect(fn).lastCalledWith({ prev: undefined, next: null, target: obj, prop: "undefVal" });

    obj.boolVal = true;
    expect(obj.boolVal).toBe(true);
    expect(fn).toBeCalledTimes(3);
    expect(fn).lastCalledWith({ prev: false, next: true, target: obj, prop: "boolVal" });

    obj.numberVal = 123;
    expect(obj.numberVal).toBe(123);
    expect(fn).toBeCalledTimes(4);
    expect(fn).lastCalledWith({ prev: 0, next: 123, target: obj, prop: "numberVal" });

    obj.stringVal = "str";
    expect(obj.stringVal).toBe("str");
    expect(fn).toBeCalledTimes(5);
    expect(fn).lastCalledWith({ prev: "", next: "str", target: obj, prop: "stringVal" });

    const dtVal = Date.now();
    const dt = new Date(dtVal);
    obj.dateVal = new Date(dt);
    expect(obj.dateVal.valueOf()).toBe(dt.valueOf());
    expect(fn).toBeCalledTimes(6);
    expect(fn).lastCalledWith({ prev: prevDateVal, next: dt, target: obj, prop: "dateVal" });

    expect(obj.func()).toBe("hello");
    const nextFunc = () => "good";
    obj.func = nextFunc;
    expect(obj.func()).toBe("good");
    expect(fn).toBeCalledTimes(7);
    expect(fn).lastCalledWith({ prev: prevFunc, next: nextFunc, target: obj, prop: "func" });

    fn.mockClear();
    const dt2 = new Date(dtVal);
    obj.dateVal = dt2;
    expect(obj.dateVal).toBe(dt2);
    expect(fn).not.toBeCalled(); // date is changed by dt.valueOf is the same

    obj.numberVal = 123;
    expect(obj.numberVal).toBe(123);
    expect(fn).not.toBeCalled(); // no changes - no events
    obj.stringVal = "str";
    expect(obj.stringVal).toBe("str");
    expect(fn).not.toBeCalled(); // no changes - no events
    obj.boolVal = true;
    expect(obj.boolVal).toBe(true);
    expect(fn).not.toBeCalled(); // no changes - no events

    obj.boolVal = false;
    expect(fn).toBeCalledTimes(1); // check if it's called again
    expect(fn).lastCalledWith({ prev: true, next: false, target: obj, prop: "boolVal" });
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
    observer.onPropChanged(arr, fn);

    // access via index
    arr[0] = "v";
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: 1, next: "v", target: arr, prop: "0" });

    // add new via index
    fn.mockClear();
    const arrLast = arr.length;
    arr[arrLast] = 999;
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev: undefined, next: 999, target: arr, prop: `${arrLast}` });
    // in this case arr length doesn't fire changes
    // expect(fn).lastCalledWith({ prev: 3, next: 4, target: arr, prop: "length" });

    // push single
    fn.mockClear();
    arr.push(12);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ prev: undefined, next: 12, target: arr, prop: "4" });

    // push several at once
    arr.length = 0;
    fn.mockClear();
    arr.push(55, 66);
    expect(fn).toBeCalledTimes(2);
    expect(fn).toBeCalledWith({ prev: undefined, next: 55, target: arr, prop: "0" });
    expect(fn).toBeCalledWith({ prev: undefined, next: 66, target: arr, prop: "1" });

    arr.length = 0;
    arr.push(1, 2, 3);
    fn.mockClear();
    // removing via splice
    arr.splice(0, 2);
    expect(fn).toBeCalled(); // splice produces delete, changing each index and changing length

    // adding via splice
    fn.mockClear();
    arr.splice(2, 0, 88);
    expect(fn).toBeCalledTimes(1); // splice produces append if nothing removed previously

    // replace via splice
    fn.mockClear();
    arr.splice(2, 1, 89);
    expect(fn).toBeCalled(); // splice produces delete, changing each index and changing length

    arr.length = 0;
    arr.push(1, 2, 3);
    fn.mockClear();
    // removing last via pop
    arr.pop();
    expect(fn).toBeCalledTimes(2);
    expect(fn).toBeCalledWith({ prev: 3, next: undefined, target: arr, prop: "2" });
    expect(fn).toBeCalledWith({ prev: 3, next: 2, target: arr, prop: "length" });

    arr.push(99, 100);
    fn.mockClear();
    // removing first via shift
    arr.shift(); // shift produces delete, changing each index and changing length
    expect(fn).toBeCalled();

    // add several via unshift (at first position)
    arr.length = 0;
    arr.push(1, 2, 3);
    fn.mockClear();
    arr.unshift(98, 99); // unshift produces changing each index and set at first
    expect(fn).toBeCalled();

    // changing via sort
    fn.mockClear();
    arr.sort(); // sort produces changing indexes so event-per-change index
    expect(fn).toBeCalled();

    // changing via reverse
    fn.mockClear();
    arr.reverse(); // reverse produces changing indexes so event-per-change index
    expect(fn).toBeCalled();

    // clearing with length: 0
    arr.length = 0;
    arr.push(1, 2, 3);
    fn.mockClear();
    arr.length = 1;
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith({ prev: 3, next: 1, target: arr, prop: "length" });
    arr.length = 0;
    expect(fn).lastCalledWith({ prev: 1, next: 0, target: arr, prop: "length" });
  });

  // todo check if date.setTime changes properly
  // todo check how Object.assign works
});
