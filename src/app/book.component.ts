import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WebService } from './web.service';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthService, User } from '@auth0/auth0-angular';
import { DatePipe } from '@angular/common';
import { catchError, switchMap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { HttpHeaders, HttpClient } from '@angular/common/http';

interface Review {
  _id: string;
  date: string;
  username: string;
  review: string;
  rating: number;
  mood: string;
  isEditing?: boolean;
  userId: string;
}

interface ReviewSummary {
  happy: { count: number; percentage: string };
  sad: { count: number; percentage: string };
  neutral: { count: number; percentage: string };
  angry: { count: number; percentage: string };
  totalReviews: number;
}

interface MoodPercentages {
  [key: string]: string; // This says: any string key maps to a string value
}

interface UserWithRoles extends User {
  roles?: string[];
}

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.css'],
})
export class BookComponent implements OnInit {
  book: any = { reviews: [] };
  reviewForm!: FormGroup;
  editReviewForm!: FormGroup;
  aggregatedRating: number = 5;
  reviewRating: number = 5;
  moodRating: string = 'happy';
  editMoodRating: string = 'happy';
  editReviewRating: number = 5;
  ascendingOrder = true;
  editedReviewId: string | null = null;
  isEditing: boolean = false;
  @ViewChild('editingModeSection') editingModeSection!: ElementRef;
  user: { name?: string; email?: string; sub?: string } | null = null;
  isAdmin: boolean = false;
  sortedReviews: Review[] = [];
  private apiUrl = 'http://localhost:5000/api/v1.0/books';
  tbrBooks: string[] = []; // Array to store TBR books
  readBooks: string[] = []; // Array to store Read books
  newTbrBook: string = ''; // Variable to store new TBR book
  newReadBook: string = ''; // Variable to store new Read book
  userObjectId: string | null = null;
  defaultMood: string = 'happy';
  bookId: string = '';
  reviewSummary: ReviewSummary | null = null;
  bookData: any = {
    bookId: '',
    title: '',
    author: '',
    ISBN: '',
    averageRating: 0,
    numberOfPages: 0,
    yearPublished: 0,
    imageLink: '',
    genre: []
  };

  constructor(
    private route: ActivatedRoute,
    private webService: WebService,
    private formBuilder: FormBuilder,
    public authService: AuthService,
    private http: HttpClient,
    private datePipe: DatePipe
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.isEditing = false;
    const bookId = this.route.snapshot.params['id'];
    this.webService.getBook(bookId).subscribe(
      (data) => {
        this.book = data;
        this.book.review_count = this.webService.calculateReviewCount(data);
        this.book.BookId = bookId;
        this.checkAdminStatus();
      },

      (error) => {
        console.error('Error fetching book:', error);
        console.log('Review Form:', this.reviewForm);
      }
    );

    this.authService.user$.subscribe(
      (userData: UserWithRoles | null | undefined) => {
        this.user = userData ?? null;
        console.log('User Data:', userData);
        this.isAdmin = !!(
          userData &&
          userData['https://my-app.example.com/roles']?.includes('Admin')
        );
        console.log('isAdmin:', this.isAdmin);
        this.initializeForms();
        this.checkAdminStatus();
      },
      (error) => {
        console.error('Error checking admin status:', error);
      }
    );
    this.bookId = this.route.snapshot.params['id'];
    this.fetchBookDetails();
    this.userObjectId = localStorage.getItem('userId');
    console.log(
      'OnInit - User Object ID:',
      this.userObjectId,
      'Book ID:',
      this.bookId
    );
  }

  initializeForms() {
    const defaultUsername = this.user?.name || '';
    const defaultMood = 'happy';

    this.reviewForm = this.formBuilder.group({
      username: [defaultUsername, Validators.required],
      review: ['', Validators.required],
      rating: [5, Validators.required],
      mood: [defaultMood, Validators.required],
      reviewDate: [new Date().toISOString(), Validators.required],
    });

    this.editReviewForm = this.formBuilder.group({
      editUsername: ['', Validators.required],
      editReview: ['', Validators.required],
      editRating: [0, Validators.required],
      editMood: ['', Validators.required],
      editReviewDate: [new Date().toISOString(), Validators.required],
    });
  }

