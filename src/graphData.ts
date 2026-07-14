// ── Node types ──
export type NodeKind = "root" | "system" | "subsystem" | "task" | "tech" | "database" | "decision";
export type NodeStatus = "completed" | "in-progress" | "planned" | "ready" | "blocked";

export interface TreeNode {
  id: string;
  label: string;
  kind: NodeKind;
  status: NodeStatus;
  completion: number;
  estHours: number;
  workedHours: number;
  priority: "critical" | "high" | "medium" | "low";
  techs: string[];
  desc: string;
  deps: string[];
  sourceFiles: string[];
  githubFolder: string;
  tasks: { label: string; done: boolean }[];
  docs: string[];
  children: TreeNode[];
  parentId?: string;
}

export interface TechDef {
  id: string;
  name: string;
  purpose: string;
  whereUsed: string[];
  docsUrl: string;
  githubUrl: string;
  install: string;
  completion: number;
  connectsTo: string[]; // tree node IDs this tech connects to
}

function n(id: string, label: string, kind: NodeKind, extra: Partial<TreeNode> & { children?: TreeNode[] } = {}): TreeNode {
  return {
    id, label, kind,
    status: "planned", completion: 0, estHours: 8, workedHours: 0,
    priority: "medium", techs: [], desc: "", deps: [], sourceFiles: [],
    githubFolder: "", tasks: [], docs: [], children: [],
    ...extra,
  };
}

// ──────────────────────────────────────────────
// Main tree
// ──────────────────────────────────────────────

