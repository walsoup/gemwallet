path = 'tests/__tests__/screens/screenContracts.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
new_lines = []
for line in lines:
    if 'assert.match(src, /openQuickAction' in line and "'income')\" in line:
        line = "    assert.match(src, /openQuickAction\\('income'\\)/) ;\\n"
    elif 'assert.match(src, /openQuickAction' in line and "'expense')\" in line:
        line = "    assert.match(src, /openQuickAction\\('expense'\\)/) ;\\n"
    new_lines.append(line)
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('patched assertions')