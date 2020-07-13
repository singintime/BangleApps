import { Grid } from './grid';
import { Kalman } from './kalman';

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS = 6371008.8;

interface GpsData {
  lat: number;
  lon: number;
  alt: number;
  speed: number,
  course: number,
  time: Date,
  fix: number;
  satellites: number;
}

/** Process GPS data */
class GpsHandler {
  public x = new Kalman();
  public y = new Kalman();
  public z = new Kalman();
  public grid = new Grid(10);

  public lastUpdated = Date.now();
  public lastValid = 0;
  public fix = false;

  getDistance(gps: GpsData): ({ t: number, d: number }) {
    const time = Date.now();
    const interval = (time - this.lastUpdated) / 1000;
    this.lastUpdated = time;
    this.fix = gps.fix > 0;

    if (!this.fix) {
      return { t: interval, d: 0 };
    }

    const p = gps.lat * DEG_TO_RAD;
    const q = gps.lon * DEG_TO_RAD;

    const x = EARTH_RADIUS * Math.sin(p) * Math.cos(q);
    const y = EARTH_RADIUS * Math.sin(p) * Math.sin(q);
    const z = EARTH_RADIUS * Math.cos(p);

    if (!this.lastValid) {
      this.x.value = x;
      this.y.value = y;
      this.z.value = z;

      this.x.error = 100;
      this.y.error = 100;
      this.z.error = 100;

      this.lastValid = time;

      return { t: interval, d: 0 };
    }

    this.x.update(x, 10);
    this.y.update(y, 10);
    this.z.update(z, 10);

    const distance = this.grid.update(this.x.delta, this.y.delta, this.z.delta);

    this.lastValid = time;
    
    return { t: interval, d: distance };
  }
}

export { GpsData, GpsHandler };
