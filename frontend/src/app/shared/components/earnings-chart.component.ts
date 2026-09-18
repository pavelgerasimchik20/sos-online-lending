import { Component, ElementRef, Input, OnChanges, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EarningsPoint {
  date: string;
  cumulativeByn: number;
}

@Component({
  selector: 'soz-earnings-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (points.length === 0) {
      <p class="soz-chart-empty">Пока нет данных о доходе — как только поступит первая выплата, здесь появится график.</p>
    } @else {
      <div class="soz-chart-wrap" #wrap>
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
          preserveAspectRatio="none"
          class="soz-chart-svg"
          (mousemove)="onMove($event)"
          (mouseleave)="hoverIndex.set(null)"
        >
          <defs>
            <linearGradient id="sozEarningsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#16A34A" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#16A34A" stop-opacity="0.02" />
            </linearGradient>
          </defs>

          <!-- сетка (recessive) -->
          @for (gy of gridYs(); track gy) {
            <line [attr.x1]="padL" [attr.x2]="width - padR" [attr.y1]="gy" [attr.y2]="gy" class="soz-grid-line" />
          }

          <path [attr.d]="areaPath()" fill="url(#sozEarningsFill)" stroke="none" />
          <path [attr.d]="linePath()" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" />

          @if (hoverIndex() !== null) {
            <line
              [attr.x1]="xFor(hoverIndex()!)"
              [attr.x2]="xFor(hoverIndex()!)"
              [attr.y1]="padT"
              [attr.y2]="height - padB"
              class="soz-crosshair"
            />
            <circle [attr.cx]="xFor(hoverIndex()!)" [attr.cy]="yFor(points[hoverIndex()!].cumulativeByn)" r="4.5" fill="#16A34A" stroke="white" stroke-width="1.5" />
          }

          <!-- прямая подпись конечной точки -->
          <circle [attr.cx]="xFor(points.length - 1)" [attr.cy]="yFor(points[points.length - 1].cumulativeByn)" r="4" fill="#16A34A" />
        </svg>

        @if (hoverIndex() !== null) {
          <div class="soz-chart-tooltip" [style.left.px]="tooltipLeft()" [style.top.px]="tooltipTop()">
            <div class="soz-tooltip-date">{{ points[hoverIndex()!].date }}</div>
            <div class="soz-tooltip-value">{{ points[hoverIndex()!].cumulativeByn }} BYN</div>
          </div>
        }

        <div class="soz-chart-endlabel">{{ points[points.length - 1].cumulativeByn }} BYN</div>
      </div>
      <div class="soz-chart-axis">
        <span>{{ points[0].date }}</span>
        <span>{{ points[points.length - 1].date }}</span>
      </div>
    }
  `,
  styles: [
    `
      .soz-chart-empty {
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
        padding: 24px 0;
      }
      .soz-chart-wrap {
        position: relative;
        width: 100%;
      }
      .soz-chart-svg {
        width: 100%;
        height: 220px;
        display: block;
        cursor: crosshair;
      }
      .soz-grid-line {
        stroke: var(--mat-sys-outline-variant, #e2e2e2);
        stroke-width: 1;
        opacity: 0.5;
      }
      .soz-crosshair {
        stroke: #16a34a;
        stroke-width: 1;
        stroke-dasharray: 3 3;
        opacity: 0.6;
      }
      .soz-chart-tooltip {
        position: absolute;
        transform: translate(-50%, -110%);
        background: rgba(20, 30, 25, 0.92);
        color: white;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 12px;
        pointer-events: none;
        white-space: nowrap;
        z-index: 2;
      }
      .soz-tooltip-value {
        font-weight: 700;
      }
      .soz-chart-endlabel {
        position: absolute;
        right: 4px;
        top: 4px;
        font-size: 12px;
        font-weight: 700;
        color: #16a34a;
        background: color-mix(in srgb, #16a34a 12%, transparent);
        padding: 2px 8px;
        border-radius: 999px;
      }
      .soz-chart-axis {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 4px;
      }
    `,
  ],
})
export class EarningsChartComponent implements OnChanges {
  @Input() points: EarningsPoint[] = [];
  @ViewChild('wrap') wrapRef?: ElementRef<HTMLDivElement>;

  readonly width = 600;
  readonly height = 220;
  readonly padL = 8;
  readonly padR = 8;
  readonly padT = 16;
  readonly padB = 12;

  readonly hoverIndex = signal<number | null>(null);

  private maxValue = 1;
  private minValue = 0;

  ngOnChanges(): void {
    this.maxValue = Math.max(1, ...this.points.map((p) => p.cumulativeByn));
    this.minValue = Math.min(0, ...this.points.map((p) => p.cumulativeByn));
  }

  xFor(index: number): number {
    if (this.points.length <= 1) return this.padL;
    const usable = this.width - this.padL - this.padR;
    return this.padL + (usable * index) / (this.points.length - 1);
  }

  yFor(value: number): number {
    const usable = this.height - this.padT - this.padB;
    const range = this.maxValue - this.minValue || 1;
    return this.padT + usable - ((value - this.minValue) / range) * usable;
  }

  gridYs(): number[] {
    return [0.25, 0.5, 0.75].map((f) => this.padT + (this.height - this.padT - this.padB) * f);
  }

  linePath(): string {
    return this.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${this.xFor(i)} ${this.yFor(p.cumulativeByn)}`).join(' ');
  }

  areaPath(): string {
    if (this.points.length === 0) return '';
    const base = this.height - this.padB;
    const line = this.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${this.xFor(i)} ${this.yFor(p.cumulativeByn)}`).join(' ');
    return `${line} L ${this.xFor(this.points.length - 1)} ${base} L ${this.xFor(0)} ${base} Z`;
  }

  onMove(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * this.width;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const dist = Math.abs(this.xFor(i) - relativeX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    this.hoverIndex.set(closest);
  }

  tooltipLeft(): number {
    const idx = this.hoverIndex();
    if (idx === null || !this.wrapRef) return 0;
    const scale = this.wrapRef.nativeElement.clientWidth / this.width;
    return this.xFor(idx) * scale;
  }

  tooltipTop(): number {
    const idx = this.hoverIndex();
    if (idx === null) return 0;
    const scaleY = 220 / this.height;
    return this.yFor(this.points[idx].cumulativeByn) * scaleY;
  }
}
