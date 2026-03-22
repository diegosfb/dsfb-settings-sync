/**
 * [프로토타입] Figma 프로토타입 플로우를 개발 태스크 체크리스트로 변환한다.
 *
 * 사용법:
 *   1. Figma API로 프로토타입 플로우(화면 연결 구조)를 가져온다.
 *   2. buildTaskChecklistFromFlow(flow) 호출.
 *   3. 반환된 markdown 문자열을 파일로 저장하거나 VS Code 노트북에 붙여넣으면
 *      체크박스 형태의 개발 작업 목록이 완성된다.
 *
 * @prototype
 * @status:experimental
 */

export interface FigmaFlowConnection {
  readonly targetNodeId: string;
  readonly label?: string;
}

export interface FigmaFlowNode {
  readonly id: string;
  readonly name: string;
  readonly type: "FRAME" | "GROUP" | "COMPONENT" | "INSTANCE";
  readonly notes?: string;
  readonly assignee?: string;
  readonly connections: readonly FigmaFlowConnection[];
}

export interface FigmaPrototypeFlow {
  readonly id: string;
  readonly name: string;
  readonly startNodeId: string;
  readonly nodes: readonly FigmaFlowNode[];
}

export interface TaskChecklistItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly completed: boolean;
  readonly dependsOn: readonly string[];
}

export interface TaskChecklistResult {
  readonly checklist: readonly TaskChecklistItem[];
  readonly markdown: string;
}

export function buildTaskChecklistFromFlow(
  flow: FigmaPrototypeFlow,
): TaskChecklistResult {
  const nodesById = new Map<string, FigmaFlowNode>();
  for (const node of flow.nodes) {
    nodesById.set(node.id, node);
  }

  const visited = new Set<string>();
  const orderedTasks: TaskChecklistItem[] = [];
  const queue: Array<{ nodeId: string; dependsOn: readonly string[] }> = [
    { nodeId: flow.startNodeId, dependsOn: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.nodeId)) {
      continue;
    }

    const node = nodesById.get(current.nodeId);
    if (!node) {
      continue;
    }

    visited.add(node.id);
    const dependencyIds = [...new Set(current.dependsOn)].sort();
    orderedTasks.push({
      id: node.id,
      title: `${node.name} (${node.type})`,
      description: buildTaskDescription(node),
      completed: false,
      dependsOn: dependencyIds,
    });

    for (const connection of node.connections) {
      queue.push({
        nodeId: connection.targetNodeId,
        dependsOn: [...dependencyIds, node.id],
      });
    }
  }

  const markdown = [
    `# ${flow.name} Task Checklist`,
    "",
    ...orderedTasks.map((task) => {
      const dependencySuffix = task.dependsOn.length > 0
        ? ` _(depends on: ${task.dependsOn.join(", ")})_`
        : "";
      return `- [ ] ${task.title}${dependencySuffix}\n  ${task.description}`;
    }),
    "",
  ].join("\n");

  return {
    checklist: orderedTasks,
    markdown,
  };
}

function buildTaskDescription(node: FigmaFlowNode): string {
  const detailParts = [
    node.notes?.trim(),
    node.assignee ? `Suggested owner: ${node.assignee}` : undefined,
    node.connections.length > 0
      ? `Next steps: ${node.connections.map((connection) => connection.label ?? connection.targetNodeId).join(", ")}`
      : "Terminal step in the prototype flow.",
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));

  return detailParts.join(" ");
}
