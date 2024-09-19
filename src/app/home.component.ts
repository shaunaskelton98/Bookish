import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { WebService } from './web.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { of } from 'rxjs';


interface Book {
  title: string;
  author: string;
  averageRating: number;
  genre: string[];
  imageLink: string;
  numberOfPages: number;
  yearPublished: number;
}

interface Post {
  _id: string;
  username: string;
  comment: string;
  comments: Comment [];
  replying?: boolean;
  reply?: string;
  showComments?: boolean;
  commentId: string;
}

interface Comment {
  _id: string;
  username: string;
  comment: string;
}

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  highestRatedBook$: Observable<Book> | undefined; // Initialize as undefined or provide a default value
  postsList: any[] = [];
  username: string = '';
  post: string = '';
  defaultUsername: string = '';
  commentContent: string = '';
  isLoggedIn: boolean = false;
  user: import("@auth0/auth0-angular").User | null | undefined;

  constructor(public authService: AuthService, private webService: WebService) {}

  ngOnInit() {
    this.getHighestRatedBook();
    this.getPosts();

    this.authService.user$.subscribe(user => {
      this.defaultUsername = user?.name || ''; 
      this.user = user;
      this.isLoggedIn = !!user;
    });
    this.getPosts();

  }

  getHighestRatedBook(): void {
    this.webService.getHighestRatedBook().subscribe(
      (response: any) => {
        console.log('API Response:', response);
        this.highestRatedBook$ = of(response?.highest_rated_book); // Using 'of' to create an observable
      },
      (error: any) => {
        console.error('Error fetching highest-rated book:', error);
      }
    );
  }

  getPosts(): void {
    this.webService.getPosts().subscribe(posts => {
      this.postsList = posts;
    }, error => {
      console.error('Error fetching posts:', error);
    });
  }
  
  submitPost(): void {
    if (this.defaultUsername.trim() && this.post.trim()) {
      this.webService.addPost(this.defaultUsername, this.post).subscribe({
        next: (response) => {
          console.log('Post added:', response);
          // Optionally reset the form fields
          this.post = '';
          // Additional actions like refreshing the list of posts
        },
        error: (error) => {
          console.error('Error adding post:', error);
        }
      });
    } else {
      console.error('Username and post fields are required.');
    }
  }
  
  editPost(id: string): void {
    // Assuming username and post are updated in component properties
    this.webService.editPost(id, this.username, this.post)
      .subscribe(response => {
        console.log('Post edited:', response);
        this.getPosts(); // Refresh posts after editing
      }, error => {
        console.error('Error editing post:', error);
      });
  }

  deletePost(id: string): void {
    this.webService.deletePost(id)
      .subscribe(response => {
        console.log('Post deleted:', response);
        this.getPosts(); // Refresh posts after deleting
      }, error => {
        console.error('Error deleting post:', error);
      });
  }

  toggleReply(post: Post): void {
    post.replying = !post.replying;
  }

  submitReply(post: Post): void {
    if (this.commentContent && this.commentContent.trim()) {
      this.webService.addComment(post._id, this.defaultUsername, this.commentContent).subscribe(response => {
        console.log('Comment added:', this.commentContent);
        this.commentContent = ''; // Reset comment content
        post.replying = false; // Hide reply form
      });
    } else {
      console.error('Comment content is required.');
    }
  }

  deleteComment(postId: string, commentId: string): void {
    this.webService.deleteComment(postId, commentId).subscribe({
      next: (response) => {
        console.log('Comment deleted:', response);
        this.getPosts(); // Refresh posts after deleting a comment
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
      }
    });
  }
      
  cancelReply(post: Post): void {
    post.replying = false;
    post.reply = ''; // Clear reply input
  }
 
  toggleComments(post: Post): void {
    post.showComments = !post.showComments;
  }
  
  canDeleteComment(commentUsername: string): boolean {
    const loggedInUsername = this.defaultUsername; 
    return loggedInUsername === commentUsername;
  }  

}


