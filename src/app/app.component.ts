import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { filter } from 'rxjs/operators';
import { KENDO_CHARTS } from '@progress/kendo-angular-charts';
import { TradingDataService } from './data-access/trading-data.service';
import { OrderBook } from './data-access/order-book';
import { groupBy, GroupResult } from '@progress/kendo-data-query';
import { NgFor } from '@angular/common';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { ChartData } from './data-access/chart-data';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
} from '@angular/forms';

import { LabelModule } from '@progress/kendo-angular-label';
import { InputsModule } from '@progress/kendo-angular-inputs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    KENDO_CHARTS,
    NgFor,
    FormsModule,
    ReactiveFormsModule,
    InputsModule,
    LabelModule,
    ButtonsModule,
    KENDO_BUTTONS,
  ],
  providers: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
  private readonly orderBookService = inject(TradingDataService);

  private intervalRef!: ReturnType<typeof setInterval>;
  public isReplayMode = false;
  public min = 0;
  public max = 99;
  public step = 1;
  public form = new FormGroup({
    slider: new FormControl(0),
  });

  public title = (value: number): string => {
    return `${this.navigation()[value]}`;
  };

  public currentSeries = signal<GroupResult[]>([]);
  public chartData = signal<ChartData[]>([]);
  public navigation = computed(() => {
    return this.chartData().map((item) => item.time);
  });

  ngOnDestroy(): void {
    this.stop();
  }

  replay(): void {
    if (this.form.get('slider')?.value !== 0) {
      this.form.get('slider')?.setValue(0);
    }

    this.isReplayMode = true;
    this.intervalRef = setInterval(() => {
      this.form.get('slider')?.setValue(this.form.get('slider')?.value!! + 1);
    }, 700);
  }

  stop(): void {
    clearInterval(this.intervalRef);
    this.isReplayMode = false;
  }

  ngOnInit(): void {
    this.listenNavigationChange();
    this.fetchOrderBookData();
  }

  private mapToGroupedData(orderBookEntries: OrderBook[]): ChartData[] {
    return orderBookEntries.map((entry) => {
      let samples = [];
      const bidSamples = [];
      const askSamples = [];
      for (let i = 1; i <= 10; i++) {
        const bidKey = `Bid${i}` as keyof OrderBook;
        const askKey = `Ask${i}` as keyof OrderBook;
        const bidSizeKey = `Bid${i}Size` as keyof OrderBook;
        const askSizeKey = `Ask${i}Size` as keyof OrderBook;

        bidSamples.push({
          value: entry[bidKey] as number,
          size: entry[bidSizeKey] as number,
          category: 'Bid',
        });

        askSamples.push({
          value: entry[askKey] as number,
          size: entry[askSizeKey] as number,
          category: 'Ask',
        });
      }

      bidSamples.sort((a, b) => a.size - b.size);
      askSamples.sort((a, b) => b.size - a.size);

      samples = [...bidSamples, ...askSamples];
      return {
        time: entry.Time.slice(0, entry.Time.indexOf('.')),
        data: samples,
      };
    });
  }

  private fetchOrderBookData(): void {
    this.orderBookService.getOrderBookData().subscribe({
      next: (data) => {
        console.log('Order book data:', data);
        this.chartData.set(this.mapToGroupedData(data));
        this.currentSeries.set(
          groupBy(this.mapToGroupedData(data)[0].data, [
            { field: 'category' },
          ]) as GroupResult[]
        );
      },
      error: (error) => {
        console.error('Error loading order book data:', error);
      },
    });
  }

  private listenNavigationChange(): void {
    this.form
      .get('slider')
      ?.valueChanges.pipe(filter((value) => value !== null))
      .subscribe((value) => {
        this.currentSeries.set(
          groupBy(this.chartData()[value].data, [
            { field: 'category' },
          ]) as GroupResult[]
        );
      });
  }
}
