import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ChromePlayer} from './player.js';

const YouTubeIndicator = GObject.registerClass(
class YouTubeIndicator extends PanelMenu.Button {
    _init(extensionPath) {
        super._init(0.0, 'YouTube Controls', true);

        const box = new St.BoxLayout({style_class: 'youtube-controls-box'});

        box.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(`${extensionPath}/icons/youtube-symbolic.svg`),
            style_class: 'system-status-icon',
        }));

        this._label = new St.Label({
            style_class: 'youtube-controls-label',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        box.add_child(this._label);

        this._playPauseIcon = new St.Icon({style_class: 'system-status-icon'});

        box.add_child(this._createButton(
            new St.Icon({icon_name: 'media-skip-backward-symbolic', style_class: 'system-status-icon'}),
            () => this._player.previous()));
        box.add_child(this._createButton(this._playPauseIcon, () => this._player.playPause()));
        box.add_child(this._createButton(
            new St.Icon({icon_name: 'media-skip-forward-symbolic', style_class: 'system-status-icon'}),
            () => this._player.next()));

        this.add_child(box);

        this._player = new ChromePlayer();
        this._player.connectObject('changed', () => this._sync(), this);
        this._sync();
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
        const title = this._player.title;

        this.visible = title !== '';
        this._label.text = title;
        this._playPauseIcon.icon_name = this._player.isPlaying
            ? 'media-playback-pause-symbolic'
            : 'media-playback-start-symbolic';
    }

    _onDestroy() {
        this._player.destroy();
        super._onDestroy();
    }
});

export default class YouTubeControlsExtension extends Extension {
    enable() {
        this._indicator = new YouTubeIndicator(this.path);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
