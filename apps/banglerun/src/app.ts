import { GpsData, GpsHandler } from './gps-handler';
import { Kalman } from './kalman';

declare var Bangle: any;
declare var BTN1: any;
declare var BTN2: any;
declare var BTN3: any;
declare var E: any;
declare var g: any;
declare var setWatch: any;

interface HrmData {
  bpm: number;
  confidence: number;
}

const playIcon = E.toArrayBuffer(atob("EBABwADwAPwA/wD/wP/w//z///////z/8P/A/wD8APAAwAA="));
const pauseIcon = E.toArrayBuffer(atob("EBAB/D/8P/w//D/8P/w//D/8P/w//D/8P/w//D/8P/w//D8="));
const stopIcon = E.toArrayBuffer(atob("EBAB//////////////////////////////////////////8="));
const turnIcon = E.toArrayBuffer(atob("EBABAAAAAAAAAAEDww/3P/9///w/8H/A/4H/A/8AAAAAAAA="));

class BangleRun {
  public gpsHandler = new GpsHandler();
  public hrm = new Kalman();

  public totDist = 0;
  public totTime = 0;
  public totSteps = 0;

  public running = false;
  public drawing = true;

  public views = [
    () => this.drawFirst(),
    () => this.drawSecond(),
    () => this.drawThird(),
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
    g.setFont('6x8', 2);

    g.setFontAlign(-1, -1, 0);
    g.setColor(this.gpsHandler.fix ? 0x07E0 : 0xF800);
    g.drawString('GPS', 10, 20);

    g.setFontAlign(0, -1, 0);
    g.setColor(0xFFFF);
    g.drawString(this.formatClock(new Date()), 120, 20);
  }

  drawFooter(page: number): void {
    for (let i = 0; i < this.views.length; i++) {
      const w = 240 / this.views.length;
      g.setColor(i === page ? 0x041F : 0x4208);
      g.fillRect(w * i + 5, 224, w * (i + 1) - 5, 240);
    }
  }

  drawButtons(): void {
    g.setColor(0xFFFF);
    g.drawImage(this.running ? pauseIcon : playIcon, 214, 32);
    g.drawImage(this.running ? pauseIcon : stopIcon, 214, 192);
    g.drawImage(turnIcon, 214, 112);
  }

  drawFirst(): void {
    g.setFont('6x8', 2);
    g.setFontAlign(0, -1, 0);
    g.setColor(0xFFFF);

    g.drawString('DISTANCE (KM)', 120, 50);
    g.drawString('TIME', 120, 140);

    g.setFontVector(40);
    g.drawString(this.formatDistance(this.totDist), 120, 70);
    g.drawString(this.formatTime(this.totTime), 120, 160);
  }

  drawSecond(): void {
    const totSpeed = this.totTime ? 3.6 * this.totDist / this.totTime : 0;
    const totCadence = this.totTime ? Math.round(60 * this.totSteps / this.totTime) : 0;

    g.setColor(0xFFFF);
    g.setFontAlign(0, -1, 0);
    g.setFont('6x8', 2);

    g.drawString('PACE (/KM)', 120, 50);
    g.drawString('CADENCE', 120, 140);

    g.setFontVector(40);
    g.drawString(this.formatPace(totSpeed), 120, 70);
    g.drawString(Math.round(totCadence), 120, 160);
  }

  drawThird(): void {
    g.setColor(0xFFFF);
    g.setFontAlign(0, -1, 0);
    g.setFont('6x8', 2);

    g.drawString('STEPS', 120, 50);
    g.drawString('HEART RATE', 120, 140);

    g.setFontVector(40);
    g.drawString(this.totSteps, 120, 70);
    g.drawString(this.running ? Math.round(this.hrm.value) : '_', 120, 160);
  }

  draw(): void {
    if (!this.drawing) { return; }
    g.clear();
    this.drawHeader();
    this.drawButtons();
    this.drawFooter(this.viewIndex);
    this.views[this.viewIndex]();
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
    if (this.running) {
      this.totDist += step.d;
      this.totTime += step.t;
    }
    this.draw();
  }

  handleHrm(hrmData: HrmData): void {
    this.hrm.update(hrmData.bpm, 100 - Math.min(hrmData.confidence, 99));
  }

  handleStep(): void {
    if (this.running) {
      this.totSteps += 1;
    }
  }

  start(): void {
    this.running = !this.running;
    
    if (this.running) {
      this.hrm.value = 0;
      this.hrm.error = 100;
      this.hrm.delta = 0;
      this.hrm.speed = 0;
      this.hrm.time = Date.now();
      Bangle.setHRMPower(1);
    } else {
      Bangle.setHRMPower(0);
    }
    
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
    Bangle.on('GPS', (gps: GpsData) => this.handleGps(gps));
    Bangle.on('HRM', (hrm: HrmData) => this.handleHrm(hrm));
    Bangle.on('step', () => this.handleStep());

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
