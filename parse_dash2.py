with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

dash_code = "".join(lines[1049:1363])
# Count how many divs are direct children of the dashboard container
import re
print("Dashboard block length:", len(dash_code))
print("Dashboard ends at:", repr(lines[1361]))
