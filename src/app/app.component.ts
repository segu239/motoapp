import { Component, OnInit } from '@angular/core';
import { ArticulosCacheService } from './services/articulos-cache.service';

declare function init_plugins();
declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'motoapp';

  constructor(private articulosCacheService: ArticulosCacheService) {}

  ngOnInit() {
    console.log("APP COMPONENTS");
    init_plugins();
    
    // Initialize article cache in the background
    this.initializeCache();
  }
  
  private initializeCache(): void {
    console.log('Initializing article cache in background');
    
    // Set a small delay to avoid competing with initial app rendering
    setTimeout(() => {
      // Load all data in background to have it ready when needed
      this.articulosCacheService.loadAllData().subscribe({
        next: (success) => {
          if (success) {
            console.log('Article cache initialized successfully');
          } else {
            console.warn('Article cache initialization failed, will retry on component access');
          }
        },
        error: (err) => {
          console.error('Error initializing article cache:', err);
        }
      });
    }, 2000); // 2 second delay to allow initial app rendering
  }
}
