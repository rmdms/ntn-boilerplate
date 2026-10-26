import { gsap } from "gsap";

export default defineNuxtPlugin(() => {
  // GSAP 2 overwrote conflicting tweens by default; the ported animations rely on it.
  gsap.defaults({ overwrite: "auto" });
});
