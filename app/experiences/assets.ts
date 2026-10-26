import { slideUrls, TRIPS } from "./photography/slider";

export interface ExperienceAssetDecl {
  /** Fetched before the experience mounts; their bytes drive the loader bar. */
  readonly essential: readonly string[];
  /** Fetched after the first frame. */
  readonly deferred: readonly string[];
  /** Audio played through a media element, never part of the bar; the manifest adds its AAC segments. */
  readonly streamed: readonly string[];
}

export const experienceAssets = {
  illuminate: { essential: ["/json/Morganite_SemiBold.json"], deferred: [], streamed: [] },
  field: { essential: ["/images/texture-grass-1024.webp"], deferred: [], streamed: [] },
  attract: { essential: ["/images/mmi.webp"], deferred: [], streamed: [] },
  discomania: { essential: [], deferred: [], streamed: ["/audios/EverythingBlack_UnlikePluto.m4a"] },
  flower: { essential: [], deferred: [], streamed: ["/audios/AllNight_By_BigBoi.m4a"] },
  photography: {
    essential: slideUrls(TRIPS[0]!),
    deferred: TRIPS.slice(1).flatMap(slideUrls),
    streamed: [],
  },
} satisfies Record<string, ExperienceAssetDecl>;

export type ExperienceName = keyof typeof experienceAssets;
