export type ParticipationType =
  | "centro_y_consejo"
  | "solo_centro"
  | "solo_consejo"
  | "no_encontrado";

export interface VoteRecord {
  nombre: string;
  orden: string;
  mesa: string;
  anioIngreso: string;
  dni: string;
}

export interface LookupResponse {
  dni: string;
  participation: ParticipationType;
  centro?: VoteRecord;
  consejo?: VoteRecord;
}

export interface LookupErrorResponse {
  error: string;
}

export interface PadronStats {
  centro: number;
  consejo: number;
  ambos: number;
  soloCentro: number;
  soloConsejo: number;
}
