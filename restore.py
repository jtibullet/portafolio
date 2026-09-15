with open('src/App.tsx', 'r') as f:
    text = f.read()

start_idx = text.find("{activeTab === 'dashboard' && (\n              <DndContext")
end_idx = text.find("{/* PROBABILISTIC SCENARIOS */}")

with open('raw_dashboard.tsx', 'r') as f:
    raw_dash = f.read()

new_text = text[:start_idx] + raw_dash + "\n            " + text[end_idx:]

with open('src/App.tsx', 'w') as f:
    f.write(new_text)

print("Restored dashboard")
