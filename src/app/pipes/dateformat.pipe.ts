import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'dateFormat'
})
export class DateFormatPipe implements PipeTransform {
  transform(value: any, format: string = 'yyyy-MM-dd'): string {
    if (!value) return '';
    
    const datePipe = new DatePipe('en-US');
    return datePipe.transform(value, format) || '';
  }
}
