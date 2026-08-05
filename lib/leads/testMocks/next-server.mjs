export class NextResponse {
  constructor(body, init = {}) {
    this._body = body;
    this.status = init.status ?? 200;
    this.headers = new Map(Object.entries(init.headers ?? {}));
  }

  static json(data, init = {}) {
    const response = new NextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    response._json = data;
    return response;
  }

  async json() {
    if (this._json !== undefined) return this._json;
    return JSON.parse(this._body);
  }
}

export class NextRequest {}
