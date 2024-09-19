import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { SuccessModalComponent } from './success-modal.component';
import { AppComponent } from './app.component';
import { BooksComponent } from './books.component';
import { WebService } from './web.service';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { HomeComponent } from './home.component';
import { BookComponent } from './book.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthModule } from '@auth0/auth0-angular';
import { NavComponent } from './nav.component';
import { DatePipe } from '@angular/common';
import { AddBookComponent } from './add-book.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '@auth0/auth0-angular';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ProfileComponent } from './profile.component';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';




var routes: any = [
  {path: '', component: HomeComponent},
  {path: 'books', component: BooksComponent},
  {path: 'books/:id', component: BookComponent},
  {path: 'add-book', component: AddBookComponent},
  {path: 'profile', component: ProfileComponent},
];

@NgModule({
  declarations: [
    AppComponent, 
    BooksComponent, 
    HomeComponent, 
    BookComponent, 
    NavComponent, 
    AddBookComponent,
    ConfirmationDialogComponent,
    SuccessModalComponent,
    ProfileComponent
  ],
  imports: [
    BrowserModule, 
    HttpClientModule,
    RouterModule.forRoot(routes), 
    ReactiveFormsModule, 
    NgbModalModule,
    FormsModule, 
    NgSelectModule, 
    AuthModule.forRoot({
      domain: 'dev-tjjuyxmfmsn3lwjz.uk.auth0.com',
      clientId: 'lJ2c83VezP4siFdOzK4wPRtSjrOP6eRA',
      authorizationParams: {
        redirect_uri: 'http://localhost:4200'
      },
    }), NgbModule,
  ],
  providers: [WebService, 
    DatePipe,
     AuthService],
  bootstrap: [AppComponent]
})
export class AppModule { }
