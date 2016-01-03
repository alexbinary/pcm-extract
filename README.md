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
- `init`       function - hook for the decoding stream (see below)
- `processSample` function - hook for the decoding stream (see below)

### Output stream

`getStream()` returns a standard readable stream in **object mode** where each item is a
number representing the sample value in the range [-1, 1].
By default, all samples are returned and alternate between channels, i.e. you get something like this :
- sample0: Left0
- sample1: Right0
- sample2: Left1
- sample3: Right1
- ...

### Custom sample processing

Options `init` and `processSample` are functions that are called with `this` being the decoding stream, which is a standard
[Transform stream](https://nodejs.org/dist/latest-v5.x/docs/api/stream.html#stream_class_stream_transform).

- `init` is called in the constructor, use this to e.g. init variables
- `processSample` is called each time a sample is read and the sample value is passed as first argument. Call `this.push(sample)` inside the function to output the value on the stream.

For example, if you want to average samples over 10 values, you can do :
```javascript

const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv',
  init = function() {
    this.sum = 0;
    this.count = 0;
  },
  processSample = function(sample) {
    this.sum += sample;
    this.count +=1;
    if (this.count === 10) {
      this.push(this.sum/this.count);
      this.sum = 0;
      this.count = 0;
    }
  },
});

```

## License

The MIT License (MIT) - Copyright (c) 2015 Alexandre Bintz <alexandre@bintz.io>  
See [LICENSE](LICENSE) file for full text.

Core code of this module is copied from module [pcm](https://www.npmjs.com/package/pcm) by [@jhurliman](https://www.npmjs.com/~jhurliman), licensed under the MIT License.
Copyright (c) 2012 Cull TV, Inc. <jhurliman@cull.tv>
