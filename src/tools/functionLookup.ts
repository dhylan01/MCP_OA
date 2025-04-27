import fs from "fs";
import path from "path"; // Import path for extension checking
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import TS from "tree-sitter-typescript"; // Import the container object
const TypeScript = TS.typescript; // Access the actual TS language
const Tsx = TS.tsx; // Access the actual TSX language

export async function functionLookupHandler(
    params: { functionName: string; filePath: string },
): Promise<string> {
    const { functionName, filePath } = params;

    let fileContent: string;
    try {
        // Resolve the path relative to the current working directory or use absolute path
        const resolvedPath = path.resolve(filePath);
        fileContent = fs.readFileSync(resolvedPath, "utf-8");
    } catch (error: any) {
        console.error(`Error reading file ${filePath}:`, error);
        return `Error: Could not read file ${filePath}. ${error.message}`;
    }

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
} 