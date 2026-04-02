import { createHash } from "crypto";
import { promises as fs } from "fs";
import { spawn } from "child_process";
import * as path from "path";

/**
 * [프로토타입] Figma 디자인 이미지와 실제 구현 화면을 스크린샷으로 비교해 버그 리포트를 생성한다.
 *
 * 사용법:
 *   1. Figma에서 비교할 컴포넌트 이미지를 내보내기 → figmaImagePath에 경로 지정.
 *   2. runtimeCapture에 실제 구현 URL과 대상 CSS 셀렉터를 지정.
 *   3. generateFigmaPlaywrightBugReport() 호출 → reportPath에 마크다운 리포트가 저장된다.
 *   4. severity가 'high'면 디자인과 구현 사이에 큰 차이가 있는 것.
 *
 * 주의: 현재는 바이트 단위 비교라 픽셀 단위 정밀도는 없음. 실제 적용 시 pixelmatch 등 라이브러리 연동 권장.
 *
 * @prototype
 * @status:experimental
 */

export interface ScreenshotViewport {
  readonly width: number;
  readonly height: number;
}

export interface PlaywrightCaptureOptions {
  readonly url: string;
  readonly outputPath: string;
  readonly selector?: string;
  readonly viewport: ScreenshotViewport;
  readonly timeoutMs?: number;
}

export interface FigmaPlaywrightBugReportOptions {
  readonly figmaImagePath: string;
  readonly runtimeCapture: PlaywrightCaptureOptions;
  readonly reportPath: string;
}

export interface FigmaPlaywrightBugReportResult {
  readonly figmaHash: string;
  readonly runtimeHash: string;
  readonly byteDifferenceRatio: number;
  readonly runtimeScreenshotPath: string;
  readonly reportPath: string;
  readonly severity: "low" | "medium" | "high";
}

export async function generateFigmaPlaywrightBugReport(
  options: FigmaPlaywrightBugReportOptions,
): Promise<FigmaPlaywrightBugReportResult> {
  await fs.mkdir(path.dirname(options.runtimeCapture.outputPath), { recursive: true });
  await fs.mkdir(path.dirname(options.reportPath), { recursive: true });
  await captureRuntimeScreenshot(options.runtimeCapture);

  const [figmaBytes, runtimeBytes] = await Promise.all([
    fs.readFile(options.figmaImagePath),
    fs.readFile(options.runtimeCapture.outputPath),
  ]);

  const figmaHash = createHash("sha256").update(figmaBytes).digest("hex");
  const runtimeHash = createHash("sha256").update(runtimeBytes).digest("hex");
  const byteDifferenceRatio = estimateBinaryDifferenceRatio(figmaBytes, runtimeBytes);
  const severity = classifyDifference(byteDifferenceRatio);

  const reportContents = [
    "# Figma vs Playwright Prototype Bug Report",
    "",
    `- Figma export: ${options.figmaImagePath}`,
    `- Runtime screenshot: ${options.runtimeCapture.outputPath}`,
    `- Figma SHA-256: ${figmaHash}`,
    `- Runtime SHA-256: ${runtimeHash}`,
    `- Byte difference ratio: ${(byteDifferenceRatio * 100).toFixed(2)}%`,
    `- Severity: ${severity}`,
    "",
    "> Prototype note: this implementation compares screenshot bytes, not decoded pixels.",
    "",
    "## Capture Context",
    "",
    `- URL: ${options.runtimeCapture.url}`,
    `- Selector: ${options.runtimeCapture.selector ?? "<full-page>"}`,
    `- Viewport: ${options.runtimeCapture.viewport.width}x${options.runtimeCapture.viewport.height}`,
    "",
  ].join("\n");

  await fs.writeFile(options.reportPath, reportContents, "utf8");

  return {
    figmaHash,
    runtimeHash,
    byteDifferenceRatio,
    runtimeScreenshotPath: options.runtimeCapture.outputPath,
    reportPath: options.reportPath,
    severity,
  };
}

async function captureRuntimeScreenshot(options: PlaywrightCaptureOptions): Promise<void> {
  const script = [
    "const { chromium } = require('playwright');",
    "(async () => {",
    "  const browser = await chromium.launch({ headless: true });",
    "  const page = await browser.newPage({ viewport: " +
      JSON.stringify(options.viewport) +
      " });",
    "  await page.goto(" + JSON.stringify(options.url) + ", { waitUntil: 'networkidle', timeout: " +
      String(options.timeoutMs ?? 20000) +
      " });",
    options.selector
      ? "  await page.locator(" + JSON.stringify(options.selector) + ").screenshot({ path: " +
        JSON.stringify(options.outputPath) +
        " });"
      : "  await page.screenshot({ path: " +
        JSON.stringify(options.outputPath) +
        ", fullPage: true });",
    "  await browser.close();",
    "})().catch((error) => { console.error(error instanceof Error ? error.stack : String(error)); process.exit(1); });",
  ].join("\n");

  await spawnNodeScript(script);
}

function estimateBinaryDifferenceRatio(left: Buffer, right: Buffer): number {
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) {
    return 0;
  }

  let differences = Math.abs(left.length - right.length);
  const comparedLength = Math.min(left.length, right.length);
  for (let index = 0; index < comparedLength; index += 1) {
    if (left[index] !== right[index]) {
      differences += 1;
    }
  }
  return differences / maxLength;
}

function classifyDifference(ratio: number): "low" | "medium" | "high" {
  if (ratio >= 0.25) {
    return "high";
  }
  if (ratio >= 0.05) {
    return "medium";
  }
  return "low";
}

function spawnNodeScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", script], {
      stdio: "pipe",
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `Playwright capture exited with code ${code ?? -1}`));
    });
  });
}
