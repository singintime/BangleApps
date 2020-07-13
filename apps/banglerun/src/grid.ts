class Grid {
  public x = 0;
  public y = 0;
  public z = 0;

  constructor(public threshold: number) { }

  update(x: number, y: number, z: number): number {
    this.x += x;
    this.y += y;
    this.z += z;

    const distance = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    const remainder = distance % this.threshold;
    const result = distance - remainder;

    if (result > 0) {
      const rescale = remainder / distance;
      this.x *= rescale;
      this.y *= rescale;
      this.z *= rescale;
    }

    return result;
  }
}

export { Grid };
