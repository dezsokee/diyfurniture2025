import { Before, Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { ElementRef } from '@angular/core';

// SUT imports
import { CutComponent } from '../../../src/app/cut/cut.component';
import { CutService, Placement } from '../../../src/app/cut/cut.service';

// Test doubles
class MockCutService {
	optimizeCalls: unknown[] = [];
	optimizeResponse: { placements: Placement[] } = { placements: [] };

	optimize(req: unknown) {
		this.optimizeCalls.push(req);
		return of(this.optimizeResponse);
	}
}

// Test context shared across steps
interface TestContext {
	component: CutComponent;
	mockCutService: MockCutService;
	mockSvgElement: SVGSVGElement | null;
	parts: {
		id: number;
		x: number;
		y: number;
		width: number;
		height: number;
		color: string;
	}[];
	pngExportTriggered: boolean;
	svgSerialized: boolean;
	pngBlobCreated: boolean;
	downloadLinkCreated: boolean;
	downloadFilename: string | null;
}

let context: TestContext;

Before(() => {
	const formBuilder = new FormBuilder();
	const mockCutService = new MockCutService();
	const component = new CutComponent(
		formBuilder,
		mockCutService as unknown as CutService
	);

	context = {
		component,
		mockCutService,
		mockSvgElement: null,
		parts: [],
		pngExportTriggered: false,
		svgSerialized: false,
		pngBlobCreated: false,
		downloadLinkCreated: false,
		downloadFilename: null,
	};
});

Given('a fresh CutComponent with mocked services', () => {
	// Already set up in Before hook
	assert.ok(context.component);
});

Given(
	'the sheet width is {int} and height is {int}',
	(width: number, height: number) => {
		context.component.form.get('sheetWidth')?.setValue(width);
		context.component.form.get('sheetHeight')?.setValue(height);
	}
);

Given(
	'an element with id {int}, type {string}, width {int}, height {int} exists',
	(id: number, type: string, width: number, height: number) => {
		context.component.addElement();
		const lastIndex = context.component.elements.length - 1;
		context.component.elements.at(lastIndex).get('id')?.setValue(id);
		context.component.elements.at(lastIndex).get('type')?.setValue(type);
		context.component.elements.at(lastIndex).get('width')?.setValue(width);
		context.component.elements
			.at(lastIndex)
			.get('height')
			?.setValue(height);
	}
);

Given(
	'placements exist with element {int} at position \\({int}, {int}\\) size {int}x{int}',
	(id: number, x: number, y: number, width: number, height: number) => {
		if (!context.component.placements) {
			context.component.placements = [];
		}
		context.component.placements.push({ id, x, y, width, height });
	}
);

Given('no placements exist', () => {
	context.component.placements = [];
});

Given('the SVG element is not available', () => {
	context.component.svgRef = undefined;
	context.mockSvgElement = null;
});

Given(
	'the SVG element is available with viewBox {int}x{int}',
	(width: number, height: number) => {
		const mockSvg = document.createElementNS(
			'http://www.w3.org/2000/svg',
			'svg'
		);
		Object.defineProperty(mockSvg, 'viewBox', {
			writable: false,
			value: {
				baseVal: { width, height },
			},
		});
		Object.defineProperty(mockSvg, 'clientWidth', {
			writable: false,
			value: width,
		});
		Object.defineProperty(mockSvg, 'clientHeight', {
			writable: false,
			value: height,
		});
		mockSvg.cloneNode = function () {
			return mockSvg;
		} as () => Node;
		mockSvg.setAttribute = function () {
			// Mock implementation
		} as (name: string, value: string) => void;

		context.mockSvgElement = mockSvg;
		context.component.svgRef = {
			nativeElement: mockSvg,
		} as ElementRef<SVGSVGElement>;
	}
);

When('I get the parts for visualization', () => {
	context.parts = context.component.parts;
});

When('I attempt to export PNG', () => {
	// Mock DOM APIs for PNG export
	const originalCreateObjectURL = URL.createObjectURL;
	const originalRevokeObjectURL = URL.revokeObjectURL;
	const originalCreateElement = document.createElement;
	const originalAppendChild = document.body.appendChild;
	const originalRemoveChild = document.body.removeChild;

	// Variables for tracking state (used via context)

	// Mock XMLSerializer
	const originalXMLSerializer = window.XMLSerializer;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as any).XMLSerializer = class {
		serializeToString(): string {
			context.svgSerialized = true;
			return '<svg>serialized</svg>';
		}
	};

	// Mock URL.createObjectURL
	URL.createObjectURL = function (blob: Blob): string {
		if (blob.type === 'image/png') {
			context.pngBlobCreated = true;
		}
		return 'blob:mock-url';
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;

	// Mock URL.revokeObjectURL
	URL.revokeObjectURL = function () {
		// Mock implementation
	};

	// Mock Image constructor
	const originalImage = window.Image;
	let imageOnLoadCallback: (() => void) | null = null;
	let imageSrc = '';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as any).Image = function () {
		const img = document.createElement('img');
		Object.defineProperty(img, 'src', {
			get: () => imageSrc,
			set: (value: string) => {
				imageSrc = value;
				// Trigger onload callback synchronously if set
				if (imageOnLoadCallback) {
					setTimeout(() => {
						if (imageOnLoadCallback) {
							imageOnLoadCallback();
						}
					}, 0);
				}
			},
			configurable: true,
		});
		Object.defineProperty(img, 'onload', {
			get: () => imageOnLoadCallback,
			set: (callback: (() => void) | null) => {
				imageOnLoadCallback = callback;
				// If src was already set, trigger callback
				if (imageSrc && callback) {
					setTimeout(() => {
						if (imageOnLoadCallback) {
							imageOnLoadCallback();
						}
					}, 0);
				}
			},
			configurable: true,
		});
		return img;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;

	// Mock document.createElement
	document.createElement = function (tagName: string): HTMLElement {
		if (tagName === 'canvas') {
			const canvas = originalCreateElement.call(
				document,
				'canvas'
			) as HTMLCanvasElement;
			const ctx = {
				drawImage: function () {
					context.pngExportTriggered = true;
				},
			};
			canvas.getContext = function (
				contextId: string
			):
				| CanvasRenderingContext2D
				| ImageBitmapRenderingContext
				| WebGLRenderingContext
				| WebGL2RenderingContext
				| null {
				if (contextId === '2d') {
					return ctx as unknown as CanvasRenderingContext2D;
				}
				return null;
			} as typeof canvas.getContext;
			canvas.toBlob = function (callback: BlobCallback) {
				const blob = new Blob(['png'], { type: 'image/png' });
				callback(blob);
			};
			return canvas;
		}
		if (tagName === 'a') {
			const anchor = originalCreateElement.call(
				document,
				'a'
			) as HTMLAnchorElement;
			let downloadValue = '';
			Object.defineProperty(anchor, 'download', {
				get: () => downloadValue,
				set: (value: string) => {
					downloadValue = value;
					context.downloadFilename = value;
				},
				configurable: true,
			});
			anchor.click = function () {
				context.downloadLinkCreated = true;
				context.downloadFilename = downloadValue;
			};
			return anchor;
		}
		return originalCreateElement.call(document, tagName);
	} as typeof document.createElement;

	// Mock document.body.appendChild
	document.body.appendChild = function (node: Node) {
		return node;
	} as typeof document.body.appendChild;

	// Mock document.body.removeChild
	document.body.removeChild = function (node: Node) {
		return node;
	} as typeof document.body.removeChild;

	// Reset state
	imageOnLoadCallback = null;
	imageSrc = '';
	context.pngExportTriggered = false;
	context.svgSerialized = false;
	context.pngBlobCreated = false;
	context.downloadLinkCreated = false;
	context.downloadFilename = null;

	try {
		context.component.exportPng();
		// Give async operations time to complete
		// In a real scenario, we'd use promises or proper async handling
		// For BDT, we'll check state after a short delay
	} catch (e) {
		// Restore originals on error
		URL.createObjectURL = originalCreateObjectURL;
		URL.revokeObjectURL = originalRevokeObjectURL;
		document.createElement = originalCreateElement;
		document.body.appendChild = originalAppendChild;
		document.body.removeChild = originalRemoveChild;
		window.XMLSerializer = originalXMLSerializer;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).Image = originalImage;
		throw e;
	}

	// Note: In a real BDT scenario, we might need to wait for async operations
	// For now, the mocks trigger synchronously where possible
});

