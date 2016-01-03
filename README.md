# pcm-extract

> Extract PCM data from audio/video file with ffmpeg

## Usage

```javascript
const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv'
});
readable.on('readable', function(){
  const sample = readable.read();
  // sample is a number representing the sample value in [-1 ; 1]
});
```

This will spawn a [ffmpeg](http://ffmpeg.org) process so you need it up and running on your system.

## Reference

### Options

- `filepath`   string  - path to source file (required)
- `channels`   number  - number of audio channels, default `2`
- `sampleRate` number  - number of samples per channel per second, default `44100`
- `start`      number  - start time in ms, default begining of file
- `end`        number  - end time in ms, default end of file

### Output stream

`getStream()` returns a standard readable stream in **object mode** where each item is a
number representing the sample value in the range [-1, 1].
Samples alternate between channels, i.e. you get something like this :
- sample0: Left0
- sample1: Right0
- sample2: Left1
- sample3: Right1
- ...

## License

The MIT License (MIT) - Copyright (c) 2015 Alexandre Bintz <alexandre@bintz.io>  
See [LICENSE](LICENSE) file for full text.

Core code of this module is copied from module [pcm](https://www.npmjs.com/package/pcm) by [@jhurliman](https://www.npmjs.com/~jhurliman), licensed under the MIT License.
Copyright (c) 2012 Cull TV, Inc. <jhurliman@cull.tv>
