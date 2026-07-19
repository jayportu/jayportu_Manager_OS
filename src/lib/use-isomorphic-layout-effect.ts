import { useEffect, useLayoutEffect } from "react";

/** useLayoutEffect en cliente, useEffect en SSR — evita el warning
 *  "useLayoutEffect does nothing on the server". */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
