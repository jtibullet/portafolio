with open('server.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "loggerOptions" in line and "info: () => {}" in line:
        continue
    if "const yfOptions = { logger: loggerOptions, validation: { logErrors: false } };" in line:
        new_lines.append("const yfOptions = { validation: { logErrors: false } };\\n")
    else:
        new_lines.append(line)

with open('server.ts', 'w') as f:
    f.writelines(new_lines)
