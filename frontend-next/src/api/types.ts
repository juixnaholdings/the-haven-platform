export type QueryParamValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryParamValue>;

export interface ApiSuccessEnvelope<TData> {
  code: number;
  status: "success";
  message: string;
  data: TData;
}

export interface ApiErrorEnvelope {
  code: number;
  status: "error";
  message: string;
  errors: Record<string, unknown>;
  data: Record<string, unknown>;
}

export type ApiEnvelope<TData> = ApiSuccessEnvelope<TData> | ApiErrorEnvelope;
