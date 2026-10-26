import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const publicDir = join(import.meta.dir, "../public");
// The mp3 is served as is (the live site's file); only the decoded-segment fallback is re-encoded.
// AudioToolbox keeps the 18-22 kHz band discomania's kick detector listens to; ffmpeg's aac encoder cuts it.
const audioCodec = "aac_at";
const audioBitrate = "256k";
const segmentSeconds = 4;
const attractMaxEdge = 2048;
const grassSize = 1024;

const tracks = ["EverythingBlack_UnlikePluto", "AllNight_By_BigBoi"];

function run(command: string[]) {
  const result = Bun.spawnSync(command, { stdout: "ignore", stderr: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(`${command[0]} failed: ${result.stderr.toString()}`);
  }
}

function encodeTrack(track: string) {
  const source = join(publicDir, "audios", `${track}.mp3`);
  const aac = [
    "-vn",
    "-map_metadata",
    "-1",
    "-c:a",
    audioCodec,
    "-b:a",
    audioBitrate,
    "-ac",
    "2",
  ];
  const segmentDir = join(publicDir, "audios", track);
  rmSync(segmentDir, { recursive: true, force: true });
  mkdirSync(segmentDir, { recursive: true });
  run([
    "ffmpeg",
    "-y",
    "-loglevel",
    "error",
    "-i",
    source,
    ...aac,
    "-f",
    "segment",
    "-segment_time",
    String(segmentSeconds),
    "-segment_format",
    "mp4",
    "-reset_timestamps",
    "1",
    join(segmentDir, "segment-%03d.m4a"),
  ]);
  return readdirSync(segmentDir).length;
}

function encodeImages() {
  const scratch = mkdtempSync(join(tmpdir(), "encode-assets-"));
  try {
    const attract = join(scratch, "mmi.png");
    run([
      "sips",
      "-Z",
      String(attractMaxEdge),
      join(publicDir, "images/mmi.png"),
      "--out",
      attract,
    ]);
    run([
      "cwebp",
      "-quiet",
      "-lossless",
      "-exact",
      attract,
      "-o",
      join(publicDir, "images/mmi.webp"),
    ]);

    const grass = join(scratch, "grass.png");
    run([
      "sips",
      "-z",
      String(grassSize),
      String(grassSize),
      join(publicDir, "images/texture-grass.png"),
      "--out",
      grass,
    ]);
    run([
      "cwebp",
      "-quiet",
      "-q",
      "90",
      "-alpha_q",
      "100",
      "-exact",
      grass,
      "-o",
      join(publicDir, `images/texture-grass-${grassSize}.webp`),
    ]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  for (const track of tracks) {
    console.log(`${basename(track)}: ${encodeTrack(track)} segments`);
  }
  encodeImages();
  console.log("images encoded");
}
