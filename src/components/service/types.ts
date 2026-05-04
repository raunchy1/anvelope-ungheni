// Types for the simplified service sheet form

export interface ServiceSheetFormData {
  // Client info
  client_name: string;
  client_phone: string;
  car_number: string;
  car_details: string;
  tire_size: string;
  km_bord: number | null;
  
  // Services JSONB structure
  services: {
    schimb_anvelope: {
      efectuat: boolean;
      pret: number;
    };
    echilibrare: {
      efectuat: boolean;
      pret: number;
      bucati: number;
    };
    geometrie: {
      efectuat: boolean;
      pret: number;
    };
    vulcanizare: {
      efectuat: boolean;
      pret: number;
      bucati: number;
    };
    hotel_anvelope: {
      efectuat: boolean;
      pret: number;
    };
    alte_servicii: {
      efectuat: boolean;
      pret: number;
      descriere: string;
    };
  };
  
  // Additional fields
  mecanic: string;
  observatii: string;
  data_intrarii: string;
}

export interface ClientWithCars {
  id: string;
  nume: string;
  telefon: string;
  masini: {
    id: string;
    numar_masina: string;
    marca_model: string;
    dimensiune_anvelope: string;
    last_km: number | null;
  }[];
}

export interface ServiceSheet {
  id: string;
  service_number: string;
  client_id: string | null;
  client_name: string;
  phone: string;
  car_number: string;
  car_details: string;
  tire_size: string;
  km_bord: number | null;
  services: ServiceSheetFormData['services'];
  mecanic: string;
  observatii: string;
  data_intrarii: string;
  created_at: string;
  updated_at: string;
}
