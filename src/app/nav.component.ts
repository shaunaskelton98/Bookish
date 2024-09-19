import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Router } from '@angular/router';

@Component({
  selector: 'navigation',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent {
  isAdmin: boolean = false;
  loggedOut: any;
  user: any;
  isNavbarOpen = false;

  constructor(public authService: AuthService, private router: Router) {
    this.checkAdminStatus();
  }

  toggleNavbar() {
    this.isNavbarOpen = !this.isNavbarOpen;
  }

  checkAdminStatus() {
    this.authService.user$.subscribe(
      (userData: any) => {
        this.isAdmin = !!(userData && userData['https://my-app.example.com/roles']?.includes('Admin'));
        console.log('isAdmin:', this.isAdmin);
      }
      )
    }
}
