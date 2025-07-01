import {
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2ToolCall,
  UnsupportedFunctionalityError,
} from "@ai-sdk/provider";
import { generateId } from "@ai-sdk/provider-utils";

export function prepareTools({
  tools,
  toolChoice,
}: {
  tools: LanguageModelV2CallOptions["tools"];
  toolChoice?: LanguageModelV2CallOptions["toolChoice"];
}): {
  tools:
    | undefined
    | Array<{
        type: "function";
        function: {
          name: string;
          description: string | undefined;
          parameters: unknown;
        };
      }>;
  toolChoice:
    | { type: "function"; function: { name: string } }
    | "auto"
    | "none"
    | "required"
    | undefined;
  toolWarnings: LanguageModelV2CallWarning[];
} {
  // when the tools array is empty, change it to undefined to prevent errors:
  tools = tools?.length ? tools : undefined;

  const toolWarnings: LanguageModelV2CallWarning[] = [];

  if (tools == null) {
    return { tools: undefined, toolChoice: undefined, toolWarnings };
  }

  const sarvamTools: Array<{
    type: "function";
    function: {
      name: string;
      description: string | undefined;
      parameters: unknown;
    };
  }> = [];

  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ type: "unsupported-tool", tool });
    } else {
      sarvamTools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      });
    }
  }

  if (toolChoice == null) {
    return { tools: sarvamTools, toolChoice: undefined, toolWarnings };
  }

  const type = toolChoice.type;

  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: sarvamTools, toolChoice: type, toolWarnings };
    case "tool":
      return {
        tools: sarvamTools,
        toolChoice: {
          type: "function",
          function: {
            name: toolChoice.toolName,
          },
        },
        toolWarnings,
      };
    default: {
      const _exhaustiveCheck: never = type;
      throw new UnsupportedFunctionalityError({
        functionality: `tool choice type: ${_exhaustiveCheck}`,
      });
    }
  }
}

import { compile } from "json-schema-to-typescript";

export const simulateToolCalling = async (
  tools: Array<{
    type: "function";
    function: {
      name: string;
      description: string | undefined;
      parameters: unknown;
    };
  }>,
): Promise<string> => {
  const context = [];
  const names = [];

  for (const tool of tools) {
    names.push(tool.function.name);

    const tsType = await compile(
      tool.function.parameters as object,
      tool.function.name,
      {
        bannerComment: "",
        format: false,
        declareExternallyReferenced: true,
        enableConstEnums: true,
        unreachableDefinitions: false,
        strictIndexSignatures: false,
      },
    );
    const toolContext = tsType
      .replace(
        /export interface (\w+) \{/,
        (_: any, name: string) => `type ${tool.function.name} = {`,
      )
      .replace(/\/\*\*\s*\n\s*\*\s*(.*?)\s*\n\s*\*\//, "// $1");
    context.push(`// ${tool.function.description}\n${toolContext}`);
  }

  const text = `These are the available tool you can execute.

${context.join("\n")}

type YourToolChoices = {
 'toolName': '${names.join("' | '")}',
 'toolData': ${names.join(" | ")}
}

Respond normally.
If user request to execute any tool, respond with pure JSON format
Make sure to translate toolData to English.

eg:
const myChoice: YourToolChoices = {
    "toolName": <name>,
    "toolData": <data>
}`;

  return text;
};

export const extractToolCallData = (
  jsonObject: object,
): LanguageModelV2ToolCall | void => {
  type ToolFunction = {
    toolName: string;
    toolData: any;
  };
  const toolFunction = jsonObject as ToolFunction;

  if (!("toolName" in toolFunction)) return;
  if (!("toolData" in toolFunction)) return;

  return {
    input: JSON.stringify(toolFunction.toolData),
    toolCallId: generateId(),
    type: "tool-call",
    toolName: toolFunction.toolName,
  };
};

export const parseJSON = <T extends object>(text: string): T | void => {
  const jsonRegex = /\{(?:[^{}]*|\{[^{}]*\})*\}/g;
  const jsonMatches = text.match(jsonRegex);

  if (jsonMatches && jsonMatches[0]) {
    try {
      const jsonObject = JSON.parse(jsonMatches[0]);
      return jsonObject;
    } catch (error) {}
  }
};

export const simulateJsonSchema = () =>
  "If user doen't specify, make sure to translate json data content into pure English.";
