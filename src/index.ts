import fs from "fs";
import path from "path";
import readline from "readline";

// Function to process a single file
async function functionLookupHandler(params: { functionName: string; filePath: string }): Promise<string> {
    const { functionName, filePath } = params;

    try {
        // Resolve the path relative to the current working directory or use absolute path
        const resolvedPath = path.resolve(filePath);
        const fileContent = fs.readFileSync(resolvedPath, "utf-8");

        // Simple string-based search approach
        const lines: number[] = [];
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
    } catch (error: any) {
        console.error(`Error reading file ${filePath}:`, error);
        return `Error: Could not read file ${filePath}. ${error.message}`;
    }
}

// Function to find all files of specified types recursively
function getAllFiles(dirPath: string, fileTypes: string[] = ['.py', '.ts', '.tsx'], fileList: string[] = []) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.')) {
            // Recurse into subdirectories, but skip hidden directories
            getAllFiles(filePath, fileTypes, fileList);
        } else {
            const ext = path.extname(filePath);
            if (fileTypes.includes(ext)) {
                fileList.push(filePath);
            }
        }
    }
    
    return fileList;
}

// Create a JSON-RPC handler
async function handleJsonRpcRequest(request: any): Promise<any> {
    if (!request || !request.method) {
        return {
            jsonrpc: "2.0",
            error: {
                code: -32600,
                message: "Invalid Request"
            },
            id: request?.id || null
        };
    }

    // Handle the initialize method
    if (request.method === "initialize") {
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                capabilities: {
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
                    }
                }
            }
        };
    }

    // Handle the initialized notification
    if (request.method === "initialized") {
        // This is a notification, no response needed
        return null;
    }

    // Handle the execute method
    if (request.method === "execute") {
        if (request.params.toolId !== "functionLookup") {
            return {
                jsonrpc: "2.0",
                error: {
                    code: -32601,
                    message: `Unknown tool: ${request.params.toolId}`
                },
                id: request.id
            };
        }

        try {
            const result = await functionLookupHandler(request.params.parameters);
            return {
                jsonrpc: "2.0",
                id: request.id,
                result
            };
        } catch (error: any) {
            console.error("Error executing functionLookup:", error);
            return {
                jsonrpc: "2.0",
                error: {
                    code: -32000,
                    message: error.message || "Error executing tool"
                },
                id: request.id
            };
        }
    }

    // Handle unknown methods
    return {
        jsonrpc: "2.0",
        error: {
            code: -32601,
            message: "Method not found"
        },
        id: request.id || null
    };
}

// Main function to read from stdin and write to stdout
async function main() {
    console.error("Function Lookup MCP Server running via stdio...");
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', async (line) => {
        try {
            const request = JSON.parse(line);
            const response = await handleJsonRpcRequest(request);
            
            if (response) {
                console.log(JSON.stringify(response));
            }
        } catch (error: any) {
            console.error("Error processing request:", error);
            const errorResponse = {
                jsonrpc: "2.0",
                error: {
                    code: -32700,
                    message: "Parse error"
                },
                id: null
            };
            console.log(JSON.stringify(errorResponse));
        }
    });

    rl.on('close', () => {
        process.exit(0);
    });
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});



