export const cookieJar = {
  values: new Map(),
  sets: [],
};

export function resetCookieJar() {
  cookieJar.values.clear();
  cookieJar.sets = [];
}

export function cookies() {
  return {
    get(name) {
      const value = cookieJar.values.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    set(name, value, options) {
      cookieJar.sets.push({ name, value, options });
      cookieJar.values.set(name, value);
    },
  };
}
