// SPDX-License-Identifier: GPL-2.0-or-later
// Window Padding — Omarchy-style gaps between windows and the screen edges.
//
// GNOME Shell turns its panel/dock into "struts" and hands them to Mutter via
// Meta.Workspace.set_builtin_struts(); Mutter subtracts them from each
// monitor to get the work area that maximize, snapping and tiling extensions
// (Tiling Shell, Tiling Assistant...) fill. We wrap that call and grow every
// monitor edge by the configured padding on top of whatever is already there
// (top bar, fixed dock), so every work-area-aware window placement gets the
// gap for free. Fullscreen windows ignore the work area and stay edge to edge.
//
// Mutter drops struts on an edge shared with another monitor, so padding only
// applies on outer screen edges in multi-monitor setups.
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

const EDGES = [
    {key: 'padding-top', side: Meta.Side.TOP},
    {key: 'padding-right', side: Meta.Side.RIGHT},
    {key: 'padding-bottom', side: Meta.Side.BOTTOM},
    {key: 'padding-left', side: Meta.Side.LEFT},
];

// How far existing struts on `side` already reach into `monitor`.
function existingThickness(monitor, side, struts) {
    const monitorRect = new Mtk.Rectangle({
        x: monitor.x, y: monitor.y, width: monitor.width, height: monitor.height,
    });
    let thickness = 0;
    for (const strut of struts) {
        if (strut.side !== side || !strut.rect.overlap(monitorRect))
            continue;
        const r = strut.rect;
        switch (side) {
        case Meta.Side.TOP:
            thickness = Math.max(thickness, r.y + r.height - monitor.y);
            break;
        case Meta.Side.BOTTOM:
            thickness = Math.max(thickness, monitor.y + monitor.height - r.y);
            break;
        case Meta.Side.LEFT:
            thickness = Math.max(thickness, r.x + r.width - monitor.x);
            break;
        case Meta.Side.RIGHT:
            thickness = Math.max(thickness, monitor.x + monitor.width - r.x);
            break;
        }
    }
    return thickness;
}

function edgeRect(monitor, side, size) {
    switch (side) {
    case Meta.Side.TOP:
        return new Mtk.Rectangle({x: monitor.x, y: monitor.y, width: monitor.width, height: size});
    case Meta.Side.BOTTOM:
        return new Mtk.Rectangle({x: monitor.x, y: monitor.y + monitor.height - size, width: monitor.width, height: size});
    case Meta.Side.LEFT:
        return new Mtk.Rectangle({x: monitor.x, y: monitor.y, width: size, height: monitor.height});
    default:
        return new Mtk.Rectangle({x: monitor.x + monitor.width - size, y: monitor.y, width: size, height: monitor.height});
    }
}

export default class WindowPaddingExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._injections = new InjectionManager();

        const extension = this;
        this._injections.overrideMethod(Meta.Workspace.prototype, 'set_builtin_struts',
            original => function (struts) {
                original.call(this, extension._withPadding(struts));
            });

        this._settingsChangedId = this._settings.connect('changed',
            () => Main.layoutManager._queueUpdateRegions());
        Main.layoutManager._queueUpdateRegions();
    }

    disable() {
        this._settings.disconnect(this._settingsChangedId);
        this._settingsChangedId = null;
        this._injections.clear();
        this._injections = null;
        this._settings = null;
        // Recompute struts without our padding so windows grow back.
        Main.layoutManager._queueUpdateRegions();
    }

    _withPadding(struts) {
        if (!this._settings.get_boolean('enabled'))
            return struts;

        const padded = [...struts];
        for (const monitor of Main.layoutManager.monitors) {
            for (const {key, side} of EDGES) {
                const padding = this._settings.get_int(key);
                if (padding <= 0)
                    continue;
                const size = existingThickness(monitor, side, struts) + padding;
                padded.push(new Meta.Strut({rect: edgeRect(monitor, side, size), side}));
            }
        }
        return padded;
    }
}
