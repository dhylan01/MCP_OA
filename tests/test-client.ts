import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import assert from "assert";

async function main() {
    // Create a child process for the server
    const child = spawn("node", ["dist/src/index.js"], {
        stdio: ["pipe", "pipe", process.stderr]
    });

    // Create a transport to communicate with the server
    const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/src/index.js"]
    });

    // Create a client
    const client = new Client({
        name: "function-lookup-client",
        version: "1.0.0"
    });

    // Connect to the server
    await client.connect(transport);

    try {
        // List available tools
        console.log("Available tools:");
        const tools = await client.listTools();
        console.log(JSON.stringify(tools, null, 2));

        // Define test cases
        const testCases = [
            {
                description: "Test case 1: Find function in index.ts",
                functionName: "functionLookup",
                filePath: "src/index.ts",
                expectedResult: "found", // We expect the function to be found
            },
            {
                description: "Test case 2: Find 'add' function in sample.ts",
                functionName: "add",
                filePath: "tests/sample.ts",
                expectedResult: "found", // We expect the function to be found
            },
            {
                description: "Test case 3: Find 'calculate' function in sample.ts",
                functionName: "calculate",
                filePath: "tests/sample.ts",
                expectedResult: "found", // We expect the function to be found
            },
            {
                description: "Test case 4: Look for non-existent function",
                functionName: "nonExistentFunction",
                filePath: "tests/sample.ts",
                expectedResult: "not found", // We expect the function to not be found
            }
        ];

        // Run test cases
        let passedTests = 0;
        for (const testCase of testCases) {
            console.log(`\n${testCase.description}`);
            console.log(`Searching for '${testCase.functionName}' in '${testCase.filePath}'...`);
            
            try {
                const result = await client.callTool({
                    name: "functionLookup",
                    arguments: {
                        functionName: testCase.functionName,
                        filePath: testCase.filePath
                    }
                });

                console.log("Result:", result);
                
                // Get the result text - handle the response structure appropriately
                // The content should be accessible from the result
                const resultText = typeof result === 'object' && result !== null && 
                                  'content' in result && Array.isArray(result.content) && 
                                  result.content.length > 0 && typeof result.content[0] === 'object' &&
                                  result.content[0] !== null && 'text' in result.content[0] 
                                  ? result.content[0].text as string 
                                  : JSON.stringify(result);
                
                // Check if result matches expected outcome
                const isFound = resultText.includes("found in");
                const isNotFound = resultText.includes("not found");
                
                if ((testCase.expectedResult === "found" && isFound) || 
                    (testCase.expectedResult === "not found" && isNotFound)) {
                    console.log("✅ TEST PASSED");
                    passedTests++;
                } else {
                    console.log("❌ TEST FAILED");
                    console.log(`Expected: ${testCase.expectedResult}, but got: ${isFound ? "found" : "not found"}`);
                }
            } catch (error) {
                console.error("Error in test case:", error);
                console.log("❌ TEST FAILED due to error");
            }
        }

        // Print test summary
        console.log("\n----- Test Summary -----");
        console.log(`Passed: ${passedTests}/${testCases.length}`);
        console.log(`Failed: ${testCases.length - passedTests}/${testCases.length}`);
        
        if (passedTests === testCases.length) {
            console.log("🎉 All tests passed!");
        } else {
            console.log("❌ Some tests failed.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        // Close the connection
        child.kill();
        process.exit(0);
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
}); 