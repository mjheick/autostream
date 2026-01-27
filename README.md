# autostream
A node.js service that helps stream video by converting in real time

# Requirements
- node >= 18
- ffmpeg >= 4.4

# Setup
```
npm install
node .
```

# Endpoints

A List of supported endpoints this service exposes

## /filename/playlist.m3u8

This provides a m3u8 playlist to stream AV content.

filename is an actual file present in VIDEO_BASEPATH.

## /segments/filename/x.ts

This is the endpoints defined in playlist.m3u8 that deliver mpegts videos.

Segments are created from the video referenced and stored in SEGMENT_DIR.

# Stuff
sample.html shows a fully working example using video.js and bootstrap 5

# Dependencies
- https://github.com/videojs/video.js
- https://getbootstrap.com/docs/5.3/getting-started/introduction/

# Cool things
- https://download.blender.org/peach/bigbuckbunny_movies/