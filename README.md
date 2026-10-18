# Phoenix

App desktop (Electron) para fazer backup entre discos e pastas: selecione uma origem e um destino, analise quais arquivos da origem ainda não existem (ou têm conteúdo diferente) no destino, e copie-os preservando a estrutura de subpastas.

## Como funciona

1. **Selecionar** — escolha a pasta/disco de origem e a de destino.
2. **Analisar** — o app varre a origem recursivamente e compara cada arquivo com o destino por caminho relativo e hash SHA-256 do conteúdo (ignorando metadados como data de modificação).
3. **Copiar** — os arquivos pendentes são copiados para o destino, preservando subpastas. Os arquivos originais na origem nunca são apagados ou movidos.

## Rodando localmente

```bash
npm install
npm start
```

## Stack

- Electron + JavaScript puro (sem build step, sem framework de UI)
- Lógica de filesystem isolada em `lib/backup.js`, sem dependência do Electron
