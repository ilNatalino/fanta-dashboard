const REQUIRED_FIELDS = [
  "name",
  "team",
  "role",
  "slot",
  "pma",
  "pfc",
  "expectedFantamedia",
  "expectedTitolarita",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];
export type ClassicRole = "P" | "D" | "C" | "A";

export type Player = {
  name: string;
  team: string;
  role: ClassicRole;
  slot: number;
  pma: number;
  pfc: number;
  expectedFantamedia: number;
  expectedTitolarita: number;
};

export type AppState = {
  version: 1;
  catalog: Player[];
};

export type ImportError = {
  row: number;
  field: string;
  reason: string;
};

export type ImportResult =
  | { status: "imported" }
  | { status: "checked" }
  | { status: "invalid"; errors: ImportError[] };

export interface StateStorage {
  load(): AppState | null;
  save(state: AppState): void;
}

export class CatalogApplication {
  #state: AppState | null;

  constructor(private readonly storage: StateStorage) {
    this.#state = storage.load();
  }

  observe(): Readonly<AppState> | null {
    return this.#state;
  }

  importCatalog(csv: string): ImportResult {
    const parsed = validateCatalog(csv);

    if (parsed.errors.length > 0) {
      return { status: "invalid", errors: parsed.errors };
    }

    if (this.#state) {
      return { status: "checked" };
    }

    const nextState: AppState = { version: 1, catalog: parsed.players };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "imported" };
  }
}

type CsvRow = { line: number; values: string[] };

function parseCsv(source: string): { rows: CsvRow[]; errors: ImportError[] } {
  const rows: CsvRow[] = [];
  const errors: ImportError[] = [];
  let values: string[] = [];
  let value = "";
  let line = 1;
  let rowLine = 1;
  let inQuotes = false;

  const finishRow = () => {
    values.push(value);
    if (values.some((cell) => cell.trim() !== "")) {
      rows.push({ line: rowLine, values });
    }
    values = [];
    value = "";
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        value += character;
        if (character === "\n") line += 1;
      }
      continue;
    }

    if (character === ",") {
      values.push(value);
      value = "";
    } else if (character === '"' && value === "") {
      inQuotes = true;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      finishRow();
      line += 1;
      rowLine = line;
    } else {
      value += character;
    }
  }

  if (inQuotes) {
    errors.push({ row: rowLine, field: "CSV", reason: "virgolette non chiuse" });
  } else if (value !== "" || values.length > 0) {
    finishRow();
  }

  return { rows, errors };
}

function validateCatalog(source: string): { players: Player[]; errors: ImportError[] } {
  const parsed = parseCsv(source);
  const errors = [...parsed.errors];
  const headerRow = parsed.rows[0];

  if (!headerRow) {
    return {
      players: [],
      errors: [...errors, { row: 1, field: "CSV", reason: "il file non contiene intestazioni" }],
    };
  }

  const headers = headerRow.values.map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header,
  );
  const indexes = new Map<RequiredField, number>();

  for (const field of REQUIRED_FIELDS) {
    const matches = headers.flatMap((header, index) => header === field ? [index] : []);
    if (matches.length === 0) {
      errors.push({ row: headerRow.line, field, reason: "colonna obbligatoria assente" });
    } else if (matches.length > 1) {
      errors.push({ row: headerRow.line, field, reason: "colonna obbligatoria duplicata" });
    } else {
      indexes.set(field, matches[0]!);
    }
  }

  const players: Player[] = [];
  const names = new Map<string, number>();

  for (const row of parsed.rows.slice(1)) {
    if (row.values.length !== headers.length) {
      errors.push({
        row: row.line,
        field: "CSV",
        reason: `numero di colonne non valido: attese ${headers.length}, trovate ${row.values.length}`,
      });
    }

    const values = Object.fromEntries(
      REQUIRED_FIELDS.map((field) => [field, indexes.has(field) ? row.values[indexes.get(field)!] ?? "" : ""]),
    ) as Record<RequiredField, string>;
    const rowErrors = validateRow(row.line, values);
    errors.push(...rowErrors);

    const normalizedName = normalizeName(values.name);
    if (normalizedName) {
      const firstLine = names.get(normalizedName);
      if (firstLine) {
        errors.push({
          row: row.line,
          field: "name",
          reason: `nome duplicato dopo la normalizzazione (già presente alla riga ${firstLine})`,
        });
      } else {
        names.set(normalizedName, row.line);
      }
    }

    if (rowErrors.length === 0) {
      players.push({
        name: values.name.trim(),
        team: values.team.trim(),
        role: values.role.trim() as ClassicRole,
        slot: parseNumber(values.slot)!,
        pma: parseNumber(values.pma)!,
        pfc: parseNumber(values.pfc)!,
        expectedFantamedia: parseNumber(values.expectedFantamedia)!,
        expectedTitolarita: parseNumber(values.expectedTitolarita)!,
      });
    }
  }

  return { players, errors };
}

function validateRow(row: number, values: Record<RequiredField, string>): ImportError[] {
  const errors: ImportError[] = [];
  const name = values.name.trim();
  const team = values.team.trim();
  const role = values.role.trim();
  const slot = parseNumber(values.slot);
  const pma = parseNumber(values.pma);
  const pfc = parseNumber(values.pfc);
  const expectedFantamedia = parseNumber(values.expectedFantamedia);
  const expectedTitolarita = parseNumber(values.expectedTitolarita);

  if (!name) errors.push({ row, field: "name", reason: "nome obbligatorio" });
  if (!team) errors.push({ row, field: "team", reason: "squadra reale obbligatoria" });
  if (!["P", "D", "C", "A"].includes(role)) {
    errors.push({ row, field: "role", reason: "Ruolo Classic non valido: usa P, D, C o A" });
  }
  if (slot === null || !Number.isInteger(slot) || slot <= 0) {
    errors.push({ row, field: "slot", reason: "deve essere un intero positivo" });
  }
  if (pma === null || pma < 0) {
    errors.push({ row, field: "pma", reason: "deve essere un numero non negativo" });
  }
  if (pfc === null || pfc <= 0) {
    errors.push({ row, field: "pfc", reason: "deve essere un numero strettamente positivo" });
  }
  if (expectedFantamedia === null) {
    errors.push({ row, field: "expectedFantamedia", reason: "deve essere un numero" });
  }
  if (expectedTitolarita === null || expectedTitolarita < 0 || expectedTitolarita > 100) {
    errors.push({ row, field: "expectedTitolarita", reason: "deve essere compresa tra 0 e 100" });
  }

  return errors;
}

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("it-IT");
}
