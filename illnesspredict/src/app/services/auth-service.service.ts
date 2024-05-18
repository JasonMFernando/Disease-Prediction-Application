import { HttpClient , HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthServiceService {

  constructor(private http:HttpClient) { }

  server_address  = "http://localhost:5000";

  send_post_request(data:any)
  {
    return this.http.post(
      this.server_address,
      JSON.stringify(data)
    )
  }


  // send_symptoms(data: any) {
  //   const headers = new HttpHeaders().set('Content-Type', 'application/json');
  //   return this.http.post(
  //     this.server_address + "/predict",
  //     JSON.stringify(data),
  //     { headers: headers }
  //   );
  // }

  send_symptoms(data: any) {
    return this.http.post(
      this.server_address + "/predict",
      JSON.stringify(data)
    );
  }

  get_medicine(predictedIllness: string) {
    const params = { disease: predictedIllness };
    return this.http.get(
      this.server_address + "/getmedicine",
      { params: params }
    );
  }
}