Then('the SVG sheet width should be {int}', (expectedWidth: number) => {
	assert.strictEqual(context.component.svgSheetWidth, expectedWidth);
});

Then('the SVG sheet height should be {int}', (expectedHeight: number) => {
	assert.strictEqual(context.component.svgSheetHeight, expectedHeight);
});

Then('there should be {int} parts', (expectedCount: number) => {
	assert.strictEqual(context.parts.length, expectedCount);
});

Then(
	'part {int} should have id {int}, position \\({int}, {int}\\), size {int}x{int}, and color {string}',
	(
		partIndex: number,
		expectedId: number,
		expectedX: number,
		expectedY: number,
		expectedWidth: number,
		expectedHeight: number,
		expectedColor: string
	) => {
		const part = context.parts[partIndex - 1];
		assert.ok(part, `Part ${partIndex} should exist`);
		assert.strictEqual(part.id, expectedId);
		assert.strictEqual(part.x, expectedX);
		assert.strictEqual(part.y, expectedY);
		assert.strictEqual(part.width, expectedWidth);
		assert.strictEqual(part.height, expectedHeight);
		assert.strictEqual(part.color, expectedColor);
	}
);

Then(
	'part {int} should have color {string}',
	(partIndex: number, expectedColor: string) => {
		const part = context.parts[partIndex - 1];
		assert.ok(part, `Part ${partIndex} should exist`);
		assert.strictEqual(part.color, expectedColor);
	}
);

Then('PNG export should not be triggered', () => {
	// Since exportPng returns early when conditions aren't met,
	// we check that the SVG wasn't serialized
	assert.ok(
		!context.svgSerialized,
		'PNG export should not have been triggered'
	);
});

Then('PNG export should be triggered', async () => {
	// Wait a bit for async operations to complete
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.ok(
		context.pngExportTriggered,
		'PNG export should have been triggered'
	);
});

Then('the SVG should be serialized', async () => {
	// Wait a bit for async operations to complete
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.ok(context.svgSerialized, 'SVG should have been serialized');
});

Then('a PNG blob should be created', async () => {
	// Wait a bit for async operations to complete
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.ok(context.pngBlobCreated, 'PNG blob should have been created');
});

Then(
	'a download link should be created with filename {string}',
	async (expectedFilename: string) => {
		// Wait a bit for async operations to complete
		await new Promise((resolve) => setTimeout(resolve, 50));
		assert.ok(
			context.downloadLinkCreated,
			'Download link should have been created'
		);
		assert.strictEqual(context.downloadFilename, expectedFilename);
	}
);
