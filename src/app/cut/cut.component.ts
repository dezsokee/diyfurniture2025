import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
	FormArray,
	FormBuilder,
	FormGroup,
	Validators,
	ReactiveFormsModule,
	FormsModule,
} from '@angular/forms';
import { MaterialModule } from '../material.module';
import { CutService, CutResponse, Placement } from './cut.service';

interface CutElement {
	id: number;
	width: number;
	height: number;
	type?: 'door' | 'leg' | 'shelf' | 'panel' | 'accessory';
}

interface SheetDimensions {
	sheetWidth: number;
	sheetHeight: number;
}

@Component({
	selector: 'app-cut',
	standalone: true,
	imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule],
	templateUrl: './cut.component.html',
	styleUrls: ['./cut.component.scss'],
})
export class CutComponent {
	@ViewChild('cutSvg', { static: false }) svgRef?: ElementRef<SVGSVGElement>;
	form: FormGroup;
	loading = false;
	elements: FormArray;
	placements: Placement[] = [];
	errorMsg: string | null = null;
	private nextId = 1;

	constructor(
		private fb: FormBuilder,
		private cutService: CutService
	) {
		this.elements = this.fb.array([]);
		this.form = this.fb.group({
			sheetWidth: [2000, [Validators.required, Validators.min(1)]],
			sheetHeight: [1000, [Validators.required, Validators.min(1)]],
			elements: this.elements,
		});
	}

	private getTypeColor(type?: CutElement['type']): string {
		switch (type) {
			case 'door':
				return '#90caf9'; // blue
			case 'leg':
				return '#a5d6a7'; // green
			case 'shelf':
				return '#ffe082'; // yellow
			case 'accessory':
				return '#ce93d8'; // purple
			case 'panel':
			default:
				return '#b0bec5'; // grey
		}
	}

	get svgSheetWidth(): number {
		return this.form?.get('sheetWidth')?.value || 1;
	}

	get svgSheetHeight(): number {
		return this.form?.get('sheetHeight')?.value || 1;
	}

	get parts() {
		const formElements = this.elements.value as CutElement[];

		return (this.placements || []).map((p, index) => {
			const el = formElements.find((e) => e.id === p.id);
			const type = el?.type;

			return {
				id: p.id ?? index,
				x: p.x,
				y: p.y,
				width: p.width,
				height: p.height,
				color: this.getTypeColor(type),
			};
		});
	}

	addElement() {
		const nextId = this.nextId++;
		const group = this.fb.group({
			id: [nextId],
			type: ['panel'],
			width: [100, [Validators.required, Validators.min(1)]],
			height: [50, [Validators.required, Validators.min(1)]],
		});
		this.elements.push(group);
	}

	removeElement(index: number) {
		this.elements.removeAt(index);
	}

	incSheet(control: 'sheetWidth' | 'sheetHeight') {
		const current = Number(this.form.get(control)?.value) || 0;
		this.form.get(control)?.setValue(current + 1);
	}

	decSheet(control: 'sheetWidth' | 'sheetHeight') {
		const current = Number(this.form.get(control)?.value) || 0;
		this.form.get(control)?.setValue(Math.max(1, current - 1));
	}

	incEl(index: number, key: 'width' | 'height') {
		const group = this.elements.at(index) as FormGroup;
		const current = Number(group.get(key)?.value) || 0;
		group.get(key)?.setValue(current + 1);
	}

	decEl(index: number, key: 'width' | 'height') {
		const group = this.elements.at(index) as FormGroup;
		const current = Number(group.get(key)?.value) || 0;
		group.get(key)?.setValue(Math.max(1, current - 1));
	}

	optimize() {
		if (this.form.invalid || this.elements.length === 0) {
			// Safety: prevent cut without elements
			return;
		}

		this.loading = true;
		this.errorMsg = null;
		const payload = this.buildPayload();
		this.cutService.optimize(payload).subscribe({
			next: (res: CutResponse) => {
				this.placements = res.placements ?? [];
				this.loading = false;
			},
			error: (err) => {
				this.errorMsg =
					(err?.error?.message as string) || 'Optimization failed';
				this.loading = false;
				this.placements = [];
			},
		});
	}

	buildPayload(): SheetDimensions & { elements: CutElement[] } {
		const { sheetWidth, sheetHeight } = this.form.value as SheetDimensions;
		const elements = (this.elements.value as CutElement[]).map((e) => ({
			id: e.id,
			width: e.width,
			height: e.height,
		}));
		return { sheetWidth, sheetHeight, elements };
	}

	getTypeIcon(type?: CutElement['type']): string {
		switch (type) {
			case 'door':
				return 'door_front';
			case 'leg':
				return 'construction';
			case 'shelf':
				return 'auto_awesome_mosaic';
			case 'accessory':
				return 'extension';
			case 'panel':
			default:
				return 'crop_square';
		}
	}

	exportPng() {
		if (!this.placements?.length) {
			return;
		}

		const svgElement = this.svgRef?.nativeElement;
		if (!svgElement) {
			return;
		}

		const viewBox = svgElement.viewBox?.baseVal;
		const width =
			(viewBox && viewBox.width) || svgElement.clientWidth || 1000;
		const height =
			(viewBox && viewBox.height) || svgElement.clientHeight || 500;

		const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
		clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		clonedSvg.setAttribute('width', String(width));
		clonedSvg.setAttribute('height', String(height));

		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(clonedSvg);
		const blob = new Blob([svgString], {
			type: 'image/svg+xml;charset=utf-8',
		});
		const url = URL.createObjectURL(blob);

		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				URL.revokeObjectURL(url);
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);
			URL.revokeObjectURL(url);

			canvas.toBlob((pngBlob) => {
				if (!pngBlob) {
					return;
				}
				const pngUrl = URL.createObjectURL(pngBlob);
				const a = document.createElement('a');
				a.href = pngUrl;
				a.download = 'cut-layout.png';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(pngUrl);
			}, 'image/png');
		};

		img.src = url;
	}
}
