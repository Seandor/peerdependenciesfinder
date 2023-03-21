// Import required modules
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// Activate the extension
function activate(context) {
  // Register the command
  const disposable = vscode.commands.registerCommand('peerdependenciesfinder.execute', (folder) => {
    // Get the folder path
    const folderPath = folder.fsPath;

    // Search for JS files and find import dependencies
    searchJsFilesAndFindDependencies(folderPath);
  });

  context.subscriptions.push(disposable);
}

// Search for JS files and find import dependencies
function searchJsFilesAndFindDependencies(folderPath) {
  // Helper function to recursively search for JS files
  function searchJsFilesRecursively(currentPath) {
    const files = fs.readdirSync(currentPath);
    const dependencies = [];

    files.forEach((file) => {
      const filePath = path.join(currentPath, file);
      const fileStat = fs.statSync(filePath);

      // Check if the file is a directory, then search recursively
      if (fileStat.isDirectory()) {
        dependencies.push(...searchJsFilesRecursively(filePath));
      } else if (path.extname(filePath) === '.js') {
        // Process the JS file
        dependencies.push(...processJsFile(filePath));
      }
    });

    return dependencies;
  }

  // Function to process a JS file and find import dependencies
  function processJsFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');

    // Find import dependencies
    const importRegex = /import\s+.*\s+from\s+['"](.*)['"];/g;
    let match;
    const dependencies = [];

    while ((match = importRegex.exec(data)) !== null) {
      // Ignore relative imports
      if (!match[1].startsWith('.')) {
        // Add the dependency to the array
        dependencies.push(match[1]);
      }
    }

    return dependencies;
  }

  // Start searching for JS files recursively and remove duplicate dependencies
  const allDependencies = [...new Set(searchJsFilesRecursively(folderPath))];

  // Locate package.json at the same level as the folder path
  const packageJsonPath = path.resolve(folderPath, '..', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    // Read package.json and parse it
    const packageJsonData = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonData);

    // Add dependencies to the peerDependencies field
    packageJson.peerDependencies = packageJson.peerDependencies || {};
    allDependencies.forEach((dependency) => {
      packageJson.peerDependencies[dependency] = '*';
    });

    // Sort the peerDependencies
    const sortedPeerDependencies = Object.keys(packageJson.peerDependencies)
      .sort()
      .reduce((sortedObj, key) => {
        sortedObj[key] = packageJson.peerDependencies[key];
        return sortedObj;
      }, {});

    // Update the package.json with sorted peerDependencies
    packageJson.peerDependencies = sortedPeerDependencies;

    // Write the updated package.json back to the file
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Show a success message when updating the file successfully
    vscode.window.showInformationMessage('package.json updated successfully with peerDependencies.');
  } else {
    // Show a warning message if package.json is not found
    vscode.window.showWarningMessage('package.json not found in the root directory. Unable to add dependencies to peerDependencies.');
  }
}

// Export the activate function
exports.activate = activate;

// Deactivate the extension
function deactivate() {}

// Export the deactivate function
exports.deactivate = deactivate;