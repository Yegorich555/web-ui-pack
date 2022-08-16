import { WUPFormElement, WUPTextControl } from "web-ui-pack";
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

  (!WUPFormElement || !WUPTextControl) && console.errr("missed");
  el = document.body.appendChild(document.createElement("wup-form"));
  const inp1 = el.appendChild(document.createElement("wup-text"));
  inp1.$options.name = "email";
  const inp2 = el.appendChild(document.createElement("wup-text"));
  inp2.$options.name = "firstName";
  const inp3 = el.appendChild(document.createElement("wup-text"));
  inp3.$options.name = undefined;

  inputs.push(inp1, inp2, inp3);

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
  h.baseTestComponent(() => document.createElement("wup-form"));

  test("$initModel / $model", () => {
    inputs[0].$initValue = "some text";
    inputs[1].$initValue = "hello from 2";
    inputs[2].$initValue = "without name";

    el.$initModel = { email: "some@email.com" };
    expect(inputs[0].$initValue).toBe("some@email.com");
    expect(inputs[0].$value).toBe("some@email.com");
    expect(el.outerHTML).toMatchInlineSnapshot(
      `"<wup-form role=\\"form\\"><wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" autocomplete=\\"off\\"><strong>Email</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt2\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt2\\" autocomplete=\\"off\\"><strong>First Name</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt3\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt3\\" autocomplete=\\"off\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><button type=\\"submit\\"></button></wup-form>"`
    );

    expect(inputs[1].$initValue).toBe("hello from 2");
    expect(inputs[2].$initValue).toBe("without name");
    expect(el.$model).toMatchObject({ email: "some@email.com", firstName: "hello from 2" });

    el.$initModel = { firstName: "Nick" };
    expect(inputs[0].$initValue).toBe("some@email.com");
    expect(inputs[1].$initValue).toBe("Nick");
    expect(el.$model).toMatchObject({ email: "some@email.com", firstName: "Nick" });

    el.$initModel = { email: "tas@google.com", firstName: "Tasy" };
    expect(inputs[0].$initValue).toBe("tas@google.com");
    expect(inputs[1].$initValue).toBe("Tasy");
    expect(el.$model).toMatchObject({ email: "tas@google.com", firstName: "Tasy" });

    // checking $model
    inputs[0].$value = "v@email.en";
    inputs[1].$value = "Mike";
    expect(el.$model).toMatchObject({ email: "v@email.en", firstName: "Mike" });
    expect(el.$initModel).toMatchObject({ email: "tas@google.com", firstName: "Tasy" });

    el.$model = { email: "true@mail.com" };
    expect(el.$model).toMatchObject({ email: "true@mail.com", firstName: "Mike" });

    el.$model = { email: "next@em.com", firstName: "Tisha", lastName: "Turunen" };
    expect(el.$model).toMatchObject({ email: "next@em.com", firstName: "Tisha", lastName: "Turunen" });
    expect(inputs[0].$value).toBe("next@em.com");
    expect(inputs[1].$value).toBe("Tisha");
    expect(inputs[2].$value).toBe("without name");

    el.$model = { email: "", firstName: undefined };
    expect(el.$model).toMatchObject({ email: "", firstName: undefined });
    expect(inputs[0].$value).toBe("");
    expect(inputs[1].$value).toBe(undefined);
    expect(inputs[2].$value).toBe("without name");

    // name applied after setModel
    inputs[0].$initValue = undefined;
    el.$initModel = { DOB: "some date", Address: "Walk st." };
    inputs[0].setAttribute("name", "DOB");
    jest.advanceTimersByTime(1);
    expect(inputs[0].$initValue).toBe("some date");

    inputs[0].setAttribute("name", "Address");
    jest.advanceTimersByTime(1);
    expect(inputs[0].$initValue).toBe("some date"); // stay same because prev. $initValue is defined
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
      el.setAttribute("autocomplete", "");
      jest.advanceTimersByTime(1);
      expect(inputs[0].$autoComplete).toBe("email");
      expect(inputs[0].$refInput.autocomplete).toBe("email");
      expect(inputs[1].$refInput.autocomplete).toBe("firstName");
      expect(inputs[2].$refInput.autocomplete).toBe("off");

      el.removeAttribute("autocomplete");
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
  });

  describe("submit", () => {
    const $willSubmitEv = jest.fn();
    const $submitEv = jest.fn();
    const $onSubmit = jest.fn();
    // native events
    const submitEv = jest.fn();
    const onsubmit = jest.fn();

    test("firing events", async () => {
      el.addEventListener("$willSubmit", $willSubmitEv);
      el.addEventListener("$submit", $submitEv);
      el.$onSubmit = $onSubmit;
      // native events
      el.addEventListener("submit", submitEv);
      el.onsubmit = onsubmit;

      btnSubmit.click();
      await h.wait(1);
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($willSubmitEv.mock.calls[0][0].$relatedForm).toBe(el);
      expect($willSubmitEv.mock.calls[0][0].$relatedEvent.type).toBe("click");
      expect($willSubmitEv.mock.calls[0][0].$submitter).toBe(btnSubmit);

      expect($submitEv).toBeCalledTimes(1);
      expect($submitEv.mock.calls[0][0].$model).toEqual({ email: undefined, firstName: undefined });
      expect($submitEv.mock.calls[0][0].$relatedForm).toBe(el);
      expect($submitEv.mock.calls[0][0].$relatedEvent.type).toBe("click");
      expect($submitEv.mock.calls[0][0].$submitter).toBe(btnSubmit);

      expect($onSubmit).toBeCalledTimes(1);
      expect($onSubmit.mock.calls[0][0].$model).toEqual({ email: undefined, firstName: undefined });
      expect($onSubmit.mock.calls[0][0].$relatedForm).toBe(el);
      expect($onSubmit.mock.calls[0][0].$relatedEvent.type).toBe("click");
      expect($onSubmit.mock.calls[0][0].$submitter).toBe(btnSubmit);

      expect(onsubmit).toBeCalledTimes(1);
      expect(onsubmit.mock.calls[0][0].submitter).toBe(btnSubmit);
      expect(submitEv).toBeCalledTimes(1);
      expect(submitEv.mock.calls[0][0].submitter).toBe(btnSubmit);

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
      expect($willSubmitEv.mock.calls[0][0].$relatedForm).toBe(el);
      expect($willSubmitEv.mock.calls[0][0].$relatedEvent.type).toBe("keydown");
      expect($willSubmitEv.mock.calls[0][0].$submitter).toBe(inputs[0]);

      expect($submitEv).toBeCalledTimes(1);
      expect($submitEv.mock.calls[0][0].$model).toEqual({ email: undefined, firstName: undefined });
      expect($submitEv.mock.calls[0][0].$relatedForm).toBe(el);
      expect($submitEv.mock.calls[0][0].$relatedEvent.type).toBe("keydown");
      expect($submitEv.mock.calls[0][0].$submitter).toBe(inputs[0]);

      expect($onSubmit).toBeCalledTimes(1);
      expect($onSubmit.mock.calls[0][0].$model).toEqual({ email: undefined, firstName: undefined });
      expect($onSubmit.mock.calls[0][0].$relatedForm).toBe(el);
      expect($onSubmit.mock.calls[0][0].$relatedEvent.type).toBe("keydown");
      expect($onSubmit.mock.calls[0][0].$submitter).toBe(inputs[0]);

      expect(onsubmit).toBeCalledTimes(1);
      expect(onsubmit.mock.calls[0][0].submitter).toBe(inputs[0]);
      expect(submitEv).toBeCalledTimes(1);
      expect(submitEv.mock.calls[0][0].submitter).toBe(inputs[0]);

      // try again when sumbitter is not HTMLElement
      jest.clearAllMocks();
      expect($willSubmitEv).toBeCalledTimes(0);
      const svg = el.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
      svg.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      await h.wait(1);
      expect($willSubmitEv).toBeCalledTimes(1);
      expect($willSubmitEv.mock.calls[0][0].$submitter).toBe(el);
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
    });

    test("collected model", async () => {
      el.addEventListener("$submit", $submitEv);

      async function expectModel(m) {
        jest.clearAllMocks();
        await h.wait(1);
        btnSubmit.click();
        await h.wait(1);
        expect($submitEv.mock.calls[0][0].$model).toEqual(m);
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
    });

    test("pending on submit", async () => {
      el.$isPending = true;
      await h.wait();
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role=\\"form\\" disabled=\\"\\"><wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" autocomplete=\\"off\\" disabled=\\"\\"><strong>Email</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt2\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt2\\" autocomplete=\\"off\\" disabled=\\"\\"><strong>First Name</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt3\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt3\\" autocomplete=\\"off\\" disabled=\\"\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><button type=\\"submit\\" disabled=\\"\\" aria-busy=\\"true\\"></button><wup-spin style=\\"position: absolute; display: none;\\" aria-label=\\"Loading. Please wait\\"><div></div></wup-spin></wup-form>"`
      );
      el.$isPending = false;
      await h.wait();
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role=\\"form\\"><wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" autocomplete=\\"off\\"><strong>Email</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt2\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt2\\" autocomplete=\\"off\\"><strong>First Name</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt3\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt3\\" autocomplete=\\"off\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><button type=\\"submit\\"></button></wup-form>"`
      );

      const submitFn = (e) => (e.$waitFor = new Promise((resolve) => setTimeout(() => resolve("true"), 500)));
      el.addEventListener("$submit", submitFn);
      btnSubmit.click();
      await h.wait(1);
      expect(el.$isPending).toBe(true);
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role=\\"form\\"><wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" autocomplete=\\"off\\"><strong>Email</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt2\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt2\\" autocomplete=\\"off\\"><strong>First Name</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt3\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt3\\" autocomplete=\\"off\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><button type=\\"submit\\" disabled=\\"\\"></button><wup-spin style=\\"display: none;\\"><div></div></wup-spin></wup-form>"`
      );
      await h.wait();
      await h.wait(1);
      expect(el.$isPending).toBe(false);
      expect(el.outerHTML).toMatchInlineSnapshot(
        `"<wup-form role=\\"form\\"><wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\" autocomplete=\\"off\\"><strong>Email</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt2\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt2\\" autocomplete=\\"off\\"><strong>First Name</strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><wup-text><label for=\\"txt3\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt3\\" autocomplete=\\"off\\"><strong></strong></span><button clear=\\"\\" aria-hidden=\\"true\\" tabindex=\\"-1\\"></button></label></wup-text><button type=\\"submit\\"></button></wup-form>"`
      );
      el.removeEventListener("$submit", submitFn);

      // check again with $onSubmit
      el.$onSubmit = () => new Promise((resolve) => setTimeout(() => resolve("true"), 500));
      btnSubmit.click();
      await h.wait(1);
      expect(el.$isPending).toBe(true);
      await h.wait();
      await h.wait(1);
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

    test("submitActions", () => {});
  });
});

// todo e2e test case: scrollIntoView to invalid input
