// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JustForGlobal {}

declare global {
  const setUnhandledReject: (fn: typeof console.error) => void;

  namespace NodeJS {
    interface Global {
      setUnhandledReject: (fn: typeof console.error) => void;
    }
  }
}
