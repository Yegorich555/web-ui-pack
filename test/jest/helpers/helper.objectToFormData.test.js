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
    expect(objectToFormData({ num: 123 }, null, null).toSnap()).toMatchInlineSnapshot(`
      {
        "num": "123",
      }
    `);
    expect(objectToFormData({ num: 123 }, undefined, undefined).toSnap()).toMatchInlineSnapshot(`
      {
        "num": "123",
      }
    `);

    // date
    expect(objectToFormData({ num: 123, dob: new Date(Date.UTC(2024, 11, 28)) }).toSnap()).toMatchInlineSnapshot(`
      {
        "dob": "2024-12-28T00:00:00.000Z",
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
    expect(objectToFormData([123, new Date(Date.UTC(2024, 11, 28))]).toSnap()).toMatchInlineSnapshot(`
      {
        "[0]": "123",
        "[1]": "2024-12-28T00:00:00.000Z",
      }
    `);

    // complex with nested props
    expect(
      objectToFormData({
        id: 5,
        options: {
          includeA: true,
          includeB: false,
          startFrom: new Date(Date.UTC(2024, 11, 29)),
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
        "options.avatar": File {},
        "options.includeA": "true",
        "options.includeB": "false",
        "options.startFrom": "2024-12-29T00:00:00.000Z",
        "options.title": "Hello world",
        "slots[0].id": "2",
        "slots[0].isEnabled": "true",
        "slots[0].value": "123",
        "slots[1].id": "105",
        "slots[1].isEnabled": "false",
        "slots[1].value": "97",
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
        "id": "5",
        "options.includeA": "true",
        "options.slots[0].id": "2",
        "options.slots[0].isEnabled": "true",
        "options.slots[0].value": "123",
        "options.slots[1].id": "105",
        "options.slots[1].isEnabled": "false",
        "options.slots[1].value": "97",
      }
    `);

    // array
    expect(
      objectToFormData([
        {
          id: 5,
          options: {
            includeA: true,
            slots: [
              { id: 2, value: 123, isEnabled: true },
              { id: 105, value: 97, isEnabled: false },
            ],
          },
        },
      ]).toSnap()
    ).toMatchInlineSnapshot(`
      {
        "[0].id": "5",
        "[0].options.includeA": "true",
        "[0].options.slots[0].id": "2",
        "[0].options.slots[0].isEnabled": "true",
        "[0].options.slots[0].value": "123",
        "[0].options.slots[1].id": "105",
        "[0].options.slots[1].isEnabled": "false",
        "[0].options.slots[1].value": "97",
      }
    `);
  });

  test("option [includeNulls]", () => {
    const obj = [
      {
        id: 5,
        firstName: null,
        lastName: undefined,
        options: [
          { id: 2, value: 123, name: null, nickName: "" },
          { id: 105, value: 97, name: null, nickName: "" },
        ],
      },
    ];

    expect(objectToFormData(obj, null, { includeNulls: true }).toSnap()).toMatchInlineSnapshot(`
      {
        "[0].firstName": "",
        "[0].id": "5",
        "[0].lastName": "",
        "[0].options[0].id": "2",
        "[0].options[0].name": "",
        "[0].options[0].nickName": "",
        "[0].options[0].value": "123",
        "[0].options[1].id": "105",
        "[0].options[1].name": "",
        "[0].options[1].nickName": "",
        "[0].options[1].value": "97",
      }
    `);

    expect(objectToFormData(obj, null, { includeNulls: false }).toSnap()).toMatchInlineSnapshot(`
      {
        "[0].id": "5",
        "[0].options[0].id": "2",
        "[0].options[0].nickName": "",
        "[0].options[0].value": "123",
        "[0].options[1].id": "105",
        "[0].options[1].nickName": "",
        "[0].options[1].value": "97",
      }
    `);
  });

  test("option [bracketNotation]", () => {
    const obj = [
      {
        id: 5,
        firstName: null,
        lastName: undefined,
        options: [
          { id: 2, value: 123, name: null, nickName: "" },
          { id: 105, value: 97, name: null, nickName: "" },
        ],
      },
    ];

    expect(objectToFormData(obj, null, { bracketNotation: true }).toSnap()).toMatchInlineSnapshot(`
      {
        "[0][id]": "5",
        "[0][options][0][id]": "2",
        "[0][options][0][nickName]": "",
        "[0][options][0][value]": "123",
        "[0][options][1][id]": "105",
        "[0][options][1][nickName]": "",
        "[0][options][1][value]": "97",
      }
    `);

    expect(objectToFormData({ id: 2, nickName: "some name here" }, null, { bracketNotation: true }).toSnap())
      .toMatchInlineSnapshot(`
      {
        "id": "2",
        "nickName": "some name here",
      }
    `);

    expect(objectToFormData(obj, null, { bracketNotation: false }).toSnap()).toMatchInlineSnapshot(`
      {
        "[0].id": "5",
        "[0].options[0].id": "2",
        "[0].options[0].nickName": "",
        "[0].options[0].value": "123",
        "[0].options[1].id": "105",
        "[0].options[1].nickName": "",
        "[0].options[1].value": "97",
      }
    `);

    expect(objectToFormData({ id: 2, nickName: "some name here" }, null, { bracketNotation: false }).toSnap())
      .toMatchInlineSnapshot(`
      {
        "id": "2",
        "nickName": "some name here",
      }
    `);
  });
});
