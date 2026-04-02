/**
 * [프로토타입] Figma 컴포넌트 메타데이터를 React 또는 Vue 스타터 코드로 변환하는 스캐폴드 생성기.
 *
 * 사용법:
 *   1. Figma API로 컴포넌트 노드 정보(id, name, properties, childLayerNames)를 가져온다.
 *   2. generateComponentScaffold({ component, framework: 'react' }) 호출.
 *   3. 반환된 files 배열의 path/contents를 디스크에 저장하면 바로 쓸 수 있는 컴포넌트 뼈대가 생성된다.
 *
 * @prototype
 * @status:experimental
 */

export type ComponentFramework = "react" | "vue";
export type FigmaComponentPropertyType = "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT";

export interface FigmaComponentProperty {
  readonly name: string;
  readonly type: FigmaComponentPropertyType;
  readonly defaultValue?: string | boolean;
  readonly required?: boolean;
}

export interface FigmaComponentNode {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly properties: readonly FigmaComponentProperty[];
  readonly childLayerNames: readonly string[];
}

export interface ScaffoldGenerationOptions {
  readonly component: FigmaComponentNode;
  readonly framework: ComponentFramework;
  readonly includeStyleBlock?: boolean;
}

export interface GeneratedScaffoldFile {
  readonly path: string;
  readonly contents: string;
}

export interface ScaffoldGenerationResult {
  readonly componentName: string;
  readonly files: readonly GeneratedScaffoldFile[];
}

interface PropDefinition {
  readonly originalName: string;
  readonly propName: string;
  readonly typeName: string;
  readonly optional: boolean;
  readonly defaultValueLiteral?: string;
}

export function generateComponentScaffold(
  options: ScaffoldGenerationOptions,
): ScaffoldGenerationResult {
  const componentName = toPascalCase(options.component.name);
  const propDefinitions = options.component.properties.map(toPropDefinition);
  const cssClassName = toKebabCase(componentName);
  const files: GeneratedScaffoldFile[] = [];

  if (options.framework === "react") {
    files.push({
      path: `${componentName}.tsx`,
      contents: buildReactComponent(componentName, cssClassName, options.component, propDefinitions),
    });
  } else {
    files.push({
      path: `${componentName}.vue`,
      contents: buildVueComponent(componentName, cssClassName, options.component, propDefinitions),
    });
  }

  if (options.includeStyleBlock !== false) {
    files.push({
      path: `${componentName}.css`,
      contents: buildCssTemplate(cssClassName, options.component.childLayerNames),
    });
  }

  return {
    componentName,
    files,
  };
}

function buildReactComponent(
  componentName: string,
  cssClassName: string,
  component: FigmaComponentNode,
  propDefinitions: readonly PropDefinition[],
): string {
  const interfaceBody = propDefinitions.length > 0
    ? propDefinitions.map((definition) => {
      const optionalMarker = definition.optional ? "?" : "";
      return `  ${definition.propName}${optionalMarker}: ${definition.typeName};`;
    }).join("\n")
    : "  className?: string;";

  const destructuredProps = propDefinitions.length > 0
    ? propDefinitions.map((definition) => definition.propName).join(", ")
    : "className";

  const layerMarkup = component.childLayerNames.map((layerName) => {
    const className = `${cssClassName}__${toKebabCase(layerName)}`;
    return `      <div className="${className}">${layerName}</div>`;
  }).join("\n");

  const defaultComment = component.description
    ? ` * ${component.description}\n`
    : "";

  return [
    `import "./${componentName}.css";`,
    "",
    "/**",
    ` * ${componentName} prototype scaffold generated from Figma component metadata.`,
    defaultComment.trimEnd(),
    " */",
    `export interface ${componentName}Props {`,
    interfaceBody,
    "}",
    "",
    `export function ${componentName}({ ${destructuredProps} }: ${componentName}Props) {`,
    "  return (",
    `    <section className="${cssClassName}">`,
    layerMarkup || `      <div className="${cssClassName}__content">${componentName}</div>`,
    "    </section>",
    "  );",
    "}",
    "",
  ].filter((line) => line.length > 0).join("\n");
}