export const TREE: TreeNode = n("moso-core", "MOSO Core", "root", {
  status: "in-progress", completion: 28, estHours: 500, workedHours: 140, priority: "critical",
  desc: "Central orchestration layer. The root intelligence that coordinates all subsystems, manages global state, and routes decisions across the entire MOSO AI operating system.",
  techs: ["Python", "FastAPI", "Docker"],
  githubFolder: "moso_core/",
  children: [
    // ═══ BRAIN ═══
    n("brain", "Brain", "system", {
      status: "in-progress", completion: 22, estHours: 120, workedHours: 28, priority: "critical",
      desc: "Central reasoning and decision-making engine. Handles goal understanding, planning, reflection, verification, and orchestrates all cognitive functions.",
      techs: ["Python", "llama.cpp", "Pydantic", "FAISS", "SQLite"],
      githubFolder: "moso_core/brain/",
      children: [
        n("goal-understanding", "Goal Understanding", "subsystem", {
          status: "in-progress", completion: 35, estHours: 14, workedHours: 5, priority: "high",
          desc: "Parses user intent, extracts goals, identifies constraints, and maps requests to actionable task structures.",
          techs: ["Python", "llama.cpp", "Pydantic"],
          githubFolder: "moso_core/brain/goal/",
          tasks: [{ label: "Intent parser", done: true }, { label: "Constraint extractor", done: false }, { label: "Goal mapper", done: false }],
        }),
        n("planning", "Planning", "subsystem", {
          status: "in-progress", completion: 41, estHours: 80, workedHours: 32, priority: "critical",
          desc: "Decomposes goals into executable task graphs with dependency ordering, retry strategies, and parallel execution support.",
          techs: ["Python", "Pydantic", "FastAPI", "SQLite", "llama.cpp", "FAISS"],
          githubFolder: "moso_core/brain/planning/",
          children: [
            n("seq-planner", "Sequential Planner", "task", {
              status: "completed", completion: 100, estHours: 12, workedHours: 12, priority: "high",
              desc: "Plans tasks in strict sequential order with dependency chains.",
              techs: ["Python", "Pydantic"],
              githubFolder: "moso_core/brain/planning/sequential.py",
              sourceFiles: ["sequential.py"],
            }),
            n("par-planner", "Parallel Planner", "task", {
              status: "in-progress", completion: 60, estHours: 14, workedHours: 8, priority: "high",
              desc: "Identifies independent tasks and plans parallel execution for speed.",
              techs: ["Python", "Pydantic"],
              githubFolder: "moso_core/brain/planning/parallel.py",
              sourceFiles: ["parallel.py"],
            }),
            n("retry-planner", "Retry Planner", "task", {
              status: "planned", completion: 15, estHours: 10, workedHours: 2, priority: "medium",
              desc: "Plans retry strategies with exponential backoff and fallback paths.",
              techs: ["Python"],
              githubFolder: "moso_core/brain/planning/retry.py",
              sourceFiles: ["retry.py"],
            }),
            n("error-planner", "Error Planner", "task", {
              status: "planned", completion: 10, estHours: 12, workedHours: 1, priority: "medium",
              desc: "Generates error recovery plans when task execution fails.",
              techs: ["Python"],
              githubFolder: "moso_core/brain/planning/error.py",
              sourceFiles: ["error.py"],
            }),
            n("recursive-planner", "Recursive Planner", "task", {
              status: "planned", completion: 5, estHours: 16, workedHours: 1, priority: "medium",
              desc: "Handles deeply nested sub-task decomposition with recursive planning.",
              techs: ["Python", "llama.cpp"],
              githubFolder: "moso_core/brain/planning/recursive.py",
              sourceFiles: ["recursive.py"],
            }),
            n("longtask-planner", "Long Task Planner", "task", {
              status: "planned", completion: 0, estHours: 16, workedHours: 0, priority: "low",
              desc: "Manages multi-hour tasks with checkpointing, progress tracking, and resume capability.",
              techs: ["Python", "SQLite"],
              githubFolder: "moso_core/brain/planning/longtask.py",
              sourceFiles: ["longtask.py"],
            }),
          ],
        }),
        n("reasoning", "Reasoning", "subsystem", {
          status: "in-progress", completion: 30, estHours: 36, workedHours: 11, priority: "critical",
          desc: "Core reasoning engine supporting multiple reasoning paradigms for problem solving.",
          techs: ["Python", "llama.cpp", "Pydantic"],
          githubFolder: "moso_core/brain/reasoning/",
          children: [
            n("cot", "Chain of Thought", "task", {
              status: "in-progress", completion: 50, estHours: 12, workedHours: 6, priority: "high",
              desc: "Step-by-step linear reasoning for straightforward problems.",
              techs: ["Python", "llama.cpp"],
              githubFolder: "moso_core/brain/reasoning/cot.py",
              sourceFiles: ["cot.py"],
            }),
            n("tot", "Tree of Thought", "task", {
              status: "planned", completion: 10, estHours: 14, workedHours: 2, priority: "medium",
              desc: "Explores multiple reasoning branches and selects optimal paths.",
              techs: ["Python", "llama.cpp"],
              githubFolder: "moso_core/brain/reasoning/tot.py",
              sourceFiles: ["tot.py"],
            }),
            n("react", "ReAct", "task", {
              status: "planned", completion: 8, estHours: 10, workedHours: 3, priority: "high",
              desc: "Reasoning + Acting loop for tool-using agentic behavior.",
              techs: ["Python", "llama.cpp", "FastAPI"],
              githubFolder: "moso_core/brain/reasoning/react.py",
              sourceFiles: ["react.py"],
            }),
          ],
        }),
        n("reflection", "Reflection", "subsystem", {
          status: "in-progress", completion: 42, estHours: 20, workedHours: 8, priority: "high",
          desc: "Self-review loop that analyzes outcomes, compares with expectations, and captures corrections for improvement.",
          techs: ["Python", "Pydantic", "SQLite"],
          githubFolder: "moso_core/brain/reflection/",
          tasks: [{ label: "Outcome analyzer", done: true }, { label: "Expectation comparator", done: false }, { label: "Correction logger", done: false }],
        }),
        n("verification", "Verification", "subsystem", {
          status: "in-progress", completion: 38, estHours: 16, workedHours: 6, priority: "high",
          desc: "Validates task outputs against expected results, checks accuracy, and marks completion.",
          techs: ["Python", "SQLite", "FastAPI"],
          githubFolder: "moso_core/brain/verification/",
          tasks: [{ label: "Output validator", done: true }, { label: "Accuracy checker", done: false }],
        }),
        n("recovery", "Recovery", "subsystem", {
          status: "planned", completion: 12, estHours: 14, workedHours: 2, priority: "medium",
          desc: "Handles system recovery after failures, including state rollback and graceful degradation.",
          techs: ["Python"],
          githubFolder: "moso_core/brain/recovery/",
        }),
        n("context-manager", "Context Manager", "subsystem", {
          status: "in-progress", completion: 45, estHours: 18, workedHours: 8, priority: "high",
          desc: "Manages conversation context, system state, and maintains relevant information windows.",
          techs: ["Python", "Pydantic", "FAISS", "SQLite"],
          githubFolder: "moso_core/brain/context/",
        }),
        n("task-manager", "Task Manager", "subsystem", {
          status: "in-progress", completion: 50, estHours: 16, workedHours: 8, priority: "high",
          desc: "Tracks task lifecycle, assigns priorities, manages queues, and monitors execution progress.",
          techs: ["Python", "SQLite", "Pydantic"],
          githubFolder: "moso_core/brain/tasks/",
        }),
        n("multi-agent", "Multi-Agent", "subsystem", {
          status: "planned", completion: 8, estHours: 24, workedHours: 2, priority: "medium",
          desc: "Coordinates multiple specialized agents for complex multi-step workflows.",
          techs: ["Python", "FastAPI", "Docker"],
          githubFolder: "moso_core/brain/multiagent/",
        }),
        n("tool-selection", "Tool Selection", "subsystem", {
          status: "planned", completion: 18, estHours: 14, workedHours: 3, priority: "high",
          desc: "Selects appropriate tools based on task requirements, context, and historical success rates.",
          techs: ["Python", "llama.cpp", "SQLite"],
          githubFolder: "moso_core/brain/tools/",
        }),
        n("skill-execution", "Skill Execution", "subsystem", {
          status: "planned", completion: 10, estHours: 12, workedHours: 1, priority: "medium",
          desc: "Executes stored skills with parameter injection and result validation.",
          techs: ["Python", "SQLite"],
          githubFolder: "moso_core/brain/skills/",
        }),
        n("self-evaluation", "Self Evaluation", "subsystem", {
          status: "planned", completion: 5, estHours: 12, workedHours: 1, priority: "low",
          desc: "Evaluates own performance metrics, identifies weaknesses, and suggests improvements.",
          techs: ["Python", "llama.cpp"],
          githubFolder: "moso_core/brain/evaluation/",
        }),
      ],
    }),

    // ═══ EYES ═══
    n("eyes", "Eyes", "system", {
      status: "in-progress", completion: 34, estHours: 60, workedHours: 20, priority: "critical",
      desc: "Visual perception subsystem. Captures screenshots, extracts text via OCR, parses UI elements, and maintains visual understanding of the screen state.",
      techs: ["Python", "OpenCV", "Tesseract", "FastAPI"],
      githubFolder: "moso_core/eyes/",
      children: [
        n("ocr-engine", "OCR Engine", "subsystem", {
          status: "in-progress", completion: 55, estHours: 16, workedHours: 9, priority: "high",
          desc: "Extracts text from screenshots using Tesseract with preprocessing for accuracy.",
          techs: ["Python", "Tesseract", "OpenCV"],
          githubFolder: "moso_core/eyes/ocr/",
          sourceFiles: ["ocr_engine.py", "preprocessor.py"],
          tasks: [{ label: "Text extraction", done: true }, { label: "Layout analysis", done: true }, { label: "Confidence scoring", done: false }],
        }),
        n("screen-capture", "Screen Capture", "subsystem", {
          status: "in-progress", completion: 48, estHours: 12, workedHours: 6, priority: "high",
          desc: "Captures full screenshots and region-of-interest crops with minimal latency.",
          techs: ["Python", "OpenCV"],
          githubFolder: "moso_core/eyes/screen/",
          sourceFiles: ["capture.py", "regions.py"],
        }),
        n("log-parser", "Log Parser", "subsystem", {
          status: "planned", completion: 20, estHours: 10, workedHours: 2, priority: "medium",
          desc: "Parses application logs and terminal output for contextual information.",
          techs: ["Python"],
          githubFolder: "moso_core/eyes/logs/",
        }),
        n("vision-model", "Vision Model", "subsystem", {
          status: "in-progress", completion: 28, estHours: 22, workedHours: 6, priority: "high",
          desc: "Identifies UI elements, buttons, input fields, and spatial relationships using computer vision.",
          techs: ["Python", "OpenCV", "llama.cpp"],
          githubFolder: "moso_core/eyes/vision/",
          sourceFiles: ["detector.py", "classifier.py", "spatial.py"],
          tasks: [{ label: "Button detector", done: true }, { label: "Input field finder", done: false }, { label: "Layout analyzer", done: false }],
        }),
      ],
    }),

    // ═══ MUSCLES ═══
    n("muscles", "Muscles", "system", {
      status: "planned", completion: 12, estHours: 50, workedHours: 6, priority: "critical",
      desc: "Action execution subsystem. Translates decisions into physical actions: mouse clicks, keyboard input, shell commands, and browser interactions.",
      techs: ["Python", "Playwright", "FastAPI", "Docker"],
      githubFolder: "moso_core/muscles/",
      children: [
        n("mouse-ctrl", "Mouse Control", "subsystem", {
          status: "planned", completion: 15, estHours: 10, workedHours: 2, priority: "high",
          desc: "Executes click, drag, scroll, and hover actions with coordinate mapping.",
          techs: ["Python", "Playwright"],
          githubFolder: "moso_core/muscles/mouse/",
          sourceFiles: ["mouse.py", "coordinates.py"],
        }),
        n("keyboard-ctrl", "Keyboard Control", "subsystem", {
          status: "planned", completion: 12, estHours: 10, workedHours: 1, priority: "high",
          desc: "Handles text input, keyboard shortcuts, key combinations, and form filling.",
          techs: ["Python", "Playwright"],
          githubFolder: "moso_core/muscles/keyboard/",
          sourceFiles: ["keyboard.py", "shortcuts.py"],
        }),
        n("shell-exec", "Shell Executor", "subsystem", {
          status: "planned", completion: 8, estHours: 12, workedHours: 1, priority: "medium",
          desc: "Executes shell commands with output capture, timeout handling, and sandboxing.",
          techs: ["Python", "Docker"],
          githubFolder: "moso_core/muscles/shell/",
          sourceFiles: ["executor.py", "sandbox.py"],
        }),
        n("browser-auto", "Browser Automation", "subsystem", {
          status: "planned", completion: 5, estHours: 18, workedHours: 2, priority: "high",
          desc: "Full browser automation: navigation, form filling, file downloads, authentication, and multi-tab management.",
          techs: ["Python", "Playwright", "FastAPI"],
          githubFolder: "moso_core/muscles/browser/",
          sourceFiles: ["browser.py", "auth.py", "downloads.py"],
          tasks: [{ label: "Page navigation", done: false }, { label: "Form filling", done: false }, { label: "Auth handler", done: false }],
        }),
      ],
    }),

    // ═══ LEARNING ═══
    n("learning", "Learning", "system", {
      status: "in-progress", completion: 25, estHours: 60, workedHours: 15, priority: "critical",
      desc: "Learning and memory subsystem. Extracts workflows, builds skills, stores experiences, and enables continuous improvement.",
      techs: ["Python", "SQLite", "FAISS", "Pydantic"],
      githubFolder: "moso_core/learning/",
      children: [
        n("memory", "Memory", "subsystem", {
          status: "in-progress", completion: 58, estHours: 28, workedHours: 16, priority: "critical",
          desc: "Core memory system with vector search, knowledge graphs, and experience databases.",
          techs: ["Python", "SQLite", "FAISS", "Pydantic"],
          githubFolder: "moso_core/learning/memory/",
          children: [
            n("vector-store", "Vector Store", "database", {
              status: "in-progress", completion: 65, estHours: 12, workedHours: 8, priority: "high",
              desc: "FAISS-backed vector database for similarity search across memories and experiences.",
              techs: ["Python", "FAISS"],
              githubFolder: "moso_core/learning/memory/vector.py",
              sourceFiles: ["vector.py", "embeddings.py"],
            }),
            n("knowledge-graph", "Knowledge Graph", "database", {
              status: "planned", completion: 15, estHours: 14, workedHours: 2, priority: "medium",
              desc: "Relational knowledge graph connecting concepts, entities, and their relationships.",
              techs: ["Python", "SQLite"],
              githubFolder: "moso_core/learning/memory/knowledge.py",
              sourceFiles: ["knowledge.py"],
            }),
            n("experience-db", "Experience DB", "database", {
              status: "in-progress", completion: 55, estHours: 10, workedHours: 6, priority: "high",
              desc: "Stores complete interaction experiences with outcomes, corrections, and metadata.",
              techs: ["Python", "SQLite", "Pydantic"],
              githubFolder: "moso_core/learning/memory/experience.py",
              sourceFiles: ["experience.py", "schema.py"],
            }),
          ],
        }),
        n("skills", "Skills", "subsystem", {
          status: "planned", completion: 18, estHours: 18, workedHours: 3, priority: "high",
          desc: "Extracts, packages, and manages reusable skills from successful workflow patterns.",
          techs: ["Python", "SQLite", "Pydantic"],
          githubFolder: "moso_core/learning/skills/",
          sourceFiles: ["extractor.py", "packager.py"],
        }),
        n("experience", "Experience", "subsystem", {
          status: "planned", completion: 12, estHours: 14, workedHours: 2, priority: "medium",
          desc: "Logs and indexes all interactions for future retrieval and pattern recognition.",
          techs: ["Python", "SQLite"],
          githubFolder: "moso_core/learning/experience/",
        }),
      ],
    }),
  ],
});

