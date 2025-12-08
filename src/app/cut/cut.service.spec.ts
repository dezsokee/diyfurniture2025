import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CutService, CutRequest, CutResponse } from './cut.service';

describe('CutService', () => {
  let service: CutService;
  let httpMock: HttpTestingController;
  const url = 'http://localhost:8081/furniture/cut';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CutService],
    });

    service = TestBed.inject(CutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Service should be instantiated
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Successful optimize POST returns placements
  it('should post optimize request and return placements', () => {
    const reqBody: CutRequest = {
      sheetWidth: 2000,
      sheetHeight: 1000,
      elements: [{ id: 1, width: 500, height: 300 }],
    };

    const mockRes: CutResponse = {
      placements: [{ id: 1, x: 0, y: 0, width: 500, height: 300 }],
    };

    service.optimize(reqBody).subscribe((res) => {
      expect(res.placements.length).toBe(1);
      expect(res.placements[0].id).toBe(1);
    });

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqBody);
    req.flush(mockRes);
  });

  // Backend error propagates to subscriber
  it('should handle backend error', () => {
    const reqBody: CutRequest = {
      sheetWidth: 2000,
      sheetHeight: 1000,
      elements: [{ id: 1, width: 500, height: 300 }],
    };

    let errored = false;

    service.optimize(reqBody).subscribe({
      next: () => fail('should error'),
      error: (err) => {
        errored = true;
        expect(err.status).toBe(400);
      },
    });

    const req = httpMock.expectOne(url);
    req.flush({ message: 'Invalid dimensions' }, { status: 400, statusText: 'Bad Request' });
    expect(errored).toBeTrue();
  });

  // Multiple elements are sent and parsed
  it('should send multiple elements', () => {
    const reqBody: CutRequest = {
      sheetWidth: 3000,
      sheetHeight: 1500,
      elements: [
        { id: 1, width: 500, height: 300 },
        { id: 2, width: 400, height: 200 },
        { id: 3, width: 600, height: 400 },
      ],
    };

    const mockRes: CutResponse = {
      placements: [
        { id: 1, x: 0, y: 0, width: 500, height: 300 },
        { id: 2, x: 500, y: 0, width: 400, height: 200 },
        { id: 3, x: 900, y: 0, width: 600, height: 400 },
      ],
    };

    service.optimize(reqBody).subscribe((res) => {
      expect(res.placements.length).toBe(3);
    });

    const req = httpMock.expectOne(url);
    expect(req.request.body.elements.length).toBe(3);
    req.flush(mockRes);
  });
});