function buildVueComponent(
  componentName: string,
  cssClassName: string,
  component: FigmaComponentNode,
  propDefinitions: readonly PropDefinition[],
): string {
  const propsObject = propDefinitions.length > 0
    ? propDefinitions.map((definition) => {
      const required = definition.optional ? "false" : "true";
      return [
        `  ${definition.propName}: {`,
        `    type: ${mapVueConstructor(definition.typeName)},`,
        `    required: ${required},`,
        definition.defaultValueLiteral
          ? `    default: () => ${definition.defaultValueLiteral},`
          : undefined,
        "  },",
      ].filter((line): line is string => Boolean(line)).join("\n");
    }).join("\n")
    : "  className: { type: String, required: false },";

  const layerMarkup = component.childLayerNames.map((layerName) => {
    const className = `${cssClassName}__${toKebabCase(layerName)}`;
    return `    <div class="${className}">${layerName}</div>`;
  }).join("\n");

  return [
    "<script setup lang=\"ts\">",
    `interface ${componentName}Props {`,
    ...(propDefinitions.length > 0
      ? propDefinitions.map((definition) => {
        const optionalMarker = definition.optional ? "?" : "";
        return `  ${definition.propName}${optionalMarker}: ${definition.typeName};`;
      })
      : ["  className?: string;"]),
    "}",
    "",
    `defineProps<${componentName}Props>();`,
    "</script>",
    "",
    "<template>",
    `  <section class="${cssClassName}">`,
    layerMarkup || `    <div class="${cssClassName}__content">${componentName}</div>`,
    "  </section>",
    "</template>",
    "",
    `<style scoped src="./${componentName}.css"></style>`,
    "",
    "<!-- Runtime props reference",
    propsObject,
    "-->",
  ].join("\n");
}

function buildCssTemplate(cssClassName: string, childLayerNames: readonly string[]): string {
  const childBlocks = childLayerNames.map((layerName) => {
    return [
      "",
      `.${cssClassName}__${toKebabCase(layerName)} {`,
      "  position: relative;",
      "}",
    ].join("\n");
  }).join("");

  return [
    `.${cssClassName} {`,
    "  display: grid;",
    "  gap: 0.75rem;",
    "}",
    childBlocks,
    "",
  ].join("\n");
}

function toPropDefinition(property: FigmaComponentProperty): PropDefinition {
  const propName = toCamelCase(property.name);
  const optional = property.required !== true;
  switch (property.type) {
    case "BOOLEAN":
      return {
        originalName: property.name,
        propName,
        typeName: "boolean",
        optional,
        defaultValueLiteral: typeof property.defaultValue === "boolean"
          ? String(property.defaultValue)
          : undefined,
      };
    case "TEXT":
      return {
        originalName: property.name,
        propName,
        typeName: "string",
        optional,
        defaultValueLiteral: typeof property.defaultValue === "string"
          ? JSON.stringify(property.defaultValue)
          : undefined,
      };
    case "INSTANCE_SWAP":
      return {
        originalName: property.name,
        propName,
        typeName: "string",
        optional,
      };
    case "VARIANT":
      return {
        originalName: property.name,
        propName,
        typeName: "string",
        optional,
        defaultValueLiteral: typeof property.defaultValue === "string"
          ? JSON.stringify(property.defaultValue)
          : undefined,
      };
  }
}

function mapVueConstructor(typeName: string): string {
  switch (typeName) {
    case "boolean":
      return "Boolean";
    case "string":
      return "String";
    default:
      return "Object";
  }
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toCamelCase(value: string): string {
  const pascalCase = toPascalCase(value);
  return pascalCase.length === 0
    ? "value"
    : pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
