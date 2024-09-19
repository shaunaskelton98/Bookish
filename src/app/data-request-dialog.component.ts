import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <div class="modal-header">
      <h4 class="modal-title">We're on it</h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss('cancel')"></button>
    </div>
    <div class="modal-body">
      <p>{{ confirmMessage }}</p>
    </div>
  `,
})
export class DataRequestDialogComponent {
  @Input() confirmMessage: string = '';

  constructor(public activeModal: NgbActiveModal) {}

  confirm(): void {
    this.activeModal.close('confirm');
  }
}
