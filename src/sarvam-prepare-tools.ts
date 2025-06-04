import {
  LanguageModelV1,
  LanguageModelV1CallWarning,
  LanguageModelV1FunctionToolCall,
  UnsupportedFunctionalityError,
} from "@ai-sdk/provider";
import { generateId } from "@ai-sdk/provider-utils";

type SarvamTools = Array<{
  type: "function";
  function: {
    name: string;
    description: string | undefined;
    parameters: unknown;
  };
}>;

export function prepareTools({
  mode,
}: {
  mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
    type: "regular";
  };
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
  tool_choice:
    | { type: "function"; function: { name: string } }
    | "auto"
    | "none"
    | "required"
    | undefined;
  toolWarnings: LanguageModelV1CallWarning[];
  fakeTools?: string;
} {
  // when the tools array is empty, change it to undefined to prevent errors:
  const tools = mode.tools?.length ? mode.tools : undefined;
  const toolWarnings: LanguageModelV1CallWarning[] = [];

  if (tools == null) {
    return { tools: undefined, tool_choice: undefined, toolWarnings };
  }

  const toolChoice = mode.toolChoice;

  const sarvamTools: SarvamTools = [];

  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ type: "unsupported-tool", tool });
    } else {
      sarvamTools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      });
    }
  }

  if (toolChoice == null) {
    return { tools: sarvamTools, tool_choice: undefined, toolWarnings };
  }

  const type = toolChoice.type;

  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: sarvamTools, tool_choice: type, toolWarnings };
    case "tool":
      return {
        tools: sarvamTools,
        tool_choice: {
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
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`,
      });
    }
  }
}

import { compile } from "json-schema-to-typescript";

export const simulateToolCalling = async (
  tools: SarvamTools,
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
): LanguageModelV1FunctionToolCall | void => {

    type ToolFunction = {
      toolName: string;
      toolData: any;
    };
    const toolFunction = jsonObject as ToolFunction

    if (!("toolName" in toolFunction)) return;
    if (!("toolData" in toolFunction)) return;

    return {
        args: JSON.stringify(toolFunction.toolData),
        toolCallId: generateId(),
        toolCallType: "function",
        toolName: toolFunction.toolName,
    };

};

export const parseJSON = <T extends object>(
    text: string,
):T | void => {
    const jsonRegex = /\{(?:[^{}]*|\{[^{}]*\})*\}/g;
    const jsonMatches = text.match(jsonRegex);

    if (jsonMatches && jsonMatches[0]) {
        try {
            const jsonObject = JSON.parse(jsonMatches[0])
            return jsonObject
        }
        catch (error) {}
    }
}

export const simulateJsonSchema = () => "If user doen't specify, make sure to translate json data content into pure English."
