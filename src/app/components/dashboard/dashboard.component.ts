import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  @Input() public reportId: string = 'e9b9cf80-9b20-45a9-86cb-e7c974d2084e';
  public reportUrl: SafeResourceUrl | undefined;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.generateReportUrl();
  }

  generateReportUrl(): void {
    if (this.reportId) {
      const url = "https://lookerstudio.google.com/embed/reporting/9a13612a-e824-4a7c-b4d3-3738eedcd693/page/p_hnpbu9seld";//`https://lookerstudio.google.com/embed/reporting/${this.reportId}/page/jFwCE`; //const url = `https://lookerstudio.google.com/embed/reporting/${this.reportId}`;
      this.reportUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }
}
