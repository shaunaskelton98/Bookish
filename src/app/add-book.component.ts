
import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { WebService } from './web.service';
import { SuccessModalComponent } from './success-modal.component';

@Component({
  selector: 'app-add-book',
  templateUrl: './add-book.component.html',
  styleUrls: ['./add-book.component.css']
})
export class AddBookComponent implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput: ElementRef | undefined; 

  bookData: any = {
    title: '',
    author: '',
    genre: [], // Initialize genre as an empty array
    ISBN: '',
    imageLink: null // Initialize image as null
  };

  addBookForm: any; // Declare addBookForm
  genres: string[] = []; // Define an array to hold the selected genre

  constructor(private webService: WebService, private modalService: NgbModal) {}

  openSuccessModal() {
    const modalRef = this.modalService.open(SuccessModalComponent);

    setTimeout(() => {
      modalRef.close();
      // Reload the page after closing the modal
      location.reload();
    }, 2000);

    modalRef.componentInstance.title = 'Book Added Successfully';
    modalRef.componentInstance.message = 'Your book has been added successfully!';
  }


  ngOnInit() {
    // Initialize addBookForm
    this.addBookForm = {
      controls: {
        title: { pristine: true },
        author: { pristine: true },
        ISBN: { pristine: true },
        imageLink: { pristine: true }
      }
    };

    this.webService.getGenres().subscribe(
      (data: string[]) => {
        this.genres = data; // Corrected variable name to 'genres'
      },
      (error) => {
        console.error('Error fetching genres:', error);
      }
    );
  }

  onSubmit(form: NgForm): void {
    const bookData = form.value;

    if (this.fileInput && this.fileInput.nativeElement && this.fileInput.nativeElement.files.length > 0) {
      const file = this.fileInput.nativeElement.files[0];

      this.webService.addBook(bookData, file).subscribe(
        (response) => {
          console.log('Book added successfully:', response);
          this.openSuccessModal(); // Open the success modal
          // Handle success as needed
        },
        (error) => {
          console.error('Error adding book:', error);
          // Handle error as needed
        }
      );
    } else {
      console.error('No file selected');
      // Handle case where no file is selected
    }
  }

  onFileSelected(event: any) {
    // Capture the selected file from the file input
    const file = event.target.files[0];
    this.bookData.imageLink = file;

    // Update the form completeness status
    this.updateFormCompleteness();
  }

  updateFormCompleteness() {
    // Update the form completeness status based on the presence of required fields
    this.addBookForm.controls.title.pristine = !this.bookData.title.trim();
    this.addBookForm.controls.author.pristine = !this.bookData.author.trim();
    this.addBookForm.controls.ISBN.pristine = !this.bookData.ISBN.trim();
    this.addBookForm.controls.imageLink.pristine = !this.bookData.imageLink;
  }
  //checking if form is valid
  isInvalid(control: any) {
    return this.addBookForm.controls[control].invalid &&
      !this.addBookForm.controls[control].pristine;
  }
//checking all fields are used
  isUntouched() {
    return this.addBookForm.controls.title.pristine &&
      this.addBookForm.controls.author.pristine &&
      this.addBookForm.controls.ISBN.pristine &&
      this.addBookForm.controls.imageLink.pristine;
  }
//checking form is not incomplete
  isIncomplete() {
    return this.isInvalid('title') ||
      this.isInvalid('author') ||
      this.isInvalid('ISBN') ||
      this.isInvalid('imageLink') ||
      this.isUntouched();
  }
}
