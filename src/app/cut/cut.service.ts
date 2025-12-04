import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CutRequest {
  sheetWidth: number;
  sheetHeight: number;
  elements: Array<{ id: number; width: number; height: number }>;
}

export interface Placement {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface CutResponse {
  placements: Placement[];
}

@Injectable({ providedIn: 'root' })
export class CutService {
  private readonly url = 'http://localhost:8081/furniture/cut';

  constructor(private http: HttpClient) {}

  optimize(req: CutRequest): Observable<CutResponse> {
    return this.http.post<CutResponse>(this.url, req);
  }
}
