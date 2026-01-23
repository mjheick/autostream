import express from "express";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * ---------------- Constants ----------------
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 8888;
const FFMPEG_EXEC = '/usr/bin/ffmpeg';
const FFPROBE_EXEC = '/usr/bin/ffprobe';
const VIDEO_BASEPATH = '/home/heick/Desktop/repos/autostream/videos';
const SEGMENT_DIR = path.join(__dirname, "segments");
const SEGMENT_DURATION = 5;

/**
 * Where we're gonna make TS files
 */
fs.mkdirSync(SEGMENT_DIR, { recursive: true });

/**
 * ---------------- Utilities ----------------
 */

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) reject(stderr || err.message);
      else resolve(stdout);
    });
  });
}

async function getDuration(videoPath) {
  const out = await run(FFPROBE_EXEC, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    videoPath
  ]);
  return parseFloat(out.trim());
}

/**
 * ---------------- Media Playlist ----------------
 */
app.get("/:source/playlist.m3u8", async (req, res) => {
  const { source } = req.params;
  console.log(`GET /${source}/playlist.m3u8`);

  const videoPath = path.join(VIDEO_BASEPATH, `${source}`);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send("Video not found");
  }

  const duration = await getDuration(videoPath);
  const totalSegments = Math.ceil(duration / SEGMENT_DURATION);

  let start = 0;
  let end = totalSegments;

  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${SEGMENT_DURATION}`,
    `#EXT-X-MEDIA-SEQUENCE:${start}`
  ];

  for (let i = start; i < end; i++) {
    lines.push(`#EXTINF:${SEGMENT_DURATION.toFixed(3)},`);
    lines.push(`/segment/${source}/${i}.ts`);
  }
  lines.push("#EXT-X-ENDLIST");

  res.set('Access-Control-Allow-Origin', '*');
  res.type("application/vnd.apple.mpegurl");
  res.send(lines.join("\n"));
});

/**
 * ---------------- Segment Endpoint ----------------
 */
app.get("/segment/:source/:index.ts", async (req, res) => {
  const { source, index } = req.params;
  console.log(`GET /segment/${source}/${index}.ts`);
  const segIndex = parseInt(index, 10);

  if (Number.isNaN(segIndex) || segIndex < 0) {
    return res.sendStatus(404);
  }

  const videoPath = path.join(VIDEO_BASEPATH, `${source}`);
  if (!fs.existsSync(videoPath)) {
    return res.sendStatus(404);
  }

  const segPath = path.join(
    SEGMENT_DIR,
    `${source}_${segIndex}.ts`
  );

  try {
    if (!fs.existsSync(segPath)) {
      await run(FFMPEG_EXEC, [
        "-y",
        "-ss", String(segIndex * SEGMENT_DURATION),
        "-i", videoPath,
        "-t", String(SEGMENT_DURATION),
        "-copyts",
        "-avoid_negative_ts", "make_zero",
        "-c", "copy",
        "-force_key_frames", `expr:gte(t,n_forced*${SEGMENT_DURATION})`,
        "-f", "mpegts",
        segPath
      ]);

    }

    res.set('Access-Control-Allow-Origin', '*');
    res.type("video/MP2T");
    res.sendFile(segPath);
  } catch (err) {
    res.status(500).send(String(err));
  }
});

/**
 * ---------------- Start Server ----------------
 */
app.listen(PORT, () => {
  console.log(`autostream service running on port ${PORT}`);
});
