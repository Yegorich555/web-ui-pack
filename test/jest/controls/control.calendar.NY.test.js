/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
import { PickersEnum } from "web-ui-pack/controls/calendar";
import calendarTZtest from "./control.calendar.TZ";
import * as h from "../../testHelper";

/** Test calendar with timezone America/New_York */
describe(`control.calendar >> timezone: ${window.TZ}, offset: ${new Date(2022, 9, 16).getTimezoneOffset()}`, () => {
  calendarTZtest();

  test("dayPicker saves hours for DST", async () => {
    const el = document.querySelector("wup-calendar");
    el.remove();
    el.$options.utc = false;
    el.$initValue = new Date("2022-11-05 23:50");
    el.$options.startWith = PickersEnum.Day;
    document.body.appendChild(el);
    await h.wait();

    const item = el.$refCalendarItems.children.item(6);
    expect(item.textContent).toBe("6"); // 6 Nov
    await h.userClick(item);
    // for NewYork DST shift on 6Nov and 14Mar
    expect(el.$value.toLocaleString()).toBe(new Date("2022-11-06 23:50").toLocaleString());
  });

  test("option multiple", async () => {
    const el = document.querySelector("wup-calendar");
    el.remove();
    el.$options.utc = false;
    el.$options.multiple = true;
    el.$initValue = [new Date("2022-11-05 23:50")];
    document.body.appendChild(el);
    await h.wait();

    const getSelected = () => Array.from(el.querySelectorAll("[aria-selected]")).map((li) => li.textContent);
    expect(getSelected()).toEqual(["5"]);
    await h.userClick(el.$refCalendarItems.children.item(6)); // 6 Nov: DST
    await h.wait();
    expect(el.$value.map((d) => d.toLocaleString())).toEqual([
      new Date("2022-11-05 23:50").toLocaleString(),
      new Date("2022-11-06 00:00").toLocaleString(),
    ]);
    expect(getSelected()).toEqual(["5", "6"]);
    await h.userClick(el.$refCalendarItems.children.item(5)); // 5 Nov
    await h.wait();
    expect(el.$value.map((d) => d.toLocaleString())).toEqual([new Date("2022-11-06 00:00").toLocaleString()]);
    expect(getSelected()).toEqual(["6"]);

    // storage keeps UTC dates without shifting by timezone
    el.$options.utc = true;
    el.$options.storageKey = "clndNY";
    el.$value = [new Date("2022-10-05T00:00:00.000Z"), new Date("2022-10-25T00:00:00.000Z")];
    await h.wait(1);
    expect(window.localStorage.getItem("clndNY")).toBe("2022-10-05_2022-10-25");
    el.$options.multiple = false;
    el.$value = new Date("2022-10-05T00:00:00.000Z");
    await h.wait(1);
    expect(window.localStorage.getItem("clndNY")).toBe("2022-10-05");
    window.localStorage.clear();
  });
});
