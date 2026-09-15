import re

with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("const loggerOptions = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };\\nconst yfOptions = { logger: loggerOptions, validation: { logErrors: false } };", "const yfOptions = { validation: { logErrors: false } };")

with open('server.ts', 'w') as f:
    f.write(content)
