import { BillofmaterialsComponent } from './billofmaterials/billofmaterials.component';
import { Draw2dComponent } from './draw2d/draw2d.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { View3DComponent } from './view3d/view3d.component';
import { ProjectComponent } from './project/project.component';

const routes: Routes = [
  { path: 'draw', component: Draw2dComponent },
  { path: 'view', component: View3DComponent },
  { path: 'bill', component: BillofmaterialsComponent },
  { path: 'cut', loadComponent: () => import('./cut/cut.component').then(m => m.CutComponent) },
  { path: 'project', component: ProjectComponent },
  { path: '', redirectTo: 'draw', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