  onSubmit() {
    const bookId = this.book?._id;
    const userId = this.user?.sub || '';

    const payload = {
      username: this.reviewForm.value.username,
      review: this.reviewForm.value.review,
      rating: this.reviewRating,
      mood: this.reviewForm.value.mood,
      reviewDate: this.reviewForm.value.reviewDate,
    };

    this.webService
      .postReview(this.reviewForm.value)
      .subscribe((response: any) => {
        this.fetchBookDetails();
        this.reviewForm.reset();
        this.resetReviewForm();
        console.log('Review submitted successfully. User ID:', this.user?.sub);
      });
  }

  isInvalid(control: string) {
    const formControl = this.reviewForm?.get(control);
    return (
      formControl &&
      formControl.invalid &&
      (formControl.touched || formControl.dirty)
    );
  }

  isUntouched() {
    return this.reviewForm.controls['review'].pristine;
  }

  isIncomplete() {
    return (
      this.isInvalid('review') ||
      this.isInvalid('username') ||
      this.isUntouched()
    );
  }

  setRating(rating: number) {
    this.reviewRating = rating; // For the review form
    this.reviewForm.get('rating')?.setValue(rating);

    this.editReviewRating = rating; // For the edit review form
    this.editReviewForm.get('editRating')?.setValue(rating);
  }

  setMood(mood: string): void {
    this.moodRating = mood;
    this.reviewForm.get('mood')?.setValue(mood);
    this.editMoodRating = mood;
    this.editReviewForm.get('editMood')?.setValue(mood);
  }

  enableEdit(review: any) {
    this.isEditing = true;
    review.isEditing = true;
    this.editedReviewId = review._id;
    this.editReviewForm.patchValue({
      editUsername: review.username,
    });
  }

  disableEdit() {
    this.isEditing = false;
    this.editedReviewId = null;

    this.editReviewForm.patchValue({
      editRating: 5,
      editReviewDate: new Date().toISOString(),
    });
  }

  disableAllEdits() {
    this.book.reviews.forEach((review: Review) => (review.isEditing = false));
  }

  fetchBookDetails() {
    if (this.bookId) {
      this.webService.getBook(this.bookId).subscribe(
        (data) => {
          this.book = data;
          this.book.review_count = this.webService.calculateReviewCount(data);
          // Calculate review summary
          this.reviewSummary = this.calculateReviewSummary(this.book.reviews);
        },
        (error) => console.error('Error fetching book:', error)
      );
    }
  }

  submitEditedReview() {
    // Check form validity and editedReviewId
    if (this.editReviewForm.valid && this.editedReviewId) {
      const editedReview = this.editReviewForm.value;

      // Modify the payload field names to match the server's expectations
      const payload = {
        username: editedReview.editUsername,
        review: editedReview.editReview,
        rating: this.editReviewRating,
        mood: this.editMoodRating,
        date: editedReview.editReviewDate,
      };

      // Create headers
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
      });

