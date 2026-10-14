import { WUPFormElement, WUPTextControl, WUPDateControl, WUPSelectControl } from "web-ui-pack";
import { SubmitActions } from "web-ui-pack/formElement";
import * as h from "../testHelper";

/** @type WUPFormElement */
let el;
/** @type Array<WUPTextControl> */
const inputs = [];
/** @type HTMLButtonElement */
let btnSubmit;

beforeEach(() => {
  jest.useFakeTimers();
  let lastUniqueNum = 0;
  jest.spyOn(WUPTextControl, "$uniqueId", "get").mockImplementation(() => `txt${++lastUniqueNum}`);

  WUPFormElement.$use();
  WUPTextControl.$use();
  WUPDateControl.$use();
  WUPSelectControl.$use();

  el = document.body.appendChild(document.createElement("wup-form"));
  const inp1 = el.appendChild(document.createElement("wup-text"));
  inp1.$options.name = "email";
  const inp2 = el.appendChild(document.createElement("wup-text"));
  inp2.$options.name = "firstName";
  const inp3 = el.appendChild(document.createElement("wup-text"));
  inp3.$options.name = "";

  inputs.push(inp1, inp2, inp3);
  inputs.forEach((ctrl) => {
    h.setupLayout(ctrl, { h: 20, w: 100, x: 1, y: 1 });
  });

  btnSubmit = el.appendChild(document.createElement("button"));
  btnSubmit.type = "submit";
  jest.advanceTimersByTime(1);
});

