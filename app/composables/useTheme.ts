export type Theme = "dark" | "light";

export function useTheme(theme: Theme) {
  // On client-side navigation the next page is set up before the previous one has left, so its theme
  // waits for mount; otherwise the leaving page fades out over the new background.
  const active = ref(import.meta.server || useNuxtApp().isHydrating);
  onMounted(() => (active.value = true));
  useHead({
    bodyAttrs: { class: () => (active.value ? `theme__${theme}` : undefined) },
  });
}
