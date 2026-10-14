import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const VISIBILITY_SWITCHES = [
    ['show-icon', 'YouTube icon'],
    ['show-title', 'Video title'],
    ['show-controls', 'Playback controls'],
];

const POSITIONS = [
    ['left', 'Left'],
    ['center', 'Center'],
    ['right', 'Right'],
];

export default class YouTubeControlsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();

        page.add(this._createDisplayGroup(settings));
        page.add(this._createPositionGroup(settings));
        window.add(page);
    }

    _createDisplayGroup(settings) {
        const group = new Adw.PreferencesGroup({title: 'Display'});

        for (const [key, title] of VISIBILITY_SWITCHES) {
            const row = new Adw.SwitchRow({title});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            group.add(row);
        }

        const widthRow = Adw.SpinRow.new_with_range(50, 1000, 10);
        widthRow.title = 'Maximum title width';
        widthRow.subtitle = 'In pixels. Longer titles are cut with an ellipsis.';
        settings.bind('max-title-width', widthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(widthRow);

        return group;
    }

    _createPositionGroup(settings) {
        const group = new Adw.PreferencesGroup({title: 'Position'});

        const row = new Adw.ComboRow({
            title: 'Area of the top bar',
            model: Gtk.StringList.new(POSITIONS.map(([, label]) => label)),
            selected: POSITIONS.findIndex(([value]) => value === settings.get_string('position')),
        });
        row.connect('notify::selected', () => {
            settings.set_string('position', POSITIONS[row.selected][0]);
        });
        group.add(row);

        const indexRow = Adw.SpinRow.new_with_range(0, 20, 1);
        indexRow.title = 'Order within the area';
        indexRow.subtitle = '0 puts it first. Each step moves it one item to the right.';
        settings.bind('position-index', indexRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(indexRow);

        return group;
    }
}
