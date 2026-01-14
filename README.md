# autostream
A node.js service that helps stream video by converting in real time

# Requirements
- node >= 18
- ffmpeg >= 4.4

# Installation
```
npm init -y
npm install express lru-cache
```

# Capabilities
ABR (Adaptive Bitrate):
- http://localhost:8888/master.m3u8

VOD Playlist:
- http://localhost:8888/playlist.m3u8?source=sample_720

Live HLS:
- http://localhost:8888/playlist.m3u8?source=sample_720&live=1

Play in VLC / ffplay
- ffplay http://localhost:8888/master.m3u8
