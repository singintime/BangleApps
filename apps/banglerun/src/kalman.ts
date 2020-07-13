class Kalman {
  public value = 0;
  public error = 1;
  public delta = 0;
  public speed = 0;
  public time = Date.now();

  update(newValue: number, newNoise: number): void {
    const time = Date.now();
    const interval = (time - this.time) / 1000;
    const estDelta = this.speed * interval;

    this.error += Math.abs(estDelta);

    const oldValue = this.value;
    const newDelta = newValue - oldValue;
    const newError = Math.abs(newDelta) + newNoise;

    const beta = this.error / (this.error + newError);
    const alpha = 1 - beta;

    this.value = alpha * this.value + beta * newValue;
    this.error = alpha * this.error + beta * newError;

    this.delta = this.value - oldValue;
    this.speed = this.delta / interval;
    this.time = time;
  }
}

export { Kalman };
