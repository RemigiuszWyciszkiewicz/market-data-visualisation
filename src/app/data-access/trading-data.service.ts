import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OrderBook } from './order-book';

@Injectable({
  providedIn: 'root',
})
export class TradingDataService {
  constructor(private http: HttpClient) {}

  getOrderBookData(): Observable<OrderBook[]> {
    return this.http.get<OrderBook[]>('assets/data/sample.json');
  }
}
