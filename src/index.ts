import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { functionLookupHandler } from "./tools/functionLookup.js";

// Define the expected parameter structure
interface ExecuteParams {
    toolId: string;
    parameters: {
        functionName: string;
        filePath: string;
    };
}

const serverOptions = {
    name: "amp-codesearch",
    version: "1.0.0",
    capabilities: { 
        resources: {},
        tools: {
            functionLookup: {
                name: "functionLookup",
                description: "Looks up how a function is used in the codebase.",
                parameters: {
                    type: "object",
                    properties: {
                        functionName: {
                            type: "string",
                            description: "The name of the function to look up."
                        },
                        filePath: { 
                            type: "string",
                            description: "The path to the file to search within."
                        }
                    },
                    required: ["functionName", "filePath"]
                }
            }
        },
    },
    handlers: {
        functionLookup: functionLookupHandler
    }
};

async function main() {
    try {
        const transport = new StdioServerTransport();
        
        // Log the options being passed
        console.error("Using server options:", JSON.stringify(serverOptions, null, 2)); 
        
        // Create server instance
        const server = new McpServer(serverOptions);
        
        // Connect to the transport
        await server.connect(transport);
        
        // Add a debug listener 
        process.on('message', (message) => {
            console.error('Received process message:', message);
        });
        
        console.error("AMP CodeSearch MCP Server running via stdio...");
    } catch (error) {
        console.error("Error in main:", error);
        process.exit(1);
    }
}
  
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});



