import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn's standard class merger. `components.json` aliases utils here, so any
 *  component pulled from a registry imports `cn` from this file. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
