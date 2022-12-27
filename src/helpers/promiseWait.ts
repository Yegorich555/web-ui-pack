/**
 * Produce Promise during for "no less than pointed time".
 * If Promise takes more than pointed time: no additional waiting
 * If Promise resolves or rejects in less than pointed time: waiting for rest time
 * @param promise Promise that we must wait for pointed time
 * @param ms min time that Promise must take
 * @param [smartOrCallback=true] Allow not to wait if pointed promise is resolved immediately default-`true`
 * @example
 * let isPending = false
 * promiseWait(Promise.resolve(), 300, (isWait)=> sPending=isWait;)
 * // OR
 * isPending = true;
 * promiseWait(Promise.resolve(), 300, true).finally(()=> isPending=false;)
 */
export default function promiseWait<T>(
  promise: Promise<T>,
  ms: number,
  smartOrCallback: boolean | ((isWait: boolean) => any) = true
): Promise<T> {
  let catchErr: Error;
  let isResolved = false;
  promise
    .catch((err) => (catchErr = err)) //
    .finally(() => (isResolved = true));

  const p = new Promise((resolve, reject) => {
    const end = (): void => (catchErr ? reject(catchErr) : resolve(promise));
    const a = setTimeout(end, ms);

    smartOrCallback &&
      setTimeout(() => {
        if (isResolved) {
          clearTimeout(a);
          end();
        } else if (typeof smartOrCallback === "function") {
          smartOrCallback(true);
          p.finally(() => smartOrCallback(false));
        }
      });
  });

  return p as Promise<T>;
}
