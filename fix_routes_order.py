import re

with open('server.ts', 'r') as f:
    text = f.read()

# The Vite middleware block
vite_block = """  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }"""

# Remove it from where it is
if vite_block in text:
    text = text.replace(vite_block, "")
else:
    print("Could not find vite block")
    
# Find the end of the global-radar route, which is right before app.listen
radar_end = """    }
});

  app.listen(PORT, "0.0.0.0", () => {"""

if radar_end in text:
    text = text.replace(radar_end, "    }\n});\n\n" + vite_block + "\n\n  app.listen(PORT, \"0.0.0.0\", () => {")
else:
    print("Could not find radar end")

with open('server.ts', 'w') as f:
    f.write(text)
