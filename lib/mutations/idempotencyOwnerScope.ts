type IdempotencyOwnerFilterQuery = {
  eq: (column: string, value: string) => IdempotencyOwnerFilterQuery;
  is: (column: string, value: null) => IdempotencyOwnerFilterQuery;
};

export function applyClientUserIdempotencyFilter<T extends IdempotencyOwnerFilterQuery>(
  query: T,
  clientUserId: string | null,
): T {
  if (clientUserId) {
    return query.eq("client_user_id", clientUserId) as T;
  }

  return query.is("client_user_id", null) as T;
}
