#!/bin/bash
################################################################################
# setup_terminal.sh - Terminal Efficiency Script for PSC Repository
#
# This script defines the gemini-fix function for automating code fixes
# using the condenser logic with an LLM (gemini-cli).
#
# INSTALLATION:
# =============
# 
# Option 1: Add to ~/.bashrc (for Bash)
#   echo 'source /path/to/setup_terminal.sh' >> ~/.bashrc
#   source ~/.bashrc
#
# Option 2: Add to ~/.zshrc (for Zsh)
#   echo 'source /path/to/setup_terminal.sh' >> ~/.zshrc
#   source ~/.zshrc
#
# Option 3: Source directly (temporary, current session only)
#   source ./setup_terminal.sh
#
# USAGE:
# ======
#   gemini-fix file1.js file2.py
#   gemini-fix src/main.js
#   gemini-fix index.html
#
# DESCRIPTION:
# ============
# The gemini-fix function condenses the specified files using condense.py
# and pipes the output to gemini-cli for analysis and fixing.
#
################################################################################

# Detect shell type
SHELL_TYPE=$(ps -p $$ -o comm= 2>/dev/null || echo "bash")

# Define the gemini-fix function
gemini-fix() {
    local files=("$@")
    
    # Check if no files provided
    if [ ${#files[@]} -eq 0 ]; then
        echo "Usage: gemini-fix <file1> [file2] ..."
        echo ""
        echo "Condenses the specified files and pipes them to gemini-cli for analysis."
        echo ""
        echo "Example:"
        echo "  gemini-fix src/main.js src/utils.js"
        echo "  gemini-fix index.html style.css"
        return 1
    fi
    
    # Check if python3 is available
    if ! command -v python3 &> /dev/null; then
        echo "Error: python3 is required but not installed."
        return 1
    fi
    
    # Check if condense.py is available
    local condense_script=""
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd 2>/dev/null || pwd)"
    
    if [ -f "./condense.py" ]; then
        condense_script="./condense.py"
    elif [ -f "$script_dir/condense.py" ]; then
        condense_script="$script_dir/condense.py"
    else
        echo "Error: condense.py not found in current directory or script directory."
        echo "Make sure condense.py exists in the PSC repository."
        return 1
    fi
    
    # Check if gemini-cli is available
    if ! command -v gemini-cli &> /dev/null; then
        echo "Error: gemini-cli is not installed or not in PATH."
        echo "Install it from: https://github.com/your-repo/gemini-cli"
        return 1
    fi
    
    echo "Condensing files: ${files[*]}"
    echo "Running analysis..."
    echo ""
    
    # Condense and pipe to gemini-cli
    python3 "$condense_script" "${files[@]}" | gemini-cli "Analyze and fix the issue in this code."
}

# Alternative inline implementation (uncomment if not using condense.py)
gemini-fix-inline() {
    local files=("$@")
    
    if [ ${#files[@]} -eq 0 ]; then
        echo "Usage: gemini-fix <file1> [file2] ..."
        return 1
    fi
    
    if ! command -v gemini-cli &> /dev/null; then
        echo "Error: gemini-cli is not installed."
        return 1
    fi
    
    local content=""
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            content+=$'\n'"// File: $file"$'\n'
            content+=$(cat "$file")
        fi
    done
    
    echo "$content" | gemini-cli "Analyze and fix the issue in this code."
}

# Show completion message when sourced
echo "✓ Terminal setup complete!"
echo ""
echo "The gemini-fix function is now available."
echo ""
echo "Usage: gemini-fix <file1> [file2] ..."
echo ""
echo "To use in future sessions, add to your shell config:"

if [ "$SHELL_TYPE" = "zsh" ]; then
    echo "  echo 'source \"$(pwd)/setup_terminal.sh\"' >> ~/.zshrc"
else
    echo "  echo 'source \"$(pwd)/setup_terminal.sh\"' >> ~/.bashrc"
fi

echo ""
echo "Make sure condense.py and gemini-cli are available in your PATH."
