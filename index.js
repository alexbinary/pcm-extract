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
   * @param opts object with following keys :
   *
   * - filepath string path to source file (required)
   *
   * - track number zero based index of track to read
   *                if omitted defaults to first track
   *
   * - start number start time in ms, if omitted file is read from the beginning
   *
   * - end number end time in ms, if omitted file is read until the end
   *
   * - channels number number of audio channels in the output stream
   *                   if input has more channels they will be downmixed
   *                   if omitted all channels are included without modification
   *
   * - sampleRate number number of samples per channel per second in the output stream
   *                     if input has a different sample rate it will be resampled
   *                     if omitted output frequency is the same as input frequency
   *
   * - init function hook to init decode stream
   *
   * - processSample function hook to process a decoded sample
   *
   * @return Readable stream in object mode, each item is a sample value,
   *         values alternate between channels, so if you have 2 channels,
   *         output looks like this :
   *         - sample 0 : Channel 0, sample 0
   *         - sample 1 : Channel 1, sample 0
   *         - sample 2 : Channel 0, sample 1
   *         - sample 3 : Channel 1, sample 1
   *         - ...
   */
  getStream: function(opts) {

    const filepath   = opts.filepath   ;
    const track      = opts.track      ;
    const start      = opts.start      ;
    const end        = opts.end        ;
    const channels   = opts.channels   ;
    const sampleRate = opts.sampleRate ;

    const fileStart    = start   !== undefined ?        start / 1000 :         0 ;
    const fileEnd      = end     !== undefined ?        end   / 1000 : undefined ;
    const fileDuration = fileEnd !== undefined ? fileEnd - fileStart : undefined ;

    // Code adapted from module `pcm` by @jhurliman - http://npmjs.com/pcm

    // Extract signed 16-bit little endian PCM data with ffmpeg
    // and pipe to stdout

    let args = [];

    // seek input if specified start is non zero
    if (fileStart) {
      args.push('-ss', fileStart);
    };

    // set input file
    args.push('-i', filepath);

    // set input duration if specified
    if (fileDuration !== undefined) {
      args.push('-t', fileDuration);
    }

    // output format & codec
    args.push('-f', 's16le');
    args.push('-acodec', 'pcm_s16le');

    // select audio track if specified
    // (defaults to first track if omitted)
    if (track !== undefined) {
      args.push('-map', `0:a:${track}`);
    }

    // set output channels if specified
    // (downmix if input has more, duplicate if input has less)
    if (channels !== undefined) {
      args.push('-ac', channels);
    }
    // set output frequency if specified
    // (resample if input frequency is different)
    if (sampleRate !== undefined) {
      args.push('-ar', sampleRate);
    }

    // write output to stdout
    args.push('pipe:');

    return require('child_process')
          .spawn('ffmpeg', args)
          .stdout.pipe(getDecodeStream(opts));
  },

};

function getDecodeStream(opts) {

  const init = opts.init || function() {
  };
  const processSample = opts.processSample || function(sample) {
    this.push(sample);
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
