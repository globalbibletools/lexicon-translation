import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer('lemma', new LemmaNotebookSerializer())
	);
}

export function deactivate() { }

class LemmaNotebookSerializer implements vscode.NotebookSerializer {
	deserializeNotebook(content: Uint8Array, token: vscode.CancellationToken): vscode.NotebookData {
		var cells: vscode.NotebookCellData[] = []

		var data = JSON.parse(new TextDecoder().decode(content))

		cells.push(
			new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, `# ${data.Lemma}`, 'markdown')
		)

		for (const formIndex in data.BaseForms) {
			const form = data.BaseForms[formIndex]
			cells.push(
				new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, `## ${+formIndex + 1}`, 'markdown')
			)

			for (const meaningIndex in form.LEXMeanings) {
				const meaning = form.LEXMeanings[meaningIndex]

				const lexicalDomainStr = meaning.LEXDomains?.map((domain: any) => {
					if (domain.DomainSource) {
						return `${domain.DomainSource} > ${domain.Domain}`
					} else {
						return domain.Domain
					}
				}).join('; ')
				const contextualDomainStr = meaning.LEXCoreDomains?.map((domain: any) => {
					if (domain.DomainSource) {
						return `${domain.DomainSource} > ${domain.Domain}`
					} else {
						return domain.Domain
					}
				}).join('; ')

				let titleStr = ''
				if (lexicalDomainStr && contextualDomainStr) {
					titleStr = `${lexicalDomainStr} -- ${contextualDomainStr}`
				} else {
					titleStr = lexicalDomainStr ?? contextualDomainStr ?? ''
				}


				cells.push(
					new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, `### ${+formIndex + 1}.${+meaningIndex + 1}: ${titleStr}`, 'markdown')
				)

				for (const senseIndex in meaning.LEXSenses) {
					const sense = meaning.LEXSenses[senseIndex]
					const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, sense.DefinitionShort, 'plaintext')
					cell.metadata = {
						formIndex,
						meaningIndex,
						senseIndex,
						field: 'DefinitionShort'
					}
					cells.push(cell)
				}
			}
		}

		const notebook = new vscode.NotebookData(cells)
		notebook.metadata = { content: data }
		return notebook
	}

	serializeNotebook(data: vscode.NotebookData, token: vscode.CancellationToken): Uint8Array {
		const content = data.metadata?.content
		if (!content) throw new Error('No file content in notebook')

		for (const cell of data.cells) {
			const metadata = cell.metadata ?? {}
			if (!metadata.field) continue

			const sense = content.BaseForms[metadata.formIndex]?.LEXMeanings[metadata.meaningIndex]?.LEXSenses[metadata.senseIndex]
			if (sense?.[metadata.field]) {
				sense[metadata.field] = cell.value
			}
		}

		return new TextEncoder().encode(JSON.stringify(content, null, 2));
	}
}
