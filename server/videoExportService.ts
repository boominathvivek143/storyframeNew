import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function transcodeWebmFileToMp4(inputPath: string): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error('ffmpeg binary not available on this server');
  }

  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(8).toString('hex');
  const outputPath = path.join(tmpDir, `storyframe_${id}_out.mp4`);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          // H.264 Main Profile Level 4.0 is universally compatible with macOS QuickTime,
          // iOS AVPlayer, Windows Media Player, Android, Premiere Pro, and social platforms.
          '-profile:v main',
          '-level:v 4.0',
          '-preset veryfast',
          '-crf 20',
          '-pix_fmt yuv420p',
          // Force even width/height so odd dimension crops never crash libx264/yuv420p
          '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
          // Explicit BT.709 color tagging - without this, QuickTime & Apple devices
          // flag the video as an unsupported version or display a black screen
          '-colorspace bt709',
          '-color_primaries bt709',
          '-color_trc bt709',
          // avc1 fourcc tag is strictly required by Apple QuickTime and iOS Photos app
          '-tag:v avc1',
          // Enforce constant 30 FPS to normalize Variable Frame Rate (VFR) timestamps from MediaRecorder
          '-fps_mode cfr',
          '-r 30',
          // Universal AAC stereo 44.1kHz audio parameters
          '-b:a 192k',
          '-ar 44100',
          '-ac 2',
          // Place moov atom at beginning of MP4 for immediate streaming and playback
          '-movflags +faststart',
        ])
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .save(outputPath);
    });
    return await fs.promises.readFile(outputPath);
  } finally {
    await fs.promises.unlink(outputPath).catch(() => {});
  }
}

/**
 * Transcodes a browser-recorded WebM (VP8/VP9 video + Opus audio, the only
 * format MediaRecorder can actually produce in Chrome/Firefox) into an MP4
 * (H.264 + AAC, yuv420p, faststart) -- the format that's actually widely
 * playable and shareable (some platforms and older devices reject WebM
 * outright).
 */
export async function transcodeWebmToMp4(webmBuffer: Buffer): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(8).toString('hex');
  const inputPath = path.join(tmpDir, `storyframe_${id}_in.webm`);

  await fs.promises.writeFile(inputPath, webmBuffer);

  try {
    return await transcodeWebmFileToMp4(inputPath);
  } finally {
    await fs.promises.unlink(inputPath).catch(() => {});
  }
}
