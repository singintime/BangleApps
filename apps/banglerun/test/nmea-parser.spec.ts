import { GpsData, NmeaParser } from '../src/nmea-parser';

describe('NmeaParser', () => {
  let parser: NmeaParser;
  let data: GpsData;

  beforeEach(() => {
    parser = new NmeaParser(_data => data = _data);
  });

  it('creates', () => {
    expect(parser).toBeTruthy();
  });

  it('executes callback on GLL sentence', () => {
    expect(data).toBeFalsy();

    parser.parse('$GNGLL');
    expect(data).toBeTruthy();
  });

  it('parses a GGA sentence', () => {
    const gga = '$GNGGA,115739.00,4158.8441367,N,09147.4416929,W,4,13,0.9,255.747,M,-32.00,M,01,0000*6E';

    parser.parse(gga);
    parser.parse('$GNGLL');

    expect(data.lat).toBeCloseTo(0.732702058833, 12);
    expect(data.lon).toBeCloseTo(-1.602049848379, 12);
    expect(data.fix).toEqual(4);
    expect(data.err).toEqual(2.25);
  });

  it('parses a VTG sentence', () => {
    const vtg = '$GNVTG,,T,,M,0.00,N,3.60,K*4E';

    parser.parse(vtg);
    parser.parse('$GNGLL');

    expect(data.vel).toEqual(1);
  });
});