afterEach(() => {
  inputs.length = 0;
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("formElement", () => {
  h.baseTestComponent(() => document.createElement("wup-form"), {
    attrs: {
      "w-autocomplete": { value: true },
      "w-autofocus": { value: true },
      "w-autostore": { value: true },
      "w-autosubmit": { value: 500 },
      disabled: { value: true, equalValue: "" },
      "w-disabled": { value: true, equalValue: "", skip: true },
      readonly: { value: true, equalValue: "" },
      "w-readonly": { value: true, equalValue: "", skip: true },
      "w-submitactions": { value: 1 },
    },
  });

  test("$initModel / $model", () => {
    inputs[0].$initValue = "some text";
    inputs[1].$initValue = "hello from 2";
    inputs[2].$initValue = "without name";

    el.$initModel = { email: "some@email.com" };
    expect(inputs[0].$initValue).toBe("some@email.com");
    expect(inputs[0].$value).toBe("some@email.com");
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-form role="form"><wup-text><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong>Email</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text><label for="txt2"><span><input placeholder=" " type="text" id="txt2" autocomplete="off"><strong>First Name</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text><label for="txt3"><span><input placeholder=" " type="text" id="txt3" autocomplete="off"><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><button type="submit"></button></wup-form>"`
    );

    expect(inputs[1].$initValue).toBe("hello from 2");
    expect(inputs[2].$initValue).toBe("without name");
    expect(el.$model).toEqual({ email: "some@email.com", firstName: "hello from 2" });

    const im = { firstName: "Nick" };
    el.$initModel = im;
    expect(inputs[0].$initValue).toBe("some@email.com");
    expect(inputs[1].$initValue).toBe("Nick");
    expect(el.$model).toEqual({ email: "some@email.com", firstName: "Nick" });
    el.$initModel = im; // just for coverage
    expect(el.$model).toEqual({ email: "some@email.com", firstName: "Nick" });

    el.$initModel = { email: "tas@google.com", firstName: "Tasy" };
    expect(inputs[0].$initValue).toBe("tas@google.com");
    expect(inputs[1].$initValue).toBe("Tasy");
    expect(el.$model).toEqual({ email: "tas@google.com", firstName: "Tasy" });

    // checking $model
    inputs[0].$value = "v@email.en";
    inputs[1].$value = "Mike";
    expect(el.$model).toEqual({ email: "v@email.en", firstName: "Mike" });
    expect(el.$initModel).toEqual({ email: "tas@google.com", firstName: "Tasy" });

    const m = { email: "true@mail.com" };
    el.$model = m;
    expect(el.$model).toEqual({ email: "true@mail.com", firstName: "Mike" });
    el.$model = m; // just for coverage
    expect(el.$model).toEqual({ email: "true@mail.com", firstName: "Mike" });

    el.$model = { email: "next@em.com", firstName: "Tisha", lastName: "Turunen" };
    expect(el.$model).toEqual({ email: "next@em.com", firstName: "Tisha", lastName: "Turunen" });
    expect(inputs[0].$value).toBe("next@em.com");
    expect(inputs[1].$value).toBe("Tisha");
    expect(inputs[2].$value).toBe("without name");

    el.$model = { email: "", firstName: undefined };
    expect(el.$model).toEqual({ email: "", firstName: undefined });
    expect(inputs[0].$value).toBe("");
    expect(inputs[1].$value).toBe(undefined);
    expect(inputs[2].$value).toBe("without name");

    // name applied after setModel
    inputs[0].$initValue = undefined;
    el.$initModel = { DOB: "some date", Address: "Walk st." };
    inputs[0].setAttribute("w-name", "DOB");
    jest.advanceTimersByTime(1);
    expect(inputs[0].$initValue).toBe("some date");

    inputs[0].setAttribute("w-name", "Address");
    jest.advanceTimersByTime(1);
    expect(inputs[0].$initValue).toBe("some date"); // stay same because prev. $initValue is defined

    // attr [w-initvalue] has priority over $initModel even if empty
    const ctrl = document.createElement("wup-text");
    ctrl.setAttribute("w-name", "DOB");
    ctrl.setAttribute("w-initvalue", "");
    el.appendChild(ctrl);
    jest.advanceTimersByTime(1);
    expect(ctrl.$initValue).toBe(undefined);
  });

  test("$initModel from controls", () => {
    inputs[0].$options.name = "user.email";
    inputs[0].$initValue = "some@text.com";
    inputs[1].$options.name = "user.firstName";
    inputs[1].$initValue = "Kate";
    expect(el.$initModel).toEqual({ user: { email: "some@text.com", firstName: "Kate" } });

    inputs[1].$initValue = "Vally";
    expect(el.$initModel).toEqual({ user: { email: "some@text.com", firstName: "Vally" } });

    el.$initModel = { user: { email: "me@google.com", firstName: "Greg", lastName: "Winter" }, isCustom: true };
    expect(inputs[0].$initValue).toBe("me@google.com");
    expect(inputs[1].$initValue).toBe("Greg");

    inputs[1].$initValue = "Kate";
    expect(el.$initModel).toEqual({
      user: { email: "me@google.com", firstName: "Kate", lastName: "Winter" },
      isCustom: true,
    });
  });

  describe("options applied to controls", () => {
    test("readOnly", () => {
      expect(inputs[0].$isReadOnly).toBe(false);
      el.setAttribute("readonly", "");
      jest.advanceTimersByTime(1);
      expect(inputs[0].$isReadOnly).toBe(true);
      expect(inputs[0].$refInput.readOnly).toBe(true);
      expect(inputs[1].$refInput.readOnly).toBe(true);
      expect(inputs[2].$refInput.readOnly).toBe(true);

      el.removeAttribute("readonly");
      jest.advanceTimersByTime(1);
      expect(inputs[0].$isReadOnly).toBe(false);
      expect(inputs[0].$refInput.readOnly).toBe(false);
      expect(inputs[1].$refInput.readOnly).toBe(false);
      expect(inputs[2].$refInput.readOnly).toBe(false);

      el.$options.readOnly = true;
      jest.advanceTimersByTime(1);
      expect(inputs[0].$isReadOnly).toBe(true);
      expect(inputs[0].$refInput.readOnly).toBe(true);
      expect(inputs[1].$refInput.readOnly).toBe(true);

      el.$options.readOnly = false;
      jest.advanceTimersByTime(1);
      expect(inputs[0].$isReadOnly).toBe(false);
      expect(inputs[0].$refInput.readOnly).toBe(false);
      expect(inputs[1].$refInput.readOnly).toBe(false);
    });

    test("disabled", () => {
      expect(inputs[0].$isDisabled).toBe(false);
      el.setAttribute("disabled", "");
      jest.advanceTimersByTime(1);
      expect(inputs[0].$isDisabled).toBe(true);
      expect(inputs[0].$refInput.disabled).toBe(true);
      expect(inputs[1].$refInput.disabled).toBe(true);
      expect(inputs[2].$refInput.disabled).toBe(true);

      el.removeAttribute("disabled");
      jest.advanceTimersByTime(1);
      expect(inputs[0].$isDisabled).toBe(false);
      expect(inputs[0].$refInput.disabled).toBe(false);
      expect(inputs[1].$refInput.disabled).toBe(false);
      expect(inputs[2].$refInput.disabled).toBe(false);

      el.$options.disabled = true;
      jest.advanceTimersByTime(1);
      expect(inputs[0].$isDisabled).toBe(true);
      expect(inputs[0].$refInput.disabled).toBe(true);
      expect(inputs[1].$refInput.disabled).toBe(true);

      el.$options.disabled = false;
      jest.advanceTimersByTime(1);
      expect(inputs[0].$isDisabled).toBe(false);
      expect(inputs[0].$refInput.disabled).toBe(false);
      expect(inputs[1].$refInput.disabled).toBe(false);
    });

    test("autoComplete", () => {
      expect(inputs[0].$autoComplete).toBe(false);
      el.setAttribute("w-autocomplete", "");
      jest.advanceTimersByTime(1);
      expect(inputs[0].$autoComplete).toBe("email");
      expect(inputs[0].$refInput.autocomplete).toBe("email");
      expect(inputs[1].$refInput.autocomplete).toBe("firstName");
      expect(inputs[2].$refInput.autocomplete).toBe("off");

      el.removeAttribute("w-autocomplete");
      jest.advanceTimersByTime(1);
      expect(inputs[0].$autoComplete).toBe(false);
      expect(inputs[0].$refInput.autocomplete).toBe("off");
      expect(inputs[1].$refInput.autocomplete).toBe("off");
      expect(inputs[2].$refInput.autocomplete).toBe("off");

      el.$options.autoComplete = true;
      jest.advanceTimersByTime(1);
      expect(inputs[0].$autoComplete).toBe("email");
      expect(inputs[0].$refInput.autocomplete).toBe("email");
      expect(inputs[1].$refInput.autocomplete).toBe("firstName");
      expect(inputs[2].$refInput.autocomplete).toBe("off");

      el.$options.autoComplete = false;
      jest.advanceTimersByTime(1);
      expect(inputs[0].$autoComplete).toBe(false);
      expect(inputs[0].$refInput.autocomplete).toBe("off");
      expect(inputs[1].$refInput.autocomplete).toBe("off");
      expect(inputs[2].$refInput.autocomplete).toBe("off");
    });
  });

  test("detached control", async () => {
    inputs[2].$value = "Something new";
    inputs[2].$options.name = "Third";
    inputs[2].$options.validations = { _alwaysInvalid: () => "Always invalid message" };
    expect(el.$isChanged).toBe(true);
    expect(el.$isValid).toBe(false);

    inputs[2].$options.name = undefined;
    expect(el.$isChanged).toBe(false);
    expect(el.$isValid).toBe(true);

    const $onSubmit = jest.fn();
    el.$onSubmit = $onSubmit;
    btnSubmit.click();
    await h.wait(1);
    expect($onSubmit).toBeCalledTimes(1);

    el.$options.readOnly = true;
    jest.advanceTimersByTime(1);
    expect(inputs[2].$refInput.readOnly).toBe(true);

    el.$options.disabled = true;
    jest.advanceTimersByTime(1);
    expect(inputs[2].$refInput.disabled).toBe(true);

    el.$options.autoComplete = true;
    jest.advanceTimersByTime(1);
    expect(inputs[2].$refInput.autocomplete).toBe("off");
  });

  test("static $tryConnect()", () => {
    const form2 = document.body.appendChild(document.createElement("wup-form"));
    const input2 = form2.appendChild(document.createElement("input"));
    const inputOutside = document.body.appendChild(document.createElement("input"));

    expect(el.$controls.length).toBe(3);
    expect(WUPFormElement.$tryConnect(inputs[0])).toBe(el);
    expect(WUPFormElement.$tryConnect(inputs[1])).toBe(el);

    expect(WUPFormElement.$tryConnect(input2)).toBe(form2);
    expect(WUPFormElement.$tryConnect(inputOutside)).toBeFalsy();
  });

  test("onChange event", async () => {
    const changeEv = jest.fn();
    el.addEventListener("$change", changeEv);
    expect(el.$isChanged).toBe(false);

    inputs[0].$value = "some@email.com";
    await h.wait();
    expect(changeEv).toBeCalledTimes(1);
    expect(changeEv.mock.calls[0][0].target).toBe(inputs[0]); // because it bubbles from control
    expect(el.$isChanged).toBe(true);

    changeEv.mockClear();
    inputs[1].$value = "Lacy";
    inputs[0].$value = "LacyNewton@email.com";
    await h.wait();
    expect(changeEv).toBeCalledTimes(2);
    expect(changeEv.mock.calls[0][0].target).toBe(inputs[1]); // because it bubbles from control
    expect(el.$isChanged).toBe(true);

    // callback $onChange
    changeEv.mockClear();
    el.$onChange = jest.fn();
    inputs[0].$value = "a@email.com";
    await h.wait();
    expect(el.$onChange).toBeCalledTimes(1);
    expect(el.$onChange.mock.calls[0][0].target).toBe(inputs[0]);
    expect(el.$onChange.mock.instances[0]).toBe(el);
    expect(changeEv).toBeCalledTimes(1);

    // stopPropagation on control prevents form.$onChange
    el.$onChange.mockClear();
    changeEv.mockClear();
    inputs[0].$onChange = (e) => e.stopPropagation();
    inputs[0].$value = "b@email.com";
    await h.wait();
    expect(el.$onChange).not.toBeCalled();
    expect(changeEv).not.toBeCalled();
  });

  describe("submit", () => {
    const $willSubmitEv = jest.fn();
    const $submitEv = jest.fn();
    const $onSubmit = jest.fn();
    const $submitEvEnd = jest.fn();
    // native events
    const submitEv = jest.fn();
    const onsubmit = jest.fn();

    test("firing events", async () => {
      el.addEventListener("$willSubmit", $willSubmitEv);
      el.addEventListener("$submit", $submitEv);
      el.addEventListener("$submitEnd", $submitEvEnd);
      el.$onSubmit = $onSubmit;
      // native events
      el.addEventListener("submit", submitEv);
      el.onsubmit = onsubmit;

      btnSubmit.click();
      await h.wait(1);
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($willSubmitEv.mock.calls[0][0].detail.relatedForm).toBe(el);
      expect($willSubmitEv.mock.calls[0][0].detail.relatedEvent.type).toBe("click");
      expect($willSubmitEv.mock.calls[0][0].detail.submitter).toBe(btnSubmit);

      expect($submitEv).toBeCalledTimes(1);
      expect($submitEv.mock.calls[0][0].detail.model).toEqual({ email: undefined, firstName: undefined });
      expect($submitEv.mock.calls[0][0].detail.relatedForm).toBe(el);
      expect($submitEv.mock.calls[0][0].detail.relatedEvent.type).toBe("click");
      expect($submitEv.mock.calls[0][0].detail.submitter).toBe(btnSubmit);

      expect($onSubmit).toBeCalledTimes(1);
      expect($onSubmit.mock.calls[0][0].detail.model).toEqual({ email: undefined, firstName: undefined });
      expect($onSubmit.mock.calls[0][0].detail.relatedForm).toBe(el);
      expect($onSubmit.mock.calls[0][0].detail.relatedEvent.type).toBe("click");
      expect($onSubmit.mock.calls[0][0].detail.submitter).toBe(btnSubmit);

      expect(onsubmit).toBeCalledTimes(1);
      expect(onsubmit.mock.calls[0][0].submitter).toBe(btnSubmit);
      expect(submitEv).toBeCalledTimes(1);
      expect(submitEv.mock.calls[0][0].submitter).toBe(btnSubmit);

      await h.wait();
      expect($submitEvEnd).toBeCalledTimes(1);
      expect($submitEvEnd.mock.lastCall[0].detail).toMatchInlineSnapshot(`
        {
          "success": true,
        }
      `);

      // when request failed
      jest.clearAllMocks();
      $onSubmit.mockImplementationOnce(() => Promise.reject(new Error("test reject")));
      btnSubmit.click();
      await h.wait();
      expect($submitEvEnd).toBeCalledTimes(1);
      expect($submitEvEnd.mock.lastCall[0].detail).toMatchInlineSnapshot(`
        {
          "success": false,
        }
      `);

      jest.clearAllMocks();
      // click on btn without type 'submit' - no action
      const btnNoSubmit = el.appendChild(document.createElement("button"));
      btnNoSubmit.type = "button";
      jest.clearAllMocks();
      expect($willSubmitEv).toBeCalledTimes(0);
      btnNoSubmit.click();
      await h.wait(1);
      expect($willSubmitEv).toBeCalledTimes(0);

      // try again on EnterKey
      jest.clearAllMocks();
      expect($willSubmitEv).toBeCalledTimes(0);
      inputs[0].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      await h.wait(1);
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($willSubmitEv.mock.calls[0][0].detail.relatedForm).toBe(el);
      expect($willSubmitEv.mock.calls[0][0].detail.relatedEvent.type).toBe("keydown");
      expect($willSubmitEv.mock.calls[0][0].detail.submitter).toBe(inputs[0]);

      expect($submitEv).toBeCalledTimes(1);
      expect($submitEv.mock.calls[0][0].detail.model).toEqual({ email: undefined, firstName: undefined });
      expect($submitEv.mock.calls[0][0].detail.relatedForm).toBe(el);
      expect($submitEv.mock.calls[0][0].detail.relatedEvent.type).toBe("keydown");
      expect($submitEv.mock.calls[0][0].detail.submitter).toBe(inputs[0]);

      expect($onSubmit).toBeCalledTimes(1);
      expect($onSubmit.mock.calls[0][0].detail.model).toEqual({ email: undefined, firstName: undefined });
      expect($onSubmit.mock.calls[0][0].detail.relatedForm).toBe(el);
      expect($onSubmit.mock.calls[0][0].detail.relatedEvent.type).toBe("keydown");
      expect($onSubmit.mock.calls[0][0].detail.submitter).toBe(inputs[0]);

      expect(onsubmit).toBeCalledTimes(1);
      expect(onsubmit.mock.calls[0][0].submitter).toBe(inputs[0]);
      expect(submitEv).toBeCalledTimes(1);
      expect(submitEv.mock.calls[0][0].submitter).toBe(inputs[0]);

      // just for coverage - when SubmitEvent protype doesn't exist (in old browsers)
      jest.clearAllMocks();
      const isSE = !!window.SubmitEvent;
      if (isSE) {
        jest.spyOn(window, "SubmitEvent").mockImplementationOnce(Event);
      } else {
        window.SubmitEvent = Event;
      }
      el.$submit();
      await h.wait();
      expect($willSubmitEv).toBeCalledTimes(1);
      expect(submitEv).toBeCalledTimes(1);
      expect(onsubmit).toBeCalledTimes(1);
      !isSE && delete window.SubmitEvent;

      // try again when submitter is not HTMLElement
      jest.clearAllMocks();
      expect($willSubmitEv).toBeCalledTimes(0);
      const svg = el.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
      svg.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      await h.wait(1);
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($willSubmitEv.mock.calls[0][0].detail.submitter).toBe(el);

      // try again when submit called manually
      jest.clearAllMocks();
      expect(() => el.$submit()).not.toThrow();
      await h.wait(10);
      expect($willSubmitEv).toBeCalledTimes(1);
      expect(submitEv).toBeCalledTimes(1);
      expect(onsubmit).toBeCalledTimes(1);

      // whole call-chain
      el = document.body.appendChild(document.createElement(el.tagName));
      const arrChain = [];
      const eventResult = { isPrevented: false, isTargetDefined: false };
      // check default scenario
      const onSubmitOriginal = (e) => {
        arrChain.push("callback");
        e.preventDefault();
        eventResult.isPrevented = e.defaultPrevented;
        eventResult.isTargetDefined = !!e.target;
      };
      el.$onSubmit = onSubmitOriginal;
      el.addEventListener("$submit", () => arrChain.push("event"), { once: true });
      // el.addEventListener("$onSubmitEnd", () => arrChain.push("eventEnd"), { once: true });
      el.addEventListener("$submit", () => arrChain.push("event-capture"), { once: true, capture: true });
      el.addEventListener("$submit", () => arrChain.push("event-capture2"), { once: true, capture: true });
      el.$submit();
      await h.wait();
      expect(arrChain).toStrictEqual([
        "event-capture", //
        "event-capture2",
        "callback",
        "event",
      ]);
      expect(eventResult).toStrictEqual({ isPrevented: true, isTargetDefined: true });
      expect(el.$onSubmit).toBe(onSubmitOriginal);
    });

    test("notify on submit result", async () => {
      el.addEventListener("$submitEnd", $submitEvEnd);
      const spyNotify = jest.spyOn(el, "$showNotify");
      const getNotify = () => document.body.querySelector("wup-notify");
      const submit = async (onSubmit, onEvent) => {
        jest.clearAllMocks();
        document.body.querySelectorAll("wup-notify").forEach((n) => n.remove());
        el.$onSubmit = onSubmit;
        onEvent && el.addEventListener("$submit", onEvent, { once: true });
        btnSubmit.click();
        await h.wait();
      };

      // success with message from $onSubmit
      await submit(() => Promise.resolve({ notifyMessage: "Saved" }));
      expect(spyNotify).toBeCalledTimes(1);
      expect(spyNotify).lastCalledWith({ notifyMessage: "Saved" }, false);
      expect(getNotify()).toBe(spyNotify.mock.results[0].value);
      expect(getNotify().textContent).toBe("Saved");
      expect(getNotify().$options.type).toBe("success");
      expect(getNotify().$options.placement).toBe("bottom-right");
      expect($submitEvEnd.mock.lastCall[0].detail.success).toBe(true);

      // fail with message from $onSubmit
      await submit(() => Promise.reject({ notifyMessage: "Oops" })); // eslint-disable-line prefer-promise-reject-errors
      expect(spyNotify).toBeCalledTimes(1);
      expect(spyNotify).lastCalledWith({ notifyMessage: "Oops" }, true);
      expect(getNotify().textContent).toBe("Oops");
      expect(getNotify().$options.type).toBe("error");
      expect($submitEvEnd.mock.lastCall[0].detail.success).toBe(false);

      // notifyMessage: true => default messages
      await submit(() => Promise.resolve({ notifyMessage: true }));
      expect(getNotify().textContent).toBe("Successful");
      expect(getNotify().$options.type).toBe("success");
      await submit(() => Promise.reject({ notifyMessage: true })); // eslint-disable-line prefer-promise-reject-errors
      expect(getNotify().textContent).toBe("Failed");
      expect(getNotify().$options.type).toBe("error");

      // custom type
      await submit(() => Promise.resolve({ notifyMessage: "Saved partially", type: "warning" }));
      expect(getNotify().$options.type).toBe("warning");
      await submit(() => Promise.reject({ notifyMessage: "Server is busy", type: "info" })); // eslint-disable-line prefer-promise-reject-errors
      expect(getNotify().$options.type).toBe("info");

      // message from e.detail.waitFor
      await submit(undefined, (e) => (e.detail.waitFor = Promise.resolve({ notifyMessage: "From waitFor" })));
      expect(spyNotify).lastCalledWith({ notifyMessage: "From waitFor" }, false);
      expect(getNotify().textContent).toBe("From waitFor");
      expect($submitEvEnd.mock.lastCall[0].detail.success).toBe(true);
      // eslint-disable-next-line prefer-promise-reject-errors
      await submit(undefined, (e) => (e.detail.waitFor = Promise.reject({ notifyMessage: "Fail from waitFor" })));
      expect(spyNotify).lastCalledWith({ notifyMessage: "Fail from waitFor" }, true);
      expect(getNotify().textContent).toBe("Fail from waitFor");
      expect($submitEvEnd.mock.lastCall[0].detail.success).toBe(false);

      // message from $onSubmit has priority over waitFor
      await submit(
        () => Promise.resolve({ notifyMessage: "From callback" }),
        (e) => (e.detail.waitFor = Promise.resolve({ notifyMessage: "From waitFor" }))
      );
      expect(spyNotify).toBeCalledTimes(1);
      expect(getNotify().textContent).toBe("From callback");

      // no message => no notify
      for (const v of [undefined, null, false, "", { notifyMessage: "" }, { notifyMessage: null }, { notifyMessage: false }]) {
        await submit(() => Promise.resolve(v));
        expect(spyNotify).not.toBeCalled();
        expect(getNotify()).toBeNull();
        expect($submitEvEnd.mock.lastCall[0].detail.success).toBe(true);

        await submit(() => Promise.reject(v));
        expect(spyNotify).not.toBeCalled();
        expect(getNotify()).toBeNull();
        expect($submitEvEnd.mock.lastCall[0].detail.success).toBe(false);
      }
      await submit(() => {}); // sync callback
      expect(spyNotify).not.toBeCalled();
      expect($submitEvEnd.mock.lastCall[0].detail.success).toBe(true);
      await submit(() => Promise.reject(new Error("test reject")));
      expect(spyNotify).not.toBeCalled();
      expect($submitEvEnd.mock.lastCall[0].detail.success).toBe(false);

      // $showNotify can be overridden
      spyNotify.mockImplementation(() => null);
      await submit(() => Promise.resolve({ notifyMessage: "Saved" }));
      expect(spyNotify).toBeCalledTimes(1);
      expect(getNotify()).toBeNull();
    });

    test("prevent submit", async () => {
      el.addEventListener("$submit", $submitEv);
      const prevFn = (e) => e.preventDefault();

      // checking preventDefault for $willSubmit
      jest.clearAllMocks();
      el.addEventListener("$willSubmit", prevFn);
      btnSubmit.click();
      await h.wait(1);
      expect($submitEv).toBeCalledTimes(0);

      jest.clearAllMocks();
      el.removeEventListener("$willSubmit", prevFn);
      btnSubmit.click();
      await h.wait(1);
      expect($submitEv).toBeCalledTimes(1);

      // checking preventDefault on btnSubmit
      jest.clearAllMocks();
      btnSubmit.addEventListener("click", prevFn);
      btnSubmit.click();
      await h.wait(1);
      expect($submitEv).toBeCalledTimes(0);
      btnSubmit.removeEventListener("click", prevFn);

      // Enter + ctrl, shift
      jest.clearAllMocks();
      inputs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await h.wait(1);
      expect($submitEv).toBeCalledTimes(1);

      jest.clearAllMocks();
      inputs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }));
      inputs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
      await h.wait(1);
      expect($submitEv).toBeCalledTimes(0);

      inputs[0].addEventListener("keydown", (e) => (e.submitPrevented = true), { once: true });
      inputs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
      await h.wait(1);
      expect($submitEv).toBeCalledTimes(0);

      // prevent $submitEnd
      jest.clearAllMocks();
      const onSubmit = jest.fn();
      const onSubmitEnd = jest.fn();
      el.$onSubmit = onSubmit;
      el.$onSubmitEnd = onSubmitEnd;
      btnSubmit.click();
      await h.wait();
      expect(onSubmit).toBeCalledTimes(1);
      expect(onSubmitEnd).toBeCalledTimes(1);
      // when prevented
      jest.clearAllMocks();
      onSubmit.mockImplementationOnce((e) => {
        e.preventDefault();
        return Promise.resolve(true);
      });
      btnSubmit.click();
      await h.wait();
      expect(onSubmit).toBeCalledTimes(1);
      expect(onSubmitEnd).toBeCalledTimes(0);
    });

    test("collected model", async () => {
      el.addEventListener("$submit", $submitEv);

      async function expectModel(m) {
        jest.clearAllMocks();
        await h.wait(1);
        btnSubmit.click();
        await h.wait(1);
        expect($submitEv.mock.calls[0][0].detail.model).toEqual(m);
      }
      await expectModel({ email: undefined, firstName: undefined });

      inputs[0].$value = "some@mail.com";
      await expectModel({ email: "some@mail.com", firstName: undefined });

      inputs[1].$value = "Mike";
      inputs[2].$value = "Vazovski";
      await expectModel({ email: "some@mail.com", firstName: "Mike" });

      inputs[2].$options.name = "lastName";
      await expectModel({ email: "some@mail.com", firstName: "Mike", lastName: "Vazovski" });

      inputs[1].$options.name = "user.profile.firstName";
      inputs[2].$options.name = "user.profile.lastName";
      await expectModel({ email: "some@mail.com", user: { profile: { firstName: "Mike", lastName: "Vazovski" } } });

      // test when input invalid & disabled
      inputs[0].$options.disabled = true;
      expect(inputs[0].$isValid).toBe(true);
      await expectModel({ user: { profile: { firstName: "Mike", lastName: "Vazovski" } } }); // model gathered without "email" control because it's disabled

      jest.clearAllMocks();
      inputs[0].$options.validations = { $alwaysInvalid: () => "Always error" };
      inputs[0].$validate();
      await h.wait(10);
      expect(inputs[0].$isValid).toBe(false);
      expect(inputs[0].canShowError).toBe(false);
      await expectModel({ user: { profile: { firstName: "Mike", lastName: "Vazovski" } } }); // model gathered without "email" even if disabled control is invalid
    });

    test("pending on submit", async () => {
      el.$isPending = true;
      await h.wait();
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role="form" aria-busy="true" readonly=""><wup-text busy=""><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off" readonly=""><strong>Email</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text busy=""><label for="txt2"><span><input placeholder=" " type="text" id="txt2" autocomplete="off" readonly=""><strong>First Name</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text busy=""><label for="txt3"><span><input placeholder=" " type="text" id="txt3" autocomplete="off" readonly=""><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><button type="submit" aria-busy="true" busy=""></button></wup-form>"`
      );

      el.changePending(true); // just for coverage
      await h.wait();
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role="form" aria-busy="true" readonly=""><wup-text busy=""><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off" readonly=""><strong>Email</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text busy=""><label for="txt2"><span><input placeholder=" " type="text" id="txt2" autocomplete="off" readonly=""><strong>First Name</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text busy=""><label for="txt3"><span><input placeholder=" " type="text" id="txt3" autocomplete="off" readonly=""><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><button type="submit" aria-busy="true" busy=""></button></wup-form>"`
      );

      el.$isPending = false;
      await h.wait();
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role="form"><wup-text><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong>Email</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text><label for="txt2"><span><input placeholder=" " type="text" id="txt2" autocomplete="off"><strong>First Name</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text><label for="txt3"><span><input placeholder=" " type="text" id="txt3" autocomplete="off"><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><button type="submit"></button></wup-form>"`
      );
      el.$isPending = false; // just for coverage

      const submitFn = (e) => (e.detail.waitFor = new Promise((res) => setTimeout(() => res("true"), 500)));
      el.addEventListener("$submit", submitFn);
      btnSubmit.click();
      await h.wait(1);
      expect(el.$isPending).toBe(true);
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role="form" aria-busy="true"><wup-text busy=""><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong>Email</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text busy=""><label for="txt2"><span><input placeholder=" " type="text" id="txt2" autocomplete="off"><strong>First Name</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text busy=""><label for="txt3"><span><input placeholder=" " type="text" id="txt3" autocomplete="off"><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><button type="submit" aria-busy="true" busy=""></button></wup-form>"`
      );
      await h.wait();
      expect(el.$isPending).toBe(false);
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role="form"><wup-text><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong>Email</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text><label for="txt2"><span><input placeholder=" " type="text" id="txt2" autocomplete="off"><strong>First Name</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text><label for="txt3"><span><input placeholder=" " type="text" id="txt3" autocomplete="off"><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><button type="submit"></button></wup-form>"`
      );
      el.removeEventListener("$submit", submitFn);

      // check again with $onSubmit
      el.$onSubmit = () => new Promise((res) => setTimeout(() => res("true"), 500));
      btnSubmit.click();
      await h.wait(1);
      expect(el.$isPending).toBe(true);
      await h.wait();
      expect(el.$isPending).toBe(false);
    });

    test("validation on submit", async () => {
      inputs[0].$options.validations = { required: true };
      inputs[1].$options.validations = { required: true };
      inputs[2].$options.validations = { required: true };
      await h.wait(1);
      el.addEventListener("$willSubmit", $willSubmitEv);
      el.addEventListener("$submit", $submitEv);

      btnSubmit.click();
      await h.wait();
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($submitEv).not.toBeCalled();
      expect(document.activeElement).toBe(inputs[0].$refInput); // focus on firstInvalid
      expect(el.$isValid).toBe(false);
      expect(el.$isChanged).toBe(false);

      jest.clearAllMocks();
      inputs[0].$value = "test@google.com";
      btnSubmit.click();
      await h.wait();
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($submitEv).not.toBeCalled();
      expect(document.activeElement).toBe(inputs[1].$refInput); // focus on firstInvalid
      expect(el.$isValid).toBe(false);
      expect(el.$isChanged).toBe(true);

      jest.clearAllMocks();
      inputs[1].$value = "Mike";
      btnSubmit.click();
      await h.wait();
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($submitEv).not.toBeCalled();
      expect(document.activeElement).toBe(inputs[2].$refInput); // focus on firstInvalid
      expect(el.$isValid).toBe(false);

      await h.wait();
      jest.clearAllMocks();
      inputs[2].$value = "Newton";
      btnSubmit.click();
      await h.wait(1);
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($submitEv).toBeCalledTimes(1);
      expect(el.$isValid).toBe(true);
    });

    describe("submitActions", () => {
      test("goToError", async () => {
        inputs.forEach((inp) => (inp.$options.validations = { required: true }));
        inputs[0].$value = "Kaly";

        el.$options.submitActions = SubmitActions.goToError;
        btnSubmit.click();
        await h.wait();
        expect(document.activeElement).toBe(inputs[1].$refInput);
        document.activeElement.blur();

        el.$options.submitActions = SubmitActions.none;
        btnSubmit.click();
        await h.wait();
        expect(document.activeElement).not.toBe(inputs[1].$refInput);
      });

      test("validateUntilFirst", async () => {
        inputs.forEach((inp) => (inp.$options.validations = { required: true }));
        inputs[0].$value = "kaly@mail.com";

        el.$options.submitActions = SubmitActions.validateUntilFirst;
        btnSubmit.click();
        await h.wait();
        expect(inputs.map((c) => !!c.$refError)).toEqual([false, true, false]);

        el.$options.submitActions = SubmitActions.none;
        btnSubmit.click();
        await h.wait();
        expect(inputs.map((c) => !!c.$refError)).toEqual([false, true, true]);
      });

      test("collectChanged", async () => {
        let m = null;
        el.addEventListener("$submit", (e) => (m = e.detail.model));

        el.$options.submitActions = SubmitActions.collectChanged;
        btnSubmit.click();
        await h.wait(1);
        expect(m).toEqual({}); // empty object
        await h.wait();

        inputs[0].$value = "kaly@mail.com";
        inputs[1].$value = "Kaly";
        inputs[2].$options.name = "lastName";
        btnSubmit.click();
        await h.wait(1);
        expect(m).toEqual({ email: "kaly@mail.com", firstName: "Kaly" });
        await h.wait();

        el.$options.submitActions = SubmitActions.none;
        btnSubmit.click();
        await h.wait(1);
        expect(m).toEqual({ email: "kaly@mail.com", firstName: "Kaly", lastName: undefined });
        await h.wait();
      });

      test("reset", async () => {
        await h.userTypeText(inputs[0].$refInput, "kaly@");
        await h.userTypeText(inputs[1].$refInput, "Ka");
        expect(inputs[0].$initValue).not.toBe("kaly@");
        expect(inputs[1].$initValue).not.toBe("Ka");
        expect(inputs[0].$isDirty).toBe(true);
        expect(inputs[1].$isDirty).toBe(true);

        el.$options.submitActions = SubmitActions.reset;
        btnSubmit.click();
        await h.wait();
        await h.wait(1);

        expect(inputs[0].$initValue).toBe("kaly@");
        expect(inputs[0].$isDirty).toBe(false);
        expect(inputs[0].$isChanged).toBe(false);

        expect(inputs[1].$initValue).toBe("Ka");
        expect(inputs[1].$isDirty).toBe(false);
        expect(inputs[1].$isChanged).toBe(false);

        // again without reset
        await h.userTypeText(inputs[0].$refInput, "kaly@mail");
        await h.userTypeText(inputs[1].$refInput, "Kaly");
        el.$options.submitActions = SubmitActions.none;
        btnSubmit.click();
        await h.wait();
        await h.wait(1);

        expect(inputs[0].$initValue).toBe("kaly@");
        expect(inputs[0].$isDirty).toBe(true);
        expect(inputs[0].$isChanged).toBe(true);

        expect(inputs[1].$initValue).toBe("Ka");
        expect(inputs[1].$isDirty).toBe(true);
        expect(inputs[1].$isChanged).toBe(true);
      });

      test("lockOnPending", async () => {
        const onSubmit = jest.fn().mockImplementation(() => new Promise((res) => setTimeout(res, 300)));
        el.$onSubmit = onSubmit;
        el.$options.submitActions = SubmitActions.lockOnPending;
        btnSubmit.focus();
        btnSubmit.click();
        await h.wait(50);
        expect(el.$isPending).toBe(true);
        expect(el.$options.disabled).toBe(false); // otherwise focus can be missed
        expect(document.activeElement).toBe(btnSubmit);
        expect(el.outerHTML).toMatchInlineSnapshot(
          `"<wup-form role="form" aria-busy="true" readonly=""><wup-text busy=""><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off" readonly=""><strong>Email</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text busy=""><label for="txt2"><span><input placeholder=" " type="text" id="txt2" autocomplete="off" readonly=""><strong>First Name</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text busy=""><label for="txt3"><span><input placeholder=" " type="text" id="txt3" autocomplete="off" readonly=""><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><button type="submit" aria-busy="true" busy=""></button></wup-form>"`
        );
        await h.wait();
        expect(el.$isPending).toBe(false);
        expect(onSubmit).toBeCalledTimes(1);

        // again + 2 clicks
        jest.clearAllMocks();
        btnSubmit.click();
        await h.wait(50);
        btnSubmit.click(); // 2nd time must be prevented
        await h.wait(50);
        expect(el.$isPending).toBe(true);
        expect(onSubmit).toBeCalledTimes(1);
        await h.wait();
        expect(el.$isPending).toBe(false);

        // again + 2 Enter-s
        jest.clearAllMocks();
        await h.userPressKey(el, { key: "Enter" });
        await h.wait(50);
        await h.userPressKey(el, { key: "Enter" });
        await h.wait(50);
        expect(el.$isPending).toBe(true);
        expect(onSubmit).toBeCalledTimes(1);
        await h.wait();
        expect(el.$isPending).toBe(false);

        el.$options.submitActions = SubmitActions.none;
        btnSubmit.click();
        await h.wait(50);
        expect(el.$isPending).toBe(true);
        expect(el.$options.disabled).toBeFalsy();
        expect(el.outerHTML).toMatchInlineSnapshot(
          `"<wup-form role="form"><wup-text><label for="txt1"><span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong>Email</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text><label for="txt2"><span><input placeholder=" " type="text" id="txt2" autocomplete="off"><strong>First Name</strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><wup-text><label for="txt3"><span><input placeholder=" " type="text" id="txt3" autocomplete="off"><strong></strong></span><button wup-icon="" clear="" tabindex="-1" aria-hidden="true" type="button"></button></label></wup-text><button type="submit" aria-busy="true" busy=""></button></wup-form>"`
        );
        await h.wait();
      });
    });

    test("option 'autoStore'", async () => {
      const sSet = jest.spyOn(Storage.prototype, "setItem");
      const sRem = jest.spyOn(Storage.prototype, "removeItem");
      // storageKey depends on options
      expect(el.storageKey).toMatchInlineSnapshot(`"/?email,firstName"`);
      el.$options.autoStore = "customKey";
      expect(el.storageKey).toBe("customKey");

      expect(el.storageGet()).toBe(null); // because nothing stored
      expect(el.storageSave()).toBe(null); // because nothing changed
      // save to storage on changes
      inputs[0].$value = "Mike@gmail.com";
      await h.wait(1001);
      expect(sSet).toBeCalledTimes(1);
      expect(sSet).lastCalledWith("customKey", '{"email":"Mike@gmail.com"}');

      jest.clearAllMocks();
      inputs[0].$value = inputs[0].$initValue;
      await h.wait(1001);
      expect(sSet).toBeCalledTimes(0);
      expect(sRem).toBeCalledTimes(1); // because no changes
      expect(sRem).lastCalledWith("customKey");
      expect(el.storageSave(null)).toBe(null); // because nothing changed
      expect(sRem).toBeCalledTimes(2); // because removing is called with Null

      const reinit = async () => {
        jest.clearAllMocks();
        document.body.innerHTML = "";
        inputs.length = 0;
        el = document.body.appendChild(document.createElement(el.tagName));
        el.$options.autoStore = "customKey";

        const inp1 = el.appendChild(document.createElement("wup-text"));
        inp1.$options.name = "email";
        const inp2 = el.appendChild(document.createElement("wup-text"));
        inp2.$options.name = "prof.firstName";
        const inp3 = el.appendChild(document.createElement("wup-text"));
        inp3.$options.name = "";
        const inp4 = el.appendChild(document.createElement("wup-date"));
        inp4.$options.name = "dt";
        const inp5 = el.appendChild(document.createElement("wup-select"));
        inp5.$options.name = "sel";
        inp5.$options.multiple = true;
        inp5.$options.items = [
          { text: "Item 1", value: 1 },
          { text: "Item 2", value: 2 },
          { text: "Item 3", value: 3 },
        ];
        const inp6 = el.appendChild(document.createElement("wup-select"));
        inp6.$options.name = "sel-complex";
        inp6.$options.items = [
          { text: "Item 1", value: { id: 1 } },
          { text: "Item 2", value: { id: 2 } },
          { text: "Item 3", value: { id: 3 } },
        ];
        inputs.push(inp1, inp2, inp3, inp4, inp5, inp6);

        btnSubmit = el.appendChild(document.createElement("button"));
        btnSubmit.type = "submit";
        await h.wait();
      };

      await reinit();
      inputs[0].$value = "Mike@gmail.com";
      inputs[1].$value = "MikeGrane";
      inputs[2].$value = "WithoutName";
      inputs[3].$value = new Date("2023-01-10");
      inputs[4].$value = [2, 3];
      // eslint-disable-next-line prefer-destructuring
      inputs[5].$value = inputs[5].$options.items[0].value; // this must be skipped from serialization
      await h.wait(1001);
      expect(sSet).toBeCalledTimes(1);
      expect(sSet).lastCalledWith(
        "customKey",
        '{"email":"Mike@gmail.com","prof.firstName":"MikeGrane","dt":"2023-01-10T00:00:00.000Z","sel":[2,3]}'
      );

      // reinit html to check if stored value is applied to inputs
      await reinit();
      expect(el._initModel).toBe(undefined);
      expect(el._model).toMatchInlineSnapshot(`
        {
          "dt": 2023-01-10T00:00:00.000Z,
          "email": "Mike@gmail.com",
          "prof": {
            "firstName": "MikeGrane",
          },
          "sel": [
            2,
            3,
          ],
        }
      `);
      expect(inputs[0].$value).toBe("Mike@gmail.com");
      expect(inputs[0].$initValue).toBe(undefined);
      expect(inputs[0].$isChanged).toBe(true);

      expect(inputs[1].$value).toBe("MikeGrane");
      expect(inputs[1].$initValue).toBe(undefined);
      expect(inputs[1].$isChanged).toBe(true);

      expect(inputs[2].$value).toBe(undefined);
      expect(inputs[2].$initValue).toBe(undefined);
      expect(inputs[2].$isChanged).toBe(false); // no name

      expect(inputs[3].$value).toStrictEqual(new Date("2023-01-10"));
      expect(inputs[3].$initValue).toBe(undefined);
      expect(inputs[3].$isChanged).toBe(true);

      expect(inputs[4].$value).toStrictEqual([2, 3]);
      expect(inputs[4].$initValue).toBe(undefined);
      expect(inputs[4].$isChanged).toBe(true);

      expect(inputs[5].$value).toBe(undefined); // because complex object
      expect(inputs[5].$initValue).toBe(undefined);
      expect(inputs[5].$isChanged).toBe(false);

      // storage must be cleard by succesful submit
      jest.clearAllMocks();
      btnSubmit.click();
      await h.wait();
      expect(sRem).toBeCalledTimes(1);

      // storage is full
      sSet.mockImplementationOnce(() => {
        throw new Error("Storage is exceeded");
      });
      inputs[0].$value = "Angela@gmail.com";
      await expect(h.wait()).rejects.toThrow();

      // storage contains invalid model
      window.localStorage.setItem("customKey", "ordinary string");
      expect(el.storageGet()).toBe(null);
      await expect(h.wait()).rejects.toThrow();

      // storage contains valid model but no matched controls
      window.localStorage.setItem("customKey", '{"missedControl":"Mrs"}');
      expect(el.storageGet()).toBe(null);
    });

    test("option 'autoSubmit'", async () => {
      const onSubmit = jest.fn();
      el.$onSubmit = onSubmit;
      const spyNotify = jest.spyOn(el, "$showNotify");
      const type = (i, text) => h.userTypeText(inputs[i].$refInput, text);
      const lastModel = () => onSubmit.mock.lastCall[0].detail.model;

      // works only if form has no submit button
      expect(el.$options.autoSubmit).toBe(3000);
      await type(0, "a@b.c");
      await h.wait(5000);
      expect(onSubmit).not.toBeCalled();
      btnSubmit.remove();

      // point false to disable
      el.$options.autoSubmit = false;
      await type(0, "a@b.c");
      await h.wait(5000);
      expect(onSubmit).not.toBeCalled();

      // attribute: empty means `true`
      el.setAttribute("w-autosubmit", "");
      await h.wait(1);
      expect(el.$options.autoSubmit).toBe(true);
      el.setAttribute("w-autosubmit", "true");
      await h.wait(1);
      expect(el.$options.autoSubmit).toBe(true);
      el.setAttribute("w-autosubmit", "false");
      await h.wait(1);
      expect(el.$options.autoSubmit).toBe(false);

      // true: submit in 3000ms after the last change
      el.$options.autoSubmit = true;
      await type(1, "Mi");
      await h.wait(2000);
      await type(1, "Mike"); // debounce is restarted
      await h.wait(2950);
      expect(onSubmit).not.toBeCalled();
      await h.wait(100);
      expect(onSubmit).toBeCalledTimes(1);
      expect(lastModel()).toEqual({ email: "a@b.c", firstName: "Mike" });
      expect(onSubmit.mock.lastCall[0].detail.submitter).toBe(inputs[1]);
      expect(onSubmit.mock.lastCall[0].detail.relatedEvent.type).toBe("$change");
      await h.wait(5000);
      expect(onSubmit).toBeCalledTimes(1);
      // with success notification: otherwise user doesn't see the result
      expect(spyNotify).toBeCalledTimes(1);
      expect(spyNotify).lastCalledWith({ notifyMessage: true }, false);
      expect(document.body.querySelector("wup-notify").textContent).toBe("Successful");

      // number: debounce in ms
      onSubmit.mockClear();
      el.$options.autoSubmit = 500;
      await type(0, "b@b.c");
      await h.wait(450);
      expect(onSubmit).not.toBeCalled();
      await h.wait(100);
      expect(onSubmit).toBeCalledTimes(1);

      // skip programmatic changes, controls without name & other elements
      onSubmit.mockClear();
      inputs[0].$value = "c@b.c";
      await type(2, "without name");
      el.appendChild(document.createElement("div")).dispatchEvent(
        new CustomEvent("$change", { bubbles: true, detail: { reason: 3 } })
      );
      await h.wait(1000);
      expect(onSubmit).not.toBeCalled();

      // any other submit cancels waiting auto-submit
      await type(0, "d@b.c");
      el.$submit();
      await h.wait(1000);
      expect(onSubmit).toBeCalledTimes(1);

      // disabled during the waiting
      onSubmit.mockClear();
      await type(0, "e@b.c");
      el.$options.autoSubmit = false;
      await h.wait(1000);
      expect(onSubmit).not.toBeCalled();

      // form is validated silently: without showing errors & focusing invalid control
      el.$options.autoSubmit = 500;
      inputs[1].$options.validations = { required: true };
      inputs[1].$value = "";
      await type(0, "f@b.c");
      await h.wait(1000);
      expect(onSubmit).not.toBeCalled();
      expect(inputs[1].$refError).toBeFalsy();
      expect(document.activeElement).toBe(inputs[0].$refInput);
      await type(1, "Kate");
      await h.wait(1000);
      expect(onSubmit).toBeCalledTimes(1);
      expect(lastModel()).toEqual({ email: "f@b.c", firstName: "Kate" });

      // invisible & readonly controls are skipped like on submit (when form is visible)
      onSubmit.mockClear();
      inputs[1].$value = "";
      h.setupLayout(el, { h: 100, w: 100, x: 1, y: 1 });
      jest.spyOn(inputs[1], "offsetHeight", "get").mockReturnValue(0);
      await type(0, "g@b.c");
      await h.wait(1000);
      expect(onSubmit).toBeCalledTimes(1);
      // but they are validated when form is hidden or removed (visibility of controls is unknown)
      jest.spyOn(el, "offsetHeight", "get").mockReturnValue(0);
      await type(0, "gg@b.c");
      await h.wait(1000);
      expect(onSubmit).toBeCalledTimes(1);
      jest.spyOn(el, "offsetHeight", "get").mockReturnValue(100);
      jest.spyOn(inputs[1], "offsetHeight", "get").mockReturnValue(20);
      inputs[1].$options.readOnly = true;
      await type(0, "h@b.c");
      await h.wait(1000);
      expect(onSubmit).toBeCalledTimes(2);
      // all controls are validated without SubmitActions.validateChangeable
      onSubmit.mockClear();
      el.$options.submitActions = SubmitActions.none;
      await type(0, "i@b.c");
      await h.wait(1000);
      expect(onSubmit).not.toBeCalled();
      el.$options.submitActions = WUPFormElement.$defaults.submitActions;
      inputs[1].$options.readOnly = false;
      inputs[1].$value = "Kate";

      // it isn't locked by the pending state of previous submit: otherwise changes are lost
      onSubmit.mockClear();
      onSubmit.mockImplementation(() => new Promise((res) => setTimeout(res, 2000)));
      await type(0, "j@b.c");
      await h.wait(500); // auto-submit is started here
      expect(onSubmit).toBeCalledTimes(1);
      await type(1, "Kitty"); // changed before the form is locked by the pending state (300ms)
      await h.wait(1000);
      expect(el.$isPending).toBe(true);
      expect(onSubmit).toBeCalledTimes(2);
      expect(lastModel()).toEqual({ email: "j@b.c", firstName: "Kitty" });
      await h.wait(3000); // wait for the end of submits
      expect(el.$isPending).toBe(false);
      onSubmit.mockReset();

      // message from $onSubmit has priority over default notification
      spyNotify.mockClear();
      onSubmit.mockImplementationOnce(() => Promise.resolve({ notifyMessage: "Saved" }));
      await type(0, "l@b.c");
      await h.wait(1000);
      expect(spyNotify).lastCalledWith({ notifyMessage: "Saved" }, false);

      // browser exit: waiting auto-submit is fired at once & browser asks to stay till the end of submit
      const exit = () => {
        const ev = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(ev);
        return ev.defaultPrevented;
      };
      expect(exit()).toBe(false); // nothing to wait
      onSubmit.mockClear();
      onSubmit.mockImplementation(() => new Promise((res) => setTimeout(res, 1000)));
      await type(0, "o@b.c");
      expect(exit()).toBe(true);
      expect(onSubmit).toBeCalledTimes(1); // at once: page is paused while browser asks user
      expect(lastModel()).toEqual({ email: "o@b.c", firstName: "Kitty" });
      await h.wait(500);
      expect(el.$isPending).toBe(true);
      expect(exit()).toBe(true); // till the end of submit
      await h.wait(1000);
      expect(el.$isPending).toBe(false);
      expect(exit()).toBe(false);
      expect(onSubmit).toBeCalledTimes(1);
      onSubmit.mockReset();

      // removed form: waiting auto-submit is fired at once with the whole model
      onSubmit.mockClear();
      await type(0, "m@b.c");
      el.remove();
      await h.wait(1);
      expect(onSubmit).toBeCalledTimes(1);
      expect(lastModel()).toEqual({ email: "m@b.c", firstName: "Kitty" });
      await h.wait(1000);
      expect(onSubmit).toBeCalledTimes(1);
      expect(exit()).toBe(false); // listener is removed with the form
      // but only if it's valid
      onSubmit.mockClear();
      document.body.appendChild(el);
      await h.wait(1);
      inputs[1].$value = "";
      await type(0, "n@b.c");
      expect(exit()).toBe(true); // listener is added again: changes aren't saved because form is invalid
      expect(onSubmit).not.toBeCalled();
      await type(0, "nn@b.c");
      el.remove();
      await h.wait(1000);
      expect(onSubmit).not.toBeCalled();
    });
  });

  test("WA: tie with heading", async () => {
    document.body.innerHTML = `<h3>..</h3> <wup-form></wup-form>`;
    await h.wait(10);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<h3 id="wup1">..</h3> <wup-form role="form" aria-labelledby="wup1"></wup-form>"`
    );

    document.body.innerHTML = `<wup-form><h3>..</h3></wup-form>`;
    await h.wait(10);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<wup-form role="form" aria-labelledby="wup2"><h3 id="wup2">..</h3></wup-form>"`
    );

    document.body.innerHTML = `<div role='heading'>..</div> <wup-form></wup-form>`;
    await h.wait(10);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<div role="heading" id="wup3">..</div> <wup-form role="form" aria-labelledby="wup3"></wup-form>"`
    );

    document.body.innerHTML = `<h2 id='hrm'>..</h2> <wup-form></wup-form>`;
    await h.wait(10);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<h2 id="hrm">..</h2> <wup-form role="form" aria-labelledby="hrm"></wup-form>"`
    );

    document.body.innerHTML = `<h2>..</h2> <wup-form><h3>.</h3></wup-form>`;
    await h.wait(10);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<h2>..</h2> <wup-form role="form" aria-labelledby="wup4"><h3 id="wup4">.</h3></wup-form>"`
    );

    document.body.innerHTML = `<h2>..</h2><wup-form aria-label="Login"></wup-form>`;
    await h.wait(10);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<h2>..</h2><wup-form aria-label="Login" role="form"></wup-form>"`
    );

    document.body.innerHTML = `<h2>..</h2><wup-form title="Login"></wup-form>`;
    await h.wait(10);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<h2>..</h2><wup-form title="Login" role="form"></wup-form>"`
    );

    document.body.innerHTML = `<h2>..</h2><h3>..<h3><wup-form aria-labelledby="sid"><div id='sid'>.</div></wup-form>`;
    await h.wait(10);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<h2>..</h2><h3>..</h3><h3><wup-form aria-labelledby="sid" role="form"><div id="sid">.</div></wup-form></h3>"`
    );
  });

  test("$validate()", async () => {
    inputs.forEach((a) => (a.$options.validations = { required: true }));
    inputs[0].$options.validations.email = true;
    inputs[0].$value = "bad-email";
    inputs[1].$value = "firstName";

    inputs[2].$options.name = null;
    expect(inputs[0].$isValid).toBe(false);
    expect(inputs[1].$isValid).toBe(true);
    // expect(inputs[2].$isValid).toBe(false);

    let includeLocked = false;
    expect(el.$validate(true).map((a) => a.$options.name)).toStrictEqual(["email"]);
    expect(el.$validate(true, includeLocked).map((a) => a.$options.name)).toStrictEqual(["email"]);
    expect(el.$validate(false).map((a) => a.$options.name)).toStrictEqual(["email"]);
    expect(el.$validate().map((a) => a.$options.name)).toStrictEqual(["email"]);

    inputs[1].$value = "";
    expect(el.$validate(true).map((a) => a.$options.name)).toStrictEqual(["email"]);
    expect(el.$validate(false).map((a) => a.$options.name)).toStrictEqual(["email", "firstName"]);
    expect(el.$validate().map((a) => a.$options.name)).toStrictEqual(["email"]); // because depends on submitActions

    inputs.forEach((a) => (a.$options.validations = null));
    expect(el.$validate(true).map((a) => a.$options.name)).toStrictEqual([]);
    expect(el.$validate(false).map((a) => a.$options.name)).toStrictEqual([]);
    expect(el.$validate().map((a) => a.$options.name)).toStrictEqual([]);

    // validate with including locked
    includeLocked = false;
    inputs.forEach((a) => {
      a.$options.validations = { required: true };
      a.$value = "";
    });
    expect(el.$validate(false, includeLocked).map((a) => a.$options.name)).toStrictEqual(["email", "firstName"]);
    // readonly
    includeLocked = false;
    inputs[0].$options.readOnly = true;
    expect(el.$validate(false, includeLocked).map((a) => a.$options.name)).toStrictEqual(["firstName"]);
    includeLocked = true;
    expect(el.$validate(false, includeLocked).map((a) => a.$options.name)).toStrictEqual(["email", "firstName"]);
    // disabled
    inputs[0].$options.readOnly = false;
    inputs[0].$options.disabled = true;
    includeLocked = false;
    expect(el.$validate(false, includeLocked).map((a) => a.$options.name)).toStrictEqual(["firstName"]);
    includeLocked = true;
    expect(el.$validate(false, includeLocked).map((a) => a.$options.name)).toStrictEqual(["email", "firstName"]);
    // hidden
    inputs[0].$options.disabled = false;
    h.setupLayout(inputs[0], { h: 0, w: 0 });
    includeLocked = false;
    expect(el.$validate(false, includeLocked).map((a) => a.$options.name)).toStrictEqual(["firstName"]);
    includeLocked = true;
    expect(el.$validate(false, includeLocked).map((a) => a.$options.name)).toStrictEqual(["email", "firstName"]);
  });
});
