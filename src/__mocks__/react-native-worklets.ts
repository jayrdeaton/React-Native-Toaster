/* eslint-disable @typescript-eslint/no-explicit-any */
export const scheduleOnRN = (fn: (...args: any[]) => any, ...args: any[]) => fn(...args)
