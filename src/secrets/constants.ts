/** Regex to match ${{secretRef.<name>}} handlebars. Uses the global flag for matchAll. */
export const HANDLEBAR_RE = /\$\{\{secretRef\.(\w+)\}\}/g;
