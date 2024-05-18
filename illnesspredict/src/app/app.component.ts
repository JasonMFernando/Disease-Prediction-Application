import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthServiceService } from './services/auth-service.service';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import * as L from 'leaflet';

@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 100, completeWords = false, ellipsis = '...') {
    if (completeWords) {
      limit = value.substr(0, limit).lastIndexOf(' ');
    }
    return value.length > limit ? value.substr(0, limit) + ellipsis : value;
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, PipeTransform {
  title = 'illnesspredict';
  form!: FormGroup; // Definite assignment assertion
  predictedIllness: string = "";
  symptoms: string[] = [];
  doctorRecommendation: string = "";
  recommendedMedicine: string = "";
  medicineReview: string = "";
  showFullReview = false;
  filteredSymptoms1: string[] = [];
  filteredSymptoms2: string[] = [];
  medicineImageUrl: string = '';
  precautions: string[] = [];
  description: string = '';
  //map!: L.Map;

  constructor(private fb: FormBuilder, private auth: AuthServiceService , private http: HttpClient) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      symptom1: [''],
      symptom2: [''],
      symptom3: [''],
      symptom4: [''],
      symptom5: [''],
      symptom6: ['']
    });

    this.loadSymptoms();
    console.log(this.symptoms);

    this.form.get('symptom1')?.valueChanges.pipe(
      debounceTime(300), // Adjust debounce time as needed
      distinctUntilChanged(),
      map(value => this.filterSymptoms(value))
    ).subscribe(filteredSymptoms => {
      this.filteredSymptoms1 = filteredSymptoms;
    });


    this.form.get('symptom2')?.valueChanges.pipe(
      debounceTime(300), // Adjust debounce time as needed
      distinctUntilChanged(),
      map(value => this.filterSymptoms(value))
    ).subscribe(filteredSymptoms => {
      this.filteredSymptoms2 = filteredSymptoms;
    });

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        console.log(
          `lat : ${position.coords.latitude}, lon: ${position.coords.longitude}`
        );
      });
    } else {
      console.log('Geolocation is not supported or unavailable.');
    }

    //this.initMap(0, 0);
  }

  // initMap(latitude: number, longitude: number) {
  //   this.map = L.map('map').setView([latitude, longitude], 13);
  //   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  //   }).addTo(this.map);
  // }

  filterSymptoms(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.symptoms.filter(symptom => symptom.toLowerCase().includes(filterValue));
  }

  submit() {
    console.log('submitted');
    console.log(this.form.value);
  
    // Send symptoms data and subscribe to get the predicted illness
    this.auth.send_symptoms(this.form.value).subscribe((response: any) => {
      // Extract predicted illness from the response
      this.predictedIllness = response.predicted_illness;

      this.getPrecautionsForDisease(this.predictedIllness);
      this.getDescriptionForDisease(this.predictedIllness);
  
      // Call the get_medicine endpoint with the predicted illness
      this.auth.get_medicine(this.predictedIllness).subscribe((medicineResponse: any) => {
        // Display the medicine information
        console.log("Medicine response:", medicineResponse);
        this.recommendedMedicine = medicineResponse.drugName + " medicine package";
        this.medicineReview = medicineResponse.review;

        //Call to load the images
        this.getMedicineImage(this.recommendedMedicine);
        // Further processing of medicine data if needed
      });
  
      // Load the CSV dataset containing the illness and doctor recommendations
      this.http.get('assets/Doctor_Versus_Disease.csv', { responseType: 'text' }).subscribe(
        data => {
          // Split the CSV data into rows
          const rows = data.split('\n');
  
          // Find the row where the first column (illness) matches the predicted illness
          for (const row of rows) {
            const [illness, doctor] = row.split(',');
            //console.log(illness);
            if (illness == this.predictedIllness) {
              // Set the doctor recommendation
              this.doctorRecommendation = `Should book a ${doctor} appointment`;
              console.log(this.doctorRecommendation);
              break;
            }
          }
        },
        error => {
          console.error('Error reading CSV file:', error);
        }
      );
    });
  }

  getMedicineImage(drugName: string) {
    const apiKey = 'AIzaSyAKbTW5aEh--tiNwGAulGMqh1ue9gT596I'; // Replace with your Google API key
    const cx = 'f3dcfb933da164ddb'; // Replace with your Custom Search Engine ID
    const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${drugName}&cx=${cx}&imgSize=medium&searchType=image&key=${apiKey}`;

    this.http.get(searchUrl).subscribe((data: any) => {
      if (data.items && data.items.length > 0) {
        this.medicineImageUrl = data.items[0].link; // Get the link of the first image
      }
    });
  }

  toggleReviewVisibility() {
    this.showFullReview = !this.showFullReview;
  }
  
  loadSymptoms(): void {
    this.http.get('assets/Symptom-severity.csv', { responseType: 'text' }).subscribe(
      data => {
        // Split the CSV data into rows
        const rows = data.split('\n');

        // Extract the values from the Symptom column (assuming it's the first column)
        this.symptoms = rows.map(row => {
          const columns = row.split(',');
          return columns[0]; // Get the value from the first column (Symptom)
        });
      },
      error => {
        console.error('Error reading CSV file:', error);
      }
    );
  }

  transform(value: string, limit = 100, completeWords = false, ellipsis = '...') {
    if (completeWords) {
      limit = value.substr(0, limit).lastIndexOf(' ');
    }
    return value.length > limit ? value.substr(0, limit) + ellipsis : value;
  }


  getPrecautionsForDisease(disease: string): void {
    console.log("came in precuations " , disease);
    this.http.get('assets/symptom_precaution.csv', { responseType: 'text' }).subscribe(
      data => {
        // Parse the CSV data
        const rows = data.split('\n');

        // Find the row where the disease matches
        for (const row of rows) {
          const columns = row.split(',');
          console.log(columns[0]);
          if (columns[0] == disease) {
            // Extract precautions
            this.precautions = columns.slice(1).filter(precaution => precaution.trim() !== '');
            break;
          }
        }
      },
      error => {
        console.error('Error reading CSV file:', error);
      }
    );
  }


  getDescriptionForDisease(disease: string): void {
    this.http.get('assets/symptom_Description.csv', { responseType: 'text' }).subscribe(
      data => {
        // Parse the CSV data
        const rows = data.split('\n');

        // Find the row where the disease matches
        for (const row of rows) {
          const columns = row.split(',');
          if (columns[0] == disease) {
            // Extract description
            this.description = columns[1].trim();
            break;
          }
        }
      },
      error => {
        console.error('Error reading CSV file:', error);
      }
    );
  }

  clearForm() {
    // Reset form values
    this.form.reset();

    // Reload the page
    window.location.reload();
  }
}
