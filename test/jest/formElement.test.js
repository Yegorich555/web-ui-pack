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
      `"<wup-form role=\\"form\\"><wup-text><label for=\\"txt1\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt1\\"><strong></strong></span></label></wup-text><wup-text><label for=\\"txt2\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt2\\"><strong></strong></span></label></wup-text><wup-text><label for=\\"txt3\\"><span><input placeholder=\\" \\" type=\\"text\\" id=\\"txt3\\"><strong></strong></span></label></wup-text><button type=\\"submit\\"></button></wup-form>"`
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
  });
});

// todo e2e click on button without [submit] should fire submit call

// test-case: submit by Enter keydown