// ──────────────────────────────────────────────
// Technology definitions
// ──────────────────────────────────────────────

export const TECHS: TechDef[] = [
  {
    id: "python", name: "Python",
    purpose: "Core language for all MOSO subsystems. Every module is written in Python for rapid prototyping and ecosystem access.",
    whereUsed: ["brain", "eyes", "muscles", "learning"],
    docsUrl: "https://docs.python.org/3/", githubUrl: "https://github.com/python/cpython",
    install: "https://docs.python.org/3/using/index.html", completion: 100,
    connectsTo: ["brain", "planning", "reasoning", "reflection", "verification", "eyes", "ocr-engine", "screen-capture", "vision-model", "muscles", "mouse-ctrl", "keyboard-ctrl", "shell-exec", "browser-auto", "learning", "memory", "skills", "experience"],
  },
  {
    id: "llama_cpp", name: "llama.cpp",
    purpose: "Local LLM inference engine. Powers the Brain's reasoning without cloud dependency.",
    whereUsed: ["brain", "reasoning", "tool-selection"],
    docsUrl: "https://github.com/ggerganov/llama.cpp", githubUrl: "https://github.com/ggerganov/llama.cpp",
    install: "https://github.com/ggerganov/llama.cpp#build", completion: 60,
    connectsTo: ["brain", "reasoning", "cot", "tot", "react", "tool-selection", "goal-understanding", "vision-model", "self-evaluation"],
  },
  {
    id: "sqlite", name: "SQLite",
    purpose: "Lightweight embedded database for storing experiences, skills, preferences, and memory.",
    whereUsed: ["memory", "skills", "experience", "reflection"],
    docsUrl: "https://www.sqlite.org/docs.html", githubUrl: "https://github.com/nicovank/sqlite",
    install: "pip install sqlite3 (built-in)", completion: 85,
    connectsTo: ["brain", "planning", "reflection", "verification", "context-manager", "task-manager", "tool-selection", "memory", "experience-db", "knowledge-graph", "skills", "experience"],
  },
  {
    id: "faiss", name: "FAISS",
    purpose: "Facebook's similarity search library. Enables fast retrieval of relevant memories and experiences.",
    whereUsed: ["memory", "context-manager"],
    docsUrl: "https://faiss.ai/", githubUrl: "https://github.com/facebookresearch/faiss",
    install: "pip install faiss-cpu", completion: 45,
    connectsTo: ["brain", "context-manager", "memory", "vector-store", "learning"],
  },
  {
    id: "pydantic", name: "Pydantic",
    purpose: "Data validation and settings management. Ensures all data structures are type-safe.",
    whereUsed: ["brain", "planning", "reasoning", "memory"],
    docsUrl: "https://docs.pydantic.dev/", githubUrl: "https://github.com/pydantic/pydantic",
    install: "pip install pydantic", completion: 90,
    connectsTo: ["brain", "planning", "seq-planner", "par-planner", "reasoning", "cot", "reflection", "context-manager", "task-manager", "memory", "experience-db", "skills"],
  },
  {
    id: "fastapi", name: "FastAPI",
    purpose: "High-performance web framework for internal APIs between subsystems.",
    whereUsed: ["brain", "muscles", "verification"],
    docsUrl: "https://fastapi.tiangolo.com/", githubUrl: "https://github.com/fastapi/fastapi",
    install: "pip install fastapi uvicorn", completion: 70,
    connectsTo: ["brain", "multi-agent", "verification", "muscles", "browser-auto", "react"],
  },
  {
    id: "docker", name: "Docker",
    purpose: "Containerization for reproducible environments, sandboxed execution, and easy deployment.",
    whereUsed: ["muscles", "shell-exec", "multi-agent"],
    docsUrl: "https://docs.docker.com/", githubUrl: "https://github.com/moby/moby",
    install: "https://docs.docker.com/get-docker/", completion: 30,
    connectsTo: ["moso-core", "muscles", "shell-exec", "multi-agent"],
  },
  {
    id: "playwright", name: "Playwright",
    purpose: "Browser automation for the Muscles subsystem. Handles all UI interactions.",
    whereUsed: ["muscles", "mouse-ctrl", "keyboard-ctrl", "browser-auto"],
    docsUrl: "https://playwright.dev/python/", githubUrl: "https://github.com/microsoft/playwright-python",
    install: "pip install playwright && playwright install", completion: 20,
    connectsTo: ["muscles", "mouse-ctrl", "keyboard-ctrl", "browser-auto"],
  },
  {
    id: "opencv", name: "OpenCV",
    purpose: "Computer vision for image processing, UI element detection, and screenshot analysis.",
    whereUsed: ["eyes", "ocr-engine", "vision-model", "screen-capture"],
    docsUrl: "https://docs.opencv.org/4.x/", githubUrl: "https://github.com/opencv/opencv",
    install: "pip install opencv-python", completion: 25,
    connectsTo: ["eyes", "ocr-engine", "screen-capture", "vision-model"],
  },
  {
    id: "tesseract", name: "Tesseract OCR",
    purpose: "Optical character recognition engine for extracting text from screenshots.",
    whereUsed: ["eyes", "ocr-engine"],
    docsUrl: "https://tesseract-ocr.github.io/", githubUrl: "https://github.com/tesseract-ocr/tesseract",
    install: "https://github.com/tesseract-ocr/tesseract#installing-tesseract", completion: 40,
    connectsTo: ["eyes", "ocr-engine"],
  },
];

