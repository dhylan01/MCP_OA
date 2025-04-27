import fs from "fs";
import path from "path";

// Function to process a single file
async function processFile(filePath, functionName) {
    try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        
        // Simple string-based search approach
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

// Function to find all files of specified types recursively
function getAllFiles(dirPath, fileTypes = ['.py', '.ts', '.tsx'], fileList = []) {
    try {
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
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
    }
    
    return fileList;
}

// Define test cases
const testCases = [
    {
        name: "Find Python function declaration",
        file: "./test_code.py",
        functionName: "hello_world",
        expectedLines: [1, 9, 11]
    },
    {
        name: "Find Python function usage",
        file: "./test_code.py",
        functionName: "calculate_sum",
        expectedLines: [5, 13]
    },
    {
        name: "Function that does not exist",
        file: "./test_code.py",
        functionName: "nonexistent_function",
        expectedResult: null
    }
];

// Run a directory search test too
const directoryTest = {
    name: "Directory search",
    functionName: "functionLookupHandler",
    directory: "./",
    expectedResult: null
};

// Function to run all tests
async function runTests() {
    console.log("Starting direct function tests...\n");
    
    for (const test of testCases) {
        console.log(`Running test: ${test.name}`);
        
        const result = await processFile(test.file, test.functionName);
        
        if (result === null) {
            console.log(`Result: Function '${test.functionName}' not found in ${test.file}`);
            
            if (test.expectedResult === null) {
                console.log("✅ Test passed: Function correctly not found\n");
            } else {
                console.log(`❌ Test failed: Expected to find function on lines: ${test.expectedLines.join(", ")}\n`);
            }
        } else {
            console.log(`Result: Function '${test.functionName}' found in '${result.file}' on lines: ${result.lines.join(", ")}`);
            
            if (test.expectedResult === null) {
                console.log(`❌ Test failed: Expected no results but found lines: ${result.lines.join(", ")}\n`);
            } else {
                // Check if found lines match expected lines
                const missingLines = test.expectedLines.filter(line => !result.lines.includes(line));
                const extraLines = result.lines.filter(line => !test.expectedLines.includes(line));
                
                if (missingLines.length === 0 && extraLines.length === 0) {
                    console.log("✅ Test passed: Found all expected lines\n");
                } else {
                    console.log("❌ Test failed:");
                    if (missingLines.length > 0) {
                        console.log(`  Missing lines: ${missingLines.join(", ")}`);
                    }
                    if (extraLines.length > 0) {
                        console.log(`  Extra lines: ${extraLines.join(", ")}`);
                    }
                    console.log("");
                }
            }
        }
    }
    
    // Run directory search test
    console.log(`Running test: ${directoryTest.name}`);
    const files = getAllFiles(directoryTest.directory);
    let found = false;
    
    for (const file of files) {
        const result = await processFile(file, directoryTest.functionName);
        if (result) {
            found = true;
            console.log(`Result: Function '${directoryTest.functionName}' found in '${result.file}' on lines: ${result.lines.join(", ")}`);
        }
    }
    
    if (!found) {
        console.log(`Result: Function '${directoryTest.functionName}' not found in any files in ${directoryTest.directory}`);
    }
    
    console.log("\nAll tests completed");
}

// Run all tests
runTests().catch(error => {
    console.error("Error during tests:", error);
}); 