import * as vscode from "vscode";

/**
 * [프로토타입] Figma 파일의 댓글(코멘트)을 코드 파일의 JSDoc 주석으로 삽입하는 제안을 생성한다.
 *
 * 사용법:
 *   1. Figma API의 GET /v1/files/:key/comments 로 댓글 목록을 가져온다.
 *   2. 댓글마다 filePath와 line 정보를 채워서 FigmaCodeComment 배열로 만든다.
 *   3. buildFigmaAnnotationProposals({ comments }) 호출 → JSDoc 삽입 위치와 내용이 담긴 proposals 반환.
 *   4. buildAnnotationWorkspaceEdit(document, proposals) 로 VS Code WorkspaceEdit 객체를 만들어
 *      vscode.workspace.applyEdit()으로 적용한다.
 *
 * @prototype
 * @status:experimental
 */

export interface FigmaCodeComment {
  readonly id: string;
  readonly author: string;
  readonly message: string;
  readonly createdAt: string;
  readonly filePath: string;
  readonly line: number;
  readonly column?: number;
  readonly tags?: readonly string[];
}

export interface JSDocAnnotationProposal {
  readonly commentId: string;
  readonly filePath: string;
  readonly insertionLine: number;
  readonly insertionColumn: number;
  readonly jsDoc: string;
}

export interface AnnotationBuildOptions {
  readonly comments: readonly FigmaCodeComment[];
  readonly indent?: string;
}

export function buildFigmaAnnotationProposals(
  options: AnnotationBuildOptions,
): readonly JSDocAnnotationProposal[] {
  return options.comments.map((comment) => ({
    commentId: comment.id,
    filePath: comment.filePath,
    insertionLine: Math.max(0, comment.line - 1),
    insertionColumn: Math.max(0, (comment.column ?? 1) - 1),
    jsDoc: createJSDocBlock(comment, options.indent ?? ""),
  }));
}

export function buildAnnotationWorkspaceEdit(
  document: vscode.TextDocument,
  proposals: readonly JSDocAnnotationProposal[],
): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  for (const proposal of proposals) {
    if (document.uri.fsPath !== proposal.filePath) {
      continue;
    }

    const insertionPoint = new vscode.Position(
      proposal.insertionLine,
      proposal.insertionColumn,
    );
    edit.insert(document.uri, insertionPoint, `${proposal.jsDoc}\n`);
  }
  return edit;
}

function createJSDocBlock(comment: FigmaCodeComment, indent: string): string {
  const normalizedLines = comment.message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const tagLines = [
    `@figmaComment ${comment.id}`,
    `@author ${comment.author}`,
    `@created ${comment.createdAt}`,
    ...(comment.tags ?? []).map((tag) => `@tag ${tag}`),
  ];

  const blockLines = [
    `${indent}/**`,
    ...normalizedLines.map((line) => `${indent} * ${sanitizeJSDocLine(line)}`),
    ...tagLines.map((line) => `${indent} * ${line}`),
    `${indent} */`,
  ];

  return blockLines.join("\n");
}

function sanitizeJSDocLine(line: string): string {
  return line.replace(/\*\//g, "* /");
}
