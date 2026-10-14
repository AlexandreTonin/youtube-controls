import System from 'system';

import {isYouTubeWindowFor} from '../youtube.js';

const cases = [
    ['Song - YouTube - Google Chrome', 'Song', true],
    ['(3) Song - YouTube - Google Chrome', 'Song', true],
    ['Song - YouTube - Google Chrome - Work', 'Song', true],
    ['Song - Twitch - Google Chrome', 'Song', false],
    ['Other - YouTube - Google Chrome', 'Song', false],
    ['YouTube - Google Chrome', '', false],
    ['Song (Live) - YouTube - Google Chrome', 'Song', false],
];

let failures = 0;
for (const [windowTitle, mediaTitle, expected] of cases) {
    const actual = isYouTubeWindowFor(windowTitle, mediaTitle);
    if (actual !== expected) {
        failures++;
        printerr(`FAIL: isYouTubeWindowFor(${JSON.stringify(windowTitle)}, ${JSON.stringify(mediaTitle)}) = ${actual}`);
    }
}

print(`${cases.length - failures}/${cases.length} passed`);
if (failures > 0)
    System.exit(1);
