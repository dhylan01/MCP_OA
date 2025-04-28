import fs from "fs";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Since we're not using Tree-sitter directly in this MCP server due to
// ES module compatibility issues, we'll use the more reliable regex approach
async function functionLookup(functionName, filePath) {
    try {
        // Resolve the path relative to the current working directory or use absolute path
        const resolvedPath = path.resolve(filePath);
        const fileContent = fs.readFileSync(resolvedPath, "utf-8");
        return performRegexSearch(functionName, fileContent, filePath);
    }
    catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return `Error: Could not analyze file ${filePath}. ${error.message}`;
    }
}
// Regex search for function names
function performRegexSearch(functionName, fileContent, filePath) {
    const lines = [];
    const fileLines = fileContent.split('\n');
    // Regular expression to match function name as a word boundary
    const regex = new RegExp(`\\b${functionName}\\b`, 'g');
    fileLines.forEach((line, index) => {
        if (regex.test(line)) {
            lines.push(index + 1);
        }
    });
    if (lines.length === 0) {
        return `Function '${functionName}' not found in ${filePath}.`;
    }
    // Format the output
    return `Function '${functionName}' found in '${filePath}' on lines: ${lines.join(", ")}`;
}
async function main() {
    console.error("Function Lookup MCP Server running via stdio...");
    // Create an MCP server with proper initialization
    const server = new McpServer({
        name: "function-lookup-server",
        version: "1.0.0"
    });
    // Register the functionLookup tool
    server.tool("functionLookup", {
        functionName: z.string().describe("The name of the function to look up."),
        filePath: z.string().describe("The path to the file to search within.")
    }, async ({ functionName, filePath }) => {
        const result = await functionLookup(functionName, filePath);
        return {
            content: [{ type: "text", text: result }]
        };
    });
    // Create a stdio transport
    const transport = new StdioServerTransport();
    // Connect the server to the transport
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
