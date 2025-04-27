import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import TS from "tree-sitter-typescript";

const TypeScript = TS.typescript;
const Tsx = TS.tsx;

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// New helper function to get all files recursively
function getAllFiles(dirPath, fileTypes = ['.py', '.ts', '.tsx'], fileList = []) {
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

// Function to process a single file
async function processFile(filePath, functionName) {
    try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const parser = new Parser();
        const fileExtension = path.extname(filePath);
        let language;
        
        if (fileExtension === ".py") {
            language = Python;
        } else if (fileExtension === ".ts") {
            language = TypeScript;
        } else if (fileExtension === ".tsx") {
            language = Tsx;
        } else {
            return null; // Unsupported file type
        }
        
        parser.setLanguage(language);
        const tree = parser.parse(fileContent);
        
        // Simple string-based search as a fallback approach
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
            return null; // No matches
        }
        
        return {
            file: filePath,
            lines: lines
        };
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return null;
    }
}

async function functionLookupHandler(params) {
    const { functionName, filePath } = params;
    const fileTypes = params.fileTypes || ['.py', '.ts', '.tsx'];

    // Check if filePath is a directory or a file
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
        // Search entire directory recursively
        const resolvedPath = path.resolve(filePath);
        const allFiles = getAllFiles(resolvedPath, fileTypes);
        
        if (allFiles.length === 0) {
            return `No supported files found in directory: ${filePath}`;
        }
        
        const results = [];
        let foundCount = 0;
        
        // Process all files and collect results
        for (const file of allFiles) {
            const result = await processFile(file, functionName);
            if (result) {
                foundCount++;
                results.push(`Function '${functionName}' found in '${result.file}' on lines: ${result.lines.join(", ")}`);
            }
        }
        
        if (foundCount === 0) {
            return `Function '${functionName}' not found in any files in ${filePath}`;
        }
        
        return `Found ${foundCount} files containing function '${functionName}':\n\n${results.join("\n\n")}`;
    } else {
        // Process single file (original implementation)
        const resolvedPath = path.resolve(filePath);
        const result = await processFile(resolvedPath, functionName);
        
        if (!result) {
            return `Function '${functionName}' not found in ${filePath}`;
        }
        
        return `Function '${functionName}' found in '${filePath}' on lines: ${result.lines.join(", ")}`;
    }
}

// Test cases
const testCases = [
  {
    name: 'Find Python function declaration',
    params: {
      functionName: 'hello_world',
      filePath: './test_code.py'
    }
  },
  {
    name: 'Find Python function usage',
    params: {
      functionName: 'calculate_sum',
      filePath: './test_code.py'
    }
  },
  {
    name: 'Function that does not exist',
    params: {
      functionName: 'nonexistent_function',
      filePath: './test_code.py'
    }
  },
  {
    name: 'Directory search',
    params: {
      functionName: 'functionLookupHandler',
      filePath: './',
      fileTypes: ['.js']
    }
  }
];

// Run tests
async function runTests() {
  console.log('Starting direct function tests...\n');
  
  for (const test of testCases) {
    console.log(`Running test: ${test.name}`);
    try {
      const result = await functionLookupHandler(test.params);
      console.log(`Result: ${result}\n`);
    } catch (error) {
      console.error(`Error in test "${test.name}":`, error);
    }
  }
  
  console.log('All tests completed');
}

runTests(); 