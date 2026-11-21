import { AfterViewInit, Directive, ElementRef, Input, OnChanges, OnDestroy } from '@angular/core';

export const BOOK_PALETTES = [
  { stage: '#cdb297', shade: '#a78d79', ink: '#251e19', paper: '#eab579', accent: '#cbe6da' },
  { stage: '#a9b7aa', shade: '#798c83', ink: '#f7ecd4', paper: '#244c48', accent: '#d2b86d' },
  { stage: '#c6acae', shade: '#9d828a', ink: '#3b2433', paper: '#efe0c5', accent: '#a1484c' },
  { stage: '#a6b6c1', shade: '#7d919e', ink: '#f0e8ce', paper: '#293f59', accent: '#b7cbd4' },
] as const;

@Directive({ selector: 'canvas[appBookArt]', standalone: true })
export class BookArtDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) appBookArt = 0;
  @Input() landscape = false;
  private observer?: ResizeObserver;
  private ready = false;

  constructor(private readonly element: ElementRef<HTMLCanvasElement>) {}

  ngAfterViewInit(): void {
    this.ready = true;
    if (typeof ResizeObserver === 'undefined') {
      this.paint();
      return;
    }
    this.observer = new ResizeObserver(() => this.paint());
    this.observer.observe(this.element.nativeElement);
  }

  ngOnChanges(): void {
    if (this.ready) this.paint();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private paint(): void {
    const canvas = this.element.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(scale, scale);

    if (this.landscape) {
      dunes(context, width, height, false);
    } else {
      jacket(context, width, height, this.appBookArt);
    }

    const grain = random(61);
    for (let i = 0; i < width * height * .105; i++) {
      context.fillStyle = i % 2 ? '#fff2' : '#15191524';
      context.fillRect(grain() * width, grain() * height, 1, .8);
    }
  }
}

function random(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

function dunes(context: CanvasRenderingContext2D, width: number, height: number, poster: boolean): void {
  const sunX = width * (poster ? .66 : .77);
  const sunY = height * (poster ? .40 : .30);
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#2a302e');
  sky.addColorStop(.75, '#807568');
  sky.addColorStop(1, '#c39468');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  const offset = poster ? 4 : 0;
  const stars = random(47);
  for (let i = 0; i < Math.round(width * height / 180); i++) {
    context.fillStyle = `rgba(243, 223, 178, ${stars() * .32})`;
    context.fillRect(stars() * width, stars() * height * .65, 1.1, .9);
  }

  const radius = Math.min(height * .23, width * .19);
  circle(context, sunX, sunY, radius, '#f5bd84');
  context.save();
  context.clip();
  context.strokeStyle = '#a9785244';
  context.lineWidth = .7;
  for (let y = sunY - radius; y < sunY + radius; y += 3.3) {
    context.beginPath();
    context.moveTo(sunX - radius, y);
    context.lineTo(sunX + radius, y);
    context.stroke();
  }
  context.restore();

  const layers = [
    { base: .51, amplitude: .052, phase: 1.45, fill: '#b49b81', ink: '#715f51' },
    { base: .61, amplitude: .10, phase: 2.35, fill: '#d0a378', ink: '#917052' },
    { base: .72, amplitude: .16, phase: 3.45, fill: '#a97453', ink: '#644837' },
    { base: .84, amplitude: .17, phase: 4.1, fill: '#d79c67', ink: '#865a42' },
    { base: .96, amplitude: .21, phase: 5.2, fill: '#654c3d', ink: '#ad7d58' },
  ];
  layers.forEach(({ base, amplitude, phase, fill, ink }, index) => {
    const curve = (t: number) => height * (base + amplitude * (
      Math.sin(10 * t + phase + offset) * .72 + Math.sin(18 * t + phase * .8) * .28
    ));
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width + 4; x += 4) context.lineTo(x, curve(x / width));
    context.lineTo(width, height);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.save();
    context.clip();
    context.strokeStyle = ink;
    context.lineWidth = Math.max(.64, height / 420);
    for (let line = 1; line < height * .63; line += Math.max(2.8, height / 88)) {
      context.beginPath();
      for (let x = 0; x <= width + 4; x += 4) {
        const t = x / width;
        const y = curve(t + line / height * .16) + line * (1 + .24 * Math.cos(t * 15 + index));
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.restore();

    if (!poster && index === 3) {
      const y = curve(.83);
      for (let i = 0; i < 3; i++) {
        const travelerX = width * .83 + i * 7;
        const travelerY = y + i * .7;
        circle(context, travelerX, travelerY - 6, 1.4, '#302a23');
        context.beginPath();
        context.moveTo(travelerX - 2.5, travelerY);
        context.lineTo(travelerX, travelerY - 5);
        context.lineTo(travelerX + 1.8, travelerY);
        context.fill();
      }
    }
  });
}

function jacket(context: CanvasRenderingContext2D, width: number, height: number, style: number): void {
  const { paper, accent } = BOOK_PALETTES[style];
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);
  if (style === 0) {
    context.save();
    context.translate(0, height * .26);
    dunes(context, width, height * .63, true);
    context.restore();
  } else if (style === 1) {
    context.lineWidth = width * .006;
    context.strokeStyle = accent;
    for (let i = 0; i < 25; i++) {
      context.beginPath();
      context.ellipse(width * .48, height * .58, width * (.08 + i * .014), height * (.09 + i * .011), -.52, 0, Math.PI * 2);
      context.stroke();
    }
    circle(context, width * .48, height * .58, width * .13, '#e7be6a');
    circle(context, width * .51, height * .57, width * .091, '#294e48');
  } else if (style === 2) {
    context.strokeStyle = '#3c3e36';
    context.lineWidth = width * .012;
    for (let i = 0; i < 5; i++) {
      const x = width * (.16 + i * .165);
      const y = height * (.47 + .12 * Math.sin(i * 1.8));
      context.beginPath();
      context.moveTo(width * .5, height * .85);
      context.quadraticCurveTo(x, height * .68, x, y);
      context.stroke();
      for (let petal = 0; petal < 6; petal++) {
        const angle = petal * Math.PI / 3;
        circle(context, x + Math.cos(angle) * width * .045, y + Math.sin(angle) * width * .045, width * .049, accent);
      }
      circle(context, x, y, width * .028, '#e4aa60');
    }
  } else {
    context.save();
    context.beginPath();
    context.rect(width * .11, height * .31, width * .82, height * .51);
    context.clip();
    context.strokeStyle = accent;
    context.lineWidth = width * .011;
    for (let i = -5; i < 25; i++) {
      context.beginPath();
      context.moveTo(width * .07, height * (.3 + i * .035));
      context.lineTo(width * .51, height * (.53 + i * .017));
      context.lineTo(width * .94, height * (.3 + i * .035));
      context.stroke();
    }
    context.restore();
  }
}
