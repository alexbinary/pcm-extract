# pcm-extract

> Extract PCM data from audio/video file with ffmpeg

This module lets you extract a [PCM representation](https://en.wikipedia.org/wiki/Pulse-code_modulation) of the audio from any audio or video file using [ffmpeg](http://ffmpeg.org). You can get every PCM sample values on every channels from either the entire file or just a subsection as a readable stream.

You need ffmpeg up and running to use this module.

## Usage

```javascript
/* get PCM samples as a readable stream */

const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv'
});

/* consume stream */

readable.on('readable', function(){
  const sample = readable.read(); // sample value in [-1 ; 1]
});
```

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
By default, all samples are returned and alternate between channels, i.e. for classic stereo :
- sample 0: Left channel, sample 0
- sample 1: Right channel, sample 0
- sample 2: Left channel, sample 1
- sample 3: Right channel, sample 1
- ...

### Samples preprocessing

The functions you pass in `init` and `processSample` are called by the decoding stream and let you implement custom samples preprocessing like subsampling, filters, etc. In most cases using these hooks gives better performance than piping into a transform stream.

Inside the functions `this` is set to the decoding stream instance, which is a standard [Transform stream](https://nodejs.org/dist/latest-v5.x/docs/api/stream.html#stream_class_stream_transform).

- `init` is called in the constructor, you can use it to init the variables you need
- `processSample` is called each time a sample is read and the sample value is passed as first argument. Call `this.push(value)` inside the function when you want to output a value on the stream (you don't have to do it each time)

For example, this discards samples of the first channel :
```javascript

const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv',
  init: function() {
    this.chan = 0;
  },
  processSample: function(sample) {
    this.chan = ++this.chan%2;
    if (this.chan === 1) {
      this.push(sample);
    }
  },
});

```


## License

The MIT License (MIT) - Copyright (c) 2016 Alexandre Bintz <alexandre@bintz.io>  
See [LICENSE](LICENSE) file for full text.

Core code of this module is copied from module [pcm](https://www.npmjs.com/package/pcm) by [@jhurliman](https://www.npmjs.com/~jhurliman), licensed under the MIT License.
Copyright (c) 2012 Cull TV, Inc. <jhurliman@cull.tv>
