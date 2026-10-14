import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ChromePlayer} from './player.js';
import {isYouTubeWindowFor} from './youtube.js';

const CHROME_WM_CLASS = 'google-chrome';

const YouTubeIndicator = GObject.registerClass(
class YouTubeIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'YouTube Controls');

        this.menu.addAction('Settings', () => extension.openPreferences());

        const box = new St.BoxLayout({style_class: 'youtube-controls-box'});

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(`${extension.path}/icons/youtube-symbolic.svg`),
            style_class: 'system-status-icon',
        });
        box.add_child(this._icon);

        this._label = new St.Label({
            style_class: 'youtube-controls-label',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        box.add_child(this._label);

        this._playPauseIcon = new St.Icon();

        this._controls = new St.BoxLayout();
        this._controls.add_child(this._createButton(
            new St.Icon({icon_name: 'media-skip-backward-symbolic'}),
            () => this._player.previous()));
        this._controls.add_child(this._createButton(this._playPauseIcon, () => this._player.playPause()));
        this._controls.add_child(this._createButton(
            new St.Icon({icon_name: 'media-skip-forward-symbolic'}),
            () => this._player.next()));
        box.add_child(this._controls);

        this.add_child(box);

        this._settings = extension.getSettings();
        this._settings.connectObject('changed', () => this._applySettings(), this);
        this._applySettings();

        this._youTubeTrackId = null;

        this._player = new ChromePlayer();
        this._player.connectObject('changed', () => this._sync(), this);

        global.display.list_all_windows().forEach(window => this._watchWindow(window));
        global.display.connectObject('window-created', (_display, window) => this._watchWindow(window), this);

        this._sync();
    }

    _applySettings() {
        this._icon.visible = this._settings.get_boolean('show-icon');
        this._label.visible = this._settings.get_boolean('show-title');
        this._controls.visible = this._settings.get_boolean('show-controls');
        this._label.style = `max-width: ${this._settings.get_int('max-title-width')}px;`;
    }

    _watchWindow(window) {
        window.connectObject('notify::title', () => this._sync(), this);
    }

    _isPlayingOnYouTube() {
        const {trackId, title} = this._player;

        if (!trackId)
            return false;

        if (trackId !== this._youTubeTrackId && this._hasYouTubeWindowFor(title))
            this._youTubeTrackId = trackId;

        return trackId === this._youTubeTrackId;
    }

    _hasYouTubeWindowFor(title) {
        return global.display.list_all_windows().some(window =>
            window.get_wm_class()?.toLowerCase() === CHROME_WM_CLASS &&
            isYouTubeWindowFor(window.get_title() ?? '', title));
    }

    _createButton(icon, onPress) {
        const button = new St.Button({style_class: 'youtube-controls-button', child: icon});

        button.connect('button-press-event', (_actor, event) => {
            if (event.get_button() !== Clutter.BUTTON_PRIMARY)
                return Clutter.EVENT_PROPAGATE;

            onPress();
            return Clutter.EVENT_STOP;
        });

        return button;
    }

    _sync() {
        this.visible = this._isPlayingOnYouTube();
        this._label.text = this._player.title;
        this._playPauseIcon.icon_name = this._player.isPlaying
            ? 'media-playback-pause-symbolic'
            : 'media-playback-start-symbolic';
    }

    _onDestroy() {
        this._settings.disconnectObject(this);
        global.display.disconnectObject(this);
        global.display.list_all_windows().forEach(window => window.disconnectObject(this));
        this._player.destroy();
        super._onDestroy();
    }
});

export default class YouTubeControlsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._settings.connectObject(
            'changed::position', () => this._addIndicator(),
            'changed::position-index', () => this._addIndicator(),
            this);
        this._addIndicator();
    }

    disable() {
        this._settings.disconnectObject(this);
        this._settings = null;
        this._indicator.destroy();
        this._indicator = null;
    }

    _addIndicator() {
        this._indicator?.destroy();
        this._indicator = new YouTubeIndicator(this);
        Main.panel.addToStatusArea(
            this.uuid,
            this._indicator,
            this._settings.get_int('position-index'),
            this._settings.get_string('position'));
    }
}
