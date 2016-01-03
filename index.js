/**
 * pcm-extract - Extract PCM data from audio/video file with ffmpeg
 *
 * The MIT License (MIT)
 * Copyright (c) 2015 Alexandre Bintz <alexandre@bintz.io>
 */

'use strict';

module.exports = {

  /**
   * Get readable stream of PCM data.
   *
   * @param opts object with following keys
   * - filepath   string  path to source file (required)
   * - channels   number  number of audio channels, default 2
   * - sampleRate number  number of samples per channel per second, default 44100
   * - mixed      boolean true returns one channel where each sample is the
   *                      average on all channels, default false
   * - aggregate  number  average sample values on {aggregate} samples,
   *                      so you get {aggregate} times less total samples
   *                      default 1 (no aggregation)
   * - start      number  start time in ms, default begining of file
   * - end        number  end time in ms, default end of file
   *
   * @return Readable stream in object mode, each item is a sample value
   *         if not mixed, values alternate between channels (L, R, L, R, ...)
   */
  getStream: function(opts) {

    const filepath   = opts.filepath ;
    const channels   = opts.channels   ||     2 ;
    const sampleRate = opts.sampleRate || 44100 ;
    const mixed      = opts.mixed !== undefined ? opts.mixed : false ;
    const aggregate  = opts.aggregate || 1 ;
    const start      = opts.start ;
    const end        = opts.end   ;

    return getRawStream({
      filepath   : filepath   ,
      channels   : channels   ,
      sampleRate : sampleRate ,
      start      : start      ,
      end        : end        ,
    }).pipe(getDecodeStream({
      channels   : channels   ,
      mixed      : mixed      ,
      aggregate  : aggregate  ,
    }));
  },

};

/**
 * Get readable stream of raw binary PCM data.
 *
 * @param opts object with following keys :
 * - filepath   string  path to source file (required)
 * - channels   number  number of audio channels
 * - sampleRate number  number of samples per channel per second
 * - start      number  start time in ms, undefined means begining of file
 * - end        number  end time in ms, undefined means end of file
 *
 * @return Readable stream of raw binary data.
 */
function getRawStream(opts) {

  const filepath   = opts.filepath   ;
  const channels   = opts.channels   ;
  const sampleRate = opts.sampleRate ;
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

  return require('child_process').spawn('ffmpeg', args).stdout;
}

/**
 * Get transform stream which decodes raw binary PCM data.
 * Pipeable from a stream returned by getRawStream().
 *
 * @param opts object with following keys :
 * - channels   number  number of audio channels
 * - mixed      boolean true returns one channel where each sample is the
 *                      average on all channels
 * - aggregate  number  average sample values on {aggregate} samples,
 *                      so you get {aggregate} times less total samples
 *
 * @return Readable stream in object mode, each item is a sample value
 *         if not mixed, values alternate between channels (L, R, L, R, ...)
 */
function getDecodeStream(opts) {

  const channels   = opts.channels  ;
  const mixed      = opts.mixed     ;
  const aggregate  = opts.aggregate ;

  var Transform = require('stream').Transform;

  function DecodeStream() {
    Transform.call(this, { readableObjectMode : true });

    this.aggregSums = [];
    this.aggregCounts = [];
    for (let c=0, l=channels; c<l; c++) {
      this.aggregSums[c] = 0;
      this.aggregCounts[c] = 0;
    }
    this.mixSum = 0;
    this.mixCount = 0;

    this.oddByte = null ;
    this.channel =    0 ;
  }
  require('util').inherits(DecodeStream, Transform);

  DecodeStream.prototype.mixSample = function(sample, channel) {

    if (mixed) {

      this.mixSum += sample;
      this.mixCount += 1;

      if (this.mixCount === channels) {

        this.aggregateSample(this.mixSum/this.mixCount, 0);

        this.mixSum = 0;
        this.mixCount = 0;
      }

    } else {

      this.aggregateSample(sample, channel);
    }
  }

  DecodeStream.prototype.aggregateSample = function(sample, channel) {

    if (aggregate) {

      this.aggregSums[channel] += sample;
      this.aggregCounts[channel] += 1;

      if (this.aggregCounts[channel] === aggregate) {

        this.push(this.aggregSums[channel] / this.aggregCounts[channel]);

        this.aggregSums[channel] = 0;
        this.aggregCounts[channel] = 0;
      }

    } else {

      this.push(sample);
    }
  }

  DecodeStream.prototype._transform = function(data, encoding, cb) {

    // Code adapted from module `pcm` by @jhurliman - http://npmjs.com/pcm

    var value;
    var i = 0;
    var dataLen = data.length;

    // If there is a leftover byte from the previous block, combine it with the
    // first byte from this block
    if (this.oddByte !== null) {
      value = ((data.readInt8(i++, true) << 8) | this.oddByte) / 32767.0;
      this.mixSample(value, this.channel);
      this.channel = ++this.channel % channels;
    }

    for (; i < dataLen; i += 2) {
      value = data.readInt16LE(i, true) / 32767.0;
      this.mixSample(value, this.channel);
      this.channel = ++this.channel % channels;
    }

    this.oddByte = (i < dataLen) ? data.readUInt8(i, true) : null;

    cb();
  }

  return new DecodeStream();
}
