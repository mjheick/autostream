import express from "express";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import LRU from "lru-cache";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8888;

const VIDEO_DIR = path.join(__dirname, "videos");
const SEGMENT_DIR = path.join(__dirname, "segments");
const SEGMENT_DURATION = 5;
const LIVE_WINDOW = 6; // segments kept for live playlists

fs.mkdirSync(SEGMENT_DIR, { recursive: true });

/* ---------------- Utilities ---------------- */

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) reject(stderr || err.message);
      else resolve(stdout);
    });
  });
}

async function getDuration(videoPath) {
  const out = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    videoPath
  ]);
  return parseFloat(out.trim());
}

/* ---------------- LRU Cache ---------------- */

const segmentCache = new LRU({
  max: 200,
  dispose: (value) => {
    if (fs.existsSync(value)) fs.unlinkSync(value);
  }
});

/* ---------------- ABR Master Playlist ---------------- */

app.get("/master.m3u8", (req, res) => {
  const source = req.query.source || "sample";

  const master = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=854x480",
    `/playlist.m3u8?source=${source}_480`,
    "#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720",
    `/playlist.m3u8?source=${source}_720`
  ];

  res.type("application/vnd.apple.mpegurl");
  res.send(master.join("\n"));
});

/* ---------------- Media Playlist ---------------- */

app.get("/playlist.m3u8", async (req, res) => {
  const source = req.query.source || "sample";
  const live = req.query.live === "1";

  const videoPath = path.join(VIDEO_DIR, `${source}.mp4`);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send("Video not found");
  }

  const duration = await getDuration(videoPath);
  const totalSegments = Math.ceil(duration / SEGMENT_DURATION);

  let start = 0;
  let end = totalSegments;

  if (live) {
    end = Math.floor(Date.now() / 1000 / SEGMENT_DURATION);
    start = Math.max(0, end - LIVE_WINDOW);
  }

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

  if (!live) lines.push("#EXT-X-ENDLIST");

  res.type("application/vnd.apple.mpegurl");
  res.send(lines.join("\n"));
});

/* ---------------- Segment Endpoint ---------------- */

app.get("/segment/:source/:index.ts", async (req, res) => {
  const { source, index } = req.params;
  const segIndex = parseInt(index, 10);

  if (Number.isNaN(segIndex) || segIndex < 0) {
    return res.sendStatus(404);
  }

  const videoPath = path.join(VIDEO_DIR, `${source}.mp4`);
  if (!fs.existsSync(videoPath)) {
    return res.sendStatus(404);
  }

  const segPath = path.join(
    SEGMENT_DIR,
    `${source}_${segIndex}.ts`
  );

  try {
    if (!fs.existsSync(segPath)) {
      await run("ffmpeg", [
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

      segmentCache.set(`${source}_${segIndex}`, segPath);
    }

    res.type("video/MP2T");
    res.sendFile(segPath);
  } catch (err) {
    res.status(500).send(String(err));
  }
});

/* ---------------- Start Server ---------------- */

app.listen(PORT, () => {
  console.log(`HLS service running on http://localhost:${PORT}`);
});
