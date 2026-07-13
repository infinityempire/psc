import sys

def condense_file(file_path, keyword, window=40):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        for i, line in enumerate(lines):
            if keyword in line:
                start = max(0, i - window)
                end = min(len(lines), i + window)

                print(f"--- Condenser Clip [{file_path} | Lines {start}-{end}] ---")
                print("".join(lines[start:end]))
                print("--- End of Clip ---")
                return

        print(f"Keyword '{keyword}' not found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python condense.py <file> <keyword>")
    else:
        condense_file(sys.argv[1], sys.argv[2])
