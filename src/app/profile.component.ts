import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { WebService } from './web.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { DataRequestDialogComponent } from './data-request-dialog.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  user: any;
  tbrBooks: any[] = [];
  BookId: any;
  confirmMessage: string = '';
  apiUrl: string | undefined;


  constructor(
    public authService: AuthService,
    private webService: WebService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.user = user;
        const userData = { username: user.name, email: user.email };
        this.updateUserInDB(userData);
        if (user.sub) {
          this.getUserProfile(user.sub);
        } else {
          console.error('User ID is undefined');
        }
      } else {
        console.error('User is null or undefined');
      }
    });
  }

  updateUserInDB(userData: any): void {
    this.authService.idTokenClaims$.subscribe((claims) => {
      if (claims) {
        const userId = claims['sub'];
        userData.userId = userId;
        console.log('User data to be updated:', userData);
        this.webService.addOrUpdateUser(userData).subscribe({
          next: (response) => {
            console.log('User details updated successfully');
          },
          error: (error) => {
            console.error('Error updating user details:', error);
          },
        });
      } else {
        console.error('User claims are null or undefined');
      }
    });
  }

  getUserProfile(userId: string): void {
    this.webService.getUserProfile(userId).subscribe(
      (response) => {
        this.tbrBooks = response.tbr;
        console.log('User profile:', response);
      },
      (error) => {
        console.error('Error fetching user profile:', error);
      }
    );
  }

  deleteUser(): void {
    if (!this.user) {
      return;
    }
    const userId = this.user.sub;
    const auth0Domain = 'dev-tjjuyxmfmsn3lwjz.uk.auth0.com';
    const managementApiAccessToken =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkNIdDNhdHVXcTc4bFB6a1dnNEtQbSJ9.eyJpc3MiOiJodHRwczovL2Rldi10amp1eXhtZm1zbjNsd2p6LnVrLmF1dGgwLmNvbS8iLCJzdWIiOiJabGgxZ050Q3ZJRzRYOVhEeU1od0Raa2hLOHZEbldNVkBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9kZXYtdGpqdXl4bWZtc24zbHdqei51ay5hdXRoMC5jb20vYXBpL3YyLyIsImlhdCI6MTcxNDc0NDgyMCwiZXhwIjoxNzE0ODMxMjIwLCJzY29wZSI6InJlYWQ6Y2xpZW50X2dyYW50cyBjcmVhdGU6Y2xpZW50X2dyYW50cyBkZWxldGU6Y2xpZW50X2dyYW50cyB1cGRhdGU6Y2xpZW50X2dyYW50cyByZWFkOnVzZXJzIHVwZGF0ZTp1c2VycyBkZWxldGU6dXNlcnMgY3JlYXRlOnVzZXJzIHJlYWQ6dXNlcnNfYXBwX21ldGFkYXRhIHVwZGF0ZTp1c2Vyc19hcHBfbWV0YWRhdGEgZGVsZXRlOnVzZXJzX2FwcF9tZXRhZGF0YSBjcmVhdGU6dXNlcnNfYXBwX21ldGFkYXRhIHJlYWQ6dXNlcl9jdXN0b21fYmxvY2tzIGNyZWF0ZTp1c2VyX2N1c3RvbV9ibG9ja3MgZGVsZXRlOnVzZXJfY3VzdG9tX2Jsb2NrcyBjcmVhdGU6dXNlcl90aWNrZXRzIHJlYWQ6Y2xpZW50cyB1cGRhdGU6Y2xpZW50cyBkZWxldGU6Y2xpZW50cyBjcmVhdGU6Y2xpZW50cyByZWFkOmNsaWVudF9rZXlzIHVwZGF0ZTpjbGllbnRfa2V5cyBkZWxldGU6Y2xpZW50X2tleXMgY3JlYXRlOmNsaWVudF9rZXlzIHJlYWQ6Y29ubmVjdGlvbnMgdXBkYXRlOmNvbm5lY3Rpb25zIGRlbGV0ZTpjb25uZWN0aW9ucyBjcmVhdGU6Y29ubmVjdGlvbnMgcmVhZDpyZXNvdXJjZV9zZXJ2ZXJzIHVwZGF0ZTpyZXNvdXJjZV9zZXJ2ZXJzIGRlbGV0ZTpyZXNvdXJjZV9zZXJ2ZXJzIGNyZWF0ZTpyZXNvdXJjZV9zZXJ2ZXJzIHJlYWQ6ZGV2aWNlX2NyZWRlbnRpYWxzIHVwZGF0ZTpkZXZpY2VfY3JlZGVudGlhbHMgZGVsZXRlOmRldmljZV9jcmVkZW50aWFscyBjcmVhdGU6ZGV2aWNlX2NyZWRlbnRpYWxzIHJlYWQ6cnVsZXMgdXBkYXRlOnJ1bGVzIGRlbGV0ZTpydWxlcyBjcmVhdGU6cnVsZXMgcmVhZDpydWxlc19jb25maWdzIHVwZGF0ZTpydWxlc19jb25maWdzIGRlbGV0ZTpydWxlc19jb25maWdzIHJlYWQ6aG9va3MgdXBkYXRlOmhvb2tzIGRlbGV0ZTpob29rcyBjcmVhdGU6aG9va3MgcmVhZDphY3Rpb25zIHVwZGF0ZTphY3Rpb25zIGRlbGV0ZTphY3Rpb25zIGNyZWF0ZTphY3Rpb25zIHJlYWQ6ZW1haWxfcHJvdmlkZXIgdXBkYXRlOmVtYWlsX3Byb3ZpZGVyIGRlbGV0ZTplbWFpbF9wcm92aWRlciBjcmVhdGU6ZW1haWxfcHJvdmlkZXIgYmxhY2tsaXN0OnRva2VucyByZWFkOnN0YXRzIHJlYWQ6aW5zaWdodHMgcmVhZDp0ZW5hbnRfc2V0dGluZ3MgdXBkYXRlOnRlbmFudF9zZXR0aW5ncyByZWFkOmxvZ3MgcmVhZDpsb2dzX3VzZXJzIHJlYWQ6c2hpZWxkcyBjcmVhdGU6c2hpZWxkcyB1cGRhdGU6c2hpZWxkcyBkZWxldGU6c2hpZWxkcyByZWFkOmFub21hbHlfYmxvY2tzIGRlbGV0ZTphbm9tYWx5X2Jsb2NrcyB1cGRhdGU6dHJpZ2dlcnMgcmVhZDp0cmlnZ2VycyByZWFkOmdyYW50cyBkZWxldGU6Z3JhbnRzIHJlYWQ6Z3VhcmRpYW5fZmFjdG9ycyB1cGRhdGU6Z3VhcmRpYW5fZmFjdG9ycyByZWFkOmd1YXJkaWFuX2Vucm9sbG1lbnRzIGRlbGV0ZTpndWFyZGlhbl9lbnJvbGxtZW50cyBjcmVhdGU6Z3VhcmRpYW5fZW5yb2xsbWVudF90aWNrZXRzIHJlYWQ6dXNlcl9pZHBfdG9rZW5zIGNyZWF0ZTpwYXNzd29yZHNfY2hlY2tpbmdfam9iIGRlbGV0ZTpwYXNzd29yZHNfY2hlY2tpbmdfam9iIHJlYWQ6Y3VzdG9tX2RvbWFpbnMgZGVsZXRlOmN1c3RvbV9kb21haW5zIGNyZWF0ZTpjdXN0b21fZG9tYWlucyB1cGRhdGU6Y3VzdG9tX2RvbWFpbnMgcmVhZDplbWFpbF90ZW1wbGF0ZXMgY3JlYXRlOmVtYWlsX3RlbXBsYXRlcyB1cGRhdGU6ZW1haWxfdGVtcGxhdGVzIHJlYWQ6bWZhX3BvbGljaWVzIHVwZGF0ZTptZmFfcG9saWNpZXMgcmVhZDpyb2xlcyBjcmVhdGU6cm9sZXMgZGVsZXRlOnJvbGVzIHVwZGF0ZTpyb2xlcyByZWFkOnByb21wdHMgdXBkYXRlOnByb21wdHMgcmVhZDpicmFuZGluZyB1cGRhdGU6YnJhbmRpbmcgZGVsZXRlOmJyYW5kaW5nIHJlYWQ6bG9nX3N0cmVhbXMgY3JlYXRlOmxvZ19zdHJlYW1zIGRlbGV0ZTpsb2dfc3RyZWFtcyB1cGRhdGU6bG9nX3N0cmVhbXMgY3JlYXRlOnNpZ25pbmdfa2V5cyByZWFkOnNpZ25pbmdfa2V5cyB1cGRhdGU6c2lnbmluZ19rZXlzIHJlYWQ6bGltaXRzIHVwZGF0ZTpsaW1pdHMgY3JlYXRlOnJvbGVfbWVtYmVycyByZWFkOnJvbGVfbWVtYmVycyBkZWxldGU6cm9sZV9tZW1iZXJzIHJlYWQ6ZW50aXRsZW1lbnRzIHJlYWQ6YXR0YWNrX3Byb3RlY3Rpb24gdXBkYXRlOmF0dGFja19wcm90ZWN0aW9uIHJlYWQ6b3JnYW5pemF0aW9uc19zdW1tYXJ5IGNyZWF0ZTphdXRoZW50aWNhdGlvbl9tZXRob2RzIHJlYWQ6YXV0aGVudGljYXRpb25fbWV0aG9kcyB1cGRhdGU6YXV0aGVudGljYXRpb25fbWV0aG9kcyBkZWxldGU6YXV0aGVudGljYXRpb25fbWV0aG9kcyByZWFkOm9yZ2FuaXphdGlvbnMgdXBkYXRlOm9yZ2FuaXphdGlvbnMgY3JlYXRlOm9yZ2FuaXphdGlvbnMgZGVsZXRlOm9yZ2FuaXphdGlvbnMgY3JlYXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJzIHJlYWQ6b3JnYW5pemF0aW9uX21lbWJlcnMgZGVsZXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJzIGNyZWF0ZTpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgcmVhZDpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgdXBkYXRlOm9yZ2FuaXphdGlvbl9jb25uZWN0aW9ucyBkZWxldGU6b3JnYW5pemF0aW9uX2Nvbm5lY3Rpb25zIGNyZWF0ZTpvcmdhbml6YXRpb25fbWVtYmVyX3JvbGVzIHJlYWQ6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyBkZWxldGU6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyBjcmVhdGU6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIHJlYWQ6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIGRlbGV0ZTpvcmdhbml6YXRpb25faW52aXRhdGlvbnMgcmVhZDpzY2ltX2NvbmZpZyBjcmVhdGU6c2NpbV9jb25maWcgdXBkYXRlOnNjaW1fY29uZmlnIGRlbGV0ZTpzY2ltX2NvbmZpZyBjcmVhdGU6c2NpbV90b2tlbiByZWFkOnNjaW1fdG9rZW4gZGVsZXRlOnNjaW1fdG9rZW4gZGVsZXRlOnBob25lX3Byb3ZpZGVycyBjcmVhdGU6cGhvbmVfcHJvdmlkZXJzIHJlYWQ6cGhvbmVfcHJvdmlkZXJzIHVwZGF0ZTpwaG9uZV9wcm92aWRlcnMgZGVsZXRlOnBob25lX3RlbXBsYXRlcyBjcmVhdGU6cGhvbmVfdGVtcGxhdGVzIHJlYWQ6cGhvbmVfdGVtcGxhdGVzIHVwZGF0ZTpwaG9uZV90ZW1wbGF0ZXMgY3JlYXRlOmVuY3J5cHRpb25fa2V5cyByZWFkOmVuY3J5cHRpb25fa2V5cyB1cGRhdGU6ZW5jcnlwdGlvbl9rZXlzIGRlbGV0ZTplbmNyeXB0aW9uX2tleXMiLCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMiLCJhenAiOiJabGgxZ050Q3ZJRzRYOVhEeU1od0Raa2hLOHZEbldNViJ9.V4GJk0-cb47hmgrW1Zx2KpIrXDzaRMG5Ti9rTphU9d3EaLY1p1DR2QOdPBCqJVfJC6ZnZATcyOfwQ0XWmuuKBqn-TnpxVrRRRIiQ7ecQDubxf74N-GW68Ywvo2q0nWTQTrIuAPNKxM0JFAmqJdNaworrw4cD-FnFc-ZImXJ8Qc6sTiutjd04oFtWhbe2AA6aeGA2nHUApwlsIVWlPu4DMd1Mh1m8UoVANh_ZWu2PolHClRUVmtRt0-YZkDHhYolVw7tsSNP8S4IcugKkx20E0CJoTqucC6xL0L6mhCd-d2HgbZEVI2wCZtHwc9Owm5mvJQ8NB2sj9PqV_krt8xFxIg"
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${managementApiAccessToken}`,
    };

    this.http
      .delete(`https://${auth0Domain}/api/v2/users/${userId}`, { headers })
      .subscribe(
        () => {
          // Log out the user
          this.authService.logout();
          // Redirect to home page
          window.location.href = '/';
          // Close the confirmation dialog if applicable
          this.modalService.dismissAll();
        },
        (error) => {
          console.error('Error deleting user:', error);
        }
      );
  }

  confirmDeleteUser(): void {
    this.confirmMessage = 'Are you sure you want to delete your account?';
    this.openConfirmationDialog();
  }
  
  openConfirmationDialog(): void {
    const modalRef = this.modalService.open(ConfirmationDialogComponent);
    modalRef.componentInstance.confirmMessage = this.confirmMessage;
    
    modalRef.result.then((result) => {
      if (result === 'confirm') {
        this.deleteUser(); // Ensure deleteUser is the correct method you want to call
      }
    }, (reason) => {
      console.log(`Dismissed with reason: ${reason}`);
    });
  }
  
  

  deleteUserTBRBook(bookId: string): void {
    if (!this.user) {
      return;
    }
    const userId = this.user.sub;
    this.webService.deleteBookFromTBR(userId, bookId).subscribe(
      () => {
        // Remove the deleted book from the local array
        this.tbrBooks = this.tbrBooks.filter((book) => book.bookId !== bookId);
      },
      (error) => {
        console.error('Error deleting book from TBR list:', error);
      }
    );
  }

  requestUserData(userId: string, username: string): void {
    this.webService.requestData(userId, username).subscribe(
      (response) => {
        console.log('Data request sent successfully:', response);
        // Open confirmation dialog for data request
        this.openDataRequestConfirmationDialog();
      },
      (error) => {
        console.error('Error occurred while sending data request:', error);
      }
    );
  }

  openDataRequestConfirmationDialog(): void {
    const modalRef = this.modalService.open(DataRequestDialogComponent);
    modalRef.componentInstance.confirmMessage = 'Data request sent successfully';
    modalRef.result.then(
      (result) => {
        // Handle confirmation result if needed
      },
      (reason) => {
        // Handle dismissal/cancellation of the dialog
      }
    );
  }

}
