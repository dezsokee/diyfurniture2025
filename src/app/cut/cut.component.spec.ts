import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { CutComponent } from './cut.component';
import { CutService } from './cut.service';

describe('CutComponent', () => {
  let fixture: ComponentFixture<CutComponent>;
  let component: CutComponent;
  let mockCutService: jasmine.SpyObj<CutService>;

  beforeEach(async () => {
    mockCutService = jasmine.createSpyObj('CutService', ['optimize']);

    await TestBed.configureTestingModule({
      imports: [CutComponent, NoopAnimationsModule],
      providers: [{ provide: CutService, useValue: mockCutService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('creation and defaults', () => {
    // Component should instantiate successfully
    it('creates component', () => {
      expect(component).toBeTruthy();
    });

    // Form starts with default sheet dims, no elements, valid state
    it('initializes form defaults', () => {
      expect(component.form.get('sheetWidth')?.value).toBe(2000);
      expect(component.form.get('sheetHeight')?.value).toBe(1000);
      expect(component.elements.length).toBe(0);
      expect(component.form.valid).toBeTrue();
    });
  });

  describe('element management', () => {
    // New elements get incremental IDs
    it('adds elements with incremental ids', () => {
      component.addElement();
      component.addElement();
      component.addElement();

      expect(component.elements.length).toBe(3);
      expect(component.elements.at(0).value.id).toBe(1);
      expect(component.elements.at(1).value.id).toBe(2);
      expect(component.elements.at(2).value.id).toBe(3);
    });

    // Removing then adding keeps ID uniqueness
    it('keeps unique ids after removal', () => {
      component.addElement();
      component.addElement();
      component.removeElement(0);
      component.addElement();

      expect(component.elements.length).toBe(2);
      expect(component.elements.at(0).value.id).toBe(2);
      expect(component.elements.at(1).value.id).toBe(3);
    });

    // Remove element at provided index
    it('removes element at index', () => {
      component.addElement();
      component.addElement();

      component.removeElement(0);

      expect(component.elements.length).toBe(1);
      expect(component.elements.at(0).value.id).toBe(2);
    });
  });

  describe('sheet and element dimensions', () => {
    // Sheet width/height increment and bounded decrement
    it('increments and decrements sheet dimensions', () => {
      component.incSheet('sheetWidth');
      component.incSheet('sheetHeight');
      expect(component.form.get('sheetWidth')?.value).toBe(2001);
      expect(component.form.get('sheetHeight')?.value).toBe(1001);

      component.form.get('sheetWidth')?.setValue(2);
      component.decSheet('sheetWidth');
      component.decSheet('sheetWidth');
      expect(component.form.get('sheetWidth')?.value).toBe(1);
    });

    // Element width/height increment and bounded decrement
    it('increments and decrements element dimensions', () => {
      component.addElement();
      component.incEl(0, 'width');
      component.incEl(0, 'height');
      expect(component.elements.at(0).get('width')?.value).toBe(101);
      expect(component.elements.at(0).get('height')?.value).toBe(51);

      component.elements.at(0).get('width')?.setValue(2);
      component.decEl(0, 'width');
      component.decEl(0, 'width');
      expect(component.elements.at(0).get('width')?.value).toBe(1);
    });
  });

  describe('payload building', () => {
    // Payload reflects current sheet values and elements
    it('builds payload with sheet and elements', () => {
      component.form.get('sheetWidth')?.setValue(2500);
      component.form.get('sheetHeight')?.setValue(1200);
      component.addElement();
      component.elements.at(0).get('width')?.setValue(400);
      component.elements.at(0).get('height')?.setValue(200);

      const payload = component.buildPayload();

      expect(payload.sheetWidth).toBe(2500);
      expect(payload.sheetHeight).toBe(1200);
      expect(payload.elements.length).toBe(1);
      expect(payload.elements[0]).toEqual({ id: 1, width: 400, height: 200 });
    });
  });

  describe('optimize guards', () => {
    // Skip optimize when form invalid
    it('does not optimize if form invalid', () => {
      component.form.get('sheetWidth')?.setValue(null);
      component.optimize();

      expect(mockCutService.optimize).not.toHaveBeenCalled();
    });

    // Skip optimize when no elements present
    it('does not optimize if no elements', () => {
      component.optimize();
      expect(mockCutService.optimize).not.toHaveBeenCalled();
    });
  });

  describe('optimize results', () => {
    // On success: call service, store placements, clear error
    it('calls service and updates placements on success', () => {
      component.addElement();
      const placements = [{ id: 1, x: 0, y: 0, width: 100, height: 50 }];
      mockCutService.optimize.and.returnValue(of({ placements }));

      component.optimize();

      expect(mockCutService.optimize).toHaveBeenCalled();
      expect(component.placements).toEqual(placements);
      expect(component.errorMsg).toBeNull();
      expect(component.loading).toBeFalse();
    });

    // On error: capture message, clear placements, stop loading
    it('handles service error', () => {
      component.addElement();
      mockCutService.optimize.and.returnValue(
        throwError(() => ({ error: { message: 'Optimization failed' } }))
      );

      component.optimize();

      expect(mockCutService.optimize).toHaveBeenCalled();
      expect(component.errorMsg).toBe('Optimization failed');
      expect(component.placements.length).toBe(0);
      expect(component.loading).toBeFalse();
    });
  });
});
