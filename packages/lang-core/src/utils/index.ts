export function adjustIndex(index: number, size: number) {
  return index > 0 ? index - 1 : Math.max(0, size + index);
}
