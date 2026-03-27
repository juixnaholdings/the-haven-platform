export interface ApiEnvelopeSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiEnvelopeError {
  success: false;
  message: string;
  errors?: Record<string, unknown>;
}

export type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeError;
