import { createContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export const createServiceToken = <T>(_: (...args: any) => T) => {
  return createContext<T | null>(null);
};

