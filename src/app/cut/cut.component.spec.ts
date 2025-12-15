import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
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
			expect(payload.elements[0]).toEqual({
				id: 1,
				width: 400,
				height: 200,
			});
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
				throwError(() => ({
					error: { message: 'Optimization failed' },
				}))
			);

			component.optimize();

			expect(mockCutService.optimize).toHaveBeenCalled();
			expect(component.errorMsg).toBe('Optimization failed');
			expect(component.placements.length).toBe(0);
			expect(component.loading).toBeFalse();
		});
	});

	describe('SVG visualization', () => {
		// Sheet dimensions getters return form values
		it('returns sheet width and height from form', () => {
			component.form.get('sheetWidth')?.setValue(2500);
			component.form.get('sheetHeight')?.setValue(1500);

			expect(component.svgSheetWidth).toBe(2500);
			expect(component.svgSheetHeight).toBe(1500);
		});

		// Sheet dimensions getters return defaults when form values are missing
		it('returns default values when form values are missing', () => {
			component.form.get('sheetWidth')?.setValue(null);
			component.form.get('sheetHeight')?.setValue(null);

			expect(component.svgSheetWidth).toBe(1);
			expect(component.svgSheetHeight).toBe(1);
		});

		// Type colors map correctly
		it('returns correct colors for element types', () => {
			expect(component['getTypeColor']('door')).toBe('#90caf9');
			expect(component['getTypeColor']('leg')).toBe('#a5d6a7');
			expect(component['getTypeColor']('shelf')).toBe('#ffe082');
			expect(component['getTypeColor']('accessory')).toBe('#ce93d8');
			expect(component['getTypeColor']('panel')).toBe('#b0bec5');
			expect(component['getTypeColor'](undefined)).toBe('#b0bec5');
		});

		// Parts getter maps placements to visual parts with colors
		it('maps placements to parts with correct colors', () => {
			component.addElement();
			component.elements.at(0).get('type')?.setValue('door');
			component.elements.at(0).get('width')?.setValue(200);
			component.elements.at(0).get('height')?.setValue(100);

			component.addElement();
			component.elements.at(1).get('type')?.setValue('leg');
			component.elements.at(1).get('width')?.setValue(50);
			component.elements.at(1).get('height')?.setValue(50);

			component.placements = [
				{ id: 1, x: 10, y: 20, width: 200, height: 100 },
				{ id: 2, x: 30, y: 40, width: 50, height: 50 },
			];

			const parts = component.parts;

			expect(parts.length).toBe(2);
			expect(parts[0]).toEqual({
				id: 1,
				x: 10,
				y: 20,
				width: 200,
				height: 100,
				color: '#90caf9', // door color
			});
			expect(parts[1]).toEqual({
				id: 2,
				x: 30,
				y: 40,
				width: 50,
				height: 50,
				color: '#a5d6a7', // leg color
			});
		});

		// Parts getter handles missing element types
		it('uses default color when element type is missing', () => {
			component.addElement();
			component.placements = [
				{ id: 1, x: 0, y: 0, width: 100, height: 50 },
			];

			const parts = component.parts;

			expect(parts[0].color).toBe('#b0bec5'); // default panel color
		});

		// Parts getter handles placements without matching elements
		it('handles placements without matching elements', () => {
			component.placements = [
				{ id: 999, x: 0, y: 0, width: 100, height: 50 },
			];

			const parts = component.parts;

			expect(parts.length).toBe(1);
			expect(parts[0].color).toBe('#b0bec5'); // default color
		});

		// Parts getter returns empty array when no placements
		it('returns empty array when no placements', () => {
			component.placements = [];
			expect(component.parts.length).toBe(0);
		});
	});

	describe('PNG export', () => {
		let mockSvgElement: jasmine.SpyObj<SVGSVGElement>;
		let mockCanvas: jasmine.SpyObj<HTMLCanvasElement>;
		let mockContext: jasmine.SpyObj<CanvasRenderingContext2D>;
		let mockImage: HTMLImageElement;
		let mockAnchor: jasmine.SpyObj<HTMLAnchorElement>;
		let mockPngBlob: Blob;
		let createObjectURLSpy: jasmine.Spy;
		let serializeToStringSpy: jasmine.Spy;
		let canvasToBlobSpy: jasmine.Spy;
		let imageOnLoadCallback: (() => void) | null = null;

		beforeEach(() => {
			// Reset callback and state
			imageOnLoadCallback = null;

			// Setup mocks
			mockSvgElement = jasmine.createSpyObj('SVGSVGElement', [
				'cloneNode',
				'setAttribute',
			]);
			Object.defineProperty(mockSvgElement, 'viewBox', {
				writable: false,
				value: {
					baseVal: { width: 2000, height: 1000 },
				},
			});
			Object.defineProperty(mockSvgElement, 'clientWidth', {
				writable: false,
				value: 2000,
			});
			Object.defineProperty(mockSvgElement, 'clientHeight', {
				writable: false,
				value: 1000,
			});

			mockCanvas = jasmine.createSpyObj('HTMLCanvasElement', [
				'getContext',
				'toBlob',
			]);
			// Make width and height settable
			Object.defineProperty(mockCanvas, 'width', {
				writable: true,
				value: 0,
			});
			Object.defineProperty(mockCanvas, 'height', {
				writable: true,
				value: 0,
			});

			mockContext = jasmine.createSpyObj('CanvasRenderingContext2D', [
				'drawImage',
			]);

			// Create a fresh image mock for each test
			mockImage = document.createElement('img');
			let imageSrc = '';
			let imageSrcSet = false;

			// Helper to trigger callback when both onload and src are set
			const triggerCallbackIfReady = () => {
				if (imageOnLoadCallback && imageSrcSet && imageSrc) {
					// Use setTimeout to simulate async behavior
					setTimeout(() => {
						if (imageOnLoadCallback) {
							imageOnLoadCallback();
						}
					}, 0);
				}
			};

			Object.defineProperty(mockImage, 'src', {
				get: () => imageSrc,
				set: (value: string) => {
					imageSrc = value;
					imageSrcSet = true;
					triggerCallbackIfReady();
				},
				configurable: true,
			});
			Object.defineProperty(mockImage, 'onload', {
				get: () => imageOnLoadCallback,
				set: (callback: (() => void) | null) => {
					imageOnLoadCallback = callback;
					triggerCallbackIfReady();
				},
				configurable: true,
			});

			mockAnchor = jasmine.createSpyObj('HTMLAnchorElement', ['click']);
			Object.defineProperty(mockAnchor, 'href', {
				writable: true,
				value: '',
			});
			Object.defineProperty(mockAnchor, 'download', {
				writable: true,
				value: '',
			});

			mockPngBlob = new Blob(['png content'], { type: 'image/png' });

			// Setup spies
			createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue(
				'blob:url1'
			);
			serializeToStringSpy = spyOn(
				XMLSerializer.prototype,
				'serializeToString'
			).and.returnValue('<svg>serialized</svg>');
			canvasToBlobSpy = jasmine
				.createSpy('toBlob')
				.and.callFake((callback: BlobCallback) => {
					callback(mockPngBlob);
				});
			mockCanvas.toBlob = canvasToBlobSpy;

			// Mock Image constructor (since exportPng uses new Image())
			// Replace window.Image constructor to return our mock
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(window as any).Image = jasmine
				.createSpy('Image')
				.and.callFake(() => mockImage);

			// Mock document.createElement
			spyOn(document, 'createElement').and.callFake(
				(tagName: string): HTMLElement => {
					if (tagName === 'canvas') {
						return mockCanvas as unknown as HTMLElement;
					}
					if (tagName === 'a') {
						return mockAnchor as unknown as HTMLElement;
					}
					if (tagName === 'img') {
						return mockImage as unknown as HTMLElement;
					}
					return document.createElement(tagName);
				}
			);

			spyOn(document.body, 'appendChild').and.returnValue(
				mockAnchor as unknown as HTMLElement
			);
			spyOn(document.body, 'removeChild').and.returnValue(
				mockAnchor as unknown as HTMLElement
			);

			mockCanvas.getContext.and.returnValue(
				mockContext as unknown as CanvasRenderingContext2D | null
			);
			mockSvgElement.cloneNode.and.returnValue(
				mockSvgElement as unknown as Node
			);
		});

		// Does not export when no placements
		it('does not export when no placements', () => {
			component.placements = [];
			component.svgRef = {
				nativeElement: mockSvgElement,
			} as ElementRef<SVGSVGElement>;

			component.exportPng();

			expect(createObjectURLSpy).not.toHaveBeenCalled();
			expect(serializeToStringSpy).not.toHaveBeenCalled();
		});

		// Does not export when SVG element is not available
		it('does not export when SVG element is not available', () => {
			component.placements = [
				{ id: 1, x: 0, y: 0, width: 100, height: 50 },
			];
			component.svgRef = undefined;

			component.exportPng();

			expect(createObjectURLSpy).not.toHaveBeenCalled();
			expect(serializeToStringSpy).not.toHaveBeenCalled();
		});
	});
});
