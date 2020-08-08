interface GpsData {
  lat: number;
  lon: number;
  vel: number;
  dop: number;
}

class NmeaParser {
  private _lat = NaN;
  private _lon = NaN;
  private _vel = NaN;
  private _dop = NaN;

  constructor(private _callbackFn: (gps: GpsData) => void) { }

  public parse(nmea: string) {
    const tokens = nmea.split(',');
    const sentence = tokens[0].substr(3, 3);

    switch (sentence) {
      case 'GGA':
        this._lat = this._parseCoord(tokens[2], tokens[3]);
        this._lon = this._parseCoord(tokens[4], tokens[5]);
        this._dop = parseFloat(tokens[8]);
        break;
      case 'VTG':
        this._vel = parseFloat(tokens[7]) / 3.6;
        break;
      case 'GLL':
        if (this._isValid()) {
          this._callbackFn({ lat: this._lat, lon: this._lon, vel: this._vel, dop: this._dop });
        }
        break;
      default:
        break;
    }
  }

  private _isValid() {
    return !isNaN(this._lat) && !isNaN(this._lon) && !isNaN(this._vel) && this._dop < 5;
  }

  private _parseCoord(coord: string, direction: string): number {
    const pivot = coord.indexOf('.') - 2;
    const degrees = parseInt(coord.substr(0, pivot));
    const minutes = parseFloat(coord.substr(pivot)) / 60;
    const radians = (degrees + minutes) * Math.PI / 180;
    if (direction === 'S' || direction === 'W') {
      return -radians;
    }
    return radians;
  }
}

export { GpsData, NmeaParser };
