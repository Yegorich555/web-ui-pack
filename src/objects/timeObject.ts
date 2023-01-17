import dateToString, { zeroBefore } from "../helpers/dateToString";
import localeInfo from "./localeInfo";

// watch: deprecate in favor of PlainTime: https://caniuse.com/?search=Temporal.PlainTime

/** Plane time-object without date */
export default class WUPTimeObject {
  hours: number;
  minutes: number;

  constructor();
  constructor(value: number | string);
  /** @param isPM set true/false if hours is 12h format */
  constructor(hours: number, minutes: number, isPM?: boolean);
  constructor(...args: any[]) {
    this.hours = 0;
    this.minutes = 0;
    let isPM: boolean | null | undefined = null;
    if (args.length === 1) {
      if (typeof args[0] === "string") {
        const [h, m] = args[0].split(/\W/);
        this.hours = Number.parseInt(h, 10);
        this.minutes = Number.parseInt(m, 10);
        if (/PM|pm$/.test(args[0])) {
          isPM = true;
        } else if (/AM|am$/.test(args[0])) {
          isPM = false;
        }
      } else {
        this.hours = Math.floor(args[0] / 60);
        this.minutes = args[0] - this.hours * 60;
      }
    } else if (args.length >= 2) {
      this.hours = args[0] as number;
      this.minutes = args[1] as number;
      // eslint-disable-next-line prefer-destructuring
      isPM = args[2];
    }

    if (this.hours === 12 && isPM === false) {
      this.hours = 0;
    } else if (this.hours !== 12 && isPM === true) {
      this.hours += 12;
    }

    if (
      Number.isNaN(this.hours) ||
      Number.isNaN(this.minutes) ||
      this.hours < 0 ||
      this.hours > 23 ||
      this.minutes < 0 ||
      this.minutes > 59
    ) {
      const err = RangeError("Out of range") as RangeError & { details: any };
      err.details = { parsed: this, args };
      console.warn(`${err.message}. Details:`, err.details);
      throw err;
    }
  }

  /** Copy hours & minutes to pointed Date
   * @returns the same date object */
  copyToDate(dt: Date, isUTC: boolean): Date {
    const ukey = isUTC ? "UTC" : "";
    dt[`set${ukey}Hours`](this.hours, this.minutes, 0, 0); // , dt[`get${ukey}Seconds`](), dt[`get${ukey}Milliseconds`]());
    return dt;
  }

  /** Returns number representation of current object */
  valueOf(): number {
    return this.hours * 60 + this.minutes;
  }

  /** Returns whether time is PM or AM */
  get isPM(): boolean {
    return this.hours > 11;
  }

  /** Returns string in "hh:mm" format */
  toString(): string {
    return `${zeroBefore(this.hours, 2)}:${zeroBefore(this.minutes, 2)}`;
  }

  /** Returns string according to objects/localeInfo.time format */
  toLocaleString(): string {
    return this.format(localeInfo.time);
  }

  /** Returns string according to pointed format (hh:mm) */
  format(format: string): string {
    return dateToString(new Date(1, 1, 1, this.hours, this.minutes), format.replace(/[\D\W]ss/, ""));
  }

  /** Returns string in "h:m" format */
  toJSON(): string {
    return `${this.hours}:${this.minutes}`;
  }
}
