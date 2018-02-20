import { Euler } from 'three';
import Coordinates from './Geographic/Coordinates';

function toCoord(ori, offset) {
    return new Coordinates('EPSG:2154', ori.easting + offset.x, ori.northing + offset.y, ori.altitude + offset.z);
}

function toOriMicMac(ori) {
    const d2r = Math.PI / 180;
    return new Euler(
        ori.roll * d2r,
        ori.pitch * d2r,
        ori.heading * d2r,
        'XYZ');
}

export const micMacConvert = {
    toCoord,
    toOri: toOriMicMac,
    offset: {
        x: 0,
        y: 0,
        z: 0,
    },
};

export default {

    decode(arrayOE, convert) {
        if (!arrayOE || !(arrayOE instanceof Array)) {
            throw new Error('lol');
        }
        const result = new Array(arrayOE.length);

        for (let i = 0; i < arrayOE.length; ++i) {
            // console.log('Decoding line : ', arrayOE[i]);
            result[i] = {
                coord: convert.toCoord(arrayOE[i], convert.offset),
                orientation: convert.toOri(arrayOE[i]),
                source: arrayOE[i],
            };
        }
        return result;
    },
};
