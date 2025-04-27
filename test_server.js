import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import assert from 'assert';
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import TS from "tree-sitter-typescript";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the MCP server
const serverPath = path.join(__dirname, 'build', 'index.js');

// Create test cases with expected results
const testCases = [
  {
    name: 'Find Python function declaration',
    file: './test_code.py',
    function: 'hello_world',
    expectedLines: [1], // Line where hello_world is defined
    shouldPass: true
  },
  {
    name: 'Find Python function usage',
    file: './test_code.py',
    function: 'calculate_sum',
    expectedLines: [5, 14], // Line where it's defined and used
    shouldPass: true
  },
  {
    name: 'Function that does not exist',
    file: './test_code.py',
    function: 'nonexistent_function',
    expectedLines: [],
    shouldPass: false
  }
];

async function runTest(testCase) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning test: ${testCase.name}`);
    
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', process.stderr]
    });
    
    let buffer = '';
    let result = null;
    
    server.stdout.on('data', (data) => {
      buffer += data.toString();
      
      try {
        const messages = buffer.split('\n').filter(line => line.trim());
        
        for (const message of messages) {
          try {
            const parsed = JSON.parse(message);
            
            if (parsed.id === 2 && parsed.result) {
              // This is our functionLookup result
              result = parsed.result;
              console.log(`Result: ${result}`);
            } else if (parsed.id === 1 && parsed.result) {
              // Initialize response received, send tool request
              console.log('Server initialized, sending test request');
              sendToolExecuteRequest(server, testCase.function, testCase.file);
            }
          } catch (e) {
            // Incomplete JSON
          }
        }
        
        buffer = buffer.split('\n').pop() || '';
      } catch (e) {
        // Keep accumulating
      }
    });
    
    server.on('exit', () => {
      if (!result) {
        if (!testCase.shouldPass) {
          console.log(`✅ Test passed: ${testCase.name} - No result as expected`);
          resolve();
        } else {
          console.log(`❌ Test failed: ${testCase.name} - No result returned`);
          reject(new Error('No result returned'));
        }
        return;
      }
      
      if (result.includes('not found') && !testCase.shouldPass) {
        console.log(`✅ Test passed: ${testCase.name} - Function correctly not found`);
        resolve();
        return;
      }
      
      if (testCase.shouldPass) {
        // Extract line numbers from result and compare with expected
        const lineMatches = result.match(/lines: ([\d, ]+)/);
        if (lineMatches) {
          const actualLines = lineMatches[1].split(', ').map(n => parseInt(n, 10));
          
          // Compare with expected lines
          const missingLines = testCase.expectedLines.filter(line => !actualLines.includes(line));
          const extraLines = actualLines.filter(line => !testCase.expectedLines.includes(line));
          
          if (missingLines.length === 0 && extraLines.length === 0) {
            console.log(`✅ Test passed: ${testCase.name}`);
            resolve();
          } else {
            console.log(`❌ Test failed: ${testCase.name}`);
            console.log(`  Missing lines: ${missingLines.join(', ')}`);
            console.log(`  Extra lines: ${extraLines.join(', ')}`);
            reject(new Error('Line numbers do not match expected'));
          }
        } else {
          console.log(`❌ Test failed: ${testCase.name} - Could not parse line numbers`);
          reject(new Error('Could not parse line numbers from result'));
        }
      } else {
        console.log(`❌ Test failed: ${testCase.name} - Expected no function to be found`);
        reject(new Error('Function was found but should not have been'));
      }
    });
    
    // Initialize server
    sendInitializeRequest(server);
    setTimeout(() => {
      sendInitializedNotification(server);
    }, 500);
    
    // Time out the test after 5 seconds
    setTimeout(() => {
      server.stdin.end();
      reject(new Error(`Test timed out: ${testCase.name}`));
    }, 5000);
  });
}

function sendInitializeRequest(server) {
  const message = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      processId: null,
      clientInfo: { name: 'TestClient', version: '1.0' },
      capabilities: {},
      trace: 'off',
      protocolVersion: '2025-03-26'
    }
  };
  
  server.stdin.write(JSON.stringify(message) + '\n');
}

function sendInitializedNotification(server) {
  const message = {
    jsonrpc: '2.0',
    method: 'initialized',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(message) + '\n');
}

function sendToolExecuteRequest(server, functionName, filePath) {
  const message = {
    jsonrpc: '2.0',
    id: 2,
    method: 'execute',
    params: {
      toolId: 'functionLookup',
      parameters: {
        functionName,
        filePath
      }
    }
  };
  
  server.stdin.write(JSON.stringify(message) + '\n');
}

// Run all tests
async function runAllTests() {
  let failures = 0;
  
  for (const testCase of testCases) {
    try {
      await runTest(testCase);
    } catch (error) {
      failures++;
      console.error(`Test failed: ${testCase.name}`);
      console.error(error.message);
    }
  }
  
  console.log(`\nTest results: ${testCases.length - failures} passed, ${failures} failed`);
  process.exit(failures > 0 ? 1 : 0);
}

runAllTests();

const TypeScript = TS.typescript;
const Tsx = TS.tsx;

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
        
        const queryStr = `
            (identifier) @name
            (#match? @name "^${functionName}$")
        `;
        
        const query = (language).query(queryStr);
        const matches = query.matches(tree.rootNode);
        
        if (matches.length === 0) {
            return null; // No matches
        }
        
        // Extract unique line numbers
        const lines = new Set();
        for (const match of matches) {
            for (const capture of match.captures) {
                if (capture.name === 'name') {
                    lines.add(capture.node.startPosition.row + 1);
                }
            }
        }
        
        const sortedLines = Array.from(lines).sort((a, b) => a - b);
        
        return {
            file: filePath,
            lines: sortedLines
        };
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return null;
    }
}

export async function functionLookupHandler(params) {
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