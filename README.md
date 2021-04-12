# VSCode C/C++ Runner

🚀 Compile and run your C/C++ code with ease. 🚀

This extension provides tasks to compile, run and debug your C/C++ code.  
You do not need to know about any compiler commands. 😎  
The extension works on Windows, Linux and MacOS.

## Example

![ExampleGif](./media/ExecuteTasks.gif?raw=true)

## Software Requirements

- 🔧 Microsoft's C/C++ VSCode Extension (will be installed automatically)
- 🔧 For C: gcc/clang, gdb/lldb and make
- 🔧 For C++: g++/clang++, gdb/lldb and make

## Install the Software Requirements (optional)

- 🖥️ Windows: Recommended to install gcc/g++, gdb and make via Cygwin: <https://www.cygwin.com/>
- 🖥️ Linux: Recommended to install gcc/g++, gdb and make via a package manager (e.g. `apt` for Debian derivates)
- 🖥️ MacOS: Recommended to install clang/clang++, lldb and make via xcode-tools: <https://developer.apple.com/xcode/features/>

## How to use

1️⃣ The first step is to select the folder that contains the C/C++ files you want to compile, run or debug.  
You can either select the folder by the quick pick menu from the status bar, or by right-clicking on a folder in the context menu.  
2️⃣ In addition you can select to either build the binary in debug or release mode.  
3️⃣ Afterwards, you can press the shortcut `ctrl+shift+r` to get a quick pick menu for the tasks.  
❕ For every quick pick menu entry, there is also an icon in the blue status bar.

For example, if you select a folder called *"vscode-test/folder1"* you will see the following tasks:

![TaskQuickBar](./media/TaskQuickPick.png)

- 🛠 Build: This task will compile all C/C++ files in the selected folder and will link them into a binary.
- ▶️ Run*: This task will execute the binary.
- 🗑️ Clean*: This task will delete all obj files (*.o).
- 🐞 Debug*: This task will start a debugging session for the binary.

*This task is only present if the build task was previously executed.

## Extension Features

The extension will automatically search for an installed compiler on your computer.  
If any compiler can be found in the PATH variables it will be stored to the local workspace settings (*".vscode/settings.json"*).  
If you wish to use any other installed compiler, just edit the entries in the local settings.  
![FoundCompiler](./media/FoundCompiler.png)  

Based on the operating system and the compiler, there will be a *c_cpp_properties.json* file created in the local *.vscode* folder.  
This file will be used by Microsoft's *C/C++* extension for intellisense. For more information refer to the official [documentation](https://code.visualstudio.com/docs/cpp/c-cpp-properties-schema-reference).  
![CCppConfig](./media/CCppConfig.png)  
**Important:** It is recommended to edit the local *"settings.json"* instead of the *"c_cpp_properties.json"*.  
The properties will be updated automatically. For more information about the extensions's settings, see [below](#extension-settings).

## Extension Settings

- ⚙️ C Compiler path (defaults to gcc)
- ⚙️ C Standard (defaults to c99)
- ⚙️ C++ Compiler path (defaults to g++)
- ⚙️ C++ Standard (defaults to c++11)
- ⚙️ Make path (defaults to make)
- ⚙️ Debugger path (defaults to gdb)
- ⚙️ To enable warnings (defaults to true)
- ⚙️ What warnings should be checked by the compiler (defaults to '-Wall -Wextra -Wpedantic')
- ⚙️ To treat warnings as errors (defaults to false)
- ⚙️ Additional compiler arguments (defaults to None)
- ⚙️ Additional linker arguments (defaults to None)
- ⚙️ Additional include paths (defaults to None)

## Important Notes

### Constraints on Files and Folders

- 📝 Allowed file extensions for headers: \*.h, \*.hpp, \*.hh, \*.hxx
- 📝 Allowed file extensions for sources: \*.c, \*.cpp, \*.cc, \*.cxx
- 📁 The extension will not list folder names starting with a dot (e.g. *".vscode"*)

### CMake Projects

The extension does not activate on start whenever there is a CMakeLists.txt file in the root folder of the workspace.  
Otherwise, the status bar would have a lot of buttons from this extension and *Microsoft's CMake Tools* extension.  
However, the user can trigger the start-up of this extension by pressing `ctrl+shift+r` regardless of a present CMake file.

## Release Notes

Refer to the [CHANGELOG](CHANGELOG.md).

## License

Copyright (C) 2021 Jan Schaffranek. Licensed under the MIT License.  
For the *C/C++* extension from Microsoft refer to their license.
