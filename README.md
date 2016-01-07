# pcm-extract

> Extract PCM data from audio/video file with ffmpeg

This module lets you extract a [PCM representation](https://en.wikipedia.org/wiki/Pulse-code_modulation) of the audio from any audio or video file using [ffmpeg](http://ffmpeg.org). You get access to every single PCM sample value on every available channels and audio tracks in the file as a native readable stream.

You need ffmpeg up and running to use this module.

## Basic usage

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

## Advanced usage

```javascript
/* read only a subsection of the file */

const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv',
  start: 1000 * 60 * 23,  // start at 23rd minute
  end: 1000 * 60 * 56,  // end at 56th minute
});


/* read second audio track in file */

const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv',
  track: 1,
});


/* downmix all channels into one */

const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv',
  channels: 1,
});


/* resample audio */

const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv',
  sampleRate: 44100, // the stream you get has 44100 samples per second for each channel
});


/* pre process samples */

const readable = require('pcm-extract').getStream({
  filepath: '/Users/John/video.mkv',
  init: function() {
    this.out = 0;
  },
  processSample: function(sample) {
    // basic low-pass filter
    this.out += 0.001 * (sample - this.out);
    this.push(this.out);
  },
});
```


## Reference


### Options

#### `filepath` string, required

Path to input file.

#### `channels` number, optional

Number of audio channels in the output stream.

By default you get all channels present in the input file. If you set this to a value less than the number of channels in the input, ffmpeg merges them in the way that makes the most sense.

Example uses cases :
- 5.1 (6 channels) -> standard stereo (2 channels)
- multiple channels -> all merged into 1 channel

#### `sampleRate` number, optional

Sample rate of the output in Hz, i.e. the number of samples per channel per second in the output stream.

By default the output stream has the same sample rate as the input. If you set this to a different value then the input will be resampled to the specified frequency.

#### `start` number, optional

Position in time to start reading the input, in milliseconds.

By default the input is read from the beginning. If you set this you only get samples after the specified time.

#### `end` number, optional

Position in time to stop reading the input, in milliseconds.

By default the input is read until the end. If you set this you only get samples before the specified time.

#### `init` function, optional

Initialization hook for the decoding stream.

Raw data extracted by ffmpeg is piped to a [transform stream](https://nodejs.org/dist/latest-v5.x/docs/api/stream.html#stream_class_stream_transform) that decodes the samples into Javascript numbers.
The provided hooks let you customize how the samples are processed before they are output on the final stream. The functions you provide are called with `this` set to the Transform stream object. Using these hooks to process the samples is more efficient than piping into an external transform stream.

Use this hook to perform any initializations you might need for your decoding logic.

#### `processSample` function, optional

Processing hook for the decoding stream.

Use this hook to process a sample that has just been decoded. The function receives the sample value in range [-1, 1] as first argument, and you must use `this.push(value)` to output a value on the final stream. You do not have to output a value for each call of that function.


### Output stream

`getStream()` returns a standard readable stream in **object mode** where each item is a
number representing the sample value in the range [-1, 1].
You listen to the `readable` event to know when data is available and call `readable.read()` to get one sample as a number.
By default, all samples are returned and alternate between channels, i.e. this is what you get for classic stereo (2 channels) :
- sample 0: Left channel, sample 0
- sample 1: Right channel, sample 0
- sample 2: Left channel, sample 1
- sample 3: Right channel, sample 1
- ...


## License

The MIT License (MIT) - Copyright (c) 2016 Alexandre Bintz <alexandre@bintz.io>  
See [LICENSE](LICENSE) file for full text.

Largely inspired by module [pcm](https://www.npmjs.com/package/pcm) by [@jhurliman](https://www.npmjs.com/~jhurliman), from which the core code of this module was originally copied.  
The MIT License - Copyright (c) 2012 Cull TV, Inc. <jhurliman@cull.tv>
