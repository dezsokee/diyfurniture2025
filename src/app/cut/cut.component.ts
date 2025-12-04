import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
  styleUrls: ['./cut.component.scss']
})
export class CutComponent {
  form: FormGroup;
  loading = false;
  elements: FormArray;
  placements: Placement[] = [];
  errorMsg: string | null = null;

  constructor(private fb: FormBuilder, private cutService: CutService) {
    this.elements = this.fb.array([]);
    this.form = this.fb.group({
      sheetWidth: [2000, [Validators.required, Validators.min(1)]],
      sheetHeight: [1000, [Validators.required, Validators.min(1)]],
      elements: this.elements
    });
  }

  addElement() {
    const nextId = this.elements.length + 1;
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
    this.form.get(control)?.setValue(Math.max(0, current - 1));
  }

  incEl(index: number, key: 'width' | 'height') {
    const group = this.elements.at(index) as FormGroup;
    const current = Number(group.get(key)?.value) || 0;
    group.get(key)?.setValue(current + 1);
  }

  decEl(index: number, key: 'width' | 'height') {
    const group = this.elements.at(index) as FormGroup;
    const current = Number(group.get(key)?.value) || 0;
    group.get(key)?.setValue(Math.max(0, current - 1));
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
        this.errorMsg = (err?.error?.message as string) || 'Optimization failed';
        this.loading = false;
        this.placements = [];
      }
    });
  }

  buildPayload(): SheetDimensions & { elements: CutElement[] } {
    const { sheetWidth, sheetHeight } = this.form.value as SheetDimensions;
    const elements = (this.elements.value as CutElement[]).map(e => ({
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
}
