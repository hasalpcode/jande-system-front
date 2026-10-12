import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { SeanceCours } from '../../../core/models/cours.models';

export interface SeanceCoursDetailDialogData {
  seance: SeanceCours;
}

@Component({
  selector: 'app-seance-cours-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './seance-cours-detail-dialog.html',
  styleUrl: './seance-cours-detail-dialog.scss',
})
export class SeanceCoursDetailDialog {
  readonly data = inject<SeanceCoursDetailDialogData>(MAT_DIALOG_DATA);
}
