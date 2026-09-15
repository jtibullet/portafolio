with open('src/App.tsx', 'r') as f:
    text = f.read()

target = """              </>
            )}
              </>
            )}
            {/* PROBABILISTIC SCENARIOS */}"""

replacement = """              </>
            )}
            {/* PROBABILISTIC SCENARIOS */}"""

text = text.replace(target, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(text)
