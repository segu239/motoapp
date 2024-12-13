import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class MotomatchBotService {

  constructor(private http: HttpClient) { }

  sendToTelegram(file: File, nombre) {
    console.log('file', file);
    const formData: FormData = new FormData();
    formData.append('chat_id', '-4123033554');
    formData.append('document', file, nombre);
  
    this.http.post(`https://api.telegram.org/bot6654673391:AAEgy7peYqnwM-OPjzavYo_D7PFv2IIIfq8/sendDocument`, formData).subscribe();

}
}



