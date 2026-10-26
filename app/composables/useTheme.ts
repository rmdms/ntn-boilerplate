export type Theme = "dark" | "light";

export function useTheme(theme: Theme) {
  useHead({ bodyAttrs: { class: `theme__${theme}` } });
}
