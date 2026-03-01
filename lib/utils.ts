
export const formatRut = (rut: string): string => {
    // Remove any non-alphanumeric characters
    const clean = rut.replace(/[^0-9kK]/g, '');
    if (clean.length <= 1) return clean;

    // Split the verification digit from the body
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toLowerCase();

    // Format body with dots (optional, but requested just the hyphen)
    // Request said "ponga solo el -"
    return `${body}-${dv}`;
};

export const validateRut = (rut: string): boolean => {
    const clean = rut.replace(/[^0-9kK]/g, '');
    if (clean.length < 2) return false;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toLowerCase();

    let m = 0, s = 1;
    let t = parseInt(body, 10);
    for (; t; t = Math.floor(t / 10)) {
        s = (s + (t % 10) * (9 - (m++ % 6))) % 11;
    }
    const expected = s ? (s - 1).toString() : 'k';
    return expected === dv;
};