      this.webService
        .editReview(this.book._id, this.editedReviewId, payload)
        .subscribe(
          () => {
            console.log('Review edited successfully');
            this.fetchBookDetails();
            this.editedReviewId = null;
            this.editReviewForm.reset();
          },
          (error: any) => {
            console.error('Error editing review:', error);
          }
        );
    }
  }

  resetReviewForm() {
    const usernameValue = this.reviewForm.get('username')?.value;
    this.reviewForm.reset();
    this.reviewForm.patchValue({
      username: usernameValue,
      reviewDate: new Date().toISOString(),
    });
  }

  canEditOrDelete(reviewUsername: string): boolean {
    return this.user?.name === reviewUsername;
  }

  deleteReview(review: Review) {
    if (!this.canEditOrDelete(review.username)) {
      // If the user is not the creator of the review, do not proceed with deletion
      console.log('You do not have permission to delete this review.');
      return;
    }

    const bookId = this.route.snapshot.params['id'];
    this.webService.deleteReview(bookId, review._id).subscribe(() => {
      this.fetchBookDetails();
    });
  }

  checkAdminStatus() {
    this.authService.user$.subscribe(
      (userData: UserWithRoles | null | undefined) => {
        this.isAdmin = !!(
          userData &&
          userData['https://my-app.example.com/roles']?.includes('Admin')
        );
        console.log('isAdmin:', this.isAdmin);
        console.log('User Data:', userData);
      },
      (error) => {
        console.error('Error checking admin status:', error);
      }
    );
  }

  deleteBook(bookId: string): Observable<any> {
    console.log('Deleting book with ID:', bookId);

    if (!this.isAdmin) {
      console.error('You do not have permission to delete this book.');
      return throwError('Permission denied');
    }

    const url = `${this.apiUrl}/${bookId}`;

    return this.http.delete(url, { observe: 'response' }).pipe(
      catchError((error) => {
        const errorMessage =
          error.error instanceof ErrorEvent
            ? error.error.message
            : error.statusText || 'Server error';
        console.error(`Error deleting book: ${errorMessage}`);
        return throwError(errorMessage);
      })
    );
  }

  onDeleteBook(bookId: string): void {
    console.log('Delete button clicked with book ID:', bookId);
    this.deleteBook(bookId).subscribe(
      (response) => {
        console.log('Book deleted successfully:', response);
      },
      (error) => {
        console.error('Error deleting book:', error);
      }
    );
  }

  calculateAggregatedRating(reviews: any[]): number {
    // Check if reviews exist
    if (!reviews || reviews.length === 0) {
      console.log('No reviews found');
      return 0;
    }

    // Log the reviews array
    console.log('Reviews:', reviews);

    // Calculate aggregated rating
    const totalRating = reviews.reduce((acc, curr) => {
      // Log each review object
      console.log('Review:', curr);
      return acc + curr.rating;
    }, 0);

    // Log the total rating
    console.log('Total Rating:', totalRating);
    // Calculate the average rating and store in a class property
    this.aggregatedRating = totalRating / reviews.length;
    console.log('Aggregated Rating:', this.aggregatedRating);//logs average rating 
    //returns avergage rating
    return this.aggregatedRating;
  }


  addBookToTBR(userId: string, book: any) {
    //xhecks for book, book id and title before proceeding
    if (!userId || !book || !book._id || !book.title) {
      console.error('User ID, book ID, or title not found.');
      return;
    }
  //prepares the book data form the book object 
    const bookData = {
      bookId: book._id,
      title: book.title,
      author: book.author,
      ISBN: book.ISBN,
      averageRating: book.averageRating,
      numberOfPages: book.numberOfPages,
      yearPublished: book.yearPublished,
      imageLink: book.imageLink,
      genre: book.genre
    };
    //calls to the web service to add the book to the TBR list
    this.webService.addBookToTBR(userId, bookData).subscribe(
      (response) => {
        console.log('Book added to TBR list:', response);//logs sucesses in console
      },
      (error) => {
        console.error('Error adding book to TBR:', error);//logs error in console
      }
    );
  }

  calculateReviewSummary(reviews: Review[]) {
    //initalise the ciunters for each mood
    let happy = 0,
      sad = 0,
      neutral = 0,
      angry = 0;
    const totalReviews = reviews.length;//total number of reviews
    // Iterate through each review to count moods
    reviews.forEach((review) => {
      switch (review.mood) {
        case 'happy':
          happy++;
          break;
        case 'sad':
          sad++;
          break;
        case 'neutral':
          neutral++;
          break;
        case 'angry':
          angry++;
          break;
        default:
          break;
      }
    });
    // Calculate mood percentages
    const happyPercentage = ((happy / totalReviews) * 100).toFixed(2);
    const sadPercentage = ((sad / totalReviews) * 100).toFixed(2);
    const neutralPercentage = ((neutral / totalReviews) * 100).toFixed(2);
    const angryPercentage = ((angry / totalReviews) * 100).toFixed(2);
    // Return an object containing mood counts and percentages along with the total review count
    return {
      happy: { count: happy, percentage: happyPercentage },
      sad: { count: sad, percentage: sadPercentage },
      neutral: { count: neutral, percentage: neutralPercentage },
      angry: { count: angry, percentage: angryPercentage },
      totalReviews,
    };
  }

  calculateUsernameWidth(): number {
    const username = this.user?.name || '';
    // Calculate the width based on the length of the username
    const width = username.length * 10; 
    return width;
  }
}
