export class PartnerDomainError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status = 400, message?: string) {
    super(message ?? code);
    this.name = "PartnerDomainError";
    this.code = code;
    this.status = status;
  }
}
