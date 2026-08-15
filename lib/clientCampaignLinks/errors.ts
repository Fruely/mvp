export class ClientCampaignDomainError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ClientCampaignDomainError";
    this.code = code;
    this.status = status;
  }
}

export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}
