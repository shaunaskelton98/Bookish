import { Component, OnInit } from '@angular/core';
import { WebService } from './web.service';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'books',
  templateUrl: './books.component.html',
  styleUrls: ['./books.component.css'],
})
export class BooksComponent implements OnInit {
  constructor(public webService: WebService, public authService: AuthService) {}

  book_list: any = [];
  page: number = 1;
  booksPerPage: number = 9;
  totalBooks: number = 122;
  totalPages: number = Math.ceil(this.totalBooks / this.booksPerPage);
  searchQuery: string = '';
  sortDirection: string = 'asc';
  sortField: string = 'title';
  moods: string[] = ['Happy', 'Sad', 'Angry', 'Neutral'];
  genres: string[] = [];
  originalBookList: any = [];
  selectedGenres: { [key: string]: boolean } = {};
  selectedMoods: { [key: string]: boolean } = {};
  isSidebarOpen: boolean = false;
  moodFilter: any = [];

  ngOnInit() {
    if (sessionStorage['page']) {
      this.page = Number(sessionStorage['page']);
    }
    this.fetchGenres();
    this.loadBooks();
    this.isSidebarOpen = true;
  }

  loadBooks() {
    const startIndex = this.booksPerPage * (this.page - 1);

    this.webService
      .getBooks(startIndex, this.sortField, this.sortDirection)
      .subscribe((books) => {
        this.originalBookList = books.map((book: any) => ({
          ...book,
          averageRating: parseFloat(book.averageRating),
        }));
        this.book_list = [...this.originalBookList];
      });
  }

  //Pagination
  previousPage() {
    if (this.page > 1) {
      this.page--;
      sessionStorage['page'] = this.page;
      this.loadBooks();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      sessionStorage['page'] = this.page;
      this.loadBooks();
    }
  }

  getPageArray(totalPages: number): number[] {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  setPage(page: number) {
    this.page = page;
    sessionStorage['page'] = this.page;
    this.loadBooks();
  }

  // Calculate review count
  calculateReviewCount(book: any): number {
    return book.reviews ? book.reviews.length : 0;
  }

  // Search books
  searchBooks() {
    if (this.searchQuery.trim() !== '') {
      this.webService.search(this.searchQuery).subscribe((results) => {
        this.book_list = results;
      });
    } else {
      this.loadBooks();
    }
  }

  //Sort Books Function
  sortBooks(field: string) {
    if (field === this.sortField) {
      this.sortDirection =
        field === 'rating'
          ? 'asc'
          : this.sortDirection === 'asc'
          ? 'desc'
          : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.loadBooks();
  }

  //Calculate average rating
  calculateAggregatedRating(reviews: any[]): number {
    // Check if reviews exist
    if (!reviews || reviews.length === 0) {
      return 0;
    }
    // Calculate aggregated rating
    const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const aggregatedRating = totalRating / reviews.length;

    return aggregatedRating;
  }

  //Filter functions
  applyFilters(): void {
    // Check if any genres are selected
    const anyGenresSelected = Object.values(this.selectedGenres).some(
      (selected) => selected
    );
    // Prepare selected genres for filtering
    const selectedGenres = Object.keys(this.selectedGenres).filter(
      (genre) => this.selectedGenres[genre]
    );
    // Prepare mood filter
    let mood: string = '';
    if (this.selectedMoods) {
      mood =
        Object.keys(this.selectedMoods).find((m) => this.selectedMoods[m]) ||
        '';
    }
    // Call the WebService method to filter books
    this.webService
      .filterBooks(mood, selectedGenres)
      .subscribe((filteredBooks) => {
        // Update the book_list with the filtered results
        this.book_list = filteredBooks;
        // Reset the page to 1 after applying filters
        this.page = 1;
      });
  }

  //Filter Mood
  filterByMood(mood: string) {
    this.selectedMoods = {};
    this.selectedMoods[mood] = true;
    this.moodFilter = [mood];
    this.applyFilters();
  }

  //Fetching Genres
  fetchGenres() {
    this.webService.getGenres().subscribe(
      (genres) => {
        this.genres = genres;
      },
      (error) => {
        console.error('Error fetching genres:', error);
      }
    );
  }

  toggleGenreFilter(genre: string) {
    // Check if the genre is already selected
    if (this.selectedGenres[genre]) {
      // Genre already selected, remove it
      delete this.selectedGenres[genre];
    } else {
      // Genre not selected, add it
      this.selectedGenres[genre] = true;
    }
    // Reload books based on selected genres
    this.loadBooks();
  }

  isGenreSelected(genre: string): boolean {
    return this.selectedGenres[genre] === true;
  }

  toggleSidebar(): void {
    console.log('Toggling dropdown'); // Add this line for debugging
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
