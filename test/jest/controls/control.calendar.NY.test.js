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

    const item = el.$refCalenarItems.children.item(6);
    expect(item.textContent).toBe("6"); // 6 Nov
    await h.userClick(item);
    // for NewYourk DST shift on 6Nov and 14Mar
    expect(el.$value.toLocaleString()).toBe(new Date("2022-11-06 23:50").toLocaleString());
  });
});
