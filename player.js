import Gio from 'gi://Gio';
import * as Signals from 'resource:///org/gnome/shell/misc/signals.js';

const BUS_NAMESPACE = 'org.mpris.MediaPlayer2.chromium';
const OBJECT_PATH = '/org/mpris/MediaPlayer2';

const PlayerIface = `
<node>
  <interface name="org.mpris.MediaPlayer2.Player">
    <method name="Previous"/>
    <method name="Next"/>
    <method name="PlayPause"/>
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="Metadata" type="a{sv}" access="read"/>
  </interface>
</node>`;

const PlayerProxy = Gio.DBusProxy.makeProxyWrapper(PlayerIface);

export class ChromePlayer extends Signals.EventEmitter {
    constructor() {
        super();

        this._proxy = null;
        this._busName = null;
        this._cancellable = new Gio.Cancellable();

        this._nameOwnerChangedId = Gio.DBus.session.signal_subscribe(
            'org.freedesktop.DBus',
            'org.freedesktop.DBus',
            'NameOwnerChanged',
            '/org/freedesktop/DBus',
            BUS_NAMESPACE,
            Gio.DBusSignalFlags.MATCH_ARG0_NAMESPACE,
            this._onNameOwnerChanged.bind(this));

        this._findPlayer();
    }

    get title() {
        return this._metadataValue('xesam:title') ?? '';
    }

    get trackId() {
        return this._metadataValue('mpris:trackid') ?? '';
    }

    get isPlaying() {
        return this._proxy?.PlaybackStatus === 'Playing';
    }

    previous() {
        this._proxy?.PreviousAsync().catch(logError);
    }

    playPause() {
        this._proxy?.PlayPauseAsync().catch(logError);
    }

    next() {
        this._proxy?.NextAsync().catch(logError);
    }

    destroy() {
        this._cancellable.cancel();
        Gio.DBus.session.signal_unsubscribe(this._nameOwnerChangedId);
        this._disconnectProxy();
    }

    _metadataValue(key) {
        return this._proxy?.Metadata?.[key]?.deepUnpack();
    }

    _onNameOwnerChanged(_connection, _sender, _path, _iface, _signal, parameters) {
        const [name, , newOwner] = parameters.deepUnpack();

        if (newOwner && !this._busName)
            this._connect(name);
        else if (!newOwner && name === this._busName)
            this._findPlayer();
    }

    _findPlayer() {
        this._disconnectProxy();

        Gio.DBus.session.call(
            'org.freedesktop.DBus',
            '/org/freedesktop/DBus',
            'org.freedesktop.DBus',
            'ListNames',
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            this._cancellable,
            (connection, result) => {
                try {
                    const [names] = connection.call_finish(result).deepUnpack();
                    const busName = names.find(name => name.startsWith(`${BUS_NAMESPACE}.`));
                    if (busName && !this._busName)
                        this._connect(busName);
                } catch (e) {
                    if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                        logError(e);
                }
            });
    }

    _connect(busName) {
        this._busName = busName;

        new PlayerProxy(Gio.DBus.session, busName, OBJECT_PATH, (proxy, error) => {
            if (error) {
                if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    logError(error);
                return;
            }

            if (busName !== this._busName)
                return;

            this._proxy = proxy;
            this._proxy.connectObject('g-properties-changed', () => this.emit('changed'), this);
            this.emit('changed');
        }, this._cancellable);
    }

    _disconnectProxy() {
        this._proxy?.disconnectObject(this);
        this._proxy = null;
        this._busName = null;
        this.emit('changed');
    }
}
