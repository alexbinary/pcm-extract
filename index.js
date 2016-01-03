/**
 * pcm-extract - Extract PCM data from audio/video file with ffmpeg
 *
 * The MIT License (MIT)
 * Copyright (c) 2016 Alexandre Bintz <alexandre@bintz.io>
 */

'use strict';

module.exports = {

  /**
   * Get readable stream of PCM data.
   *
   * @param opts object with following keys
   * - filepath      string   path to source file (required)
   * - channels      number   number of audio channels, default 2
   * - sampleRate    number   number of samples per channel per second, default 44100
   * - start         number   start time in ms, default begining of file
   * - end           number   end time in ms, default end of file
   * - init          function hook to init decode stream
   * - processSample function hook to process a decoded sample
   *
   * @return Readable stream in object mode, each item is a sample value
   *         values alternate between channels (L, R, L, R, ...)
   */
  getStream: function(opts) {

    const filepath   = opts.filepath   ;
    const channels   = opts.channels   ||     2 ;
    const sampleRate = opts.sampleRate || 44100 ;
    const start      = opts.start      ;
    const end        = opts.end        ;

    const fileStart    = start   !== undefined ?        start / 1000 :         0 ;
    const fileEnd      = end     !== undefined ?        end   / 1000 : undefined ;
    const fileDuration = fileEnd !== undefined ? fileEnd - fileStart : undefined ;

    // Code adapted from module `pcm` by @jhurliman - http://npmjs.com/pcm

    // Extract signed 16-bit little endian PCM data with ffmpeg
    // and pipe to stdout

    let args = [];
    if (fileStart) {  // seek input if specified start is non zero
      args = args.concat(['-ss', fileStart]);
    };
    args = args.concat(['-i', filepath]);
    if (fileDuration !== undefined) {
      args = args.concat(['-t', fileDuration]);
    }
    args = args.concat([
      '-f'     , 's16le'    ,
      '-ac'    , channels   ,
      '-acodec', 'pcm_s16le',
      '-ar'    , sampleRate ,
      '-y'     , 'pipe:1'   ,
    ]);

    return require('child_process')
          .spawn('ffmpeg', args)
          .stdout.pipe(getDecodeStream(opts));
  },

};

function getDecodeStream(opts) {

  const init = opts.init || function() {
  };
  const processSample = opts.processSample || function(sample) {
    this.push(this.sum/this.count);
  };

  var Transform = require('stream').Transform;

  function DecodeStream() {
    Transform.call(this, { readableObjectMode : true });

    this.oddByte = null;
    init.call(this);
  }
  require('util').inherits(DecodeStream, Transform);

  DecodeStream.prototype._transform = function(data, encoding, cb) {

    // Code adapted from module `pcm` by @jhurliman - http://npmjs.com/pcm

    var value;
    var i = 0;
    var dataLen = data.length;

    // If there is a leftover byte from the previous block, combine it with the
    // first byte from this block
    if (this.oddByte !== null) {
      value = ((data.readInt8(i++, true) << 8) | this.oddByte) / 32767.0;
      processSample.call(this, value);
    }

    for (; i < dataLen; i += 2) {
      value = data.readInt16LE(i, true) / 32767.0;
      processSample.call(this, value);
    }

    this.oddByte = (i < dataLen) ? data.readUInt8(i, true) : null;

    cb();
  }

  return new DecodeStream();
}
