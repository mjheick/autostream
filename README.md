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

# Capabilities
ABR (Adaptive Bitrate):
- http://localhost:8888/master.m3u8

VOD Playlist:
- http://localhost:8888/playlist.m3u8?source=sample_720

Live HLS:
- http://localhost:8888/playlist.m3u8?source=sample_720&live=1

Play in VLC / ffplay
- ffplay http://localhost:8888/master.m3u8

# Dependencies
- https://github.com/videojs/video.js
- https://getbootstrap.com/docs/5.3/getting-started/introduction/

# Cool things
- https://download.blender.org/peach/bigbuckbunny_movies/