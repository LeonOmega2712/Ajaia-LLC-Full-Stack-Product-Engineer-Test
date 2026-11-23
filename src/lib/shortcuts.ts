/** Label for the primary shortcut modifier: ⌘ on Apple platforms, Ctrl elsewhere. */
export const modifierLabel = (isMac: boolean) => (isMac ? "⌘" : "Ctrl");

export const isMacPlatform = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
