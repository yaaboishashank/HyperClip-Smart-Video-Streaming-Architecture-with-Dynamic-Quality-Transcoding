import { spawn } from "node:child_process";
import path from "node:path";

export function runTool(command, args, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      signal,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";
    let processError;

    child.stdout.on("data", (chunk) => {
      output = (output + chunk).slice(-1000000);
    });

    child.stderr.on("data", (chunk) => {
      errorOutput = (errorOutput + chunk).slice(-8000);
    });

    // Wait for "close" so file handles are closed before cleanup.
    child.on("error", (error) => {
      processError = error;
    });

    child.on("close", (code) => {
      if (processError) {
        reject(processError);
      } else if (signal?.aborted) {
        reject(new Error("Video processing was interrupted."));
      } else if (code === 0) {
        resolve(output);
      } else {
        reject(
          new Error(
            errorOutput ||
              `${command} exited with code ${code}`
          )
        );
      }
    });
  });
}

export async function inspectVideo(file, signal) {
  const raw = await runTool(
    process.env.FFPROBE_PATH || "ffprobe",
    [
      "-v", "error",
      "-protocol_whitelist", "file,pipe",
      "-show_streams",
      "-show_format",
      "-of", "json",
      file,
    ],
    signal
  );

  const data = JSON.parse(raw);

  const stream = data.streams?.find(
    (item) =>
      item.codec_type === "video" &&
      !item.disposition?.attached_pic
  );

  const duration = Number(data.format?.duration);

  if (
    !stream ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 600
  ) {
    throw new Error(
      "Use a valid video up to 10 minutes long."
    );
  }

  const [a, b] = (stream.sample_aspect_ratio || "1:1")
    .split(":")
    .map(Number);

  let width =
    Number(stream.width) *
    (a > 0 && b > 0 ? a / b : 1);

  let height = Number(stream.height);

  const rotation = Number(
    stream.side_data_list?.find(
      (item) => item.rotation != null
    )?.rotation ??
      stream.tags?.rotate ??
      0
  );

  if (Math.abs(rotation) % 180 === 90) {
    [width, height] = [height, width];
  }

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 2 ||
    height < 2
  ) {
    throw new Error("Invalid video dimensions.");
  }

  return {
    width,
    height,
    duration,
    streamIndex: stream.index,
  };
}

export function outputProfiles(info) {
  const shortSide = Math.min(info.width, info.height);

  if (!Number.isFinite(shortSide) || shortSide < 2) {
    throw new Error("Invalid source dimensions.");
  }

  // Never upscale. Maximum output short side is 720 pixels.
  const sourceSize =
    Math.floor(Math.min(shortSide, 720) / 2) * 2;

  const sizes = [
    ...new Set([
      ...[240, 360, 480, 720].filter(
        (size) => size <= sourceSize
      ),
      sourceSize,
    ]),
  ].sort((a, b) => a - b);

  return sizes.map((size) => {
    const ratio = size / shortSide;

    return {
      label: `${size}p`,
      width: Math.max(
        2,
        Math.floor((info.width * ratio) / 2) * 2
      ),
      height: Math.max(
        2,
        Math.floor((info.height * ratio) / 2) * 2
      ),
    };
  });
}

export async function encodeVideo(
  input,
  directory,
  profile,
  info,
  signal
) {
  const output = path.join(
    directory,
    `${profile.label}.mp4`
  );

  await runTool(
    process.env.FFMPEG_PATH || "ffmpeg",
    [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-y",
      "-protocol_whitelist", "file,pipe",
      "-i", input,
      "-map", `0:${info.streamIndex}`,
      "-map", "0:a:0?",
      "-vf",
      `scale=${profile.width}:${profile.height},setsar=1`,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "24",
      "-pix_fmt", "yuv420p",
      "-threads", "2",
      "-filter_threads", "1",
      "-c:a", "aac",
      "-b:a", "96k",
      "-ac", "2",
      "-map_metadata", "-1",
      "-movflags", "+faststart",
      output,
    ],
    signal
  );

  return output;
}