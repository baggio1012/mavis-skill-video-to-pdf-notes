# Why `imageio-ffmpeg` beats `winget` / GitHub release on Windows

When a Windows machine needs ffmpeg and the user has not installed it
manually, the typical reflex is `winget install Gyan.FFmpeg`. On modern
Windows (10/11, post-2024 builds) that path regularly fails in two ways:

1. **winget hangs on `DeliveryOptimization`**. Gyan.FFmpeg is ~200 MB;
   winget downloads via Microsoft Delivery Optimization (DOA), which on
   some networks stalls indefinitely after 100-200 MB. The 5-minute and
   10-minute timeouts both fired on the same download. There is no
   winget-level resume, so each retry re-downloads from scratch.
2. **GitHub release CDN is unreachable behind many Chinese proxies**.
   `gh-proxy.com`, `mirror.ghproxy.com`, `ghps.cc`, `gh.llkk.cc` all
   timed out from a Beijing/Shanghai ISP in May 2026. `github.akams.cn`
   responded 200 but returned a 404 HTML page, not the binary.

`imageio-ffmpeg` sidesteps both:

- It is a **PyPI wheel** that bundles a pre-compiled ffmpeg.exe (7.1
  essentials, ~80 MB on disk).
- `pip install imageio-ffmpeg` uses PyPI mirrors that generally work
  (清华 / 阿里 / 腾讯镜像 are configured by default on most Chinese
  Python installs).
- Once installed, resolve the absolute path with:

  ```python
  import imageio_ffmpeg
  print(imageio_ffmpeg.get_ffmpeg_exe())
  # -> C:\Program Files\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe
  ```

- The bundled binary supports the codecs you actually need for video →
  audio extraction: `libmp3lame` (MP3 encode), all common demuxers
  (mp4 / mkv / mov / webm), and a wide range of H.264 / H.265 / AV1
  decoders. It does **not** include some niche encoders (x264 encoding,
  some pro codecs), but those are not needed for the lecture/meeting
  PDF use case.

## Reusable command

```powershell
$ff = python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"
& $ff -hide_banner -loglevel warning -y `
    -i "input.mp4" -vn -ac 1 -ar 16000 -b:a 64k "output.mp3"
```

`-vn` drops the video stream, `-ac 1` forces mono (single-speaker
content), `-ar 16000` is the ASR-friendly sample rate, `-b:a 64k` keeps
the file small without losing consonants. For a 3 GB lecture mp4 with
~22 min of speech, expect ~80 MB output in ~25 s on a modern SSD.

## When `imageio-ffmpeg` is the wrong tool

- You need to **encode** video (e.g. produce an mp4 from frames) — its
  build does not include `libx264` for encoding (decode-only). Install
  Gyan.FFmpeg full build for that, or use `imageio-ffmpeg` plus a
  separate `x264` binary.
- You need ffmpeg's **filter graph** features (drawtext, overlay,
  complex filters) — bundled build has most common filters but not
  exotic ones. Same fallback as above.
- You are on Linux/macOS — imageio-ffmpeg works there too, but the
  system `apt install ffmpeg` / `brew install ffmpeg` path is
  frictionless and gives you the full build.
