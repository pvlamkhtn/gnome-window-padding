// SPDX-License-Identifier: GPL-2.0-or-later
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SIDES = [
    ['padding-top', 'Top'],
    ['padding-right', 'Right'],
    ['padding-bottom', 'Bottom'],
    ['padding-left', 'Left'],
];

export default class WindowPaddingPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();

        const general = new Adw.PreferencesGroup({
            title: 'Window padding',
            description: 'Gap between windows and the screen edges. Changes apply instantly.',
        });
        const enabledRow = new Adw.SwitchRow({
            title: 'Enable padding',
            subtitle: 'Turn off to get the stock GNOME layout back',
        });
        settings.bind('enabled', enabledRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        general.add(enabledRow);
        page.add(general);

        const sides = new Adw.PreferencesGroup({title: 'Padding (px)'});
        settings.bind('enabled', sides, 'sensitive', Gio.SettingsBindFlags.GET);

        const allRow = new Adw.SpinRow({
            title: 'All sides',
            subtitle: 'Set every side to the same value',
            adjustment: new Gtk.Adjustment({lower: 0, upper: 300, step_increment: 1, page_increment: 10}),
        });
        allRow.value = settings.get_int('padding-top');
        allRow.connect('notify::value', () => {
            for (const [key] of SIDES)
                settings.set_int(key, Math.round(allRow.value));
        });
        sides.add(allRow);

        for (const [key, title] of SIDES) {
            const row = new Adw.SpinRow({
                title,
                adjustment: new Gtk.Adjustment({lower: 0, upper: 300, step_increment: 1, page_increment: 10}),
            });
            settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
            sides.add(row);
        }
        page.add(sides);

        window.add(page);
    }
}
