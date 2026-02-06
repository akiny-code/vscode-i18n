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
			provideCompletionItems(document, position, token, context) {
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
	context.subscriptions.push(completionProvider)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}