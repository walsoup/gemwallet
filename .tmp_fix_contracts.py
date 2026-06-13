path = 'tests/__tests__/screens/screenContracts.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
# Fix excessive escaping in regex literals
content = content.replace("assert.match(src, /openQuickAction\\\\\\\\\\('income'\\\\\\\\\\\\)/);", "assert.match(src, /openQuickAction\\\\('income'\\\\)/);")
content = content.replace("assert.match(src, /openQuickAction\\\\\\\\\\('expense'\\\\\\\\\\\\)/);", "assert.match(src, /openQuickAction\\\\('expense'\\\\)/);")
content = content.replace("assert.match(src, /sections=\\\\\\\\\\{groupedTransactions\\\\\\\\\\\}/);", "assert.match(src, /sections=\\\\{groupedTransactions\\\\}/);")
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('fixed')
