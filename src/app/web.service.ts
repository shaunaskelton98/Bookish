import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '@auth0/auth0-angular';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class WebService {
  private BookId: any;
  tbrBooks: string[] = [];
  private apiUrl = 'http://localhost:5000/api/v1.0/books';
  private postURL = 'http://localhost:5000/api/v1.0/books/posts';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private createHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });

  }

  getHighestRatedBook(): Observable<any> {
    const url = `http://localhost:5000/api/v1.0/home`;
    return this.http.get(url);
  }

  getGenres(): Observable<string[]> {
    const genresUrl = `${this.apiUrl}/genres`;
    return this.http.get<string[]>(genresUrl);
  }

  getBooks(
    startIndex: number,
    sortField: string,
    sortDirection: string
  ): Observable<any[]> {
    const booksPerPage = 9;
    const url = `${this.apiUrl}?pn=${
      startIndex / booksPerPage + 1
    }&ps=${booksPerPage}&sortField=${sortField}&sortDirection=${sortDirection}`;
    return this.http.get<any[]>(url);
  }

  getBook(id: any): Observable<any> {
    this.BookId = id;
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<any>(url).pipe(
      tap((data) => {
        console.log('Book data:', data);
      })
    );
  }

  calculateReviewCount(book: any): number {
    return book.reviews ? book.reviews.length : 0;
  }

  getReviews(id: any): Observable<any[]> {
    const url = `${this.apiUrl}/${id}/reviews`;
    return this.http.get<any[]>(url);
  }

  postReview(review: any): Observable<any> {
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    const postData = {
      username: review.username,
      review: review.review,
      rating: review.rating,
      mood: review.mood,
      date: todayDate,
    };

    if (!this.BookId) {
      // Throw an error if BookId is not defined
      return throwError('Invalid BookId');
    }

    const url = `${this.apiUrl}/${this.BookId}/reviews`;
    return this.http.post<any>(url, postData);
  }

  search(query: string): Observable<any[]> {
    const url = `${this.apiUrl}?query=${query}`;
    return this.http.get<any[]>(url);
  }

  getBookDetails(bookId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${bookId}`);
  }

  editReview(bookId: string, reviewId: string, data: any): Observable<any> {
    const url = `${this.apiUrl}/${bookId}/reviews/${reviewId}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return this.http.put(url, data, { headers });
  }

  addBook(bookData: any, file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('title', bookData.title);
    formData.append('author', bookData.author);
    formData.append('ISBN', bookData.ISBN);
    formData.append('imageLink', file, file.name);
    formData.append('genre', bookData.genre);

    return this.http.post(this.apiUrl, formData).pipe(
      catchError((error) => {
        console.error('Error adding book:', error);
        return throwError(error);
      })
    );
  }

  deleteReview(bookId: string, reviewId: string): Observable<any> {
    // Check if reviewId is provided
    if (!reviewId) {
      console.error('Error deleting review: reviewId is undefined');
      return throwError('Invalid reviewId');
    }

    const url = `${this.apiUrl}/${bookId}/reviews/${reviewId}`;

    return this.http.delete(url).pipe(
      catchError((error) => {
        console.error('Error deleting review:', error);
        return throwError(error);
      })
    );
  }

  deleteBook(bookId: string): Observable<any> {
    if (!bookId) {
      console.error('Error deleting book: bookId is undefined');
      return throwError('Invalid bookId');
    }

    const url = `${this.apiUrl}/${bookId}`;

    return this.http.delete(url).pipe(
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

  getPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/posts`);
  }

  addPost(username: string, post: string) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const body = JSON.stringify({ username, post });

    return this.http.post(this.postURL, body, { headers });

    
  }

  editPost(id: string, username: string, post: string): Observable<any> {
    return this.http.put<any>(`${this.postURL}/${id}`, { username, post });
  }

  deletePost(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/posts/${id}`);
  }

  addComment(id: string, username: string, comment: string): Observable<any> {
    const url = `${this.postURL}/${id}/comments`;
    const body = { username, comment };
    return this.http.post(url, body);
  }

  deleteComment(postId: string, commentId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/posts/${postId}/comments/${commentId}`
    );
  }

  addOrUpdateUser(userData: any): Observable<any> {
    const usersEndpoint = `http://localhost:5000/api/v1.0/books/users`; // User endpoint
    return this.http.post(usersEndpoint, userData); // POST request to add/update user
  }


  addBookToTBR(userId: string, bookData: any): Observable<any> {
    const url = `${this.apiUrl}/profile/${userId}`;
    return this.http.post(url, bookData);
  }
  
  filterBooks(mood: string, selectedGenres: string[]): Observable<any[]> {
    //query parameters based on the selected filters
    let params = new HttpParams();
    if (mood) {
      params = params.set('mood', mood);
    }
    if (selectedGenres && selectedGenres.length > 0) {
      selectedGenres.forEach(genre => {
        params = params.append('genre', genre);
      });
    }
    //HTTP request to the backend API to filter books
    return this.http.get<any[]>(`${this.apiUrl}`, { params }); 
  }  

  getUserProfile(userId: string): Observable<any> {
    return this.http.get<any>(`http://localhost:5000/api/v1.0/books/profile/${userId}`);
  }

  deleteBookFromTBR(userId: string, bookId: string): Observable<any> {
    return this.http.delete<any>(`http://localhost:5000/api/v1.0/books/profile/${userId}/tbr/${bookId}`)
  } 

  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/profile/${userId}`);
  }

  requestData(userId: string, username: string): Observable<any> {
    return this.http.post<any>('http://localhost:5000/api/v1.0/admin/data-requests', { userId, username });
  }
}