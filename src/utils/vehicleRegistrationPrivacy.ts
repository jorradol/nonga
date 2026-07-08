export interface RegistrationExtraction {
  registrationProvince: string;
  licensePlateFull: string;
  licensePlateMasked: string;
  parseUncertain: boolean;
}

function normalizeSpace(raw: string): string {
  return String(raw ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLabelNoise(raw: string): string {
  return normalizeSpace(raw).replace(
    /(ทะเบียนรถ|เลขทะเบียน|ป้ายทะเบียน|ทะเบียน|license plate|plate number|registration province|registration)/gi,
    " "
  );
}

function looksProvinceToken(token: string): boolean {
  if (!token) return false;
  if (/\d/.test(token)) return false;
  return /[\u0E00-\u0E7Fa-zA-Z]/.test(token);
}

function splitProvinceFromTrailing(text: string): {
  plateLike: string;
  province: string;
  uncertain: boolean;
} {
  const cleaned = cleanLabelNoise(text);
  if (!cleaned) {
    return { plateLike: "", province: "", uncertain: true };
  }

  const bySlash = cleaned
    .split(/[|;/]+/)
    .map((part) => normalizeSpace(part))
    .filter(Boolean);
  if (bySlash.length >= 2) {
    const first = bySlash[0];
    const second = bySlash[1];
    const secondIsProvince = looksProvinceToken(second) && !/\d/.test(second);
    return {
      plateLike: first,
      province: secondIsProvince ? second : "",
      uncertain: !secondIsProvince,
    };
  }

  const tokens = cleaned.split(" ").filter(Boolean);
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    const prev = tokens[tokens.length - 2];
    if (looksProvinceToken(last)) {
      const province = /[A-Za-z]/.test(last) && looksProvinceToken(prev)
        ? `${prev} ${last}`
        : last;
      const plateTokens = /[A-Za-z]/.test(last) && looksProvinceToken(prev)
        ? tokens.slice(0, -2)
        : tokens.slice(0, -1);
      return {
        plateLike: normalizeSpace(plateTokens.join(" ")),
        province: normalizeSpace(province),
        uncertain: false,
      };
    }
  }

  return { plateLike: cleaned, province: "", uncertain: true };
}

function normalizePlateCore(raw: string): string {
  return normalizeSpace(raw).replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]/g, "");
}

function resolveMaskPrefix(plateCore: string): string {
  if (!plateCore) return "";
  const prefixMatch =
    plateCore.match(/^(\d?[A-Za-z\u0E00-\u0E7F]{1,3})/) ??
    plateCore.match(/^([A-Za-z\u0E00-\u0E7F]{2})/);
  if (prefixMatch?.[1]) return prefixMatch[1];
  if (plateCore.length <= 2) return "";
  return plateCore.slice(0, 2);
}

export function maskLicensePlate(
  plateRaw: string,
  provinceRaw?: string
): string {
  const plateCore = normalizePlateCore(plateRaw);
  const province = normalizeSpace(provinceRaw ?? "");
  if (!plateCore) {
    return province ? province : "ปิดเลขทะเบียน";
  }
  const prefix = resolveMaskPrefix(plateCore);
  const base = prefix ? `${prefix}****` : "ปิดเลขทะเบียน";
  return province ? `${base} ${province}` : base;
}

export function extractRegistrationFields(input: {
  plateValue?: string;
  provinceValue?: string;
}): RegistrationExtraction {
  const plateRaw = normalizeSpace(input.plateValue ?? "");
  const provinceExplicit = normalizeSpace(input.provinceValue ?? "");
  const split = splitProvinceFromTrailing(plateRaw);
  const plateCore = normalizePlateCore(split.plateLike || plateRaw);
  const province = provinceExplicit || split.province;
  const masked = maskLicensePlate(plateCore, province);
  return {
    registrationProvince: province,
    licensePlateFull: plateCore,
    licensePlateMasked: masked,
    parseUncertain: Boolean(plateRaw) && !plateCore,
  };
}
