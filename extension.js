const vscode = require('vscode')
const fs = require('fs')
const path = require('path')

function getI18nFile(filePath) {
	if (!filePath) return
	const dirName = path.dirname(filePath)
	if (filePath !== dirName) {
		const i18nFile = path.join(dirName, 'locales', 'en.json')
		if (fs.existsSync(i18nFile)) return i18nFile
	}
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const completionProvider = vscode.languages.registerCompletionItemProvider(
		['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
		{
			provideCompletionItems(document, position) {
				const wordRange = document.getWordRangeAtPosition(position, /_t\([`"'][\w\d_\.]*/)
				if (!wordRange) return
				const i18nFile = getI18nFile(document.fileName)
				if (!i18nFile) return
				try {
					let i18nContent = JSON.parse(fs.readFileSync(i18nFile, 'utf-8'))
					const words = document.getText(wordRange).slice(4).split('.')
					for (let i = 0, n = words.length - 1; i < n; i++) {
						i18nContent = i18nContent[words[i]]
					}
					return Object.keys(i18nContent).map(key => {
						let completion = new vscode.CompletionItem(key, vscode.CompletionItemKind.Keyword)
						let content = i18nContent[key]
						if (typeof content === 'string') {
							completion.detail = content
							completion.documentation = content
						} else {
							completion.documentation = new vscode.MarkdownString('```json\n' + JSON.stringify(content, null, 2) + '\n```')
						}
						return completion
					})
				} catch {}
			}
		},
		'.', '`', '"', "'"
	)
	const definitionProvider = vscode.languages.registerDefinitionProvider(
		['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
		{
			provideDefinition(document, position) {
				const wordRange = document.getWordRangeAtPosition(position, /_t\([`"'][\w\d_\.]*/)
				if (!wordRange) return
				const i18nFile = getI18nFile(document.fileName)
				if (!i18nFile) return
				try {
					const fileContent = fs.readFileSync(i18nFile, 'utf-8')
					const lines = fileContent.split('\n')
					const keyParts = document.getText(wordRange).slice(4).split('.')
					for (let i = 0, j = 1, n = keyParts.length, m = lines.length; i < n;) {
						const key = keyParts[i++]
						if (!key) continue
						const indent = ' '.repeat(i << 1)
						const searchKey = `${indent}"${key}"`
						for (let k = j; k < m; k++) {
							const line = lines[k]
							if (line.startsWith(searchKey)) {
								if (i === n) {
									return new vscode.Location(vscode.Uri.file(i18nFile), new vscode.Position(k, searchKey.length + 3))
								}
								j = k + 1
								break
							} else if (!line.startsWith(indent)) {
								const newLines = []
								for (let p = i; p < n; p++) {
									newLines.splice(
										newLines.length >> 1,
										0,
										`${' '.repeat(p << 1)}"${keyParts[p-1]}": {`,
										`${' '.repeat(p << 1)}}`
									)
								}
								newLines.splice(
									newLines.length >> 1,
									0,
									`${' '.repeat(n << 1)}"${keyParts[n-1]}": ""`
								)
								let l = j
								for (i = j; i < k; i++) {
									if (lines[i].startsWith(`${indent}"`)) {
										l = i
										if (searchKey < lines[i]) break
									}
								}
								if (i === k) l = k
								if (l < k) {
									newLines[newLines.length - 1] = `${newLines.at(-1)},`
								} else if (l > j) {
									lines[l - 1] = `${lines[l - 1]},`
								}
								lines.splice(l, 0, ...newLines)
								fs.writeFileSync(i18nFile, lines.join('\n'))
								return new vscode.Location(vscode.Uri.file(i18nFile), new vscode.Position(l + (newLines.length >> 1), (n << 1) + keyParts[n-1].length + 5))
							}
						}
					}
					return new vscode.Location(vscode.Uri.file(i18nFile), new vscode.Position(0, 0))
				} catch {}
			}
		}
	)
	context.subscriptions.push(completionProvider, definitionProvider)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}