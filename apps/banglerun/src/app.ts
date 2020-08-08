import { GpsHandler } from './gps-handler';
import { GpsData, NmeaParser } from './nmea-parser';

declare var Bangle: any;
declare var BTN1: any;
declare var BTN2: any;
declare var BTN3: any;
declare var E: any;
declare var g: any;
declare var Graphics: any;
declare var setWatch: any;

const playIcon = E.toArrayBuffer(atob("EBABwADwAPwA/wD/wP/w//z///////z/8P/A/wD8APAAwAA="));
const pauseIcon = E.toArrayBuffer(atob("EBAB/D/8P/w//D/8P/w//D/8P/w//D/8P/w//D/8P/w//D8="));
const stopIcon = E.toArrayBuffer(atob("EBAB//////////////////////////////////////////8="));
const turnIcon = E.toArrayBuffer(atob("EBABAAAAAAAAAAEDww/3P/9///w/8H/A/4H/A/8AAAAAAAA="));

const b = Graphics.createArrayBuffer(240, 240, 16);

class BangleRun {
  public nmeaParser = new NmeaParser((gps) => this.handleGps(gps));
  public gpsHandler = new GpsHandler();

  public totDist = 0;
  public totTime = 0;
  public totSteps = 0;

  public gpsReady = false;
  public running = false;
  public drawing = true;

  public views = [
    () => this.drawFirst(),
    () => this.drawSecond(),
  ];

  public viewIndex = 0;

  formatClock(date: Date): string {
    return ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2);
  }

  formatDistance(m: number): string {
    return (m / 1000).toFixed(2);
  }

  formatTime(time: number): string {
    const seconds = Math.round(time);
    const hrs = Math.floor(seconds / 3600);
    const min = Math.floor(seconds / 60) % 60;
    const sec = seconds % 60;
    return (hrs ? hrs + ':' : '') + ('0' + min).substr(-2) + `:` + ('0' + sec).substr(-2);
  }

  formatPace(kmh: number): string {
    if (kmh <= 0.6) {
      return `__'__"`;
    }
    const skm = Math.round(3600 / kmh);
    const min = Math.floor(skm / 60);
    const sec = skm % 60;
    return ('0' + min).substr(-2) + `'` + ('0' + sec).substr(-2) + `"`;
  }

  drawHeader(): void {
    b.setFont('6x8', 2);

    b.setFontAlign(-1, -1, 0);
    b.setColor(this.gpsReady ? 0x07E0 : 0xF800);
    b.drawString('GPS', 10, 20);

    b.setFontAlign(0, -1, 0);
    b.setColor(0xFFFF);
    b.drawString(this.formatClock(new Date()), 120, 20);
  }

  drawFooter(page: number): void {
    for (let i = 0; i < this.views.length; i++) {
      const w = 240 / this.views.length;
      b.setColor(i === page ? 0x041F : 0x4208);
      b.fillRect(w * i + 5, 224, w * (i + 1) - 5, 240);
    }
  }

  drawButtons(): void {
    b.setColor(0xFFFF);
    b.drawImage(this.running ? pauseIcon : playIcon, 214, 32);
    b.drawImage(this.running ? pauseIcon : stopIcon, 214, 192);
    b.drawImage(turnIcon, 214, 112);
  }

  drawFirst(): void {
    b.setFont('6x8', 2);
    b.setFontAlign(0, -1, 0);
    b.setColor(0xFFFF);

    b.drawString('DISTANCE (KM)', 120, 50);
    b.drawString('TIME', 120, 140);

    b.setFontVector(40);
    b.drawString(this.formatDistance(this.totDist), 120, 70);
    b.drawString(this.formatTime(this.totTime), 120, 160);
  }

  drawSecond(): void {
    const totSpeed = this.totTime ? 3.6 * this.totDist / this.totTime : 0;
    const totCadence = this.totTime ? Math.round(60 * this.totSteps / this.totTime) : 0;

    b.setColor(0xFFFF);
    b.setFontAlign(0, -1, 0);
    b.setFont('6x8', 2);

    b.drawString('PACE (/KM)', 120, 50);
    b.drawString('CADENCE', 120, 140);

    b.setFontVector(40);
    b.drawString(this.formatPace(totSpeed), 120, 70);
    b.drawString(Math.round(totCadence), 120, 160);
  }

  draw(): void {
    if (!this.drawing) { return; }
    b.clear();
    this.drawHeader();
    this.drawButtons();
    this.drawFooter(this.viewIndex);
    this.views[this.viewIndex]();
    g.drawImage(b.asImage, 0, 0);
  }

  scroll(): void {
    if (!this.drawing) {
      return;
    }

    this.viewIndex = (this.viewIndex + this.views.length + 1) % this.views.length;
    this.draw();
  }

  handleGps(coords: GpsData): void {
    const step = this.gpsHandler.getDistance(coords);
    this.gpsReady = true;
    if (this.running) {
      this.totDist += step.d;
      this.totTime += step.t;
    }
    this.draw();
  }

  start(): void {
    this.running = !this.running;
    this.draw();
  }

  stop(): void {
    if (!this.running) {
      this.totDist = 0;
      this.totTime = 0;
      this.totSteps = 0;
    }
    this.running = false;
    Bangle.setHRMPower(0);
    this.draw();
  }

  run(): void {
    Bangle.on('GPS-raw', (nmea: string) => {
      this.gpsReady = false;
      this.nmeaParser.parse(nmea);
    });

    Bangle.on('lcdPower', (on: boolean) => {
      this.drawing = on;
      if (on) {
        this.draw();
      }
    });

    Bangle.setGPSPower(1);

    this.draw();

    setWatch(() => this.start(), BTN1, { repeat: true, edge: 'rising' });
    setWatch(() => this.scroll(), BTN2, { repeat: true, edge: 'rising' });
    setWatch(() => this.stop(), BTN3, { repeat: true, edge: 'rising' });
  }
}

new BangleRun().run();
