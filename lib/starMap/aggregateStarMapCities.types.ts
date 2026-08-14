export type StarMapSpecialistInput = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  postalCode: string | null;
  mapTimestamp: string | null;
};

export type PostalCodeLookup = {
  postal_code: string;
  lat: number | null;
  lng: number | null;
  city: string | null;
};