// ──────────────────────────────────────────────
// Flat map helpers
// ──────────────────────────────────────────────

export function flattenTree(node: TreeNode, parent?: TreeNode): (TreeNode & { parentId?: string })[] {
  const result: (TreeNode & { parentId?: string })[] = [{ ...node, parentId: parent?.id }];
  for (const child of node.children) {
    result.push(...flattenTree(child, node));
  }
  return result;
}

export const ALL_NODES = flattenTree(TREE);

export function findNode(id: string): TreeNode | undefined {
  return ALL_NODES.find((n) => n.id === id);
}

// ── Layout constants ──
const LEVEL_H = 130;
const LEAF_W = 110;

// ──────────────────────────────────────────────
// Tree layout algorithm
// ──────────────────────────────────────────────

interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  bounds: { width: number; height: number };
}

export function computeLayout(root: TreeNode): LayoutResult {
  const positions = new Map<string, { x: number; y: number }>();
  const subtreeWidths = new Map<string, number>();

  function measure(node: TreeNode): number {
    if (node.children.length === 0) {
      subtreeWidths.set(node.id, LEAF_W);
      return LEAF_W;
    }
    let total = 0;
    for (const child of node.children) {
      total += measure(child);
    }
    total = Math.max(total, LEAF_W);
    subtreeWidths.set(node.id, total);
    return total;
  }

  function position(node: TreeNode, depth: number, xStart: number): void {
    const sw = subtreeWidths.get(node.id) ?? LEAF_W;
    const cx = xStart + sw / 2;
    const cy = depth * LEVEL_H + 60;
    positions.set(node.id, { x: cx, y: cy });

    if (node.children.length === 0) return;

    const childTotalW = node.children.reduce((sum, ch) => sum + (subtreeWidths.get(ch.id) ?? LEAF_W), 0);
    let cursor = xStart + (sw - childTotalW) / 2;

    for (const child of node.children) {
      const cw = subtreeWidths.get(child.id) ?? LEAF_W;
      position(child, depth + 1, cursor);
      cursor += cw;
    }
  }

  const totalW = measure(root);
  position(root, 0, 0);

  let maxX = 0, maxY = 0;
  for (const [, pos] of positions) {
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y > maxY) maxY = pos.y;
  }

  return { positions, bounds: { width: maxX + LEAF_W, height: maxY + 100 } };
}
