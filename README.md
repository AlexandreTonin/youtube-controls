# YouTube Controls

A GNOME Shell extension that puts whatever you're watching on YouTube in the top bar: video title, previous, play/pause and next. It's for when the video is in a Chrome window three workspaces away and you only want to pause it.

It only works with Google Chrome and only shows up for YouTube. Other media in Chrome, like Twitch or a podcast site, is ignored.

## Install

You need GNOME Shell 45 or newer and Google Chrome.

```sh
git clone https://github.com/AlexandreTonin/youtube-controls.git \
  ~/.local/share/gnome-shell/extensions/youtube-controls@AlexandreTonin
```

Log out and back in (on Wayland, GNOME Shell can't be restarted in place), then enable it:

```sh
gnome-extensions enable youtube-controls@AlexandreTonin
```

## Settings

Open them from the Extensions app, or with `gnome-extensions prefs youtube-controls@AlexandreTonin`. Changes apply right away.

- Show or hide the YouTube icon, the video title and the playback buttons
- Maximum title width, in pixels (longer titles get an ellipsis)
- Which area of the top bar the indicator sits in (left, center or right) and its order among the items already there

## How it works

Chrome already publishes its media sessions over [MPRIS](https://specifications.freedesktop.org/mpris-spec/latest/), the D-Bus interface Linux desktops use for media keys. It registers as `org.mpris.MediaPlayer2.chromium.instanceN`, and `N` changes every time Chrome starts. The extension doesn't look for a fixed name. It watches the `org.mpris.MediaPlayer2.chromium` namespace and attaches to whichever instance appears.

Playback controls are plain MPRIS calls: `Previous`, `PlayPause`, `Next`. The title and play state come from `PropertiesChanged` signals, so there's no polling.

Deciding whether the media is from YouTube is the harder part. Chrome's MPRIS metadata doesn't include the page URL, so a YouTube video and a Twitch stream look the same from D-Bus. The extension uses the window title instead: a Chrome window with a YouTube tab in front is titled `<video title> - YouTube - Google Chrome`. When that title matches the `xesam:title` Chrome reports, the extension remembers the track's `mpris:trackid` as YouTube. The indicator then stays up even after you switch tabs.

The code is three small files:

| File | Role |
| --- | --- |
| `player.js` | Finds Chrome on D-Bus and wraps the MPRIS player |
| `youtube.js` | Matches a window title against a media title |
| `extension.js` | The top bar indicator |

## Limitations

These come from relying on window titles. They aren't planned fixes.

- The YouTube tab has to be the active tab of its window at least once while the video is playing. A video started in a background tab you never look at won't show up.
- If YouTube and another site are both playing, Chrome exposes only one media session over MPRIS, and that's the one you'll see.
- Chromium, Brave and other Chromium-based browsers register under the same D-Bus name, but their windows aren't `google-chrome`, so they're ignored.

## Development

The title matcher has a small test that runs with plain `gjs`, no GNOME Shell needed:

```sh
gjs -m test/youtube.test.js
```

To try the extension without logging out, run a nested shell:

```sh
dbus-run-session -- gnome-shell --nested --wayland
```

The nested shell has its own D-Bus session, so Chrome has to be started inside it.

The compiled schema (`schemas/gschemas.compiled`) is committed so a plain `git clone` works. If you change the XML schema, recompile it before committing:

```sh
glib-compile-schemas --strict schemas/
```

Logs show up in `journalctl -f -o cat /usr/bin/gnome-shell`.

## Credits

[spotify-controls](https://github.com/Sonath21/spotify-controls) by Sonath21 is the reference for how a panel indicator drives an MPRIS player. It also documents the GNOME 49/50 quirk where nested `St.Button`s stop emitting `clicked`. No code was copied from it.

## License

GPL-3.0. See [LICENSE](LICENSE).
