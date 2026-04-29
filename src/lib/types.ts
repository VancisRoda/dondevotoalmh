export type ParticipationType =
  | "centro_y_consejo"
  | "solo_centro"
  | "solo_consejo"
  | "no_encontrado";

export type StatsRange = "day" | "week" | "total";

export type ReportStatus = "new" | "in_progress" | "closed";

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

export interface LookupEvent {
  id: number;
  dni: string;
  participation: Exclude<ParticipationType, "no_encontrado">;
  centroFound: boolean;
  consejoFound: boolean;
  centroMesa: string | null;
  consejoMesa: string | null;
  centroOrden: string | null;
  consejoOrden: string | null;
  anioIngreso: string | null;
  consultedAt: string;
}

export interface MetricPoint {
  label: string;
  count: number;
}

export interface ParticipationMetric {
  key: Exclude<ParticipationType, "no_encontrado">;
  label: string;
  count: number;
}

export interface PeakMetric {
  label: string;
  count: number;
}

export interface TopDniMetric {
  dni: string;
  count: number;
  lastConsultedAt: string;
}

export interface AdminStatsSummary {
  totalConsultas: number;
  dnisUnicos: number;
  centroYConsejo: number;
  soloCentro: number;
  soloConsejo: number;
  diaPico: PeakMetric | null;
  horaPico: PeakMetric | null;
}

export interface AdminStatsResponse {
  range: StatsRange;
  selectedDate: string;
  generatedAt: string;
  summary: AdminStatsSummary;
  participationSeries: ParticipationMetric[];
  dailySeries: MetricPoint[];
  hourlySeries: MetricPoint[];
  topDnis: TopDniMetric[];
  recentLookups: LookupEvent[];
}

export interface IrregularityFollowup {
  id: number;
  reportId: number;
  message: string;
  createdAt: string;
}

export interface IrregularityReport {
  id: number;
  message: string;
  fullName: string | null;
  email: string | null;
  phoneRaw: string | null;
  phoneWhatsapp: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  followups: IrregularityFollowup[];
}

export interface IrregularityReportCreatePayload {
  message: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export interface ApiOkResponse {
  ok: true;
}

export interface ApiMessageResponse {
  message: string;
}
