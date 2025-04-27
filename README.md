# AMP CodeSearch MCP Server

A Model Context Protocol (MCP) server that helps AI assistants like Copilot or Claude analyze code by looking up function usage within source files.

## Features

- **Function Lookup**: Find where and how specific functions are used in your codebase
- Supports Python and TypeScript/TSX files
- Uses tree-sitter for accurate code analysis

## Installation

1. Clone this repository:

   ```
   git clone <repository-url>
   cd MCP_OA
   ```

2. Install dependencies:

   ```
   npm install --legacy-peer-deps
   ```

   _Note: The `--legacy-peer-deps` flag is required to handle dependency conflicts between tree-sitter packages._

## Building

Build the TypeScript code:

```
npm run build
```

This compiles the source code to the `build` directory.

## Setting Up with an MCP-Compatible Assistant

### VS Code Copilot Extension

1. Open VS Code settings
2. Search for "MCP" or "Model Context Protocol"
3. Add a new server with these settings:
   - **Server Name**: `amp-codesearch` (or any name you prefer)
   - **Command**: `node`
   - **Arguments**: `build/index.js` (path to the compiled script)
   - **Environment Variables**: None needed

### Claude Code Extension

1. Open Claude settings in VS Code
2. Navigate to the "MCP Servers" section
3. Add a new server with:
   ```json
   {
     "mcpServers": {
       "amp-codesearch": {
         "command": "node",
         "args": ["build/index.js"]
       }
     }
   }
   ```

## Using the Tools

### functionLookup

This tool finds occurrences of a specific function within a source file.

**Parameters**:

- `functionName`: The name of the function to look for
- `filePath`: Path to the file to analyze

**Example prompt**:

```
Please find where the 'calculate_sum' function is used in src/calculator.py.
```

## Testing

To manually test the server:

1. Build the server: `npm run build`
2. Create a test file (e.g., `test_code.py`) with some function definitions and calls
3. Run: `node test_server.js`

## Troubleshooting

If you encounter connection issues with the MCP server:

1. Check that the `protocolVersion` is specified correctly in the assistant's configuration
2. Look for detailed error messages in the server logs
3. Make sure the server is built properly (`npm run build`)
4. Verify that the correct path is used in the arguments configuration

## License

MIT
