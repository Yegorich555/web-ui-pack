/** Copy hh:mm:ss.fff part from B to A
 * @returns the same date pointed at first argument
 */
export default function dateCopyTime(to: Date, from: Date, utc: boolean): Date {
  const u = utc ? "UTC" : "";
  to[`set${u}Hours`](
    from[`get${u}Hours`](),
    from[`get${u}Minutes`](),
    from[`get${u}Seconds`](),
    from[`get${u}Milliseconds`]()
  );
  return to;
}
