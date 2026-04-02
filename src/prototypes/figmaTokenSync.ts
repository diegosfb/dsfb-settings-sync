/**
 * [프로토타입] Figma Variables의 색상 토큰을 VS Code 컬러 설정으로 매핑하는 헬퍼 모음.
 *
 * 사용법:
 *   1. Figma API로 Variables 목록을 가져온다 (GET /v1/files/:key/variables/local)
 *   2. mapFigmaVariablesToVSCodeSettings()를 호출하면 VS Code settings.json에 쓸 색상값 맵이 반환된다.
 *   3. 결과를 vscode.workspace.getConfiguration('workbench').update('colorCustomizations', ...) 로 적용한다.
 *
 * @prototype
 * @status:experimental
 */

export type FigmaResolvedType = "COLOR" | "STRING" | "FLOAT" | "BOOLEAN";

export interface FigmaRGBAColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
}

export interface FigmaVariable {
  readonly id: string;
  readonly collectionId: string;
  readonly name: string;
  readonly description?: string;
  readonly resolvedType: FigmaResolvedType;
  readonly valuesByMode: Readonly<Record<string, FigmaRGBAColor | string | number | boolean>>;
}

export interface VSCodeColorSettingCandidate {
  readonly key: string;
  readonly reason: string;
}

export interface FigmaTokenSyncOptions {
  readonly variables: readonly FigmaVariable[];
  readonly modeId: string;
  readonly aliasMap?: Readonly<Record<string, string>>;
}

export interface FigmaTokenSyncResult {
  readonly settings: Readonly<Record<string, string>>;
  readonly matches: readonly {
    readonly variableId: string;
    readonly variableName: string;
    readonly settingKey: string;
    readonly hexColor: string;
    readonly reason: string;
  }[];
  readonly collisions: Readonly<Record<string, readonly string[]>>;
  readonly unmappedVariables: readonly FigmaVariable[];
}

interface MappingRule {
  readonly settingKey: string;
  readonly keywords: readonly string[];
  readonly reason: string;
}

const DEFAULT_RULES: readonly MappingRule[] = [
  {
    settingKey: "editor.background",
    keywords: ["editor", "surface", "canvas", "background"],
    reason: "editor surface token",
  },
  {
    settingKey: "editor.foreground",
    keywords: ["editor", "text", "foreground", "content"],
    reason: "editor text token",
  },
  {
    settingKey: "activityBar.background",
    keywords: ["activity", "sidebar", "navigation", "background"],
    reason: "activity bar background token",
  },
  {
    settingKey: "activityBar.foreground",
    keywords: ["activity", "sidebar", "navigation", "foreground"],
    reason: "activity bar foreground token",
  },
  {
    settingKey: "sideBar.background",
    keywords: ["sidebar", "panel", "background"],
    reason: "side bar background token",
  },
  {
    settingKey: "statusBar.background",
    keywords: ["status", "footer", "background"],
    reason: "status bar background token",
  },
  {
    settingKey: "button.background",
    keywords: ["button", "action", "primary", "background"],
    reason: "button background token",
  },
  {
    settingKey: "button.foreground",
    keywords: ["button", "action", "text", "foreground"],
    reason: "button foreground token",
  },
];

export function mapFigmaVariablesToVSCodeSettings(
  options: FigmaTokenSyncOptions,
): FigmaTokenSyncResult {
  const aliasMap = options.aliasMap ?? {};
  const settings = new Map<string, string>();
  const collisions = new Map<string, string[]>();
  const matches: Array<{
    variableId: string;
    variableName: string;
    settingKey: string;
    hexColor: string;
    reason: string;
  }> = [];
  const unmapped: FigmaVariable[] = [];

  for (const variable of options.variables) {
    if (variable.resolvedType !== "COLOR") {
      continue;
    }

    const modeValue = variable.valuesByMode[options.modeId];
    if (!isFigmaColor(modeValue)) {
      unmapped.push(variable);
      continue;
    }

    const candidate = resolveSettingCandidate(variable.name, aliasMap);
    if (!candidate) {
      unmapped.push(variable);
      continue;
    }

    const hexColor = rgbaToHex(modeValue);
    const previous = settings.get(candidate.key);
    if (previous && previous !== hexColor) {
      const existing = collisions.get(candidate.key) ?? [];
      collisions.set(candidate.key, [...existing, variable.name]);
      continue;
    }

    settings.set(candidate.key, hexColor);
    matches.push({
      variableId: variable.id,
      variableName: variable.name,
      settingKey: candidate.key,
      hexColor,
      reason: candidate.reason,
    });
  }

  return {
    settings: Object.fromEntries([...settings.entries()].sort(([a], [b]) => a.localeCompare(b))),
    matches,
    collisions: Object.fromEntries(
      [...collisions.entries()].map(([key, value]) => [key, [...value].sort()]),
    ),
    unmappedVariables: unmapped,
  };
}

function resolveSettingCandidate(
  variableName: string,
  aliasMap: Readonly<Record<string, string>>,
): VSCodeColorSettingCandidate | undefined {
  const normalizedName = normalizeName(variableName);
  const aliasKey = aliasMap[normalizedName] ?? aliasMap[variableName];
  if (aliasKey) {
    return {
      key: aliasKey,
      reason: "custom alias map",
    };
  }

  let bestRule: MappingRule | undefined;
  let bestScore = 0;

  for (const rule of DEFAULT_RULES) {
    const score = rule.keywords.reduce<number>((total, keyword) => {
      return total + (normalizedName.includes(keyword) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestRule = rule;
      bestScore = score;
    }
  }

  if (!bestRule || bestScore === 0) {
    return undefined;
  }

  return {
    key: bestRule.settingKey,
    reason: `${bestRule.reason} (${bestScore} keyword hits)`,
  };
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function isFigmaColor(value: unknown): value is FigmaRGBAColor {
  if (!value || typeof value !== "object") {
    return false;
  }

  const color = value as Partial<FigmaRGBAColor>;
  return typeof color.r === "number"
    && typeof color.g === "number"
    && typeof color.b === "number";
}

function rgbaToHex(color: FigmaRGBAColor): string {
  const r = clampByte(color.r * 255);
  const g = clampByte(color.g * 255);
  const b = clampByte(color.b * 255);
  const alpha = clampByte((color.a ?? 1) * 255);
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return alpha === 255 ? base : `${base}${toHex(alpha)}`;
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0").toUpperCase();
}
