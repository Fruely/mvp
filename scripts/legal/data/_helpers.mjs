/** Shared helpers for legal data modules. */
export function p(id, de, ru, ua) {
  return { type: "p", id, de, ru, ua };
}

export function h2(de, ru, ua) {
  return { type: "h2", de, ru, ua };
}

export function h3(de, ru, ua) {
  return { type: "h3", de, ru, ua };
}

/** Five-field GDPR processing block (purpose, data, recipient, basis, retention). */
export function dsBlock(letter, titleDe, titleRu, titleUa, fields) {
  const prefix = `ds-${letter.toLowerCase()}`;
  return [
    h3(titleDe, titleRu, titleUa),
    p(`${prefix}-purpose`, fields.purpose.de, fields.purpose.ru, fields.purpose.ua),
    p(`${prefix}-data`, fields.data.de, fields.data.ru, fields.data.ua),
    p(`${prefix}-recipient`, fields.recipient.de, fields.recipient.ru, fields.recipient.ua),
    p(`${prefix}-basis`, fields.basis.de, fields.basis.ru, fields.basis.ua),
    p(`${prefix}-retention`, fields.retention.de, fields.retention.ru, fields.retention.ua),
  ];
}
