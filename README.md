# vrchat-jellyfin

[![Docker](https://github.com/orcachillin/vrchat-jellyfin/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/orcachillin/vrchat-jellyfin/actions/workflows/docker-publish.yml)

a Jellyfin client designed for VRChat

> [!IMPORTANT]
>
> ### What ships today
>
> Browse Jellyfin libraries in a HeroUI web UI, pick subtitles, and mint a **capability stream URL** (`/v/<id>`) you paste into VRChat / ChilloutVR / Resonite. Artwork is proxied through this app (`/img/...`) so browsers never see Jellyfin hostnames or API keys. See [docs/capability-urls.md](docs/capability-urls.md).
>
> ### Still aspirational
>
> Jellyfin cast / Chromecast-style remote control of the in-world player is **not** implemented. Seeking and splash/instruction streams are also open. Today's mint-and-paste flow is the practical workaround until cast exists.

handles requesting media from jellyfin in a format that can be played in vrchat, as well as proxying urls to bypass the risk of sharing a jellyfin api key

## Tips
- If the player has a switch between **Video** and **Stream**, use **Stream**
- I've personally had better luck with the Unity video player over the AVPro one, but both should work
- If you change the video encoding settings, 720p (the default) works best for most devices. I wouldn't go above 1080p unless you have a smaller group or high upload bandwitdh.

## Supported Platforms

- [x] VRChat
- [x] Chillout VR
- [x] Resonite

*These are just platforms that have been tested, feel free to PR with other platforms if you've tested on them*

## Docker

A docker image is provided for easy deployment:

### Running

Docker Compose (recommended):

```yaml
version: '3'
services:
  vrchat-jellyfin:
    image: ghcr.io/orcachillin/vrchat-jellyfin:master
    container_name: vrchat-jellyfin
    restart: unless-stopped
    ports:
      - 4000:4000
    environment:
      JELLYFIN_HOST: <http[s]://URL>
      JELLYFIN_USERNAME: <USERNAME>
      JELLYFIN_PASSWORD: <PASSWORD>
      AUDIO_BITRATE: 128000
      VIDEO_BITRATE: 3000000
      MAX_AUDIO_CHANNELS: 2
      MAX_HEIGHT: 720
      MAX_WIDTH: 1280
```

Docker CLI:

```bash
docker run -d \
--name vrchat-jellyfin \
--restart unless-stopped \
-p 4000:4000 \
-e JELLYFIN_HOST=<http[s]://URL> \
-e JELLYFIN_USERNAME=<USERNAME> \
-e JELLYFIN_PASSWORD=<PASSWORD> \
-e AUDIO_BITRATE: 128000 \
-e VIDEO_BITRATE: 3000000 \
-e MAX_HEIGHT: 720 \
-e MAX_WIDTH: 1280 \
ghcr.io/orcachillin/vrchat-jellyfin:master
```

## Installation (No Docker)

Install Node.js and npm

```bash
npm install
npm run build
```

Rename the `.env.example` file to `.env` and fill in the required fields.  

It's reccommended to use a process manager like pm2 to keep it running:

```bash
pm2 start dist/index.js --name vrc-jellyfin
pm2 save
```
Make sure to do `pm2 startup` if you haven't already so it autostarts

## Sample Caddy config

Caddy can be used to allow streaming to the web over HTTPS.

```
media.example.com {
        # VRChat (AVPro) doesn't like tls1.3
        tls {
                # Due to a lack of DHE support, you -must- use an ECDSA cert to support IE 11 on Windows 7
                ciphers TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
        }

        header Strict-Transport-Security "max-age=63072000"
        header X-Content-Type-Options nosniff

        header Content-Security-Policy "
        default-src 'self';
        style-src 'self';
        script-src 'self';
        font-src 'self';
        img-src data: 'self';
        form-action 'self';
        connect-src 'self';
        frame-ancestors 'none';
        "

        # Videos don't require sign-in, just the interface
        @auth {
                not path /v/*
        }

        basicauth @auth {
                vrcuser MY_PASSWORD_HASH # Password can be obtained with `caddy hash-password`
        }

        reverse_proxy 1.2.3.4:4000 {
        }
}
```

## Usage

Go to the web interface (default port is 4000), select media, and copy the link. Paste the link into the vrchat client to play the media.

## Progress

- [x] Jellyfin proxy 
- [x] Transcoding
- [ ] Subtitle Baking
- [ ] Audio track selection
- [x] Subtitle track selection
- [x] HeroUI web interface (browse libraries, mint capability URLs, proxy artwork)
- [ ] Support for the jellyfin cast api
- [ ] Video Stream generation (splash screen with instructions, etc)
- [x] Docker / GHCR (`ghcr.io/orcachillin/vrchat-jellyfin`)
- [ ] Seeking (not sure if this is possible)
