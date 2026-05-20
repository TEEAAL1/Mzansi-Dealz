import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatZAR(amount: number): string {
  return "R " + amount.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
