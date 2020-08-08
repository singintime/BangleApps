import { GpsData } from './nmea-parser';

const EARTH_RADIUS = 6371008.8;
const POS_ACCURACY = 2.5;
const VEL_ACCURACY = 0.05;

/** Process GPS data */
class GpsHandler {
  private _x: number;
  private _y: number;
  private _z: number;
  private _v: number;
  private _t: number;
  private _ep: number;
  private _ev: number;

  getDistance(data: GpsData) {
    const x = EARTH_RADIUS * Math.sin(data.lat) * Math.cos(data.lon);
    const y = EARTH_RADIUS * Math.sin(data.lat) * Math.sin(data.lon);
    const z = EARTH_RADIUS * Math.cos(data.lat);
    const v = data.vel;
    const t = Date.now();

    if (this._t === 0) {
      this._x = x;
      this._y = y;
      this._z = z;
      this._v = v;
      this._t = t;
      this._ep = 50;
      this._ev = 1;
      return;
    }

    const dx = x - this._x;
    const dy = y - this._y;
    const dz = z - this._z;
    const dv = v - this._v;
    const dt = t - this._t;

    const ep = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const ev = Math.sqrt(dv * dv);

    this._ep += this._v * dt;

    const gp = this._ep / (this._ep + ep + data.dop * POS_ACCURACY);
    const gv = this._ev / (this._ev + ev + data.dop * VEL_ACCURACY);

    this._x += (dx - this._x) * gp;
    this._y += (dy - this._y) * gp;
    this._z += (dz - this._z) * gp;
    this._v += (dv - this._v) * gv;
    this._t = t;

    return { t: dt, d: ep * gp };
  }
}

export { GpsData, GpsHandler };
