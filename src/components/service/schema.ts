import { z } from 'zod';

export const serviceSheetSchema = z.object({
  // Client info - required fields
  client_name: z.string().min(1, 'Numele clientului este obligatoriu'),
  client_phone: z.string().default(''),
  car_number: z.string().min(1, 'Numărul mașinii este obligatoriu'),
  car_details: z.string().default(''),
  tire_size: z.string().default(''),
  km_bord: z.number().nullable().default(null),
  
  // Services structure
  services: z.object({
    schimb_anvelope: z.object({
      efectuat: z.boolean().default(false),
      pret: z.number().default(0),
    }),
    echilibrare: z.object({
      efectuat: z.boolean().default(false),
      pret: z.number().default(0),
      bucati: z.number().default(4),
    }),
    geometrie: z.object({
      efectuat: z.boolean().default(false),
      pret: z.number().default(0),
    }),
    vulcanizare: z.object({
      efectuat: z.boolean().default(false),
      pret: z.number().default(0),
      bucati: z.number().default(1),
    }),
    hotel_anvelope: z.object({
      efectuat: z.boolean().default(false),
      pret: z.number().default(0),
    }),
    alte_servicii: z.object({
      efectuat: z.boolean().default(false),
      pret: z.number().default(0),
      descriere: z.string().default(''),
    }),
  }),
  
  // Additional fields
  mecanic: z.string().min(1, 'Mecanicul responsabil este obligatoriu'),
  observatii: z.string().default(''),
  data_intrarii: z.string().min(1, 'Data intrării este obligatorie'),
});

export type ServiceSheetSchema = z.infer<typeof serviceSheetSchema>;

export const defaultValues: ServiceSheetSchema = {
  client_name: '',
  client_phone: '',
  car_number: '',
  car_details: '',
  tire_size: '',
  km_bord: null,
  services: {
    schimb_anvelope: { efectuat: false, pret: 0 },
    echilibrare: { efectuat: false, pret: 0, bucati: 4 },
    geometrie: { efectuat: false, pret: 0 },
    vulcanizare: { efectuat: false, pret: 0, bucati: 1 },
    hotel_anvelope: { efectuat: false, pret: 0 },
    alte_servicii: { efectuat: false, pret: 0, descriere: '' },
  },
  mecanic: '',
  observatii: '',
  data_intrarii: new Date().toISOString().split('T')[0],
};
