import objectToFormData from "web-ui-pack/helpers/objectToFormData";

FormData.prototype.toSnap = function toSnap() {
  return Object.fromEntries(this.entries());
};

describe("helper.objectToFormData", () => {
  test("default", () => {
    // primitives
    expect(objectToFormData({ num: 123, str: "some text", isBool: true }).toSnap()).toMatchInlineSnapshot(`
      {
        "isBool": "true",
        "num": "123",
        "str": "some text",
      }
    `);

    // with predefined object
    const preparedFormData = new FormData();
    preparedFormData.append("id", "13687");
    expect(objectToFormData({ num: 123 }, preparedFormData).toSnap()).toMatchInlineSnapshot(`
      {
        "id": "13687",
        "num": "123",
      }
    `);
    expect(objectToFormData({ num: 123 }, preparedFormData)).toBe(preparedFormData);

    // with null/undefined object
    expect(objectToFormData({ num: 123 }, null).toSnap()).toMatchInlineSnapshot(`
      {
        "num": "123",
      }
    `);
    expect(objectToFormData({ num: 123 }, undefined).toSnap()).toMatchInlineSnapshot(`
      {
        "num": "123",
      }
    `);

    // date
    expect(objectToFormData({ num: 123, dob: new Date(2024, 11, 28) }).toSnap()).toMatchInlineSnapshot(`
      {
        "dob": "2024-12-27T22:00:00.000Z",
        "num": "123",
      }
    `);

    // file
    const f = objectToFormData({ num: 123, icon: new File([54, 98], "test.png") });
    expect(f.toSnap()).toMatchInlineSnapshot(`
      {
        "icon": File {},
        "num": "123",
      }
    `);
    expect(f.get("icon").name).toBe("test.png");
    expect(f.get("icon").size).toBe(4); // count of bytes: somehow it's x2 by default

    // array
    expect(objectToFormData([123, new Date(2024, 11, 28)]).toSnap()).toMatchInlineSnapshot(`
      {
        "[0]": "123",
        "[1]": "2024-12-27T22:00:00.000Z",
      }
    `);

    // complex with nested props
    expect(
      objectToFormData({
        id: 5,
        options: {
          includeA: true,
          includeB: false,
          startFrom: new Date(2024, 11, 29),
          title: "Hello world",
          avatar: new File([54], "test2.png"),
        },
        slots: [
          { id: 2, value: 123, isEnabled: true },
          { id: 105, value: 97, isEnabled: false },
        ],
      }).toSnap()
    ).toMatchInlineSnapshot(`
      {
        "id": "5",
        "options[avatar]": File {},
        "options[includeA]": "true",
        "options[includeB]": "false",
        "options[startFrom]": "2024-12-28T22:00:00.000Z",
        "options[title]": "Hello world",
        "slots[0][id]": "2",
        "slots[0][isEnabled]": "true",
        "slots[0][value]": "123",
        "slots[1][id]": "105",
        "slots[1][isEnabled]": "false",
        "slots[1][value]": "97",
      }
    `);

    // complex with nested props2
    expect(
      objectToFormData({
        id: 5,
        firstName: null,
        lastName: undefined,
        options: {
          includeA: true,
          slots: [
            { id: 2, value: 123, isEnabled: true },
            { id: 105, value: 97, isEnabled: false },
          ],
        },
      }).toSnap()
    ).toMatchInlineSnapshot(`
      {
        "firstName": "null",
        "id": "5",
        "lastName": "undefined",
        "options[includeA]": "true",
        "options[slots][0][id]": "2",
        "options[slots][0][isEnabled]": "true",
        "options[slots][0][value]": "123",
        "options[slots][1][id]": "105",
        "options[slots][1][isEnabled]": "false",
        "options[slots][1][value]": "97",
      }
    `);
  });
});
